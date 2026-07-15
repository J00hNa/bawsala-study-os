const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET = Deno.env.get('ACCOUNT_PURGE_CRON_SECRET') ?? '';
const TIMEOUT_MS = 10_000;

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}

async function timedFetch(input: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timeout); }
}

Deno.serve(async (request: Request) => {
  const requestId = crypto.randomUUID();
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed', requestId });
  if (!SUPABASE_URL || !SERVICE_KEY || !CRON_SECRET) return json(503, { error: 'Server is not configured', requestId });
  if (request.headers.get('x-cron-secret') !== CRON_SECRET) return json(401, { error: 'Unauthorized', requestId });

  try {
    const common = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

    // Reset any stuck processing items back to pending
    await timedFetch(`${SUPABASE_URL}/rest/v1/account_deletion_requests?status=eq.processing`, {
      method: 'PATCH',
      headers: { ...common, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'pending' })
    }).catch(() => {});

    const dueUrl = new URL(`${SUPABASE_URL}/rest/v1/account_deletion_requests`);
    dueUrl.searchParams.set('select', 'user_id,request_id');
    dueUrl.searchParams.set('status', 'eq.pending');
    dueUrl.searchParams.set('delete_after', `lte.${new Date().toISOString()}`);
    dueUrl.searchParams.set('order', 'delete_after.asc');
    dueUrl.searchParams.set('limit', '50');
    const dueResponse = await timedFetch(dueUrl.toString(), { headers: common });
    if (!dueResponse.ok) return json(502, { error: 'Could not read deletion queue', requestId });
    const due: Array<{ user_id: string; request_id: string }> = await dueResponse.json();

    let deleted = 0;
    let failed = 0;
    for (const item of due) {
      try {
        const markUrl = `${SUPABASE_URL}/rest/v1/account_deletion_requests?user_id=eq.${encodeURIComponent(item.user_id)}`;
        const markResponse = await timedFetch(markUrl, {
          method: 'PATCH', headers: { ...common, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'processing' })
        });
        if (!markResponse.ok) {
          failed += 1;
          continue;
        }
        const deleteResponse = await timedFetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(item.user_id)}`, {
          method: 'DELETE',
          headers: { ...common, 'Content-Type': 'application/json' },
          body: JSON.stringify({ should_soft_delete: false })
        });
        if (deleteResponse.ok) deleted += 1;
        else {
          failed += 1;
          await timedFetch(markUrl, {
            method: 'PATCH', headers: { ...common, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'failed' })
          });
        }
      } catch {
        failed += 1;
        try {
          const markUrl = `${SUPABASE_URL}/rest/v1/account_deletion_requests?user_id=eq.${encodeURIComponent(item.user_id)}`;
          await timedFetch(markUrl, {
            method: 'PATCH', headers: { ...common, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'failed' })
          });
        } catch { /* best effort */ }
      }
    }
    return json(200, { ok: true, scanned: due.length, deleted, failed, requestId });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'AbortError';
    return json(timedOut ? 504 : 500, { error: timedOut ? 'Upstream timeout' : 'Purge failed', requestId });
  }
});
