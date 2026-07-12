import assert from 'node:assert/strict';
import domain from '../lib/study-domain.js';

const date='2026-07-10';
const now=Date.parse('2026-07-10T12:00:00.000Z');
const keys={
  profiles:[{id:'guest',name:'Test Student',dailyHours:2}],
  activeProfileId:'guest',
  'profile.guest.dashboard:mission':{id:'old',text:'Old mission',mission:'Old mission',date:'2026-07-09',minutes:25,createdAt:'2026-07-09T08:00:00.000Z'},
  'profile.guest.study:sessions':[{id:'old-session',minutes:30,finishedAt:'2026-07-09T10:00:00.000Z'}],
  'profile.guest.errors':[{id:'old-error',subject:'Math',error:'Old error',fix:'Old fix',createdAt:'2026-07-09T10:00:00.000Z'}],
  'profile.guest.homeworks':[{id:'hw1',title:'Urgent assignment',subject:'Math',due:'2026-07-11',done:false,createdAt:'2026-07-01T00:00:00.000Z'}],
  'profile.guest.notebook:flashcards':[{id:'c1',front:'Q',back:'A',dueAt:'2026-07-09T00:00:00.000Z'}]
};

const stale=domain.buildStudyOverview(keys,{date,now,profileId:'guest',timezoneOffsetMinutes:0});
assert.equal(stale.mission,null,'stale mission must not count for today');
assert.equal(stale.focus.minutes,0,'old sessions must not count for today');
assert.equal(stale.counts.todayErrors,0,'old errors must not count for today');
assert.equal(stale.priority.kind,'homework','urgent homework should become the next real priority');
assert.ok(stale.warnings.some(item=>item.code==='STALE_MISSION'),'stale mission warning is required');

const original=structuredClone(keys);
const transaction=domain.applyTransaction(keys,[
  {type:'continuation.set',payload:{id:'ctx1',kind:'homework',entityId:'hw1',title:'Urgent assignment',subject:'Math',target:'focus'}},
  {type:'mission.save',payload:{id:'m1',text:'Finish urgent assignment',subject:'Math',minutes:35,originType:'homework',originId:'hw1'}},
  {type:'source-budget.save',payload:{limit:2,sources:['Textbook','Question bank'],rule:'No third source'}},
  {type:'session.complete',payload:{id:'s1',minutes:20,focusScore:4,mission:'Finish urgent assignment',finishedAt:'2026-07-10T11:00:00.000Z'}},
  {type:'error.save',payload:{id:'e1',subject:'Math',error:'Sign mistake',fix:'Check the sign before substitution'}}
],{date,now,profileId:'guest',timezoneOffsetMinutes:0,idFactory:()=>`generated_${Math.random()}`});

assert.deepEqual(keys,original,'transactions must not mutate the input snapshot');
assert.equal(transaction.overview.mission.text,'Finish urgent assignment');
assert.equal(transaction.overview.continuation.entityId,'hw1');
assert.equal(transaction.overview.focus.minutes,20);
assert.equal(transaction.overview.counts.todayErrors,1);
assert.equal(transaction.overview.loop.done,3,'mission, focus, and error steps should be complete');
assert.equal(transaction.overview.loop.nextAction.key,'review');
assert.ok(transaction.changedKeys.every(key=>key.startsWith('profile.guest.')),'study writes must remain profile scoped');

let atomicFailed=false;
try{
  domain.applyTransaction(keys,[
    {type:'mission.save',payload:{text:'Should not persist'}},
    {type:'error.save',payload:{error:'Missing fix'}}
  ],{date,now,profileId:'guest'});
}catch(error){
  atomicFailed=true;
  assert.equal(error.message,'ERROR_AND_FIX_REQUIRED');
}
assert.equal(atomicFailed,true,'invalid transactions must fail');
assert.deepEqual(keys,original,'failed transactions must remain atomic');

const closed=domain.applyTransaction(transaction.keys,[
  {type:'review.save',payload:{id:'r1',date:'2026-07-10T12:00:00.000Z',text:'Closed day',tomorrow:'Continue assignment'}},
  {type:'continuation.clear',payload:{}}
],{date,now,profileId:'guest',timezoneOffsetMinutes:0});
assert.equal(closed.overview.loop.done,4,'review must close the four-step loop');
assert.equal(closed.overview.continuation,null,'closing the context must remove continuation');
assert.equal(closed.overview.loop.nextAction.key,'flow');

console.log('OK: study domain transactions, daily semantics, profile scope, and atomic failure behavior verified.');
