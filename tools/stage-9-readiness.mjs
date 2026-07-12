import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(); let failed=false;
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const fail=message=>{failed=true;console.error('Stage 9 readiness failed:',message);};
for(const [file,markers] of Object.entries({
  'README.md':['Deployment','Health and monitoring','Backup and restore','API documentation'],
  'PRODUCTION_READINESS.md':['Test evidence','Conditional GO checklist','Rollback','Known unproven evidence']
})){
  if(!fs.existsSync(path.join(root,file))){fail(`missing ${file}`);continue;}
  const text=read(file); if(text.length<3000)fail(`${file} is too thin`);
  for(const marker of markers)if(!text.includes(marker))fail(`${file} missing ${marker}`);
}
const openapi=JSON.parse(read('docs/openapi.json')); assert.equal(openapi.openapi,'3.1.0');
for(const route of ['/api/health/ready','/api/auth/login','/api/calendar/events','/api/integrations/google-calendar/connect','/api/billing/webhook','/api/admin/security-status'])if(!openapi.paths?.[route])fail(`OpenAPI missing ${route}`);
const pkg=JSON.parse(read('package.json'));
for(const script of ['test','test:unit','test:integration','test:security','test:deployment','check:all'])if(!pkg.scripts?.[script])fail(`package missing ${script}`);
if(!String(pkg.engines?.node||'').includes('22'))fail('Node 22+ engine requirement missing');
const ci=read('.github/workflows/ci.yml');
for(const marker of ['npm ci','npm run check','npm test','npm run artifact:check','npm run test:frontend','npm run test:integration','npm run test:security','npm audit --audit-level=high --omit=dev','docker build'])if(!ci.includes(marker))fail(`CI missing ${marker}`);
const env=read('.env.example');
for(const marker of ['BAWSALA_DATA_DIR','BAWSALA_STORAGE=sqlite','BAWSALA_OAUTH_ENCRYPTION_KEY','BAWSALA_STRIPE_SECRET_KEY','BAWSALA_HEALTH_DETAILS_TOKEN','BAWSALA_BACKUP_UPLOAD_URL','BAWSALA_BACKUP_ENCRYPTION_KEY','TRUST_PROXY'])if(!env.includes(marker))fail(`.env.example missing ${marker}`);
if(failed)process.exit(1); console.log('OK: Stage 9 testing, documentation, and deployment readiness gates passed.');
