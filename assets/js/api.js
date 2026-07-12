(function(){
  const store = () => window.MT_STORE;
  const sec = () => window.MT_SECURITY;
  const delay = value => new Promise(resolve => setTimeout(()=>resolve(value), 25));
  function cleanFromCollection(key, payload){ return sec().sanitizeForKey(key, [payload], [])[0]; }
  function allResources(){ return [...window.MT_DATA.resources, ...store().get('site:customResources',[])]; }
  function allServices(){ return [...window.MT_DATA.services, ...store().get('site:customServices',[])]; }
  window.MT_API = {
    mode:'bawsala-v16-continuous-study-backend',
    async saveProblem(payload){ return delay(store().addToCollection('problems', cleanFromCollection('problems', {...payload, visibility:payload?.visibility || 'student-admin', status:payload?.status || 'جديدة'}))); },
    async listProblems(){ return delay(store().get('problems', [])); },
    async listAllProblems(){ return delay(store().listProfileScoped('problems').flatMap(row => row.items.map(item => ({...item, profileId:row.profile.id, profileName:row.profile.name})))); },
    async saveHomework(payload){ return delay(store().addToCollection('homeworks', cleanFromCollection('homeworks', payload))); },
    async listHomeworks(){ return delay(store().get('homeworks', [])); },
    async saveGroup(payload){ return delay(store().addToCollection('groups', cleanFromCollection('groups', payload))); },
    async listGroups(){ return delay(store().get('groups', [])); },
    async saveAdvisorResult(payload){ const clean=sec().sanitizeForKey('advisor:last', payload, null); store().set('advisor:last', clean); return delay(clean); },
    async saveStudySession(payload){ return delay(store().addToCollection('study:sessions', cleanFromCollection('study:sessions', payload))); },
    async listStudySessions(){ return delay(store().get('study:sessions', [])); },
    async saveDailyReview(payload){ return delay(store().addToCollection('dailyReviews', cleanFromCollection('dailyReviews', payload))); },
    async listDailyReviews(){ return delay(store().get('dailyReviews', [])); },
    async saveMission(payload){ const clean=sec().sanitizeForKey('dashboard:mission', payload, null); if(window.BAWSALA_STUDY?.saveMission) return delay(window.BAWSALA_STUDY.saveMission(clean)); store().set('dashboard:mission', clean); return delay(clean); },
    async getMission(){ return delay(store().get('dashboard:mission', null)); },
    async saveWeeklyPlan(payload){ const clean=sec().sanitizeForKey('dashboard:weeklyPlan', payload, null); store().set('dashboard:weeklyPlan', clean); return delay(clean); },
    async getWeeklyPlan(){ return delay(store().get('dashboard:weeklyPlan', null)); },
    async allResources(){ return delay(allResources()); },
    async allServices(){ return delay(allServices()); }
  };
})();
