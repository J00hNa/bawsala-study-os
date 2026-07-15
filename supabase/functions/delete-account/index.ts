const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map(value => value.trim()).filter(Boolean);
const MAX_BODY_BYTES = 4096;
const REQUEST_TIMEOUT_MS = 10_000;

function headersFor(origin: string | null, allowed: boolean): HeadersInit {
  return {
    ...(allowed && origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  };
}

function json(status: number, body: Record<string, unknown>, headers: HeadersInit): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

async function timedFetch(input: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timeout); }
}

Deno.serve(async (request: Request) => {
  const requestId = crypto.randomUUID();
  const origin = request.headers.get('Origin');
  const allowed = Boolean(origin && ALLOWED_ORIGINS.includes(origin));
  const headers = headersFor(origin, allowed);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || ALLOWED_ORIGINS.length === 0) {
    return json(503, { error: 'Server is not configured', requestId }, headers);
  }
  if (!allowed) return json(403, { error: 'Origin not allowed', requestId }, headers);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed', requestId }, headers);

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) return json(413, { error: 'Request too large', requestId }, headers);
  const authorization = request.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return json(401, { error: 'Authentication required', requestId }, headers);

  let body: { confirmation?: string };
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return json(413, { error: 'Request too large', requestId }, headers);
    }
    body = JSON.parse(rawBody);
  } catch {
    return json(400, { error: 'Invalid JSON body', requestId }, headers);
  }
  if (body?.confirmation !== 'DELETE MY ACCOUNT') return json(400, { error: 'Confirmation phrase is invalid', requestId }, headers);

  try {
    const userResponse = await timedFetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: authorization }
    });
    if (!userResponse.ok) return json(401, { error: 'Invalid session', requestId }, headers);
    const user = await userResponse.json();
    if (!user?.id) return json(401, { error: 'Invalid user', requestId }, headers);

    const requestedAt = new Date();
    const deleteAfter = new Date(requestedAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    const scheduleResponse = await timedFetch(`${SUPABASE_URL}/rest/v1/account_deletion_requests?on_conflict=user_id`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({
        user_id: user.id,
        requested_at: requestedAt.toISOString(),
        delete_after: deleteAfter.toISOString(),
        status: 'pending',
        request_id: requestId
      })
    });
    if (!scheduleResponse.ok) return json(500, { error: 'Could not schedule deletion', requestId }, headers);

    return json(202, { ok: true, requestedAt: requestedAt.toISOString(), deleteAfter: deleteAfter.toISOString(), requestId }, headers);
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'AbortError';
    return json(timedOut ? 504 : 500, { error: timedOut ? 'Upstream timeout' : 'Deletion scheduling failed', requestId }, headers);
  }
});
