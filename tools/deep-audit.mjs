import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
let failed = false;
const errors = [];
function fail(message){ failed = true; errors.push(message); }
function read(file){ return fs.readFileSync(path.join(root, file), 'utf8'); }

const textExtensions = new Set(['.js','.mjs','.cjs','.json','.html','.css','.md','.txt','.webmanifest','.yml','.yaml','.example']);
function walk(dir){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(['node_modules','data','.git'].includes(entry.name)) continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) out.push(...walk(full)); else out.push(full);
  }
  return out;
}
const files=walk(root);
for(const file of files){
  const ext=path.extname(file);
  if(!textExtensions.has(ext) && path.basename(file)!=='.gitignore' && path.basename(file)!=='_headers') continue;
  const source=fs.readFileSync(file,'utf8');
  for(let index=0;index<source.length;index+=1){
    const code=source.charCodeAt(index);
    if(code < 32 && ![9,10,13].includes(code)){
      fail(`Control character U+${code.toString(16).padStart(4,'0')} in ${path.relative(root,file)} at offset ${index}`);
      break;
    }
  }
}

const htmlFiles=[path.join(root,'index.html'),...fs.readdirSync(path.join(root,'pages')).filter(name=>name.endsWith('.html')).map(name=>path.join(root,'pages',name))];
for(const file of htmlFiles){
  const source=fs.readFileSync(file,'utf8');
  const rel=path.relative(root,file);
  const css=(source.match(/assets\/dist\/bawsala-pixel\.css/g)||[]).length;
  const core=(source.match(/assets\/dist\/bawsala-core\.js/g)||[]).length;
  const enhancements=(source.match(/assets\/dist\/bawsala-enhancements\.js/g)||[]).length;
  if(css!==1 || core!==1 || enhancements!==1) fail(`${rel} must load exactly one CSS, core JS, and enhancement JS bundle.`);
  if(/assets\/css\//.test(source)) fail(`${rel} still loads a raw CSS layer.`);
  const corePos=source.indexOf('bawsala-core.js');
  const enhancementPos=source.indexOf('bawsala-enhancements.js');
  if(corePos<0 || enhancementPos<corePos) fail(`${rel} loads enhancement code before core code.`);
  for(const match of source.matchAll(/(?:href|src)=["']([^"']+)["']/g)){
    const ref=match[1].split('#')[0].split('?')[0];
    if(!ref || /^(?:https?:|mailto:|tel:|data:)/i.test(ref)) continue;
    const target=path.resolve(path.dirname(file),ref);
    if(!fs.existsSync(target)) fail(`Broken local reference ${match[1]} in ${rel}`);
  }
}

const manifest=JSON.parse(read('assets/dist/build-manifest.json'));
for(const output of manifest.outputs||[]){
  const source=fs.readFileSync(path.join(root,output.file));
  const hash=crypto.createHash('sha256').update(source).digest('hex');
  if(hash!==output.sha256) fail(`Bundle hash mismatch for ${output.file}; run npm run build.`);
}

const sw=read('service-worker.js');
for(const asset of ['bawsala-pixel.css','bawsala-core.js','bawsala-enhancements.js']){
  if(!sw.includes(asset)) fail(`Service worker does not cache ${asset}.`);
}
if(/networkFirst\(request, '\.\/index\.html'\)\s*:\s*cacheFirst/.test(sw)) fail('Service worker still uses index.html as an asset fallback.');
if(!/request\.mode\s*===\s*['"]navigate['"]/.test(sw) || !/navigationResponse\(event\)/.test(sw) || !/networkFirst\(request\)/.test(sw)) fail('Service worker does not separate navigation fallback from asset fallback.');

const server=read('server.js');
for(const marker of ['networkSecurity.ipMatchesAllowlist','networkSecurity.safeEqualSecret','adminCount() === 0','PUBLIC_BASE_URL_NOT_CONFIGURED','ABSOLUTE_FORM_URL_NOT_ALLOWED','configuredExternalUrl']){
  if(!server.includes(marker)) fail(`Server hardening marker missing: ${marker}`);
}
if(server.includes("value.startsWith(rule.split('/')[0]")) fail('Unsafe pseudo-CIDR matching remains in server.js.');
if(/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(server)) fail('server.js contains hidden control characters.');

const backend=read('assets/js/backend-client.js');
if(!backend.includes("data.error==='BAD_CSRF'") || !backend.includes('retryState={csrf:false')) fail('Frontend CSRF refresh-and-retry guard is missing.');

const staticHeaders=read('_headers');
for(const marker of ['Content-Security-Policy','Cross-Origin-Opener-Policy','Cross-Origin-Resource-Policy','Permissions-Policy']){
  if(!staticHeaders.includes(marker) || !server.includes(marker)) fail(`Security-header parity missing ${marker}.`);
}
if(staticHeaders.includes("'unsafe-inline'") || server.includes("'unsafe-inline'")) fail('CSP must not allow unsafe-inline.');
if(fs.existsSync(path.join(root,'vercel.json'))) fail('Misleading Vercel deployment configuration must not ship with the stateful server.');
for(const marker of ['serveSecurityTxt','/.well-known/security.txt','Preferred-Languages: ar, en']) if(!server.includes(marker)) fail(`Dynamic security.txt marker missing: ${marker}`);

if(failed){
  for(const message of errors) console.error('Deep audit failed:',message);
  process.exit(1);
}
console.log(`OK: deep audit passed (${htmlFiles.length} pages, ${files.length} repository files checked).`);
