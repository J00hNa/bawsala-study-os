import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const loop=require('../assets/js/study-loop.js');
const timer=require('../assets/js/focus-timer.js');

const date='2026-07-10';
const fullInput={
  date,
  mission:{text:'حل 20 سؤال تفاضل',date,createdAt:`${date}T07:00:00.000Z`},
  sourceBudget:{limit:2,sources:['كتاب الوزارة','أسئلة سنوات','مصدر زائد']},
  executionGuard:{sourceLimit:3},
  sessions:[{minutes:4,finishedAt:`${date}T08:00:00.000Z`},{minutes:25,finishedAt:`${date}T09:00:00.000Z`},{minutes:40,finishedAt:'2026-07-09T09:00:00.000Z'}],
  errors:[{error:'خطأ',fix:'قاعدة منع',createdAt:`${date}T10:00:00.000Z`},{error:'وصف بلا حل',fix:'',createdAt:`${date}T10:05:00.000Z`}],
  reviews:[{date:`${date}T18:00:00.000Z`}]
};
const status=loop.evaluate(fullInput);
assert.equal(status.done,4);
assert.equal(status.percent,100);
assert.deepEqual(status.sources,['كتاب الوزارة','أسئلة سنوات']);
assert.equal(status.sessions.length,1);
assert.equal(status.minutes,25);
assert.equal(loop.nextAction(status).key,'flow');

const stages=[
  [{date},'mission'],
  [{...fullInput,mission:null,sourceBudget:null,sessions:[],errors:[],reviews:[]},'mission'],
  [{...fullInput,sourceBudget:{sources:[]},sessions:[],errors:[],reviews:[]},'mission'],
  [{...fullInput,sessions:[],errors:[],reviews:[]},'focus'],
  [{...fullInput,errors:[],reviews:[]},'errors'],
  [{...fullInput,reviews:[]},'review']
];
for(const [input,key] of stages)assert.equal(loop.nextAction(loop.evaluate(input)).key,key);
assert.equal(loop.sourceLimit({limit:99},{sourceLimit:1}),3);
assert.equal(loop.sourceLimit({},{}),2);
const localMidnight=new Date(2026,6,10,0,30,0);
assert.equal(loop.localDateOf(localMidnight.toISOString()),'2026-07-10','ISO timestamps must be assigned to the device-local study day');
assert.equal(loop.validSessions([{minutes:5,finishedAt:localMidnight.toISOString()}],'2026-07-10').length,1);

const startAt=1_000_000;
let state=timer.create({now:startAt,day:date,durationMinutes:25,missionText:'مهمة',sources:['أ','ب'],missionSignature:timer.missionSignature('مهمة',['أ','ب'])});
state=timer.start(state,startAt);
assert.equal(timer.elapsed(state,startAt+75_000),75,'wall-clock elapsed time must survive throttled intervals');
state=timer.pause(state,startAt+75_000);
assert.equal(timer.elapsed(state,startAt+500_000),75,'paused timers must not keep counting');
state=timer.start(state,startAt+500_000);
assert.equal(timer.elapsed(state,startAt+545_000),120,'resume must add to prior elapsed time');
assert.equal(timer.remaining(state,startAt+545_000),1380);
assert.equal(timer.progress(state,startAt+545_000),8);

const runningDuration=timer.setDuration(state,10,startAt+545_000);
assert.equal(runningDuration.durationSeconds,1500,'duration cannot change while running');
state=timer.pause(state,startAt+545_000);
state=timer.setDuration(state,10,startAt+545_000);
assert.equal(state.durationSeconds,600);

state=timer.start(state,startAt+545_000);
const completeView=timer.view(state,startAt+1_200_000);
assert.equal(completeView.complete,true);
assert.equal(completeView.running,false);
assert.equal(completeView.elapsedSeconds,600);
assert.ok(completeView.state.completedAt);

const restored=timer.restore(JSON.parse(JSON.stringify(completeView.state)),{day:date,now:startAt+1_300_000});
assert.equal(timer.elapsed(restored,startAt+1_300_000),600);
assert.equal(timer.restore(completeView.state,{day:'2026-07-11',now:startAt}),null,'stale day state must be rejected');
assert.equal(timer.restore({version:999},{day:date,now:startAt}),null,'unknown timer schema must be rejected');
assert.equal(timer.missionSignature('مهمة',['أ','ب']),timer.missionSignature('مهمة',['أ','ب']));
assert.notEqual(timer.missionSignature('مهمة',['أ']),timer.missionSignature('مهمة',['ب']));

console.log('OK: shared study-loop and resumable focus-timer engine tests passed.');
