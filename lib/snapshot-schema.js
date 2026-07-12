'use strict';

const MAX_STRING = 1400;
const MAX_LONG = 25000;
const SYNC_ALLOWED_BASE_KEYS = new Set([
  'theme','language','site:settings','activeProfileId','profiles',
  'advisor:last','advisor:quickPrompt','homeworks','rounds','groups','problems','errors','compare',
  'academic:rows','study:sessions','study:calendar','study:continuation','dashboard:mission','dashboard:executionGuard','dashboard:weeklyPlan','dashboard:notes','dashboard:dailyReport',
  'dailyReviews','study:sourceBudget','user:preferences','notebook:notes','notebook:diary','notebook:flashcards','notebook:bookmarks',
  'mindmaps','site:customResources','site:announcements','site:featuredLectures','student:goals','student:habits','ui:tourDone'
]);
const PROFILE_SYNC_RE = /^profile\.[a-zA-Z0-9:_-]{1,90}\.(.+)$/;

function toStringSafe(value){ return String(value ?? ''); }
function stripControls(value){ return toStringSafe(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' '); }
function cleanText(value, max = MAX_STRING){ return stripControls(value).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max); }
function cleanMultiline(value, max = MAX_LONG){ return stripControls(value).replace(/[<>]/g, '').replace(/\r\n/g,'\n').replace(/\n{6,}/g,'\n\n\n\n\n').trim().slice(0, max); }
function clampNumber(value, min, max, fallback = min){ const num = Number(value); return Number.isFinite(num) ? Math.min(max, Math.max(min, num)) : fallback; }
function cleanId(value){ const raw = cleanText(value, 140).replace(/[^a-zA-Z0-9:_-]/g, ''); return raw || ('sr_' + Math.random().toString(16).slice(2)); }
function cleanDate(value){ const raw = cleanText(value, 40); return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : ''; }
function cleanBool(value){ return value === true || value === 'true'; }
function safePercent(value){ return clampNumber(value, 0, 100, 0); }
function enumOf(value, allowed, fallback){ return allowed.includes(value) ? value : fallback; }
function list(value, max){ return Array.isArray(value) ? value.slice(0, max) : []; }
function cleanRecordBase(item){
  return compact({
    id: cleanId(item?.id),
    createdAt: cleanText(item?.createdAt || new Date().toISOString(), 50),
    updatedAt: cleanText(item?.updatedAt, 50) || undefined,
    deletedAt: cleanBool(item?._deleted) ? (cleanText(item?.deletedAt || new Date().toISOString(), 50) || new Date().toISOString()) : undefined,
    _deleted: cleanBool(item?._deleted) || undefined
  });
}
function compact(obj){ return Object.fromEntries(Object.entries(obj).filter(([,v]) => v !== undefined)); }
function safeURL(value){
  const raw = cleanText(value, 700);
  if(!raw) return '#';
  if(raw.startsWith('#')) return raw;
  if(/^(javascript|data|vbscript|file):/i.test(raw)) return '#';
  try{
    const parsed = new URL(raw, 'https://bawsala.local/');
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? raw : '#';
  }catch(_){ return '#'; }
}
function cleanKey(value){ return String(value ?? '').replace(/[^a-zA-Z0-9:_\-.]/g, '').slice(0, 180); }
function syncBaseKey(name){ const raw = cleanKey(name); const m = raw.match(PROFILE_SYNC_RE); return m ? m[1] : raw; }
function isSyncKeyAllowed(name){ const raw = cleanKey(name); if(!raw || raw.length > 180 || /^(admin|security|backup|auth):/i.test(raw)) return false; return SYNC_ALLOWED_BASE_KEYS.has(syncBaseKey(raw)); }
function cleanResource(item){ return {
  id: cleanId(item?.id),
  name: cleanText(item?.name, 120) || 'مصدر',
  type: enumOf(cleanText(item?.type, 24), ['official','platform','practice','channel','btec','teacher','library','tool'], 'tool'),
  cost: enumOf(cleanText(item?.cost, 20), ['free','paid','mixed'], 'free'),
  track: enumOf(cleanText(item?.track, 20), ['all','academic','btec','vocational'], 'all'),
  subject: cleanText(item?.subject, 80) || 'عام',
  fit: cleanText(item?.fit, 260) || 'مفيد للدراسة',
  risk: cleanText(item?.risk, 260) || 'تحقق قبل الاعتماد',
  score: clampNumber(item?.score, 0, 100, 70),
  url: safeURL(item?.url)
}; }
const validators = {
  'theme': value => enumOf(value, ['dark','light'], 'dark'),
  'language': value => enumOf(value, ['ar','en'], 'ar'),
  'activeProfileId': value => cleanId(value),
  'site:settings': value => value && typeof value === 'object' ? ({
    brandArabic: cleanText(value.brandArabic, 30) || 'بوصلة',
    brandEnglish: cleanText(value.brandEnglish, 40) || 'Bawsala',
    tagline: cleanText(value.tagline, 120) || 'عدة دراسة يومية مجانية للطالب الأردني',
    announcement: cleanText(value.announcement, 220),
    whatsapp: cleanText(value.whatsapp, 20).replace(/[^0-9]/g,'').slice(0,16) || '962792305585',
    showAnnouncement: cleanBool(value.showAnnouncement)
  }) : null,
  'profiles': value => list(value, 40).map(item => compact({
    ...cleanRecordBase(item),
    name: cleanText(item?.name, 70) || 'طالب',
    track: enumOf(cleanText(item?.track, 20), ['علمي','أدبي','BTEC','مهني','غير محدد','academic','btec'], 'غير محدد'),
    grade: enumOf(cleanText(item?.grade, 30), ['الأول ثانوي','التوجيهي','خريج','غير محدد','tawjihi','first-secondary','other'], 'غير محدد'),
    goal: clampNumber(item?.goal, 0, 100, 80),
    weakSubject: cleanText(item?.weakSubject, 80),
    dailyHours: clampNumber(item?.dailyHours,0,14,2),
    avatar: cleanText(item?.avatar, 4) || '●',
    status: enumOf(cleanText(item?.status, 20), ['نشط','متوقف','مراقبة'], 'نشط')
  })),
  'advisor:quickPrompt': value => cleanMultiline(value, 900),
  'compare': value => list(value, 3).map(cleanId),
  'dashboard:notes': value => cleanMultiline(value, 25000),
  'dashboard:dailyReport': value => cleanMultiline(value, 12000),
  'dashboard:executionGuard': value => value && typeof value === 'object' ? ({
    purpose: cleanText(value.purpose, 300) || 'مهمة اليوم',
    sourceLimit: clampNumber(value.sourceLimit, 1, 3, 2),
    minutes: clampNumber(value.minutes, 10, 180, 30),
    forbidden: cleanText(value.forbidden, 220) || 'فتح مصادر جديدة قبل أول جلسة',
    blocker: cleanText(value.blocker, 260),
    updatedAt: cleanText(value.updatedAt || new Date().toISOString(), 50)
  }) : null,
  'study:sourceBudget': value => value && typeof value === 'object' ? ({
    date: cleanText(value.date || new Date().toISOString().slice(0,10),50),
    limit: clampNumber(value.limit,1,3,2),
    sources: list(value.sources,3).map(x=>cleanText(x,120)).filter(Boolean).slice(0,3),
    rule: cleanText(value.rule,220),
    updatedAt: cleanText(value.updatedAt || new Date().toISOString(),50)
  }) : null,
  'user:preferences': value => value && typeof value === 'object' ? ({
    startPage: cleanText(value.startPage,80)||'dashboard.html',
    defaultFocus: clampNumber(value.defaultFocus,5,120,25),
    dailyGoal: clampNumber(value.dailyGoal,10,600,120),
    compact: cleanBool(value.compact),
    reduceMotion: cleanBool(value.reduceMotion),
    autoSync: value.autoSync === false ? false : true,
    notifications: cleanBool(value.notifications)
  }) : {},
  'site:customResources': value => list(value, 80).map(cleanResource),
  'site:announcements': value => list(value, 20).map(item => compact({...cleanRecordBase(item), text:cleanText(item?.text,220), active:cleanBool(item?.active)})),
  'site:featuredLectures': value => list(value, 80).map(cleanResource),
  'homeworks': value => list(value, 160).map(item => compact({...cleanRecordBase(item), title:cleanText(item?.title,160)||'واجب', subject:cleanText(item?.subject,80)||'عام', due:cleanDate(item?.due), priority:enumOf(cleanText(item?.priority,20),['عالية','متوسطة','خفيفة'],'متوسطة'), done:cleanBool(item?.done)})),
  'rounds': value => list(value, 80).map((item,i)=>compact({...cleanRecordBase(item), subject:cleanText(item?.subject,80)||'عام', goal:cleanText(item?.goal,200)||'مراجعة', minutes:clampNumber(item?.minutes,5,180,35), index:clampNumber(item?.index,1,50,i+1), done:cleanBool(item?.done)})),
  'groups': value => list(value, 80).map(item => compact({...cleanRecordBase(item), name:cleanText(item?.name,100)||'مجموعة دراسة', subject:cleanText(item?.subject,80)||'عام', track:enumOf(cleanText(item?.track,20),['أكاديمي','BTEC','مختلط','توجيهي','عام'],'عام'), capacity:clampNumber(item?.capacity,2,80,6), members:clampNumber(item?.members,1,80,1), goal:cleanText(item?.goal,260)||'هدف واضح'})),
  'problems': value => list(value, 120).map(item => compact({...cleanRecordBase(item), source:enumOf(cleanText(item?.source,30),['community','support-center','quick-capture',''],'') , privacy:enumOf(cleanText(item?.privacy,20),['anonymous','info','private'],'anonymous'), visibility:enumOf(cleanText(item?.visibility,24),['student-admin','private','admin-only'],'student-admin'), status:enumOf(cleanText(item?.status,20),['جديدة','قيد المتابعة','تم الحل','مؤجلة'],'جديدة'), priority:enumOf(cleanText(item?.priority,20),['normal','high'],'normal'), title:cleanText(item?.title,160)||'مشكلة طالب', category:cleanText(item?.category,80)||'عام', name:cleanText(item?.name,80), contact:cleanText(item?.contact,120), details:cleanMultiline(item?.details,9000)||'بدون تفاصيل', adminNote:cleanMultiline(item?.adminNote,3000)})),
  'errors': value => list(value, 220).map(item => compact({...cleanRecordBase(item), subject:cleanText(item?.subject,80)||'عام', lesson:cleanText(item?.lesson,120)||'غير محدد', category:enumOf(cleanText(item?.category,30),['فهم','حفظ','تسرع','قانون','وقت','صياغة','BTEC','آخر'],'آخر'), status:enumOf(cleanText(item?.status,30),['جديد','قيد المراجعة','تمت المراجعة','انتهى'],'جديد'), error:cleanMultiline(item?.error,5000), fix:cleanMultiline(item?.fix,5000), reviewAt:cleanText(item?.reviewAt,50), reviewedAt:cleanText(item?.reviewedAt,50), cardId:cleanText(item?.cardId,140).replace(/[^a-zA-Z0-9:_-]/g,''), missionId:cleanText(item?.missionId,140).replace(/[^a-zA-Z0-9:_-]/g,''), message:cleanText(item?.message,300), source:cleanText(item?.source,160), page:cleanText(item?.page,120), stack:cleanMultiline(item?.stack,2500)})),
  'academic:rows': value => list(value, 40).map(item => ({id:cleanId(item?.id), name:cleanText(item?.name,90)||'مادة', mark:clampNumber(item?.mark,0,100,0), weight:clampNumber(item?.weight,0,100,0)})),
  'study:sessions': value => list(value, 500).map(item => compact({...cleanRecordBase(item), minutes:clampNumber(item?.minutes,1,240,25), elapsedSeconds:clampNumber(item?.elapsedSeconds,0,10800,0), plannedMinutes:clampNumber(item?.plannedMinutes,5,180,25), completionRatio:clampNumber(item?.completionRatio,0,100,0), mission:cleanText(item?.mission,220)||'جلسة تركيز', subject:cleanText(item?.subject,80), focusScore:clampNumber(item?.focusScore,1,5,3), blocker:cleanText(item?.blocker,300), distractions:clampNumber(item?.distractions,0,999,0), sources:list(item?.sources,3).map(source=>cleanText(source,120)).filter(Boolean), startedAt:cleanText(item?.startedAt,50), finishedAt:cleanText(item?.finishedAt,50)})),
  'study:calendar': value => list(value, 500).map(item => compact({...cleanRecordBase(item), title:cleanText(item?.title,140)||'حدث دراسي', type:enumOf(cleanText(item?.type,30),['deadline','exam','session','task','reminder'],'task'), date:cleanDate(item?.date)||new Date().toISOString().slice(0,10), time:cleanText(item?.time,8).replace(/[^0-9:]/g,'').slice(0,5), allDay:cleanBool(item?.allDay), endDate:cleanDate(item?.endDate)||undefined, startTime:cleanText(item?.startTime||item?.start_time,60), endTime:cleanText(item?.endTime||item?.end_time,60), timezone:cleanText(item?.timezone,80)||'Asia/Amman', duration:clampNumber(item?.duration,0,480,0), track:enumOf(cleanText(item?.track,20),['all','academic','btec'],'all'), subject:cleanText(item?.subject,80)||'عام', color:enumOf(cleanText(item?.color,20),['red','blue','green','teal','purple','gray',''],'') , notes:cleanMultiline(item?.notes||item?.description,2000), description:cleanMultiline(item?.description||item?.notes,2000), reminder:enumOf(cleanText(item?.reminder,20),['none','same-day','day-before','week-before'],'none'), reminderMinutes: item?.reminderMinutes === undefined ? undefined : clampNumber(item?.reminderMinutes,0,10080,0), reminderSentAt:cleanText(item?.reminderSentAt,60)||undefined, googleEventId:cleanText(item?.googleEventId,160), googleEtag:cleanText(item?.googleEtag,240)||undefined, googleUpdatedAt:cleanText(item?.googleUpdatedAt,60)||undefined, externalProvider:cleanText(item?.externalProvider,40)||undefined, externalSyncStatus:cleanText(item?.externalSyncStatus,40)||undefined})),
  'dailyReviews': value => list(value, 240).map(item => compact({...cleanRecordBase(item), energy:enumOf(cleanText(item?.energy,20),['منخفضة','متوسطة','عالية'],'متوسطة'), commitment:enumOf(cleanText(item?.commitment,20),['ضعيف','مقبول','جيد','ممتاز'],'مقبول'), blocker:cleanText(item?.blocker,520), lesson:cleanText(item?.lesson,500), tomorrow:cleanText(item?.tomorrow,260), text:cleanMultiline(item?.text,3600), date:cleanText(item?.date,50)})),
  'dashboard:mission': value => value && typeof value === 'object' ? compact({ id:cleanId(value.id), text:cleanText(value.text || value.mission,220)||'مهمة اليوم', mission:cleanText(value.mission || value.text,220)||'مهمة اليوم', subject:cleanText(value.subject,80), minutes:clampNumber(value.minutes,5,180,25), status:enumOf(cleanText(value.status,20),['ready','started','done','failed'],'ready'), date:cleanDate(value.date), originType:cleanText(value.originType,40), originId:cleanText(value.originId,140).replace(/[^a-zA-Z0-9:_-]/g,''), originLabel:cleanText(value.originLabel,160), createdAt:cleanText(value.createdAt || new Date().toISOString(),50), updatedAt:cleanText(value.updatedAt || value.createdAt || new Date().toISOString(),50) }) : null,
  'study:continuation': value => value && typeof value === 'object' ? compact({ id:cleanId(value.id), kind:cleanText(value.kind,40)||'study', entityId:cleanText(value.entityId,140).replace(/[^a-zA-Z0-9:_-]/g,''), title:cleanText(value.title,180)||'متابعة الدراسة', subject:cleanText(value.subject,80), target:cleanText(value.target,40)||'focus', sourcePage:cleanText(value.sourcePage,160), status:enumOf(cleanText(value.status,20),['active','done','cancelled'],'active'), createdAt:cleanText(value.createdAt || new Date().toISOString(),50), updatedAt:cleanText(value.updatedAt || value.createdAt || new Date().toISOString(),50), expiresAt:cleanText(value.expiresAt,50) }) : null,
  'dashboard:weeklyPlan': value => value && typeof value === 'object' ? ({ createdAt:cleanText(value.createdAt || new Date().toISOString(),50), items:list(value.items,21).map((item,i)=>({id:cleanId(item?.id), day:clampNumber(item?.day,1,21,i+1), text:cleanText(item?.text,200), done:cleanBool(item?.done)})) }) : null,
  'advisor:last': value => value && typeof value === 'object' ? ({ title:cleanText(value.title,180)||'قرار دراسي', badge:enumOf(cleanText(value.badge,20),['green','blue','teal','red','gray'],'green'), decisionLevel:cleanText(value.decisionLevel,80)||'قرار عملي', plan:list(value.plan,10).map(x=>cleanText(x,200)).filter(Boolean), resources:list(value.resources,8).map(r=>({name:cleanText(r?.name,120), fit:cleanText(r?.fit,260), url:safeURL(r?.url)})), createdAt:cleanText(value.createdAt || new Date().toISOString(),50), raw: typeof value.raw === 'object' && value.raw ? Object.fromEntries(Object.entries(value.raw).slice(0,30).map(([k,v])=>[cleanText(k,50), cleanText(v,600)])) : {} }) : null,
  'notebook:notes': value => list(value, 360).map(item=>compact({...cleanRecordBase(item), title:cleanText(item?.title,140)||'ملاحظة', subject:cleanText(item?.subject,80)||'عام', body:cleanMultiline(item?.body || item?.text,25000), tags:list(item?.tags,10).map(x=>cleanText(x,40)).filter(Boolean), source:cleanText(item?.source,120), pinned:cleanBool(item?.pinned), archived:cleanBool(item?.archived)})),
  'notebook:diary': value => list(value, 240).map(item=>compact({...cleanRecordBase(item), mood:cleanText(item?.mood,40)||'جيد', wins:cleanMultiline(item?.wins,5000), blockers:cleanMultiline(item?.blockers,5000), done:cleanMultiline(item?.done || item?.wins,5000), tomorrow:cleanText(item?.tomorrow,240)})),
  'notebook:flashcards': value => list(value, 900).map(item=>compact({...cleanRecordBase(item), deck:cleanText(item?.deck,80)||'عام', subject:cleanText(item?.subject,80)||'عام', front:cleanText(item?.front || item?.question,360), back:cleanMultiline(item?.back || item?.answer,9000), hint:cleanText(item?.hint,420), tags:list(item?.tags,10).map(x=>cleanText(x,40)).filter(Boolean), level:clampNumber(item?.level,1,7,1), intervalDays:clampNumber(item?.intervalDays,0,365,0), ease:clampNumber(item?.ease,1.3,3.2,2.3), reps:clampNumber(item?.reps,0,999,0), lapses:clampNumber(item?.lapses,0,999,0), correct:clampNumber(item?.correct,0,999,0), wrong:clampNumber(item?.wrong,0,999,0), archived:cleanBool(item?.archived), dueAt:cleanText(item?.dueAt || new Date().toISOString(),50), lastReviewedAt:cleanText(item?.lastReviewedAt,50)})),
  'notebook:bookmarks': value => list(value, 200).map(item=>compact({...cleanRecordBase(item), title:cleanText(item?.title,140), url:safeURL(item?.url), note:cleanText(item?.note,260)})),
  'mindmaps': value => list(value, 80).map(item=>compact({...cleanRecordBase(item), title:cleanText(item?.title,120)||'خريطة ذهنية', subject:cleanText(item?.subject,80)||'عام', center:cleanText(item?.center,120)||'الفكرة الرئيسية', nodes:list(item?.nodes,80).map((node,i)=>({id:cleanId(node?.id || ('node_'+i)), parentId:cleanId(node?.parentId || 'center'), text:cleanText(node?.text,140)||'فرع', color:enumOf(cleanText(node?.color,20),['brand','blue','green','purple','gray'],'brand')}))})),
  'student:goals': value => list(value, 60).map(item=>compact({...cleanRecordBase(item), title:cleanText(item?.title,140)||'هدف', metric:cleanText(item?.metric,80)||'دراسة', target:clampNumber(item?.target,0,1000,1), current:clampNumber(item?.current,0,1000,0), due:cleanDate(item?.due), done:cleanBool(item?.done)})),
  'student:habits': value => list(value, 60).map(item=>compact({...cleanRecordBase(item), title:cleanText(item?.title || item?.name,100)||'عادة', name:cleanText(item?.name || item?.title,100)||'عادة', streak:clampNumber(item?.streak,0,365,0), lastDone:cleanText(item?.lastDone,50)})),
  'ui:tourDone': cleanBool
};
function sanitizeForBaseKey(baseKey, value, fallback = undefined){
  if(!SYNC_ALLOWED_BASE_KEYS.has(baseKey)) return fallback;
  const validator = validators[baseKey];
  try{
    const clean = validator ? validator(value) : value;
    return clean === undefined ? fallback : clean;
  }catch(_){ return fallback; }
}
module.exports = { SYNC_ALLOWED_BASE_KEYS, syncBaseKey, isSyncKeyAllowed, sanitizeForBaseKey, cleanKey };
