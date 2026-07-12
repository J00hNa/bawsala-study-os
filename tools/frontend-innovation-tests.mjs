import fs from 'node:fs';import path from 'node:path';
const root=process.cwd();let failed=false;const fail=m=>{failed=true;console.error('FRONTEND FEATURE FAIL:',m);};const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const runtime=read('assets/js/frontend-v21.js');const css=read('assets/css/app.css');const commands=read('assets/js/command-center.js');
for(const marker of ['mountQuickCapture','openQuickCapture','saveCapture','cleanMultiline','deleteFromCollection','data-capture-undo','mountStudyRail','studySnapshot','mountPageCompass','collectSections','mountReadingProgress','role="progressbar"'])if(!runtime.includes(marker))fail(`runtime missing ${marker}`);
for(const marker of ['.study-context-rail','.quick-capture','.capture-action-toast','.page-reading-progress','.page-compass','.mobile-dock__capture'])if(!css.includes(marker))fail(`app.css missing ${marker}`);
if(!commands.includes("id:'quick-capture'")||!commands.includes("id:'page-compass'"))fail('command center misses capture or compass actions');
if(failed)process.exit(1);console.log('OK: supporting capture, context, compass, and reading-progress features remain available outside the primary loop.');
