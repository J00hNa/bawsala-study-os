import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
let failed=false;
const fail=message=>{failed=true;console.error('CHECK FAIL:',message);};
const rel=file=>path.relative(root,file).replaceAll('\\','/');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function walk(dir,extensions,output=[]){
  for(const name of fs.readdirSync(dir)){
    if(['node_modules','.git','data'].includes(name))continue;
    const full=path.join(dir,name); const stat=fs.statSync(full);
    if(stat.isDirectory())walk(full,extensions,output);
    else if(extensions.some(ext=>name.endsWith(ext)))output.push(full);
  }
  return output;
}

const scripts=walk(root,['.js','.mjs','.cjs']).filter(file=>!rel(file).startsWith('assets/dist/'));
for(const file of scripts){
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(result.status!==0)fail(`syntax error in ${rel(file)}\n${result.stderr}`);
}

const htmlFiles=[path.join(root,'index.html'),...fs.readdirSync(path.join(root,'pages')).filter(name=>name.endsWith('.html')).sort().map(name=>path.join(root,'pages',name))];
for(const file of htmlFiles){
  const source=fs.readFileSync(file,'utf8');
  const fileRel=rel(file);
  if(!/<main\b[^>]*id=["']main["']/.test(source))fail(`${fileRel} missing <main id="main">`);
  if(!/name=["']description["'][^>]*content=["'][^"']{20,}["']/.test(source))fail(`${fileRel} missing useful description`);
  if(!/name=["']color-scheme["'][^>]*content=["']light dark["']/.test(source))fail(`${fileRel} missing color-scheme`);
  if(!/viewport-fit=cover/.test(source))fail(`${fileRel} missing safe-area viewport`);
  if(source.includes("'unsafe-inline'"))fail(`${fileRel} CSP allows unsafe-inline`);
  if((source.match(/bawsala-pixel\.css/g)||[]).length!==1)fail(`${fileRel} must load one production CSS bundle`);
  if((source.match(/bawsala-enhancements\.js/g)||[]).length!==1)fail(`${fileRel} must load one enhancement bundle`);
  if(/href=["'](?:\.\.\/|\.\/)?assets\/css\//.test(source))fail(`${fileRel} loads raw CSS directly`);
  if(/\sstyle\s*=|\son[a-z]+\s*=|javascript:/i.test(source))fail(`${fileRel} contains inline behavior or style`);
  const ids=[...source.matchAll(/\bid=["']([^"']+)["']/g)].map(match=>match[1]);
  const duplicates=[...new Set(ids.filter((id,index)=>ids.indexOf(id)!==index))];
  if(duplicates.length)fail(`${fileRel} duplicate ids: ${duplicates.join(', ')}`);
  if([...source.matchAll(/<img\b(?![^>]*\balt\s*=)[^>]*>/gi)].length)fail(`${fileRel} has image without alt`);
  if([...source.matchAll(/<button\b(?![^>]*\btype\s*=)[^>]*>/gi)].length)fail(`${fileRel} has button without explicit type`);
  for(const match of source.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)){
    const value=match[1];
    if(!value||/^(?:https?:|mailto:|tel:|data:|blob:|javascript:)/i.test(value))continue;
    const [beforeHash,hash='']=value.split('#');
    const clean=beforeHash.split('?')[0];
    const target=clean?path.normalize(path.join(path.dirname(file),clean)):file;
    if(clean&&!fs.existsSync(target)){fail(`${fileRel} broken local reference: ${value}`);continue;}
    if(hash&&target.endsWith('.html')){
      const targetSource=fs.readFileSync(target,'utf8');
      if(!new RegExp(`\\bid=["']${hash.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["']`).test(targetSource))fail(`${fileRel} broken local anchor: ${value}`);
    }
  }
}

const manifest=JSON.parse(read('assets/dist/build-manifest.json'));
if(manifest.version!=='16.0.1')fail(`build manifest version is ${manifest.version}`);
if(JSON.stringify(manifest.cssSources)!==JSON.stringify(['assets/css/app.css']))fail('production bundle must use only assets/css/app.css');
const css=read('assets/css/app.css');
if(Buffer.byteLength(css)>70000)fail(`app.css exceeds 70 KB: ${Buffer.byteLength(css)}`);
if((css.match(/!important/g)||[]).length)fail('app.css must not use !important');
for(const marker of ['.workspace-route-strip','.mobile-dock','.calendar-month-grid','.app-recovery-panel','@media (prefers-reduced-motion:reduce)'])if(!css.includes(marker))fail(`app.css missing ${marker}`);
for(const old of ['base.css','layout.css','components.css','pages.css','theme.css','design-system.css','pixel-ascii.css','frontend-v20.css','frontend-v21.css','frontend-v22.css','frontend-v23.css','frontend-v24.css'])if(fs.existsSync(path.join(root,'assets/css',old)))fail(`legacy CSS source still exists: ${old}`);

const workspace=read('pages/workspace.html');
for(const id of ['flow','mission','focus','errors','review','library'])if(!workspace.includes(`id="${id}"`))fail(`workspace missing primary route ${id}`);
const routeCount=(workspace.match(/class="workspace-route/g)||[]).length;
if(routeCount>6)fail(`workspace exposes ${routeCount} primary routes; maximum is 6`);
const signup=read('pages/signup.html');
if(!/name="phone"/.test(signup)||/name="phone"[^>]*required/.test(signup))fail('signup phone must exist and remain optional');
if(/name="dob"/.test(signup))fail('signup must not collect date of birth');
if(!/name="ageConfirmed"[^>]*required/.test(signup))fail('signup needs required 13+ confirmation');
const auth=read('assets/js/auth.js');
const server=read('server.js');
if(!auth.includes('ageConfirmed')||!server.includes('ageConfirmed'))fail('age confirmation is not enforced end to end');

const report=read('PRODUCTION_READINESS.md');
if(/Score:\s*\d+\/100|97\/100/.test(report))fail('readiness document contains a fabricated numeric score');
for(const marker of ['conditional, not production-approved','Conditional GO checklist','External-provider proof','single-instance architecture'])if(!report.toLowerCase().includes(marker.toLowerCase()))fail(`readiness document missing ${marker}`);
const community=read('pages/community.html');
if(!community.includes('مساحة الطالب المحلية')||!community.includes('ليست شبكة اجتماعية'))fail('local groups must be labeled honestly');
const schoolmind=read('pages/schoolmind.html');
if(!schoolmind.includes('أداة ذكاء اصطناعي تعليمية خارجية مستقلة')||!schoolmind.includes('لا يوجد ربط تقني'))fail('SchoolMind boundary is not explicit');

for(const marker of ['__Host-bawsala_session','assertAllowedHost','PERSISTENCE_UNAVAILABLE','bawsala-encrypted-backup-v1'])if(!server.includes(marker))fail(`server hardening marker missing ${marker}`);

if(failed)process.exit(1);
console.log(`OK: ${scripts.length} source scripts, ${htmlFiles.length} pages, focused product boundaries, privacy fields, and consolidated CSS checked.`);
