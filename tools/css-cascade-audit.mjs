import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();let failed=false;
const fail=message=>{failed=true;console.error('CSS AUDIT FAIL:',message);};
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const pages=[path.join(root,'index.html'),...fs.readdirSync(path.join(root,'pages')).filter(name=>name.endsWith('.html')).map(name=>path.join(root,'pages',name))];
for(const file of pages){const source=fs.readFileSync(file,'utf8');if((source.match(/bawsala-pixel\.css/g)||[]).length!==1)fail(`${path.relative(root,file)} must load one CSS bundle`);if(/assets\/css\//.test(source))fail(`${path.relative(root,file)} loads a source stylesheet`);}
const manifest=JSON.parse(read('assets/dist/build-manifest.json'));
if(JSON.stringify(manifest.cssSources)!==JSON.stringify(['assets/css/app.css']))fail(`unexpected sources: ${(manifest.cssSources||[]).join(', ')}`);
const source=read('assets/css/app.css');const bundle=read('assets/dist/bawsala-pixel.css');
if(!bundle.includes('assets/css/app.css'))fail('bundle does not identify app.css');
const important=(source.match(/!important/g)||[]).length;if(important)fail(`${important} !important declarations remain`);
const bytes=Buffer.byteLength(source);if(bytes>70000)fail(`${bytes} source bytes exceed 70000`);
const blocks=new Map();for(const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)){const key=`${match[1].replace(/\s+/g,' ').trim()}{${match[2].replace(/\s+/g,' ').trim()}}`;if(key.length>4)blocks.set(key,(blocks.get(key)||0)+1);}
const duplicates=[...blocks.values()].reduce((sum,count)=>sum+Math.max(0,count-1),0);if(duplicates>12)fail(`${duplicates} exact duplicate rule blocks exceed 12`);
if(failed)process.exit(1);console.log(`OK: one CSS source, ${bytes} bytes, ${important} !important, ${duplicates} duplicate extras.`);
