import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
let failed = false;
function read(file){ return fs.readFileSync(path.join(root,file),'utf8'); }
function fail(message){ failed=true; console.error('Flow smoke failed:', message); }
const flows = [
  {name:'home decision to focus', html:'index.html', htmlMarkers:['homeDecisionForm','pages/workspace.html#flow','launch-assurances'], js:'assets/js/home.js', jsMarkers:['homeDecisionForm','BAWSALA_STUDY','beginContext','pages/workspace.html#focus']},
  {name:'workspace daily execution', html:'pages/workspace.html', htmlMarkers:['workspacePanel','workspaceNav'], js:'assets/js/workspace.js', jsMarkers:['seedSampleStudyDay','exportDailyJson','loopCompletion','riskPanel']},
  {name:'quick search', html:'index.html', htmlMarkers:['siteHeader'], js:'assets/js/search.js', jsMarkers:['RECENT_KEY','PageDown','aliasPack','يوم دراسي نموذجي']},
  {name:'account sync export', html:'pages/account.html', htmlMarkers:['exportServerAccountData'], js:'assets/js/account.js', jsMarkers:['syncConflictWarning','exportServerAccountData']},
  {name:'launch telemetry without overlay', html:'index.html', htmlMarkers:['bawsala-core.js'], js:'assets/js/monitoring.js', jsMarkers:['buildLaunchSnapshot','recordProductEvent','MT_PRODUCT_SUITE']},
  {name:'global command center', html:'index.html', htmlMarkers:['bawsala-enhancements.js'], js:'assets/js/command-center.js', jsMarkers:['commandCenterTrigger','Ctrl K','roleCommands','contextCommands','recentPageCommands','BAWSALA_COMMAND_CENTER']},
  {name:'offline cloud recovery', html:'pages/account.html', htmlMarkers:['bawsala-core.js'], js:'assets/js/backend-client.js', jsMarkers:['PENDING_SYNC_KEY','markPendingSync','flushPendingSync','SYNC_QUEUED_OFFLINE']},
  {name:'production pulse', html:'pages/admin.html', htmlMarkers:['serverAdminMount'], js:'assets/js/admin-server.js', jsMarkers:['Production Pulse','operationChecks','lastSaveStats','نسخة خارجية','السجل الأمني']},
  {name:'quick capture and study context', html:'pages/dashboard.html', htmlMarkers:['bawsala-enhancements.js','launchChecklist'], js:'assets/js/frontend-v21.js', jsMarkers:['mountQuickCapture','showCaptureToast','mountStudyRail','mountPageCompass','mountReadingProgress']},
  {name:'account-backed support', html:'pages/support.html', htmlMarkers:['supportForm','supportTickets','supportAuthGate'], js:'assets/js/support.js', jsMarkers:['backend.createSupportTicket','backend.supportTickets','backend.updateSupportTicket','data-ticket-close']},
  {name:'public service status', html:'pages/status.html', htmlMarkers:['statusOverview','statusComponents','refreshStatus'], js:'assets/js/status.js', jsMarkers:['/api/health/live','/api/health/ready','data-status-orb']}
];
for(const flow of flows){
  const html=read(flow.html); const js=read(flow.js);
  for(const marker of flow.htmlMarkers) if(!html.includes(marker)) fail(`${flow.name} html missing ${marker}`);
  for(const marker of flow.jsMarkers) if(!js.includes(marker)) fail(`${flow.name} js missing ${marker}`);
}
for(const marker of ['renderFeedbackWidget','renderOnboardingNudge','applyPitchMode','seedInvestorDemo']){
  if(read('assets/js/monitoring.js').includes(marker)||read('assets/js/workspace.js').includes(marker))fail(`retired demo marker returned: ${marker}`);
}
if(failed) process.exit(1);
console.log(`OK: ${flows.length} critical browser flows statically verified.`);
