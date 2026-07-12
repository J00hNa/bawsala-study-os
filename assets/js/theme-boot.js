(function(){
  try{
    var themeKeys = ['bawsala.v12.theme','bawsala.v11.theme','bawsala.v10.theme','siraaj.v10.theme','masar.v9.theme','masar.v8.theme','masar.v7.theme'];
    var langKeys = ['bawsala.v12.language','bawsala.v11.language','bawsala.v10.language','siraaj.v10.language'];
    var theme = 'dark';
    var navLang = (navigator.languages && navigator.languages[0]) || navigator.language || 'ar';
    var language = String(navLang).toLowerCase().startsWith('ar') ? 'ar' : 'en';
    function readValue(key){
      var raw = localStorage.getItem(key);
      if(!raw) return null;
      try{return JSON.parse(raw);}catch(_){return String(raw).replace(/\"/g,'');}
    }
    for(var i=0;i<themeKeys.length;i++){ var tv=readValue(themeKeys[i]); if(tv==='light'||tv==='dark'){ theme=tv; break; } }
    for(var j=0;j<langKeys.length;j++){ var lv=readValue(langKeys[j]); if(lv==='ar'||lv==='en'){ language=lv; break; } }
    var preferenceKeys = ['bawsala.v12.user:preferences','bawsala.v11.user:preferences','bawsala.v10.user:preferences'];
    var preferences = {};
    for(var k=0;k<preferenceKeys.length;k++){ var pv=readValue(preferenceKeys[k]); if(pv && typeof pv==='object'){ preferences=pv; break; } }
    var fontScale = ['normal','large','xlarge'].indexOf(preferences.fontScale)>=0 ? preferences.fontScale : 'normal';
    var contrast = ['standard','high'].indexOf(preferences.contrast)>=0 ? preferences.contrast : 'standard';
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.lang = language;
    document.documentElement.dataset.fontScale = fontScale;
    document.documentElement.dataset.contrast = contrast;
    document.documentElement.lang = language === 'en' ? 'en' : 'ar';
    document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl';
  }catch(_){ document.documentElement.dataset.theme = 'dark'; document.documentElement.dataset.lang = 'ar'; }
})();
