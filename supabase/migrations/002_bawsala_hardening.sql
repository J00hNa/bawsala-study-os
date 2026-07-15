-- Bawsala Study OS v4 hardening migration.
-- Apply after 001_bawsala_backend.sql.

begin;

alter table public.study_state_backups
  add column if not exists reason text not null default 'automatic';

alter table public.study_state_backups
  drop constraint if exists study_state_backups_reason_length;
alter table public.study_state_backups
  add constraint study_state_backups_reason_length check (char_length(reason) between 1 and 64);

-- Direct destructive access is intentionally removed. Restores happen by pushing
-- a selected backup as a new revision; backups themselves remain immutable.
drop policy if exists "study_states_delete_own" on public.study_states;
drop policy if exists "study_state_backups_delete_own" on public.study_state_backups;
revoke delete on public.study_states from authenticated;
revoke delete on public.study_state_backups from authenticated;
grant select on public.study_state_backups to authenticated;

create table if not exists public.account_deletion_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  delete_after timestamptz not null,
  status text not null default 'pending',
  request_id uuid not null default gen_random_uuid(),
  constraint account_deletion_future check (delete_after >= requested_at + interval '13 days'),
  constraint account_deletion_status check (status in ('pending', 'cancelled', 'processing', 'failed'))
);

create index if not exists account_deletion_due_idx
  on public.account_deletion_requests (status, delete_after)
  where status = 'pending';

alter table public.account_deletion_requests enable row level security;
alter table public.account_deletion_requests force row level security;
revoke all on public.account_deletion_requests from public, anon, authenticated;
grant select on public.account_deletion_requests to authenticated;

drop policy if exists "account_deletion_select_own" on public.account_deletion_requests;
create policy "account_deletion_select_own"
  on public.account_deletion_requests for select to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.study_sync_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, bucket)
);

revoke all on public.study_sync_rate_limits from public, anon, authenticated;

create table if not exists public.study_sync_audit (
  request_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  outcome text not null check (outcome in ('created', 'updated', 'conflict')),
  revision bigint not null check (revision >= 0),
  device_fingerprint text,
  created_at timestamptz not null default now()
);

create index if not exists study_sync_audit_user_time_idx
  on public.study_sync_audit (user_id, created_at desc);

alter table public.study_sync_audit enable row level security;
alter table public.study_sync_audit force row level security;
revoke all on public.study_sync_audit from public, anon, authenticated;
grant select on public.study_sync_audit to authenticated;
drop policy if exists "study_sync_audit_select_own" on public.study_sync_audit;
create policy "study_sync_audit_select_own"
  on public.study_sync_audit for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.validate_bawsala_state(p_state jsonb)
returns void
language plpgsql
volatile
set search_path = public, pg_temp
as $$
declare
  v_key text;
begin
  if p_state is null or jsonb_typeof(p_state) <> 'object' then
    raise exception 'State must be a JSON object' using errcode = '22023';
  end if;
  if octet_length(p_state::text) > 1300000 then
    raise exception 'State exceeds the 1.3 MB limit' using errcode = '22001';
  end if;
  if coalesce((p_state->>'schemaVersion')::integer, 0) <> 4 then
    raise exception 'Unsupported state schema version' using errcode = '22023';
  end if;
  if jsonb_typeof(p_state->'profile') <> 'object' or jsonb_typeof(p_state->'settings') <> 'object' then
    raise exception 'State profile/settings are invalid' using errcode = '22023';
  end if;
  foreach v_key in array array['quests','subjects','sessions','focusLog','notes','resources','cards','reviewLog','questions','arenaRuns','challengeClaims','notifications'] loop
    if jsonb_typeof(p_state->v_key) <> 'array' then
      raise exception 'State collection % is invalid', v_key using errcode = '22023';
    end if;
  end loop;
  if jsonb_array_length(p_state->'subjects') > 100
     or jsonb_array_length(p_state->'quests') > 400
     or jsonb_array_length(p_state->'sessions') > 1000
     or jsonb_array_length(p_state->'notes') > 300
     or jsonb_array_length(p_state->'cards') > 5000
     or jsonb_array_length(p_state->'questions') > 2000 then
    raise exception 'State collection limit exceeded' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.validate_bawsala_state(jsonb) from public, anon, authenticated;

create or replace function public.archive_study_state()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.state is distinct from new.state and not exists (
    select 1 from public.study_state_backups
    where user_id = old.user_id and created_at > now() - interval '15 minutes'
  ) then
    insert into public.study_state_backups (user_id, revision, state, reason)
    values (old.user_id, old.revision, old.state, 'automatic-before-sync');

    delete from public.study_state_backups
    where id in (
      select id from public.study_state_backups
      where user_id = old.user_id
      order by created_at desc
      offset 12
    );
  end if;
  return new;
end;
$$;
revoke all on function public.archive_study_state() from public, anon, authenticated;

create or replace function public.record_study_sync_audit(
  p_request_id uuid,
  p_user_id uuid,
  p_outcome text,
  p_revision bigint,
  p_device_id text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.study_sync_audit (request_id, user_id, outcome, revision, device_fingerprint)
  values (p_request_id, p_user_id, p_outcome, p_revision, nullif(left(md5(coalesce(p_device_id, '')), 16), left(md5(''), 16)));

  delete from public.study_sync_audit
  where user_id = p_user_id and created_at < now() - interval '90 days';
end;
$$;
revoke all on function public.record_study_sync_audit(uuid, uuid, text, bigint, text) from public, anon, authenticated;

create or replace function public.sync_study_state(
  p_state jsonb,
  p_expected_revision bigint default 0,
  p_device_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_current public.study_states%rowtype;
  v_revision bigint;
  v_request_count integer;
  v_request_id uuid := gen_random_uuid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform public.validate_bawsala_state(p_state);

  if p_device_id is not null and (char_length(p_device_id) < 8 or char_length(p_device_id) > 128) then
    raise exception 'Invalid device identifier' using errcode = '22023';
  end if;
  if coalesce(p_expected_revision, 0) < 0 then
    raise exception 'Invalid expected revision' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  insert into public.study_sync_rate_limits (user_id, bucket, request_count)
  values (v_user_id, date_trunc('minute', clock_timestamp()), 1)
  on conflict (user_id, bucket)
  do update set request_count = public.study_sync_rate_limits.request_count + 1
  returning request_count into v_request_count;

  if v_request_count > 60 then
    raise exception 'Sync rate limit exceeded' using errcode = 'P0001';
  end if;

  delete from public.study_sync_rate_limits
  where bucket < now() - interval '10 minutes';

  select * into v_current
  from public.study_states
  where user_id = v_user_id
  for update;

  if not found then
    if coalesce(p_expected_revision, 0) <> 0 then
      perform public.record_study_sync_audit(v_request_id, v_user_id, 'conflict', 0, p_device_id);
      return jsonb_build_object('ok', false, 'conflict', true, 'revision', 0, 'state', null, 'request_id', v_request_id);
    end if;

    begin
      insert into public.study_states (user_id, state, revision, last_device_id)
      values (v_user_id, p_state, 1, p_device_id)
      returning revision into v_revision;
    exception when unique_violation then
      select * into v_current from public.study_states where user_id = v_user_id;
      perform public.record_study_sync_audit(v_request_id, v_user_id, 'conflict', v_current.revision, p_device_id);
      return jsonb_build_object(
        'ok', false, 'conflict', true, 'revision', v_current.revision,
        'state', v_current.state, 'updated_at', v_current.updated_at, 'request_id', v_request_id
      );
    end;

    perform public.record_study_sync_audit(v_request_id, v_user_id, 'created', v_revision, p_device_id);
    return jsonb_build_object('ok', true, 'conflict', false, 'revision', v_revision, 'updated_at', now(), 'request_id', v_request_id);
  end if;

  if v_current.revision <> coalesce(p_expected_revision, 0) then
    perform public.record_study_sync_audit(v_request_id, v_user_id, 'conflict', v_current.revision, p_device_id);
    return jsonb_build_object(
      'ok', false, 'conflict', true, 'revision', v_current.revision,
      'state', v_current.state, 'updated_at', v_current.updated_at, 'request_id', v_request_id
    );
  end if;

  update public.study_states
  set state = p_state,
      revision = revision + 1,
      last_device_id = p_device_id,
      updated_at = now()
  where user_id = v_user_id
  returning revision into v_revision;

  perform public.record_study_sync_audit(v_request_id, v_user_id, 'updated', v_revision, p_device_id);
  return jsonb_build_object('ok', true, 'conflict', false, 'revision', v_revision, 'updated_at', now(), 'request_id', v_request_id);
end;
$$;

revoke all on function public.sync_study_state(jsonb, bigint, text) from public, anon;
grant execute on function public.sync_study_state(jsonb, bigint, text) to authenticated;

create or replace function public.cancel_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_updated integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.account_deletion_requests
  set status = 'cancelled'
  where user_id = v_user_id and status = 'pending';
  get diagnostics v_updated = row_count;
  return jsonb_build_object('ok', true, 'cancelled', v_updated > 0);
end;
$$;
revoke all on function public.cancel_account_deletion() from public, anon;
grant execute on function public.cancel_account_deletion() to authenticated;

commit;
