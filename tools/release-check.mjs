import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
let failed=false;
const fail=message=>{failed=true;console.error('RELEASE ARTIFACT FAIL:',message);};
const file=relative=>path.join(root,relative);
const read=relative=>fs.readFileSync(file(relative),'utf8');
const exists=relative=>fs.existsSync(file(relative));
const pkg=JSON.parse(read('package.json'));
const VERSION=String(pkg.version||'');
const contains=(relative,marker)=>{if(!exists(relative)||!read(relative).includes(marker))fail(`${relative} missing ${marker}`);};

if(!/^\d+\.\d+\.\d+$/.test(VERSION))fail(`invalid package version: ${VERSION}`);
contains('server.js',`const APP_VERSION = '${VERSION}'`);
contains('README.md',`v${VERSION}`);
contains('manifest.webmanifest',`v${VERSION}`);
contains('service-worker.js',`const BUILD_VERSION='${VERSION}'`);
contains('assets/js/pwa.js',`const BUILD_VERSION='${VERSION}'`);

const report=read('PRODUCTION_READINESS.md');
if(/Score:\s*\d+\/100|97\/100/.test(report))fail('readiness report contains a fabricated numeric score');
contains('PRODUCTION_READINESS.md','conditional, not production-approved');

const manifest=JSON.parse(read('assets/dist/build-manifest.json'));
if(manifest.version!==VERSION)fail(`bundle manifest version mismatch: ${manifest.version}`);
if(JSON.stringify(manifest.cssSources)!==JSON.stringify(['assets/css/app.css']))fail('bundle does not use only app.css');
for(const output of manifest.outputs||[]){
  if(!exists(output.file))fail(`missing bundle ${output.file}`);
  if(!exists(`${output.file}.gz`)||!exists(`${output.file}.br`))fail(`missing precompressed variants for ${output.file}`);
}

const css=read('assets/css/app.css');
if(css.includes('!important'))fail('app.css contains !important');
if(/overflow-x\s*:\s*hidden/i.test(css))fail('app.css hides horizontal overflow instead of fixing it');
const hiddenRule=css.lastIndexOf('[hidden]{display:none}');
if(hiddenRule<0||hiddenRule<css.lastIndexOf('.confirm-backdrop'))fail('[hidden] rule must be present after overlay display rules');
for(const marker of ['grid-template-columns:32px minmax(0,1fr)','overflow-wrap:anywhere','min-height:var(--tap)'])if(!css.includes(marker))fail(`critical responsive CSS marker missing: ${marker}`);

const policy=JSON.parse(read('config/static-policy.json'));
const sw=read('service-worker.js');
const swPaths=JSON.parse(sw.match(/const PRIVATE_PATHS=(\[[^;]+\]);/)?.[1]||'[]');
if(JSON.stringify(swPaths)!==JSON.stringify(policy.privateCachePaths))fail('service-worker private paths drift from config/static-policy.json');
for(const privatePath of policy.privateCachePaths||[])if(!sw.includes(privatePath))fail(`service worker missing private path ${privatePath}`);
for(const marker of ["/(?:no-store|private)/i",'response.headers.has(\'Set-Cookie\')','isPrivatePath(url.pathname)'])if(!sw.includes(marker))fail(`service worker privacy marker missing: ${marker}`);

const server=read('server.js');
for(const marker of [
  '__Host-bawsala_session','assertAllowedHost','STATIC_POLICY.authProtectedPages','PRECONDITION_REQUIRED','SYNC_CONFLICT',
  'bawsala-encrypted-backup-v1','bawsala-state-backup-v2','isPrivateOrReservedIp','serveSecurityTxt','unhandledRejection'
])if(!server.includes(marker)&&!read('lib/state-store.js').includes(marker)&&!read('lib/network-security.js').includes(marker))fail(`hardening marker missing: ${marker}`);
const backend=read('assets/js/backend-client.js');
for(const marker of ['ageConfirmed:payload.ageConfirmed===true','baseRevision:state.lastRevision','If-Match','flushPendingSync'])if(!backend.includes(marker))fail(`backend client marker missing: ${marker}`);
if(/dateOfBirth|setupToken/.test(read('pages/signup.html')))fail('public signup still contains date of birth or setup token');

const headers=read('_headers');
if(headers.includes("'unsafe-inline'"))fail('_headers CSP permits unsafe-inline');
if(exists('vercel.json'))fail('misleading stateful Vercel deployment configuration is present');
if(exists('.well-known/security.txt'))fail('stale static security.txt is present; server must generate it from the configured origin');

function walk(dir,out=[]){
  for(const name of fs.readdirSync(dir)){
    if(['node_modules','.git','data'].includes(name))continue;
    const full=path.join(dir,name),stat=fs.statSync(full);
    if(stat.isDirectory())walk(full,out);else out.push(full);
  }
  return out;
}
const files=walk(root);
const markdown=files.filter(item=>item.endsWith('.md')).map(item=>path.relative(root,item).replaceAll('\\','/')).sort();
const requiredRootMarkdown=['PRODUCTION_READINESS.md','README.md'];
for(const item of requiredRootMarkdown)if(!markdown.includes(item))fail(`missing required root Markdown: ${item}`);
const unexpectedMarkdown=markdown.filter(item=>!requiredRootMarkdown.includes(item)&&!item.startsWith('docs/repair/'));
if(unexpectedMarkdown.length)fail(`unexpected product Markdown files: ${unexpectedMarkdown.join(', ')}`);
for(const sourceFile of files.filter(item=>/\.(?:js|mjs|cjs)$/.test(item)&&!item.includes(`${path.sep}assets${path.sep}dist${path.sep}`))){
  const result=spawnSync(process.execPath,['--check',sourceFile],{encoding:'utf8'});
  if(result.status!==0)fail(`syntax error in ${path.relative(root,sourceFile)}\n${result.stderr}`);
}
for(const runtime of ['data/bawsala.sqlite','data/db.json'])if(exists(runtime))fail(`${runtime} must not ship in a release archive`);
const openapi=JSON.parse(read('docs/openapi.json'));
if(Object.keys(openapi.paths||{}).length<60)fail('OpenAPI route count below 60');

if(failed)process.exit(1);
console.log(`OK: static release artifact checks passed for v${VERSION}. Runtime release validation is executed by npm run release:check.`);
