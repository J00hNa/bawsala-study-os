import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';

const root=process.cwd();
const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'bawsala-security-'));
const port=19400+Math.floor(Math.random()*400);
const base=`http://127.0.0.1:${port}`;
const publicBase='https://trusted.example';
const setupToken='setup-token-with-at-least-32-random-characters';
let child;
let stderr='';

function setCookies(headers){
  if(typeof headers.getSetCookie==='function') return headers.getSetCookie();
  const raw=headers.get('set-cookie');
  return raw?[raw]:[];
}
function firstCookie(headers,name){
  for(const value of setCookies(headers)){
    const first=value.split(';')[0];
    if(first.startsWith(name+'=')) return first;
  }
  return '';
}
async function waitForServer(){
  const started=Date.now();
  while(Date.now()-started<7000){
    try{
      const response=await fetch(base+'/api/health/live',{headers:{'x-forwarded-proto':'https','host':'trusted.example'}});
      if(response.ok) return;
    }catch(_){/* retry */}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error(`SECURITY_SERVER_DID_NOT_START\n${stderr}`);
}
async function csrfClient(){
  const response=await fetch(base+'/api/auth/csrf',{headers:{'x-forwarded-proto':'https','host':'trusted.example'}});
  const json=await response.json();
  const cookie=firstCookie(response.headers,'bawsala_csrf');
  if(!json.csrfToken||!cookie) throw new Error('SECURITY_CSRF_PRIME_FAILED');
  return {token:json.csrfToken,cookie};
}
async function api(pathname,{method='GET',body,client,headers={}}={}){
  const requestHeaders={'Accept':'application/json','x-forwarded-proto':'https','host':'trusted.example',...headers};
  if(!['GET','HEAD','OPTIONS'].includes(method)){
    requestHeaders['Content-Type']='application/json';
    requestHeaders['X-Bawsala-Request']='1';
    requestHeaders['X-Bawsala-CSRF']=client.token;
    requestHeaders.Cookie=client.cookie;
  }
  const response=await fetch(base+pathname,{method,headers:requestHeaders,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});
  const json=await response.json().catch(()=>({}));
  return {response,json};
}
function rawAbsoluteFormRequest(){
  return new Promise((resolve,reject)=>{
    const req=http.request({host:'127.0.0.1',port,method:'GET',path:`http://evil.example/api/health`,headers:{Host:'evil.example','X-Forwarded-Proto':'https'}},res=>{
      res.resume(); res.on('end',()=>resolve(res.statusCode));
    });
    req.on('error',reject); req.end();
  });
}
function rawHostRequest(hostHeader,proto='https',pathname='/pages/dashboard.html'){
  return new Promise((resolve,reject)=>{
    const req=http.request({host:'127.0.0.1',port,method:'GET',path:pathname,headers:{Host:hostHeader,'X-Forwarded-Proto':proto}},res=>{
      const chunks=[]; res.on('data',chunk=>chunks.push(chunk)); res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString('utf8')}));
    });
    req.on('error',reject); req.end();
  });
}

try{
  child=spawn(process.execPath,['server.js'],{
    cwd:root,
    env:{...process.env,NODE_ENV:'production',PORT:String(port),TRUST_PROXY:'true',BAWSALA_DATA_DIR:dataDir,BAWSALA_STORAGE:'json',BAWSALA_PUBLIC_BASE_URL:publicBase,BAWSALA_ALLOWED_HOSTS:'trusted.example,127.0.0.1',BAWSALA_SETUP_ADMIN_TOKEN:setupToken,BAWSALA_SECURITY_PEPPER:'security-regression-pepper-32-bytes',BAWSALA_MAIL_PROVIDER:'test-console',BAWSALA_PAYMENT_PROVIDER:'stripe',BAWSALA_STRIPE_SECRET_KEY:'sk_test_not_a_real_key',BAWSALA_PAYMENT_WEBHOOK_SECRET:'webhook-test-secret',BAWSALA_PASSWORD_PEPPER:'password-regression-pepper-32-bytes',BAWSALA_TRUSTED_PROXY_IPS:'127.0.0.1,::1',BAWSALA_ENFORCE_PRODUCTION_CONFIG:'false',BAWSALA_ALLOW_ADMIN_BOOTSTRAP_HEADER:'true'},
    stdio:['ignore','pipe','pipe']
  });
  child.stderr.on('data',chunk=>{stderr+=chunk.toString();});
  await waitForServer();
  const client=await csrfClient();

  const weak=await api('/api/auth/signup',{method:'POST',client,body:{name:'Weak Password',email:'weak@example.test',password:'StrongZZZZZZ123!',phone:'0790000000',track:'academic',specialization:'it',grade:'tawjihi',privacyAccepted:true,ageConfirmed:true}});
  if(weak.response.status!==400||weak.json.error!=='WEAK_PASSWORD') throw new Error('REPEATED_PASSWORD_GUARD_FAILED');

  const first=await api('/api/auth/signup',{method:'POST',client,body:{name:'First Admin',email:'admin@example.test',password:'QuartzRiver582!',phone:'0790000001',track:'academic',specialization:'it',grade:'tawjihi',privacyAccepted:true,ageConfirmed:true},headers:{'X-Bawsala-Setup-Token':setupToken}});
  if(first.response.status!==201||first.json.user?.role!=='admin') throw new Error('FIRST_SETUP_ADMIN_FAILED');

  const sessionSetCookies=setCookies(first.response.headers);
  const hardenedSession=sessionSetCookies.find(value=>value.startsWith('__Host-bawsala_session='))||'';
  if(!hardenedSession||!/; Secure/i.test(hardenedSession)||!/; HttpOnly/i.test(hardenedSession)||!/; SameSite=Strict/i.test(hardenedSession)||!/; Path=\//i.test(hardenedSession)||/; Domain=/i.test(hardenedSession)) throw new Error('HOST_PREFIXED_SESSION_COOKIE_GUARD_FAILED');

  const second=await api('/api/auth/signup',{method:'POST',client,body:{name:'Second User',email:'student@example.test',password:'MangoOrbit741!',phone:'0790000002',track:'academic',specialization:'it',grade:'tawjihi',privacyAccepted:true,ageConfirmed:true},headers:{'X-Bawsala-Setup-Token':setupToken}});
  if(second.response.status!==201||second.json.user?.role!=='student') throw new Error('SETUP_TOKEN_REUSE_CREATED_ADMIN');

  const plans=await api('/api/billing/plans');
  if(!plans.response.ok||plans.json.provider?.configured!==false||plans.json.provider?.checkoutConfigured!==false||plans.json.provider?.providerSecretPresent!==true) throw new Error('BILLING_FALSE_READINESS_GUARD_FAILED');

  const rejectedHost=await rawHostRequest('evil.example','https');
  if(rejectedHost.status!==421) throw new Error('HOST_ALLOWLIST_GUARD_FAILED');
  const redirect=await rawHostRequest('trusted.example','http');
  if(redirect.status!==308||redirect.headers.location!==`${publicBase}/pages/dashboard.html`) throw new Error('TRUSTED_HOST_HTTPS_REDIRECT_FAILED');

  const absoluteStatus=await rawAbsoluteFormRequest();
  if(absoluteStatus!==400) throw new Error('ABSOLUTE_FORM_URL_GUARD_FAILED');

  const home=await fetch(base+'/',{headers:{'x-forwarded-proto':'https','host':'trusted.example'}});
  for(const header of ['content-security-policy','cross-origin-opener-policy','cross-origin-resource-policy','x-frame-options']) if(!home.headers.get(header)) throw new Error(`SECURITY_HEADER_MISSING_${header}`);
  const sw=await fetch(base+'/service-worker.js',{headers:{'x-forwarded-proto':'https','host':'trusted.example'}});
  if(!/no-store/i.test(sw.headers.get('cache-control')||'')) throw new Error('SERVICE_WORKER_CACHE_POLICY_FAILED');

  console.log('OK: security regression integration tests passed.');
} finally {
  if(child) child.kill('SIGTERM');
  await new Promise(resolve=>setTimeout(resolve,200));
  fs.rmSync(dataDir,{recursive:true,force:true});
}
