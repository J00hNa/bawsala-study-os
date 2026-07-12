import fs from 'node:fs';import path from 'node:path';
const root=process.cwd();let failed=false;const fail=m=>{failed=true;console.error('QUALITY GATE FAIL:',m);};const exists=f=>fs.existsSync(path.join(root,f));const read=f=>fs.readFileSync(path.join(root,f),'utf8');const contains=(f,m)=>{if(!exists(f)||!read(f).includes(m))fail(`${f} missing ${m}`);};
function walk(dir,out=[]){for(const name of fs.readdirSync(dir)){if(['node_modules','.git','data'].includes(name))continue;const full=path.join(dir,name),stat=fs.statSync(full);if(stat.isDirectory())walk(full,out);else out.push(full);}return out;}
const markdown=walk(root).filter(f=>f.endsWith('.md')).map(f=>path.relative(root,f).replaceAll('\\','/')).sort();const requiredRootMarkdown=['PRODUCTION_READINESS.md','README.md'];for(const file of requiredRootMarkdown)if(!markdown.includes(file))fail(`missing required root Markdown: ${file}`);const unexpectedMarkdown=markdown.filter(file=>!requiredRootMarkdown.includes(file)&&!file.startsWith('docs/repair/'));if(unexpectedMarkdown.length)fail(`unexpected product Markdown files: ${unexpectedMarkdown.join(', ')}`);
for(const file of ['README.md','PRODUCTION_READINESS.md','.github/workflows/ci.yml','docs/openapi.json','assets/css/app.css','assets/dist/build-manifest.json'])if(!exists(file))fail(`missing ${file}`);
for(const marker of ['Focused Daily Loop','single-instance SQLite','does not collect a full date of birth'])contains('README.md',marker);
for(const marker of ['conditional, not production-approved','Approved scope','Not approved','Conditional GO checklist','External-provider proof','Final judgment'])contains('PRODUCTION_READINESS.md',marker);
if(/Score:\s*\d+\/100|97\/100/.test(read('PRODUCTION_READINESS.md')))fail('readiness report contains numeric score');
for(const [file,markers] of Object.entries({
  'server.js':['__Host-bawsala_session','assertAllowedHost','PERSISTENCE_UNAVAILABLE','bawsala-encrypted-backup-v1','security-log-chain','SERVER_OVERLOADED'],
  'lib/state-store.js':['normalized-relational-wal','incrementalWrites: true','consumeRateLimit'],
  'assets/js/backend-client.js':['PENDING_SYNC_KEY','flushPendingSync'],
  'assets/js/frontend-v20.js':['mountMobileDock','mountPreferences','setFocusMode'],
  'assets/js/frontend-v21.js':['mountQuickCapture','mountStudyRail','mountPageCompass'],
  'assets/js/frontend-runtime-v22.js':['pendingEnhancementRoots','bootWatchdog'],
  'assets/css/app.css':['.mobile-dock','.display-preferences','.study-context-rail','.quick-capture','.app-recovery-panel','.calendar-month-grid'],
  '.github/workflows/ci.yml':['npm run test:frontend','npm run test:integration','npm run test:security','docker build']
}))for(const marker of markers)contains(file,marker);
const manifest=JSON.parse(read('assets/dist/build-manifest.json'));if(manifest.version!=='16.0.1'||JSON.stringify(manifest.cssSources)!==JSON.stringify(['assets/css/app.css']))fail('build manifest is not the v16 consolidated build');
const openapi=JSON.parse(read('docs/openapi.json'));if(Object.keys(openapi.paths||{}).length<60)fail('OpenAPI route inventory below 60 paths');
if(failed)process.exit(1);console.log('OK: product quality gates passed without self-reported scoring.');
