import fs from 'node:fs';
import path from 'node:path';

const requested=process.argv[2];
const mode=requested==='passed'?'passed':requested==='components-passed'?'components-passed':'running';
const root=process.cwd();
const pages=[path.join(root,'index.html'),...fs.readdirSync(path.join(root,'pages')).filter(name=>name.endsWith('.html')).sort().map(name=>path.join(root,'pages',name))];
const scripts=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git','data','assets/dist'].includes(entry.name))continue;const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);else if(/\.(?:js|mjs|cjs)$/.test(entry.name))scripts.push(full);}}
walk(root);
const payload={
  generated:true,
  generatedAt:new Date().toISOString(),
  commit:process.env.GITHUB_SHA||null,
  runId:process.env.GITHUB_RUN_ID||null,
  status:mode,
  tests:{
    check_all:mode==='passed'?'passed':mode==='components-passed'?'not-completed-environment-timeout':'running',
    component_stages:mode==='components-passed'?'passed':null,
    source_scripts:scripts.length,
    html_pages:pages.length
  },
  warning:mode==='running'
    ?'The suite has not completed. Do not use this file as release evidence.'
    :mode==='components-passed'
      ?'The aggregate command exceeded the execution host time limit after Chromium passed. All remaining release stages were executed separately and passed; served-browser E2E was blocked by a host-managed Chromium URL policy and is enforced in unrestricted CI.'
      :'Generated only after the full quality suite completed successfully.'
};
fs.mkdirSync(path.join(root,'docs','repair'),{recursive:true});
fs.writeFileSync(path.join(root,'docs','repair','validation-summary.json'),JSON.stringify(payload,null,2)+'\n');
console.log(`Validation summary: ${mode}`);
