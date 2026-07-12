import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import os from 'node:os';
import crypto from 'node:crypto';
import http from 'node:http';

const root = process.cwd();
const smokeDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bawsala-smoke-'));
const dbPath = path.join(smokeDataDir, 'db.json');
const sqlitePath = path.join(smokeDataDir, 'bawsala.sqlite');
const walPath = sqlitePath + '-wal';
const shmPath = sqlitePath + '-shm';
let sqliteAvailable = false;
try { await import('node:sqlite'); sqliteAvailable = true; } catch (_) { sqliteAvailable = false; }
const port = 18080 + Math.floor(Math.random() * 1000);
const base = `http://127.0.0.1:${port}`;
const providerPort = port + 2000;
const providerBase = `http://127.0.0.1:${providerPort}`;
const healthToken = 'smoke-health-token-32-random-characters';
let csrfToken = '';
let csrfCookie = '';
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
fs.rmSync(dbPath, { force: true });
fs.rmSync(sqlitePath, { force: true });
fs.rmSync(walPath, { force: true });
fs.rmSync(shmPath, { force: true });

let child;
let providerServer;
function base32Decode(value){
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean=String(value||'').toUpperCase().replace(/[^A-Z2-7]/g,'');
  let bits=''; for(const char of clean){ const index=alphabet.indexOf(char); if(index<0) throw new Error('BAD_BASE32'); bits += index.toString(2).padStart(5,'0'); }
  const bytes=[]; for(let i=0;i+8<=bits.length;i+=8) bytes.push(parseInt(bits.slice(i,i+8),2));
  return Buffer.from(bytes);
}
function totp(secret, now=Date.now()){
  const counter=Math.floor(now/30000); const buffer=Buffer.alloc(8); buffer.writeBigUInt64BE(BigInt(counter));
  const digest=crypto.createHmac('sha1',base32Decode(secret)).update(buffer).digest(); const offset=digest[digest.length-1]&15;
  return String((digest.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');
}
async function startProvider(){
  providerServer=http.createServer((req,res)=>{
    let raw=''; req.on('data',chunk=>raw+=chunk); req.on('end',()=>{
      let body={}; try{ body=raw?JSON.parse(raw):{}; }catch(_){}
      res.writeHead(200,{'Content-Type':'application/json'});
      if(req.url==='/checkout') return res.end(JSON.stringify({id:'provider_'+String(body.clientReferenceId||'session'),checkoutUrl:`https://payments.example.test/checkout?client_reference_id=${encodeURIComponent(body.clientReferenceId||'')}`}));
      if(req.url==='/portal') return res.end(JSON.stringify({portalUrl:'https://payments.example.test/portal'}));
      res.statusCode=404; return res.end(JSON.stringify({error:'NOT_FOUND'}));
    });
  });
  await new Promise((resolve,reject)=>providerServer.listen(providerPort,'127.0.0.1',resolve).once('error',reject));
}
async function request(pathname, options={}){
  const init={...options, headers:{...(options.headers||{})}};
  const method=String(init.method||'GET').toUpperCase();
  if(!['GET','HEAD','OPTIONS'].includes(method)){
    init.headers['X-Bawsala-Request']='1';
    init.headers['X-Bawsala-CSRF']=csrfToken;
    init.headers.Cookie = [init.headers.Cookie, csrfCookie].filter(Boolean).join('; ');
  }
  const res = await fetch(base + pathname, init);
  const json = await res.json().catch(()=>({}));
  return { res, json };
}
async function primeCsrf(){
  const res = await fetch(base + '/api/auth/csrf');
  const json = await res.json().catch(()=>({}));
  csrfToken = json.csrfToken || '';
  csrfCookie = (res.headers.get('set-cookie') || '').split(';')[0];
  if(!csrfToken || !csrfCookie) throw new Error('CSRF_PRIME_FAILED');
}
async function waitForServer(){
  const started = Date.now();
  while(Date.now() - started < 6000){
    try{ const {res,json} = await request('/api/health/live'); if(res.ok && json.ok){ if(json.version !== '16.0.1') throw new Error('HEALTH_VERSION_MISMATCH'); return; } }catch(_){/* retry */}
    await new Promise(r=>setTimeout(r,120));
  }
  throw new Error('SERVER_DID_NOT_START');
}
function cookieFrom(res){
  const raw = res.headers.get('set-cookie') || '';
  return raw.split(';')[0];
}
async function main(){
  await startProvider();
  child = spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, PORT: String(port), NODE_ENV: 'development', BAWSALA_STORAGE: sqliteAvailable ? 'sqlite' : 'json', BAWSALA_DATA_DIR: smokeDataDir, BAWSALA_GOOGLE_CLIENT_ID: 'fake-client-id.apps.googleusercontent.com', BAWSALA_GOOGLE_CLIENT_SECRET: 'fake-client-secret', BAWSALA_GOOGLE_REDIRECT_URI: `${base}/api/auth/google/callback`, BAWSALA_GOOGLE_CALENDAR_ENABLED: 'true', BAWSALA_OAUTH_ENCRYPTION_KEY: 'smoke-oauth-encryption-key-32-characters-minimum', BAWSALA_MFA_ENCRYPTION_KEY: 'smoke-mfa-encryption-key-32-characters-minimum', BAWSALA_PAYMENT_PROVIDER: 'smoke-provider', BAWSALA_PAYMENT_CHECKOUT_API_URL: `${providerBase}/checkout`, BAWSALA_PAYMENT_PORTAL_API_URL: `${providerBase}/portal`, BAWSALA_PAYMENT_WEBHOOK_SECRET: 'smoke-webhook-secret', BAWSALA_LEGAL_ENTITY_NAME: 'Bawsala Test Operator', BAWSALA_LEGAL_ENTITY_ADDRESS: 'Test Address, Amman, Jordan', BAWSALA_LEGAL_JURISDICTION: 'Jordan', BAWSALA_LEGAL_TAX_ID: 'not-applicable-test', BAWSALA_LEGAL_CONTACT_EMAIL: 'legal@example.test', BAWSALA_REFUND_POLICY_VERSION: 'smoke-v1', BAWSALA_REFUND_WINDOW_DAYS: '14', BAWSALA_HEALTH_DETAILS_TOKEN: healthToken, BAWSALA_ALLOW_DEV_ADMIN_BOOTSTRAP: 'true', BAWSALA_ALLOW_DEV_RESET_LINKS: 'true', BAWSALA_AUTH_RATE_LIMIT: '200', BAWSALA_BACKUP_ENCRYPTION_KEY: 'smoke-backup-encryption-key-32-characters-minimum' }, stdio: ['ignore','pipe','pipe'] });
  await waitForServer();
  await primeCsrf();

  const home = await fetch(base + '/');
  if(!home.headers.get('content-security-policy') || home.headers.get('x-frame-options') !== 'DENY' || home.headers.get('cross-origin-resource-policy') !== 'same-origin') throw new Error('SECURITY_HEADERS_MISSING');
  const ready = await request('/api/health/ready', { headers:{'X-Bawsala-Health-Token':healthToken} });
  if(!ready.res.ok || ready.json.status !== 'ready' || !ready.json.dependencies || !ready.json.storage?.engine) throw new Error('HEALTH_READY_FAILED');
  if(sqliteAvailable && ready.json.storage.engine !== 'sqlite') throw new Error('SQLITE_ENGINE_NOT_ACTIVE');
  if(!ready.res.headers.get('server-timing') || !/ms$/.test(ready.res.headers.get('x-response-time')||'')) throw new Error('RUNTIME_TIMING_HEADERS_MISSING');
  const wrongMethod = await request('/api/auth/signup');
  if(wrongMethod.res.status !== 405 || wrongMethod.json.error !== 'METHOD_NOT_ALLOWED' || wrongMethod.res.headers.get('allow') !== 'POST') throw new Error('API_METHOD_CONTRACT_FAILED');
  const checkoutOptions = await fetch(base + '/api/billing/checkout', { method:'OPTIONS' });
  if(checkoutOptions.status !== 204 || !String(checkoutOptions.headers.get('allow')||'').includes('POST')) throw new Error('API_OPTIONS_CONTRACT_FAILED');

  const missingAsset = await fetch(base + '/assets/js/missing-file.js');
  if(missingAsset.status !== 404) throw new Error('MISSING_ASSET_DID_NOT_404');

  const outsidePath = path.join(path.dirname(root), path.basename(root) + '-secret.txt');
  fs.writeFileSync(outsidePath, 'leak-test');
  const traversal = await fetch(base + '/%2e%2e/' + encodeURIComponent(path.basename(outsidePath)));
  fs.rmSync(outsidePath, { force: true });
  if(traversal.status !== 403 && traversal.status !== 404) throw new Error('STATIC_PATH_TRAVERSAL_NOT_BLOCKED');
  const sourceLeak = await fetch(base + '/server.js');
  if(sourceLeak.status !== 403) throw new Error('SERVER_SOURCE_STATIC_LEAK');
  fs.mkdirSync(path.join(root, 'data'), { recursive:true });
  const dataProbePath = path.join(root, 'data', 'static-leak-probe.json');
  fs.writeFileSync(dataProbePath, '{"secret":true}');
  const dataLeak = await fetch(base + '/data/static-leak-probe.json');
  fs.rmSync(dataProbePath, { force:true });
  if(dataLeak.status !== 403) throw new Error('RUNTIME_DATA_STATIC_LEAK');

  const csrfBlocked = await fetch(base + '/api/auth/signup', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:'No Header', email:'csrf@example.test', password:'StrongPass123!', privacyAccepted:true,ageConfirmed:true}) });
  const csrfJson = await csrfBlocked.json().catch(()=>({}));
  if(csrfBlocked.status !== 403 || csrfJson.error !== 'BAD_CSRF') throw new Error('CSRF_GUARD_NOT_ENFORCED');

  const oldToken = csrfToken;
  csrfToken = 'wrongcsrfwrongcsrfwrongcsrfwrongcsrfwrongcsrf';
  const wrongCsrf = await request('/api/auth/signup', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:'Bad CSRF', email:'badcsrf@example.test', password:'StrongPass123!', privacyAccepted:true,ageConfirmed:true}) });
  csrfToken = oldToken;
  if(wrongCsrf.res.status !== 403 || wrongCsrf.json.error !== 'BAD_CSRF') throw new Error('CSRF_TOKEN_NOT_ENFORCED');
  const badContentType = await fetch(base + '/api/auth/password-reset/request', { method:'POST', headers:{'Content-Type':'text/plain','X-Bawsala-Request':'1','X-Bawsala-CSRF':csrfToken,'Cookie':csrfCookie}, body:'email=x@example.test' });
  const badContentTypeJson = await badContentType.json().catch(()=>({}));
  if(badContentType.status !== 415 || badContentTypeJson.error !== 'UNSUPPORTED_MEDIA_TYPE') throw new Error('JSON_CONTENT_TYPE_GUARD_FAILED');

  const googleStart = await request('/api/auth/google/start');
  if(!googleStart.res.ok || !googleStart.json.enabled || !googleStart.json.authUrl?.includes('accounts.google.com')) throw new Error('GOOGLE_START_NOT_READY');
  const googleStateCookie = cookieFrom(googleStart.res);
  const googleState = new URL(googleStart.json.authUrl).searchParams.get('state');
  if(!googleState || !googleStateCookie.includes('bawsala_google_state=')) throw new Error('GOOGLE_STATE_NOT_ISSUED');
  const badGoogleCallback = await fetch(base + '/api/auth/google/callback?state=wrongstatewrongstatewrongstatewrongstate&code=fake', { redirect:'manual', headers:{Cookie:googleStateCookie} });
  if(badGoogleCallback.status !== 302 || !String(badGoogleCallback.headers.get('location')||'').includes('google_state_failed')) throw new Error('GOOGLE_STATE_GUARD_FAILED');
  const googlePending = await request('/api/auth/google/pending');
  if(!googlePending.res.ok || googlePending.json.pending !== null) throw new Error('GOOGLE_PENDING_SHOULD_BE_EMPTY');

  const rejectedPrivacy = await request('/api/auth/signup', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:'No Privacy', email:'privacy@example.test', password:'StrongPass123!', phone:'0790000000', track:'academic', grade:'tawjihi', ageConfirmed:true}) });
  if(rejectedPrivacy.res.status !== 400 || rejectedPrivacy.json.error !== 'PRIVACY_REQUIRED') throw new Error('PRIVACY_CONSENT_NOT_ENFORCED');

  const missingAgeConfirmation = await request('/api/auth/signup', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:'Missing Age Confirmation', email:'young@example.test', password:'StrongPass123!', phone:'0790000000', track:'academic', specialization:'science', grade:'tawjihi', privacyAccepted:true,ageConfirmed:false}) });
  if(missingAgeConfirmation.res.status !== 400 || missingAgeConfirmation.json.error !== 'AGE_CONFIRMATION_REQUIRED') throw new Error('AGE_CONFIRMATION_GATE_NOT_ENFORCED');

  const signup = await request('/api/auth/signup', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:'Smoke Admin', email:'smoke@example.test', password:'StrongPass123!', phone:'0790000000', track:'academic', specialization:'science', grade:'tawjihi', privacyAccepted:true,ageConfirmed:true}) });
  if(signup.res.status !== 201 || signup.json.user?.role !== 'admin') throw new Error('DEV_BOOTSTRAP_ADMIN_FAILED');
  if(signup.json.user?.emailVerified !== false || !signup.json.verification?.devVerificationUrl) throw new Error('EMAIL_VERIFICATION_NOT_ISSUED');
  const cookie = cookieFrom(signup.res);
  if(!cookie) throw new Error('NO_SESSION_COOKIE');
  const unverifiedSync = await request('/api/sync/snapshot', { headers:{Cookie:cookie} });
  if(unverifiedSync.res.status !== 403 || unverifiedSync.json.error !== 'EMAIL_VERIFICATION_REQUIRED') throw new Error('EMAIL_VERIFICATION_GATE_NOT_ENFORCED');
  const verifyToken = new URL(signup.json.verification.devVerificationUrl).searchParams.get('token');
  const verified = await request('/api/auth/verify-email/confirm', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({token:verifyToken}) });
  if(!verified.res.ok || verified.json.user?.emailVerified !== true) throw new Error('EMAIL_VERIFICATION_CONFIRM_FAILED');
  const verifyStatus = await request('/api/auth/verify-email/status', { headers:{Cookie:cookie} });
  if(!verifyStatus.res.ok || verifyStatus.json.user?.emailVerified !== true) throw new Error('EMAIL_VERIFICATION_STATUS_FAILED');
  const mfaStart = await request('/api/account/mfa', { method:'POST', headers:{'Content-Type':'application/json', Cookie:cookie}, body:'{}' });
  if(!mfaStart.res.ok || !mfaStart.json.secret) throw new Error('MFA_SETUP_START_FAILED:'+JSON.stringify(mfaStart.json));
  const mfaSecret = mfaStart.json.secret;
  const mfaConfirm = await request('/api/account/mfa/confirm', { method:'POST', headers:{'Content-Type':'application/json', Cookie:cookie}, body:JSON.stringify({code:totp(mfaSecret)}) });
  if(!mfaConfirm.res.ok || !Array.isArray(mfaConfirm.json.recoveryCodes) || mfaConfirm.json.recoveryCodes.length < 5) throw new Error('MFA_SETUP_CONFIRM_FAILED:'+JSON.stringify(mfaConfirm.json));

  const supportWithoutConsent = await request('/api/support/tickets', { method:'POST', headers:{'Content-Type':'application/json', Cookie:cookie}, body:JSON.stringify({category:'technical', priority:'normal', title:'مشكلة تجريبية', details:'هذه تفاصيل كافية لاختبار رفض الطلب دون موافقة.'}) });
  if(supportWithoutConsent.res.status !== 400 || supportWithoutConsent.json.error !== 'SUPPORT_CONSENT_REQUIRED') throw new Error('SUPPORT_CONSENT_GATE_FAILED:'+supportWithoutConsent.res.status+':'+JSON.stringify(supportWithoutConsent.json));
  const supportCreated = await request('/api/support/tickets', { method:'POST', headers:{'Content-Type':'application/json', Cookie:cookie}, body:JSON.stringify({category:'technical', priority:'high', title:'مشكلة تجريبية بالخادم', details:'هذه تفاصيل كافية لاختبار دورة طلب الدعم الحقيقية على الخادم.', consent:true}) });
  if(supportCreated.res.status !== 201 || !supportCreated.json.ticket?.id || supportCreated.json.ticket?.priority !== 'high' || supportCreated.json.ticket?.history?.[0]?.actor !== 'user') throw new Error('SUPPORT_TICKET_CREATE_FAILED');
  const supportTicketId = supportCreated.json.ticket.id;
  const supportListed = await request('/api/support/tickets', { headers:{Cookie:cookie} });
  if(!supportListed.res.ok || !supportListed.json.tickets?.some(ticket=>ticket.id===supportTicketId)) throw new Error('SUPPORT_TICKET_LIST_FAILED');
  const supportAdminUpdate = await request(`/api/admin/problems/${encodeURIComponent(signup.json.user.id)}/${encodeURIComponent(supportTicketId)}`, { method:'PATCH', headers:{'Content-Type':'application/json', Cookie:cookie}, body:JSON.stringify({status:'قيد المتابعة', adminNote:'تم استلام الطلب وجارٍ فحصه.'}) });
  if(!supportAdminUpdate.res.ok || supportAdminUpdate.json.problem?.status !== 'قيد المتابعة') throw new Error('SUPPORT_ADMIN_UPDATE_FAILED');
  const supportAfterAdmin = await request('/api/support/tickets', { headers:{Cookie:cookie} });
  const supportUserView = supportAfterAdmin.json.tickets?.find(ticket=>ticket.id===supportTicketId);
  if(!supportAfterAdmin.res.ok || supportUserView?.adminNote !== 'تم استلام الطلب وجارٍ فحصه.' || supportUserView?.history?.at(-1)?.actor !== 'support' || supportUserView?.history?.some(entry=>String(entry.actor||'').startsWith('usr_'))) throw new Error('SUPPORT_HISTORY_PRIVACY_FAILED');
  const supportClosed = await request(`/api/support/tickets/${encodeURIComponent(supportTicketId)}`, { method:'PATCH', headers:{'Content-Type':'application/json', Cookie:cookie}, body:JSON.stringify({status:'تم الحل'}) });
  if(!supportClosed.res.ok || supportClosed.json.ticket?.status !== 'تم الحل' || !supportClosed.json.ticket?.closedAt) throw new Error('SUPPORT_TICKET_CLOSE_FAILED');

  const billingPlans = await request('/api/billing/plans', { headers:{Cookie:cookie} });
  if(!billingPlans.res.ok || billingPlans.json.pricing?.yearlyDiscountPercent < 15 || billingPlans.json.pricing?.yearlyDiscountPercent > 20) throw new Error('BILLING_PRICE_MATH_FAILED');
  if(!billingPlans.json.provider?.configured) throw new Error('BILLING_PROVIDER_CONFIG_NOT_REPORTED');
  const billingGates = await request('/api/billing/feature-gates', { headers:{Cookie:cookie} });
  if(!billingGates.res.ok || billingGates.json.gates?.adsEnabled !== true || billingGates.json.gates?.premiumResources !== false) throw new Error('BILLING_FREE_FEATURE_GATES_FAILED');
  const checkoutKey = 'smoke-checkout-001';
  const checkout = await request('/api/billing/checkout', { method:'POST', headers:{'Content-Type':'application/json', Cookie:cookie, 'Idempotency-Key':checkoutKey}, body:JSON.stringify({planId:'plus-monthly'}) });
  if(!checkout.res.ok || !checkout.json.configured || !checkout.json.checkoutUrl?.includes('client_reference_id=') || !checkout.json.checkoutSession?.id) throw new Error('BILLING_CHECKOUT_SESSION_FAILED');
  const checkoutReplay = await request('/api/billing/checkout', { method:'POST', headers:{'Content-Type':'application/json', Cookie:cookie, 'Idempotency-Key':checkoutKey}, body:JSON.stringify({planId:'plus-monthly'}) });
  if(!checkoutReplay.res.ok || checkoutReplay.res.headers.get('idempotency-replayed') !== 'true' || checkoutReplay.json.checkoutSession?.id !== checkout.json.checkoutSession.id) throw new Error('BILLING_CHECKOUT_IDEMPOTENCY_FAILED');
  const checkoutConflict = await request('/api/billing/checkout', { method:'POST', headers:{'Content-Type':'application/json', Cookie:cookie, 'Idempotency-Key':checkoutKey}, body:JSON.stringify({planId:'plus-yearly'}) });
  if(checkoutConflict.res.status !== 409 || checkoutConflict.json.error !== 'IDEMPOTENCY_CONFLICT' || checkoutConflict.json.retryable !== false) throw new Error('BILLING_IDEMPOTENCY_CONFLICT_FAILED');
  const unsignedWebhook = await fetch(base + '/api/billing/webhook', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:'evt_unsigned', type:'invoice.paid', userId:signup.json.user.id, planId:'plus-monthly'}) });
  if(unsignedWebhook.status !== 401) throw new Error('BILLING_WEBHOOK_SIGNATURE_GUARD_FAILED');
  const webhookEventId = 'evt_smoke_paid';
  const webhookTimestamp = Math.floor(Date.now()/1000);
  const webhookBody = JSON.stringify({id:webhookEventId, type:'invoice.paid', userId:signup.json.user.id, planId:'plus-monthly', checkoutSessionId:checkout.json.checkoutSession.id, amountMinor:4990, currency:'JOD', renewal:'2099-01-01T00:00:00.000Z', subscriptionId:'sub_smoke'});
  const signature = crypto.createHmac('sha256','smoke-webhook-secret').update(`${webhookTimestamp}.${webhookEventId}.${webhookBody}`).digest('hex');
  const webhookHeaders = {'Content-Type':'application/json','x-bawsala-timestamp':String(webhookTimestamp),'x-bawsala-event-id':webhookEventId,'x-bawsala-signature':signature};
  const webhookPaid = await fetch(base + '/api/billing/webhook', { method:'POST', headers:webhookHeaders, body:webhookBody });
  const webhookPaidJson = await webhookPaid.json().catch(()=>({}));
  if(!webhookPaid.ok || webhookPaidJson.subscription?.status !== 'active' || webhookPaidJson.subscription?.adsRemoved !== true) throw new Error('BILLING_WEBHOOK_ACTIVATION_FAILED');
  const webhookDuplicate = await fetch(base + '/api/billing/webhook', { method:'POST', headers:webhookHeaders, body:webhookBody });
  const webhookDuplicateJson = await webhookDuplicate.json().catch(()=>({}));
  if(!webhookDuplicate.ok || webhookDuplicateJson.idempotent !== true) throw new Error('BILLING_WEBHOOK_IDEMPOTENCY_FAILED');
  const activeBilling = await request('/api/billing/status', { headers:{Cookie:cookie} });
  if(!activeBilling.res.ok || activeBilling.json.subscription?.plan !== 'plus-monthly' || activeBilling.json.gates?.premiumResources !== true || !activeBilling.json.history?.invoices?.length) throw new Error('BILLING_STATUS_HISTORY_FAILED');
  const changePlan = await request('/api/billing/change-plan', { method:'POST', headers:{'Content-Type':'application/json', Cookie:cookie, 'Idempotency-Key':'smoke-change-plan-001'}, body:JSON.stringify({planId:'plus-yearly'}) });
  if(!changePlan.res.ok || changePlan.json.subscription?.pendingPlanChange?.planId !== 'plus-yearly') throw new Error('BILLING_CHANGE_PLAN_PENDING_FAILED');
  const cancelBilling = await request('/api/billing/cancel', { method:'POST', headers:{'Content-Type':'application/json', Cookie:cookie, 'Idempotency-Key':'smoke-cancel-001'}, body:JSON.stringify({reason:'smoke'}) });
  if(!cancelBilling.res.ok || cancelBilling.json.subscription?.cancelAtPeriodEnd !== true) throw new Error('BILLING_CANCEL_FAILED');

  const resetReuse = await request('/api/auth/password-reset/request', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:'smoke@example.test'}) });
  if(!resetReuse.res.ok || !resetReuse.json.reset?.devResetUrl) throw new Error('PASSWORD_RESET_REQUEST_FAILED');
  const resetReuseToken = new URL(resetReuse.json.reset.devResetUrl).searchParams.get('token');
  const resetSamePassword = await request('/api/auth/password-reset/confirm', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({token:resetReuseToken, newPassword:'StrongPass123!'}) });
  if(resetSamePassword.res.status !== 400 || resetSamePassword.json.error !== 'PASSWORD_REUSED') throw new Error('PASSWORD_REUSE_GUARD_FAILED');

  const initialSnapshot = await request('/api/sync/snapshot', { headers:{Cookie:cookie} });
  if(!initialSnapshot.res.ok || !initialSnapshot.json.snapshot?.revision) throw new Error('INITIAL_SNAPSHOT_REVISION_MISSING');
  let syncRevision = initialSnapshot.json.snapshot.revision;
  const longText = 'x'.repeat(1400);
  const put = await request('/api/sync/snapshot', { method:'PUT', headers:{'Content-Type':'application/json', Cookie:cookie, 'If-Match':`"${syncRevision}"`}, body:JSON.stringify({baseRevision:syncRevision, keys:{'notebook:notes':[{id:'n1',title:'long',body:longText}]}, mode:'merge'}) });
  if(!put.res.ok) throw new Error('SYNC_PUT_FAILED:' + JSON.stringify(put.json));
  syncRevision = put.json.snapshot.revision;
  const got = await request('/api/sync/snapshot', { headers:{Cookie:cookie} });
  const body = got.json.snapshot?.keys?.['notebook:notes']?.[0]?.body || '';
  if(body.length !== longText.length) throw new Error(`SYNC_TRUNCATED:${body.length}`);
  if(!got.json.snapshot?.revision || !String(got.json.snapshot.revision).startsWith('sha256:')) throw new Error('SNAPSHOT_REVISION_MISSING');
  syncRevision = got.json.snapshot.revision;

  const homeworkSeed = await request('/api/sync/snapshot', { method:'PUT', headers:{'Content-Type':'application/json', Cookie:cookie}, body:JSON.stringify({baseRevision:syncRevision, keys:{'homeworks':[{id:'hw1',title:'old homework',subject:'رياضيات',createdAt:'2026-01-01T00:00:00.000Z'}]}, mode:'merge'}) });
  if(!homeworkSeed.res.ok) throw new Error('TOMBSTONE_SEED_FAILED');
  syncRevision = homeworkSeed.json.snapshot.revision;
  const homeworkDelete = await request('/api/sync/snapshot', { method:'PUT', headers:{'Content-Type':'application/json', Cookie:cookie}, body:JSON.stringify({baseRevision:syncRevision, keys:{'homeworks':[{id:'hw1',title:'old homework',subject:'رياضيات',createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-02-01T00:00:00.000Z',deletedAt:'2026-02-01T00:00:00.000Z',_deleted:true}]}, mode:'merge'}) });
  if(!homeworkDelete.res.ok || homeworkDelete.json.snapshot?.keys?.homeworks?.[0]?._deleted !== true) throw new Error('TOMBSTONE_NOT_PRESERVED');
  syncRevision = homeworkDelete.json.snapshot.revision;
  const staleHomework = await request('/api/sync/snapshot', { method:'PUT', headers:{'Content-Type':'application/json', Cookie:cookie}, body:JSON.stringify({baseRevision:syncRevision, keys:{'homeworks':[{id:'hw1',title:'stale resurrection',subject:'رياضيات',createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-02T00:00:00.000Z'}]}, mode:'merge'}) });
  if(!staleHomework.res.ok || staleHomework.json.snapshot?.keys?.homeworks?.[0]?._deleted !== true) throw new Error('TOMBSTONE_RESURRECTION_GUARD_FAILED');
  syncRevision = staleHomework.json.snapshot.revision;

  const badKeyPut = await request('/api/sync/key/' + encodeURIComponent('dashboard:mission'), { method:'PUT', headers:{'Content-Type':'application/json', Cookie:cookie}, body:JSON.stringify({baseRevision:syncRevision,value:'not-an-object'}) });
  if(badKeyPut.res.status !== 400 || badKeyPut.json.error !== 'INVALID_VALUE') throw new Error('SINGLE_KEY_SCHEMA_GUARD_FAILED');
  const goodKeyPut = await request('/api/sync/key/' + encodeURIComponent('dashboard:mission'), { method:'PUT', headers:{'Content-Type':'application/json', Cookie:cookie}, body:JSON.stringify({baseRevision:syncRevision,value:{text:'مهمة دخان الاختبار', minutes:30, status:'started'}}) });
  if(!goodKeyPut.res.ok || goodKeyPut.json.value?.minutes !== 30 || !goodKeyPut.json.revision) throw new Error('SINGLE_KEY_SCHEMA_SAVE_FAILED');
  syncRevision = goodKeyPut.json.revision;

  const studyDate = new Date().toISOString().slice(0,10);
  const studyIdempotency='study-smoke-idempotency-key-001';
  const studyPayload={date:studyDate,timezoneOffsetMinutes:0,baseRevision:syncRevision,actions:[
    {type:'continuation.set',payload:{id:'ctx-smoke',kind:'homework',entityId:'hw-smoke',title:'واجب مترابط',subject:'رياضيات',target:'focus'}},
    {type:'mission.save',payload:{id:'mission-smoke',text:'إنهاء الواجب المترابط',subject:'رياضيات',minutes:35,originType:'homework',originId:'hw-smoke'}},
    {type:'source-budget.save',payload:{limit:2,sources:['الكتاب','بنك الأسئلة'],rule:'لا مصدر ثالث'}},
    {type:'session.complete',payload:{id:'session-smoke',minutes:18,focusScore:4,mission:'إنهاء الواجب المترابط',finishedAt:`${studyDate}T10:00:00.000Z`}},
    {type:'error.save',payload:{id:'error-smoke',subject:'رياضيات',error:'خطأ إشارة',fix:'أراجع الإشارة قبل التعويض'}}
  ]};
  const studyTx = await request('/api/study/transactions', { method:'POST', headers:{'Content-Type':'application/json', Cookie:cookie, 'Idempotency-Key':studyIdempotency}, body:JSON.stringify(studyPayload) });
  if(!studyTx.res.ok || studyTx.json.overview?.loop?.done !== 3 || studyTx.json.overview?.continuation?.entityId !== 'hw-smoke' || studyTx.json.overview?.focus?.minutes !== 18) throw new Error('STUDY_TRANSACTION_FAILED:'+JSON.stringify(studyTx.json));
  syncRevision = studyTx.json.revision;
  const repeatedStudyTx = await request('/api/study/transactions', { method:'POST', headers:{'Content-Type':'application/json', Cookie:cookie, 'Idempotency-Key':studyIdempotency}, body:JSON.stringify(studyPayload) });
  if(!repeatedStudyTx.res.ok || repeatedStudyTx.json.revision !== studyTx.json.revision || repeatedStudyTx.json.overview?.focus?.sessions !== 1) throw new Error('STUDY_TRANSACTION_IDEMPOTENCY_FAILED');
  const studyOverview = await request(`/api/study/overview?date=${studyDate}&timezoneOffsetMinutes=0`, { headers:{Cookie:cookie} });
  if(!studyOverview.res.ok || studyOverview.json.overview?.mission?.text !== 'إنهاء الواجب المترابط' || studyOverview.json.overview?.counts?.todayErrors !== 1) throw new Error('STUDY_OVERVIEW_FAILED');

  const createdCalendar = await request('/api/calendar/events', { method:'POST', headers:{'Content-Type':'application/json', Cookie:cookie}, body:JSON.stringify({title:'امتحان دخان', type:'exam', date:'2026-08-01', time:'09:30', duration:90, track:'academic', subject:'Science', notes:'server calendar', reminder:'day-before'}) });
  if(createdCalendar.res.status !== 201 || createdCalendar.json.event?.title !== 'امتحان دخان') throw new Error('CALENDAR_CREATE_FAILED');
  const calendarId = createdCalendar.json.event.id;
  const updatedCalendar = await request('/api/calendar/events/' + encodeURIComponent(calendarId), { method:'PATCH', headers:{'Content-Type':'application/json', Cookie:cookie}, body:JSON.stringify({title:'امتحان معدل', date:'2026-08-02'}) });
  if(!updatedCalendar.res.ok || updatedCalendar.json.event?.title !== 'امتحان معدل') throw new Error('CALENDAR_UPDATE_FAILED');
  const listedCalendar = await request('/api/calendar/events', { headers:{Cookie:cookie} });
  if(!listedCalendar.res.ok || !listedCalendar.json.events?.some(ev=>ev.id===calendarId)) throw new Error('CALENDAR_LIST_FAILED');
  const rangedCalendar = await request('/api/calendar/events?start=2026-08-02&end=2026-08-02&type=exam', { headers:{Cookie:cookie} });
  if(!rangedCalendar.res.ok || !rangedCalendar.json.events?.some(ev=>ev.id===calendarId) || !rangedCalendar.json.sync) throw new Error('CALENDAR_RANGE_FILTER_FAILED');
  const readCalendar = await request('/api/calendar/events/' + encodeURIComponent(calendarId), { headers:{Cookie:cookie} });
  if(!readCalendar.res.ok || readCalendar.json.event?.id !== calendarId) throw new Error('CALENDAR_READ_FAILED');
  const badCalendarRange = await request('/api/calendar/events', { method:'POST', headers:{'Content-Type':'application/json', Cookie:cookie}, body:JSON.stringify({title:'Bad calendar range', start_time:'2026-08-02T10:00:00.000Z', end_time:'2026-08-02T09:00:00.000Z'}) });
  if(badCalendarRange.res.status !== 400 || badCalendarRange.json.error !== 'INVALID_CALENDAR_RANGE') throw new Error('CALENDAR_RANGE_GUARD_FAILED');
  const reminderStart = new Date(Date.now() + 5 * 60_000).toISOString();
  const reminderEnd = new Date(Date.now() + 35 * 60_000).toISOString();
  const dueCalendar = await request('/api/calendar/events', { method:'POST', headers:{'Content-Type':'application/json', Cookie:cookie}, body:JSON.stringify({title:'تذكير دخان مستحق', type:'reminder', start_time:reminderStart, end_time:reminderEnd, timezone:'Asia/Amman', reminder_minutes:10}) });
  if(dueCalendar.res.status !== 201) throw new Error('DUE_CALENDAR_CREATE_FAILED:'+JSON.stringify(dueCalendar.json));
  const reminderRun = await request('/api/calendar/reminders/dispatch', { method:'POST', headers:{'Content-Type':'application/json', Cookie:cookie}, body:'{}' });
  if(!reminderRun.res.ok || reminderRun.json.dispatched < 1 || reminderRun.json.outboxSize < 1) throw new Error('CALENDAR_REMINDER_DISPATCH_FAILED:'+JSON.stringify(reminderRun.json));
  const googleCalendarStatus = await request('/api/integrations/google-calendar/status', { headers:{Cookie:cookie} });
  if(!googleCalendarStatus.res.ok || !googleCalendarStatus.json.scopes?.includes('https://www.googleapis.com/auth/calendar.events')) throw new Error('GOOGLE_CALENDAR_STATUS_FAILED');
  const googleCalendarConnect = await request('/api/integrations/google-calendar/connect', { headers:{Cookie:cookie} });
  if(!googleCalendarConnect.res.ok || !googleCalendarConnect.json.authUrl) throw new Error('GOOGLE_CALENDAR_CONNECT_URL_FAILED');
  const googleAuthUrl = new URL(googleCalendarConnect.json.authUrl);
  if(googleAuthUrl.searchParams.get('access_type') !== 'offline' || googleAuthUrl.searchParams.get('code_challenge_method') !== 'S256' || !String(googleAuthUrl.searchParams.get('scope')||'').includes('calendar.events')) throw new Error('GOOGLE_CALENDAR_OAUTH_SECURITY_FAILED');
  const googleCalendarSync = await request('/api/integrations/google-calendar/sync', { method:'POST', headers:{'Content-Type':'application/json', Cookie:cookie}, body:JSON.stringify({direction:'two-way'}) });
  if(googleCalendarSync.res.status !== 409 || googleCalendarSync.json.error !== 'GOOGLE_CALENDAR_NOT_CONNECTED') throw new Error('GOOGLE_CALENDAR_CONNECTION_GUARD_FAILED');
  const deletedCalendar = await request('/api/calendar/events/' + encodeURIComponent(calendarId), { method:'DELETE', headers:{Cookie:cookie} });
  if(!deletedCalendar.res.ok || deletedCalendar.json.events?.some(ev=>ev.id===calendarId)) throw new Error('CALENDAR_DELETE_FAILED');

  const latestBeforeConflict = await request('/api/sync/snapshot', { headers:{Cookie:cookie} });
  if(!latestBeforeConflict.res.ok || !latestBeforeConflict.json.snapshot?.revision) throw new Error('LATEST_SNAPSHOT_REVISION_MISSING');
  syncRevision = latestBeforeConflict.json.snapshot.revision;
  const stalePut = await request('/api/sync/snapshot', { method:'PUT', headers:{'Content-Type':'application/json', Cookie:cookie}, body:JSON.stringify({baseRevision:'sha256:stale-client-revision', keys:{'dashboard:notes':'merge conflict probe'}, mode:'merge'}) });
  if(stalePut.res.status !== 409 || stalePut.json.error !== 'SYNC_CONFLICT' || stalePut.json.currentRevision !== syncRevision) throw new Error('SYNC_CONFLICT_REJECTION_FAILED');

  const missingPrecondition = await request('/api/sync/snapshot', { method:'PUT', headers:{'Content-Type':'application/json', Cookie:cookie}, body:JSON.stringify({keys:{'dashboard:notes':'missing precondition'}, mode:'merge'}) });
  if(missingPrecondition.res.status !== 428 || missingPrecondition.json.error !== 'PRECONDITION_REQUIRED') throw new Error('SYNC_PRECONDITION_REQUIRED_FAILED');

  const badPut = await request('/api/sync/snapshot', { method:'PUT', headers:{'Content-Type':'application/json', Cookie:cookie}, body:JSON.stringify({baseRevision:syncRevision,keys:{'admin:pinHash':'bad','security:events':[{'id':'s1'}],'profile.guest.notebook:notes':[{id:'n2',title:'remote',body:'ok'}]}, mode:'merge'}) });
  if(!badPut.res.ok) throw new Error('FILTER_SYNC_PUT_FAILED');
  syncRevision = badPut.json.snapshot.revision;
  if(badPut.json.snapshot?.keys?.['admin:pinHash'] || badPut.json.snapshot?.keys?.['security:events']) throw new Error('SYNC_FILTER_FAILED');
  const schemaPut = await request('/api/sync/snapshot', { method:'PUT', headers:{'Content-Type':'application/json', Cookie:cookie}, body:JSON.stringify({baseRevision:syncRevision,keys:{'profile.guest.problems':[{'id':'bad|id','title':'<img src=x onerror=alert(1)>','details':'ok','privacy':'not-valid','status':'bad-status','ownerUserId':'<bad>'}]}, mode:'merge'}) });
  if(!schemaPut.res.ok) throw new Error('SCHEMA_SYNC_PUT_FAILED');
  syncRevision = schemaPut.json.snapshot.revision;
  const problem = schemaPut.json.snapshot?.keys?.['profile.guest.problems']?.[0];
  if(!problem || problem.privacy !== 'anonymous' || problem.status !== 'جديدة' || /[<>|]/.test(problem.id + problem.title)) throw new Error('SERVER_SCHEMA_VALIDATION_FAILED');
  const pagedProblems = await request('/api/admin/problems?page=1&limit=1&status=' + encodeURIComponent('جديدة'), { headers:{Cookie:cookie} });
  if(!pagedProblems.res.ok || pagedProblems.json.problems?.length !== 1 || pagedProblems.json.pagination?.total < 1 || pagedProblems.json.pagination?.limit !== 1) throw new Error('ADMIN_PROBLEM_PAGINATION_FAILED');

  const exported = await request('/api/account/export', { headers:{Cookie:cookie} });
  if(!exported.res.ok || exported.json.appVersion !== '16.0.1' || exported.json.snapshot?.keys?.['notebook:notes']?.[0]?.body?.length !== longText.length) throw new Error('ACCOUNT_EXPORT_FAILED');
  const backup = await request('/api/admin/backup', { headers:{Cookie:cookie} });
  if(!backup.res.ok || backup.json.backup?.appVersion !== '16.0.1' || backup.json.backup?.db?.sessions) throw new Error('ADMIN_BACKUP_FAILED');

  const userId = signup.json.user.id;
  const downgrade = await request('/api/admin/users/' + encodeURIComponent(userId), { method:'PATCH', headers:{'Content-Type':'application/json', Cookie:cookie}, body:JSON.stringify({role:'student'}) });
  if(downgrade.res.status !== 409 || downgrade.json.error !== 'LAST_ADMIN_REQUIRED') throw new Error('LAST_ADMIN_GUARD_FAILED');

  const studentSignup = await request('/api/auth/signup', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:'Smoke Student', email:'student@example.test', password:'StrongPass123!', phone:'0790000001', track:'academic', specialization:'it', grade:'tawjihi', privacyAccepted:true,ageConfirmed:true}) });
  if(studentSignup.res.status !== 201 || studentSignup.json.user?.role !== 'student') throw new Error('STUDENT_SIGNUP_FAILED');
  let studentCookie = cookieFrom(studentSignup.res);
  const studentVerifyToken = new URL(studentSignup.json.verification.devVerificationUrl).searchParams.get('token');
  const studentVerified = await request('/api/auth/verify-email/confirm', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({token:studentVerifyToken}) });
  if(!studentVerified.res.ok) throw new Error('STUDENT_EMAIL_VERIFICATION_FAILED');
  const studentSupport = await request('/api/support/tickets', { method:'POST', headers:{'Content-Type':'application/json', Cookie:studentCookie}, body:JSON.stringify({category:'account', priority:'normal', title:'طلب سيحذف مع الحساب', details:'يجب حذف هذا الطلب تلقائياً عند حذف حساب الطالب بالكامل.', consent:true}) });
  if(studentSupport.res.status !== 201 || !studentSupport.json.ticket?.id) throw new Error('STUDENT_SUPPORT_BEFORE_DELETE_FAILED');
  const studentSupportId = studentSupport.json.ticket.id;
  const sessions = await request('/api/account/sessions', { headers:{Cookie:studentCookie} });
  if(!sessions.res.ok || !sessions.json.sessions?.some(s=>s.current)) throw new Error('SESSIONS_LIST_FAILED');
  const badDelete = await request('/api/account', { method:'DELETE', headers:{'Content-Type':'application/json', Cookie:studentCookie}, body:JSON.stringify({password:'WrongPassword123!'}) });
  if(badDelete.res.status !== 401 || badDelete.json.error !== 'INVALID_PASSWORD') throw new Error('ACCOUNT_DELETE_PASSWORD_GUARD_FAILED');
  const deleted = await request('/api/account', { method:'DELETE', headers:{'Content-Type':'application/json', Cookie:studentCookie}, body:JSON.stringify({password:'StrongPass123!'}) });
  if(!deleted.res.ok) throw new Error('ACCOUNT_DELETE_FAILED');
  const supportAfterAccountDelete = await request('/api/admin/problems?q=' + encodeURIComponent(studentSupportId), { headers:{Cookie:cookie} });
  if(!supportAfterAccountDelete.res.ok || supportAfterAccountDelete.json.problems?.some(problem=>problem.id===studentSupportId)) throw new Error('ACCOUNT_DELETE_SUPPORT_RETENTION_FAILED');

  const studentSignup2 = await request('/api/auth/signup', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:'Smoke Student 2', email:'student2@example.test', password:'StrongPass123!', phone:'0790000002', track:'btec', specialization:'business-admin', grade:'tawjihi', privacyAccepted:true,ageConfirmed:true}) });
  if(studentSignup2.res.status !== 201 || studentSignup2.json.user?.role !== 'student') throw new Error('STUDENT2_SIGNUP_FAILED');
  studentCookie = cookieFrom(studentSignup2.res);
  const pagedUsers = await request('/api/admin/users?page=1&limit=1&q=smoke', { headers:{Cookie:cookie} });
  if(!pagedUsers.res.ok || pagedUsers.json.users?.length !== 1 || pagedUsers.json.pagination?.total < 2 || pagedUsers.json.pagination?.limit !== 1) throw new Error('ADMIN_USER_PAGINATION_FAILED');
  for(let i=0;i<4;i++){
    const failedLogin = await request('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:'student2@example.test', password:'WrongPass123!'}) });
    if(failedLogin.res.status !== 401 || failedLogin.json.error !== 'INVALID_LOGIN') throw new Error('LOGIN_FAILURE_TRACKING_FAILED');
  }
  const lockedLogin = await request('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:'student2@example.test', password:'WrongPass123!'}) });
  if(lockedLogin.res.status !== 429 || lockedLogin.json.error !== 'LOGIN_THROTTLED' || !lockedLogin.res.headers.get('retry-after')) throw new Error('LOGIN_SOURCE_THROTTLE_NOT_ENFORCED');
  const securityStatus = await request('/api/admin/security-status', { headers:{Cookie:cookie} });
  if(!securityStatus.res.ok || securityStatus.json.status?.sessionIdleMinutes !== 30 || !securityStatus.json.status?.rateLimits) throw new Error('SECURITY_STATUS_FAILED');
  const securityEvents = await request('/api/admin/security-events', { headers:{Cookie:cookie} });
  if(!securityEvents.res.ok || !securityEvents.json.events?.some(ev=>ev.type === 'login-throttled')) throw new Error('SECURITY_EVENTS_FAILED');

  const maintenanceOn = await request('/api/admin/settings', { method:'PATCH', headers:{'Content-Type':'application/json', Cookie:cookie}, body:JSON.stringify({maintenance:true}) });
  if(!maintenanceOn.res.ok || maintenanceOn.json.settings?.maintenance !== true) throw new Error('MAINTENANCE_ENABLE_FAILED');
  const blocked = await request('/api/sync/snapshot', { headers:{Cookie:studentCookie} });
  if(blocked.res.status !== 503 || blocked.json.error !== 'MAINTENANCE_MODE') throw new Error('MAINTENANCE_GUARD_FAILED');
  const adminStillWorks = await request('/api/admin/overview', { headers:{Cookie:cookie} });
  if(!adminStillWorks.res.ok) throw new Error('MAINTENANCE_BLOCKED_ADMIN');
  const maintenanceOff = await request('/api/admin/settings', { method:'PATCH', headers:{'Content-Type':'application/json', Cookie:cookie}, body:JSON.stringify({maintenance:false}) });
  if(!maintenanceOff.res.ok || maintenanceOff.json.settings?.maintenance !== false) throw new Error('MAINTENANCE_DISABLE_FAILED');
  const adminMetrics = await request('/api/admin/metrics', { headers:{Cookie:cookie} });
  if(!adminMetrics.res.ok || adminMetrics.json.metrics?.totalRequests < 10 || !adminMetrics.json.metrics?.latencyMs || !adminMetrics.json.metrics?.eventLoopLagMs || !adminMetrics.json.routes?.some(route=>route.id==='admin.metrics') || !Array.isArray(adminMetrics.json.metrics?.recent)) throw new Error('ADMIN_RUNTIME_METRICS_FAILED');
  if(!Number.isFinite(adminMetrics.json.operations?.score) || !Array.isArray(adminMetrics.json.operations?.checks) || adminMetrics.json.operations?.rateLimiter?.mode!==(sqliteAvailable?'sqlite-durable':'in-memory')) throw new Error('OPERATIONS_PULSE_FAILED');
  const openMetrics = await fetch(base + '/api/health/metrics', { headers:{Cookie:cookie} });
  const openMetricsText = await openMetrics.text();
  if(!openMetrics.ok || !String(openMetrics.headers.get('content-type')||'').includes('version=0.0.4') || !openMetricsText.includes('bawsala_operational_score') || !openMetricsText.includes('bawsala_event_loop_lag_ms')) throw new Error('OPENMETRICS_ENDPOINT_FAILED');
  const hiddenMetrics = await fetch(base + '/api/health/metrics');
  if(hiddenMetrics.status !== 404) throw new Error('OPENMETRICS_ACCESS_GUARD_FAILED');

  const resetDone = await request('/api/auth/password-reset/confirm', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({token:resetReuseToken, newPassword:'NewStrongPass456!'}) });
  if(!resetDone.res.ok || resetDone.json.user?.hasPassword !== true) throw new Error('PASSWORD_RESET_CONFIRM_FAILED');
  const oldSessionBlocked = await request('/api/account/sessions', { headers:{Cookie:cookie} });
  if(oldSessionBlocked.res.status !== 401) throw new Error('PASSWORD_RESET_DID_NOT_REVOKE_SESSIONS');
  const oldPasswordLogin = await request('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:'smoke@example.test', password:'StrongPass123!'}) });
  if(oldPasswordLogin.res.status !== 401) throw new Error('OLD_PASSWORD_STILL_WORKS_AFTER_RESET');
  const newPasswordLogin = await request('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:'smoke@example.test', password:'NewStrongPass456!', mfaCode:totp(mfaSecret)}) });
  if(!newPasswordLogin.res.ok || newPasswordLogin.json.user?.emailVerified !== true) throw new Error('NEW_PASSWORD_LOGIN_FAILED');

  console.log('OK: server smoke test passed.');
}
async function stopChild(){
  if(providerServer) await new Promise(resolve=>providerServer.close(()=>resolve()));
  if(!child)return;
  if(child.exitCode===null){
    child.kill('SIGTERM');
    await Promise.race([new Promise(resolve=>child.once('exit',resolve)),new Promise(resolve=>setTimeout(resolve,1000))]);
  }
  if(child.exitCode===null){
    child.kill('SIGKILL');
    await Promise.race([new Promise(resolve=>child.once('exit',resolve)),new Promise(resolve=>setTimeout(resolve,1000))]);
  }
  child.stdout?.destroy?.();
  child.stderr?.destroy?.();
}
try{
  await main();
} finally {
  await stopChild();
  fs.rmSync(smokeDataDir, { recursive: true, force: true });
}
process.exit(0);
