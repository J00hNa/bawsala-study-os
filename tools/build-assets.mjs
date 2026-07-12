import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

const root=process.cwd();
const outputDir=path.join(root,'assets','dist');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const VERSION=String(pkg.version||'0.0.0');
const staticPolicy=JSON.parse(fs.readFileSync(path.join(root,'config','static-policy.json'),'utf8'));
const cssSources=['app.css'].map(file=>`assets/css/${file}`);
const coreSources=[
  'data.js','security.js','backend-client.js','storage.js','study-loop.js','focus-timer.js','study-service.js','api.js','ui.js','auth-status.js','monitoring.js','search.js','pwa.js','onboarding-gate.js'
].map(file=>`assets/js/${file}`);
const enhancementSources=['command-center.js','frontend-v20.js','i18n.js','frontend-v21.js','frontend-runtime-v22.js'].map(file=>`assets/js/${file}`);

function read(relative){
  const absolute=path.join(root,relative);
  if(!fs.existsSync(absolute))throw new Error(`Missing build source: ${relative}`);
  return fs.readFileSync(absolute,'utf8').replace(/^\uFEFF/,'');
}
function bundle(sources,kind){
  const separator=kind==='css'?'\n\n':'\n;\n';
  return sources.map(relative=>`/* ===== ${relative} ===== */\n${read(relative).trim()}\n`).join(separator)+'\n';
}
function digest(buffer){return crypto.createHash('sha256').update(buffer).digest('hex');}
function write(name,content){
  fs.mkdirSync(outputDir,{recursive:true});
  const target=path.join(outputDir,name);
  const data=Buffer.from(content);
  fs.writeFileSync(target,data);
  const gzip=zlib.gzipSync(data,{level:9});
  const brotli=zlib.brotliCompressSync(data,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:6}});
  fs.writeFileSync(target+'.gz',gzip);
  fs.writeFileSync(target+'.br',brotli);
  return {
    file:path.relative(root,target).replaceAll('\\','/'),
    bytes:data.length,
    gzipBytes:gzip.length,
    brotliBytes:brotli.length,
    sha256:digest(data)
  };
}
function versionAssetReferences(){
  const htmlFiles=['index.html',...fs.readdirSync(path.join(root,'pages')).filter(name=>name.endsWith('.html')).map(name=>`pages/${name}`)];
  const pattern=/((?:\.\.\/|\.\/)?assets\/(?:dist|js|img)\/[^"'?]+\.(?:css|js|png|jpg|jpeg|svg|webp))(?:\?v=[^"']*)?/g;
  for(const relative of htmlFiles){
    const target=path.join(root,relative);
    const source=fs.readFileSync(target,'utf8');
    const next=source.replace(pattern,`$1?v=${VERSION}`);
    if(next!==source)fs.writeFileSync(target,next);
  }
}
function syncRuntimeMetadata(){
  const swPath=path.join(root,'service-worker.js');
  let sw=fs.readFileSync(swPath,'utf8');
  sw=sw
    .replace(/const BUILD_VERSION='[^']+';/,`const BUILD_VERSION='${VERSION}';`)
    .replace(/const PRIVATE_PATHS=\[[^;]*\];/,`const PRIVATE_PATHS=${JSON.stringify(staticPolicy.privateCachePaths||[])};`)
    .replace(/'\.\/assets\/img\/logo\.svg(?:\?v=[^']*)?','\.\/assets\/img\/icon-192\.png(?:\?v=[^']*)?','\.\/assets\/img\/icon-512\.png(?:\?v=[^']*)?'/,
      `'./assets/img/logo.svg?v=${VERSION}','./assets/img/icon-192.png?v=${VERSION}','./assets/img/icon-512.png?v=${VERSION}'`);
  fs.writeFileSync(swPath,sw);

  const pwaPath=path.join(root,'assets','js','pwa.js');
  let pwa=fs.readFileSync(pwaPath,'utf8').replace(/const BUILD_VERSION='[^']+';/,`const BUILD_VERSION='${VERSION}';`);
  fs.writeFileSync(pwaPath,pwa);

  const manifestPath=path.join(root,'manifest.webmanifest');
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  manifest.name=`Bawsala Study OS v${VERSION}`;
  manifest.start_url=`./index.html?v=${VERSION}`;
  manifest.dir='rtl';
  for(const icon of manifest.icons||[]) icon.src=String(icon.src||'').split('?')[0]+`?v=${VERSION}`;
  for(const shortcut of manifest.shortcuts||[]) for(const icon of shortcut.icons||[]) icon.src=String(icon.src||'').split('?')[0]+`?v=${VERSION}`;
  fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
}

syncRuntimeMetadata();

const outputs=[
  write('bawsala-pixel.css',bundle(cssSources,'css')),
  write('bawsala-core.js',bundle(coreSources,'js')),
  write('bawsala-enhancements.js',bundle(enhancementSources,'js'))
];
versionAssetReferences();
fs.writeFileSync(path.join(outputDir,'build-manifest.json'),JSON.stringify({version:VERSION,generatedAt:new Date().toISOString(),cssSources,coreSources,enhancementSources,outputs},null,2)+'\n');
console.log('OK: deterministic asset bundles and precompressed variants built.');
for(const item of outputs)console.log(`- ${item.file}: ${item.bytes} bytes, br:${item.brotliBytes}, gzip:${item.gzipBytes}, sha256:${item.sha256.slice(0,16)}`);
