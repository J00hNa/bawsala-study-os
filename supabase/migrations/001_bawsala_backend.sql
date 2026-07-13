-- Bawsala Study OS: secure, local-first cloud state.
-- Run this entire file in Supabase SQL Editor once.

begin;

create table if not exists public.study_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  last_device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_states_state_is_object check (jsonb_typeof(state) = 'object'),
  constraint study_states_device_id_length check (last_device_id is null or char_length(last_device_id) <= 128),
  constraint study_states_max_size check (octet_length(state::text) <= 1500000)
);

create table if not exists public.study_state_backups (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  revision bigint not null,
  state jsonb not null,
  created_at timestamptz not null default now(),
  constraint study_state_backups_state_is_object check (jsonb_typeof(state) = 'object'),
  constraint study_state_backups_max_size check (octet_length(state::text) <= 1500000)
);

create index if not exists study_state_backups_user_created_idx
  on public.study_state_backups (user_id, created_at desc);

alter table public.study_states enable row level security;
alter table public.study_states force row level security;
alter table public.study_state_backups enable row level security;
alter table public.study_state_backups force row level security;

revoke all on public.study_states from public, anon;
revoke all on public.study_state_backups from public, anon;
grant select on public.study_states to authenticated;
grant select, delete on public.study_state_backups to authenticated;

create policy "study_states_select_own"
  on public.study_states for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "study_states_insert_own"
  on public.study_states for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "study_states_update_own"
  on public.study_states for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "study_states_delete_own"
  on public.study_states for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "study_state_backups_select_own"
  on public.study_state_backups for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "study_state_backups_delete_own"
  on public.study_state_backups for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.archive_study_state()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.study_state_backups
    where user_id = old.user_id
      and created_at > now() - interval '1 hour'
  ) then
    insert into public.study_state_backups (user_id, revision, state)
    values (old.user_id, old.revision, old.state);

    delete from public.study_state_backups
    where id in (
      select id
      from public.study_state_backups
      where user_id = old.user_id
      order by created_at desc
      offset 8
    );
  end if;
  return new;
end;
$$;

revoke all on function public.archive_study_state() from public, anon, authenticated;

drop trigger if exists archive_study_state_before_update on public.study_states;
create trigger archive_study_state_before_update
before update of state on public.study_states
for each row execute function public.archive_study_state();

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
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_state is null or jsonb_typeof(p_state) <> 'object' then
    raise exception 'State must be a JSON object' using errcode = '22023';
  end if;

  if octet_length(p_state::text) > 1500000 then
    raise exception 'State exceeds the 1.5 MB limit' using errcode = '22001';
  end if;

  if p_device_id is not null and char_length(p_device_id) > 128 then
    raise exception 'Invalid device identifier' using errcode = '22023';
  end if;

  select * into v_current
  from public.study_states
  where user_id = v_user_id
  for update;

  if not found then
    if coalesce(p_expected_revision, 0) <> 0 then
      return jsonb_build_object('ok', false, 'conflict', true, 'revision', 0, 'state', null);
    end if;

    begin
      insert into public.study_states (user_id, state, revision, last_device_id)
      values (v_user_id, p_state, 1, p_device_id)
      returning revision into v_revision;
    exception when unique_violation then
      select * into v_current
      from public.study_states
      where user_id = v_user_id;
      return jsonb_build_object(
        'ok', false,
        'conflict', true,
        'revision', v_current.revision,
        'state', v_current.state,
        'updated_at', v_current.updated_at
      );
    end;

    return jsonb_build_object('ok', true, 'conflict', false, 'revision', v_revision, 'updated_at', now());
  end if;

  if v_current.revision <> coalesce(p_expected_revision, 0) then
    return jsonb_build_object(
      'ok', false,
      'conflict', true,
      'revision', v_current.revision,
      'state', v_current.state,
      'updated_at', v_current.updated_at
    );
  end if;

  update public.study_states
  set state = p_state,
      revision = revision + 1,
      last_device_id = p_device_id,
      updated_at = now()
  where user_id = v_user_id
  returning revision into v_revision;

  return jsonb_build_object('ok', true, 'conflict', false, 'revision', v_revision, 'updated_at', now());
end;
$$;

revoke all on function public.sync_study_state(jsonb, bigint, text) from public, anon;
grant execute on function public.sync_study_state(jsonb, bigint, text) to authenticated;

commit;
