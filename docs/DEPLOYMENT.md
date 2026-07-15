# دليل النشر الإنتاجي

## 0. متطلبات

- Node.js 20 أو أحدث.
- Supabase CLI حديث.
- مشروع Supabase منفصل للإنتاج عن التطوير.
- نطاق HTTPS تملكه فعليًا.

## 1. تطبيق migrations

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase migration list
```

يجب أن تُطبّق الملفات بالترتيب:

```text
supabase/migrations/001_bawsala_backend.sql
supabase/migrations/002_bawsala_hardening.sql
```

بعدها افحص Database Security Advisor وتأكد أن RLS مفعّل وأن أدوار `anon/authenticated` لا تملك DELETE مباشرًا على الحالة أو النسخ.

## 2. إعداد Auth

في Supabase Authentication:

- فعّل Email/Password وتأكيد البريد للإطلاق العام.
- اضبط Site URL إلى أصل الإنتاج الدقيق.
- أضف redirect URLs الدقيقة للإنتاج والتطوير فقط.
- اربط Custom SMTP واختبر التأكيد والاستعادة وتغيير كلمة المرور.
- اضبط سياسة كلمة المرور خادميًا؛ تحقق العميل ليس حاجزًا أمنيًا.

## 3. Turnstile

1. أنشئ Cloudflare Turnstile widget مقيّدًا باسم نطاق الإنتاج.
2. ضع site key العام في `config.js`.
3. ضع secret key داخل Supabase Auth > Bot and Abuse Protection، لا داخل المستودع.
4. فعّل CAPTCHA في Supabase بعد التأكد أن الواجهة ترسل token.

## 4. أسرار Edge Functions

```bash
supabase secrets set \
  ALLOWED_ORIGINS=https://study.example.com \
  ACCOUNT_PURGE_CRON_SECRET='A_LONG_RANDOM_SECRET'
```

لا تضع شرطة `/` في نهاية origin. لا تضف wildcard. متغيرات Supabase الافتراضية الخادمية متاحة للدوال المستضافة؛ لا تنسخ `service_role` إلى frontend.

## 5. نشر الدوال

```bash
supabase functions deploy delete-account
supabase functions deploy purge-deleted-accounts
```

`delete-account` يستقبل طلب المستخدم ويجدول الحذف. `purge-deleted-accounts` لا يجب أن يكون زرًا عامًا؛ استدعاؤه يكون من cron فقط مع `x-cron-secret`.

## 6. جدولة purge

أنشئ Job من Supabase Cron/Jobs يستدعي:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/purge-deleted-accounts
```

كل ساعة مثلًا، method POST، مع header:

```text
x-cron-secret: ACCOUNT_PURGE_CRON_SECRET_VALUE
```

احفظ السر في Vault/Secrets ولا تضعه في SQL مكشوف أو frontend. اختبر أولًا بحساب تجريبي وموعد مستحق مضبوط في بيئة staging.

## 7. إعداد config وبناء الإنتاج

عدّل `config.js` بالقيم العامة:

```js
window.BAWSALA_CONFIG = Object.freeze({
  SUPABASE_URL: 'https://YOUR_PROJECT_REF.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'YOUR_PUBLISHABLE_KEY',
  TURNSTILE_SITE_KEY: 'YOUR_PUBLIC_TURNSTILE_SITE_KEY',
  SYNC_DEBOUNCE_MS: 1800
});
```

ثم:

```bash
npm ci
npm run build
npm run check
npm audit
```

الـbuild يقرأ Supabase URL ويولد CSP exact-origin وملفات hashed. **انشر محتويات `dist/` فقط**. لا تنشر `node_modules` أو `.env` أو ملفات المصدر على أنها artifact الإنتاج.

## 8. ترويسات الاستضافة

`dist/_headers` مناسب لخدمات تدعم صيغة Cloudflare/Netlify-style. `dist/vercel.json` مناسب لـVercel. تأكد من أن المنصة تطبق فعليًا:

- CSP.
- HSTS دون `includeSubDomains` ما لم تكن تملك كل النطاقات الفرعية.
- `config.js`, `index.html`, `sw.js` دون cache طويل.
- ملفات `assets/*-HASH.js/css` immutable.

## 9. اختبار قبول إلزامي

- حسابان مختلفان على الجهاز نفسه لا يشاهد أحدهما بيانات الآخر.
- تسجيل مستخدم جديد لا يرفع anonymous profile دون زر COPY.
- callback PKCE يعمل، وURL tokens المصطنعة لا تُقبل.
- تبويبان: التبويب القديم يُمنع من overwrite.
- امتلاء/فشل التخزين يؤدي rollback ولا يعرض Saved.
- import/restore/reset يتوقف إذا فشل backup.
- offline edits تعود للمزامنة، وrevision conflict يعرض قرارًا.
- Service Worker update يظهر prompt ولا يخلط assets.
- signup/confirmation/recovery/Turnstile تعمل على النطاق الحقيقي.
- جدولة حذف، إلغاء، ثم purge بعد الاستحقاق تعمل في staging.
- فحص لوحة المفاتيح، قارئ الشاشة، RTL، mobile، light/high contrast/reduced motion.

## 10. rollback

- احتفظ بآخر build ناجح من `dist/`.
- لا تعدّل migration مطبقة؛ أنشئ migration عكسية جديدة.
- قبل نشر تغييرات schema، صدّر نسخة قاعدة بيانات مناسبة لخطة المشروع.
- عند خلل frontend، أعد نشر artifact السابق؛ الأصول hashed تمنع cache mixing.
