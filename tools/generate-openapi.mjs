import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { publicContract } = require('../lib/api-contract');

const dynamicPaths = {
  'account.sessions.revoke': '/api/account/sessions/{sessionId}',
  'calendar.event': '/api/calendar/events/{eventId}',
  'sync.key': '/api/sync/key/{key}',
  'support.ticket': '/api/support/tickets/{ticketId}',
  'admin.user': '/api/admin/users/{userId}',
  'admin.user.sessions': '/api/admin/users/{userId}/sessions',
  'admin.problem': '/api/admin/problems/{ownerId}/{problemId}'
};
const publicIds = new Set([
  'health.full','health.live','health.ready','health.storage','auth.csrf','auth.signup','auth.verify.confirm',
  'auth.password-reset.request','auth.password-reset.confirm','auth.login','auth.google.config','auth.google.start',
  'auth.google.callback','billing.plans','billing.webhook'
]);
const noCsrfMethods = new Set(['get','head','options']);
function tagFor(id){ return id.split('.')[0]; }
function parametersFor(path){
  return [...path.matchAll(/\{([^}]+)\}/g)].map(match=>({name:match[1],in:'path',required:true,schema:{type:'string',minLength:1,maxLength:180}}));
}
function securityFor(route, method){
  if(route.id==='billing.webhook') return [{stripeWebhookSignature:[]},{genericWebhookSignature:[]}];
  const needsSession=!publicIds.has(route.id);
  const needsCsrf=!noCsrfMethods.has(method);
  const item={};
  if(needsSession) item.sessionCookie=[];
  if(needsCsrf){ item.csrfHeader=[]; item.requestGuard=[]; }
  return Object.keys(item).length?[item]:[];
}
const paths={};
for(const route of publicContract()){
  const routePath=route.path || dynamicPaths[route.id];
  const openPath=dynamicPaths[route.id] || routePath;
  if(!openPath || openPath.startsWith('^')) continue;
  paths[openPath] ||= {};
  for(const rawMethod of route.methods){
    const method=rawMethod.toLowerCase();
    const operation={
      tags:[tagFor(route.id)],
      operationId:route.id.replace(/[^a-zA-Z0-9]+/g,'_')+'_'+method,
      summary:route.id,
      'x-rate-limit-category':route.category,
      security:securityFor(route,method),
      parameters:parametersFor(openPath),
      responses:{
        '200':{description:'Successful response'},
        '400':{$ref:'#/components/responses/BadRequest'},
        '401':{$ref:'#/components/responses/Unauthorized'},
        '403':{$ref:'#/components/responses/Forbidden'},
        '429':{$ref:'#/components/responses/RateLimited'},
        '500':{$ref:'#/components/responses/ServerError'}
      }
    };
    if(route.id==='auth.signup' && method==='post') operation.responses['201']={description:'Account created'};
    if(route.id==='support.tickets' && method==='post') operation.responses['201']={description:'Support ticket created'};
    if(route.id==='health.ready') operation.responses['503']={description:'Application is not ready'};
    if(route.id==='health.storage') operation.responses['404']={description:'Hidden unless an admin session or health token is supplied'};
    if(!operation.parameters.length) delete operation.parameters;
    if(!operation.security.length) delete operation.security;
    paths[openPath][method]=operation;
  }
}
const spec={
  openapi:'3.1.0',
  info:{title:'Bawsala Study Toolkit API',version:'16.0.1',description:'Implemented server route inventory. Browser mutations require the CSRF cookie/header pair and X-Bawsala-Request: 1. Detailed health data requires an admin session or X-Bawsala-Health-Token.'},
  servers:[{url:'https://your-domain.example'}],
  tags:['health','auth','account','integration','calendar','billing','study','sync','support','admin'].map(name=>({name})),
  components:{
    securitySchemes:{
      sessionCookie:{type:'apiKey',in:'cookie',name:'__Host-bawsala_session'},
      csrfHeader:{type:'apiKey',in:'header',name:'X-Bawsala-CSRF'},
      requestGuard:{type:'apiKey',in:'header',name:'X-Bawsala-Request'},
      healthToken:{type:'apiKey',in:'header',name:'X-Bawsala-Health-Token'},
      stripeWebhookSignature:{type:'apiKey',in:'header',name:'Stripe-Signature'},
      genericWebhookSignature:{type:'apiKey',in:'header',name:'X-Bawsala-Signature'}
    },
    schemas:{Error:{type:'object',properties:{ok:{type:'boolean',const:false},error:{type:'string'},message:{type:'string'},retryable:{type:'boolean'},requestId:{type:'string'}},required:['ok','error','requestId']}},
    responses:{
      BadRequest:{description:'Validation or request-shape failure',content:{'application/json':{schema:{$ref:'#/components/schemas/Error'}}}},
      Unauthorized:{description:'Authentication or signature failure',content:{'application/json':{schema:{$ref:'#/components/schemas/Error'}}}},
      Forbidden:{description:'Authorization, CSRF, origin, or policy failure',content:{'application/json':{schema:{$ref:'#/components/schemas/Error'}}}},
      RateLimited:{description:'Rate limit exceeded',headers:{'Retry-After':{schema:{type:'integer'}}},content:{'application/json':{schema:{$ref:'#/components/schemas/Error'}}}},
      ServerError:{description:'Unexpected server failure',content:{'application/json':{schema:{$ref:'#/components/schemas/Error'}}}}
    }
  },
  paths
};
fs.writeFileSync('docs/openapi.json',JSON.stringify(spec,null,2)+'\n');
console.log(`Generated OpenAPI route inventory with ${Object.keys(paths).length} paths.`);
