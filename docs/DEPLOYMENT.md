# دليل النشر — Supabase + Cloudflare Pages

## 1. إنشاء مشروع Supabase

1. أنشئ مشروعًا جديدًا.
2. من **SQL Editor** افتح الملف التالي ونفّذه كاملًا مرة واحدة:

```text
supabase/migrations/001_bawsala_backend.sql
```

3. من **Database → Security Advisor** أعد تشغيل الفحص بعد تنفيذ SQL وتأكد أنه لا توجد جداول عامة بلا RLS.

## 2. إعداد Auth

من **Authentication**:

1. فعّل Email/Password.
2. فعّل تأكيد البريد قبل تسجيل الدخول للإطلاق العام.
3. اضبط الحد الأدنى لكلمة المرور على 10 أحرف على الأقل، وفعّل متطلبات الحروف/الأرقام/الرموز من إعدادات Password Security.
4. في **URL Configuration**:
   - `Site URL`: رابط الإنتاج النهائي، مثل `https://your-project.pages.dev/`
   - `Redirect URLs`:

```text
https://your-project.pages.dev/**
http://localhost:8080/**
```

في الإنتاج استخدم الرابط الدقيق قدر الإمكان، ولا تترك wildcards واسعة لنطاقات لا تملكها.

## 3. إعداد البريد

خدمة البريد الافتراضية في Supabase مخصصة للتجربة وليست مناسبة لإطلاق عام. اربط Custom SMTP قبل دعوة المستخدمين؛ خلاف ذلك ستتعطل رسائل التأكيد والاستعادة سريعًا. يمكن استخدام مزود مجاني مثل Resend للبداية، مع الانتباه إلى حصته اليومية والشهرية الحالية.

بعد إعداد SMTP اختبر فعليًا:

- إنشاء حساب جديد.
- وصول رسالة التأكيد.
- رابط الاستعادة.
- تغيير كلمة المرور.

## 4. إعداد `config.js`

من **Project Settings → API** انسخ:

- Project URL.
- Publishable key، أو `anon` key في المشاريع القديمة.

عدّل `config.js`:

```js
window.BAWSALA_CONFIG = Object.freeze({
  SUPABASE_URL: 'https://YOUR_PROJECT_REF.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'YOUR_PUBLISHABLE_OR_ANON_KEY',
  TURNSTILE_SITE_KEY: '',
  SYNC_DEBOUNCE_MS: 1400
});
```

هذه القيم عامة بطبيعتها. **لا تضع** `service_role` أو secret key هنا.

## 5. Turnstile — موصى به للإطلاق العام

1. أنشئ Cloudflare Turnstile widget وحدّد hostname الإنتاجي.
2. ضع الـ **site key** العام داخل `config.js` في `TURNSTILE_SITE_KEY`.
3. في Supabase انتقل إلى:
   **Authentication → Bot and Abuse Protection → Enable CAPTCHA**.
4. اختر Cloudflare Turnstile وضع الـ **secret key** هناك، لا في المشروع.
5. استخدم widget منفصل للتطوير أو مفاتيح الاختبار الرسمية؛ لا تسمح لـ `localhost` في widget الإنتاجي.

عندما يكون `TURNSTILE_SITE_KEY` فارغًا لا يتم تحميل أي script خارجي ويستمر Auth من دونه. لا تفعّل CAPTCHA داخل Supabase قبل وضع site key في الواجهة، وإلا ستفشل طلبات Auth عمدًا.

## 6. نشر دالة حذف الحساب

الدالة موجودة هنا:

```text
supabase/functions/delete-account/index.ts
```

### عبر Supabase CLI

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set ALLOWED_ORIGINS=https://your-project.pages.dev,http://localhost:8080
supabase functions deploy delete-account
```

استخدم origins دقيقة دون `/` في النهاية. بعد الانتقال إلى custom domain حدّث السر:

```bash
supabase secrets set ALLOWED_ORIGINS=https://study.example.com
supabase functions deploy delete-account
```

`SUPABASE_URL` و`SUPABASE_ANON_KEY` و`SUPABASE_SERVICE_ROLE_KEY` متاحة داخل بيئة Edge Function المستضافة. لا تنسخ `service_role` إلى أي ملف frontend.

يمكن أيضًا إنشاء الدالة ونشرها من Dashboard، ثم إضافة `ALLOWED_ORIGINS` إلى Secrets.

## 7. نشر الواجهة على Cloudflare Pages

الطريقة الأبسط:

1. أنشئ مشروع Pages عبر Direct Upload أو اربطه بمستودع Git.
2. لا يوجد build command.
3. مجلد الإخراج هو جذر المشروع الذي يحتوي `index.html`.
4. ارفع **محتويات المجلد**، لا ملف zip داخل الموقع.
5. افتح الرابط وتأكد من وصول `_headers` ضمن النشر.

الأفضل ربط Git حتى يكون كل تعديل قابلًا للمراجعة والرجوع.

## 8. اختبار ما بعد النشر

نفّذ بالترتيب:

1. افتح الموقع في نافذة خاصة وأنشئ مستخدم A.
2. أضف Quest ثم اضغط Sync.
3. افتح متصفحًا آخر وسجّل بالمستخدم A وتأكد أن البيانات وصلت.
4. عدّل الجهازين قبل المزامنة وتأكد أن نافذة التعارض تظهر.
5. أنشئ مستخدم B وتأكد أنه لا يرى بيانات A.
6. اختبر Offline، أضف تعديلًا، ثم أعد الاتصال.
7. اختبر Forgot Password من رابط الإنتاج.
8. اختبر Delete Account وتأكد أن المستخدم اختفى من Supabase Auth وأن صفوفه حُذفت cascade.
9. راجع Auth logs وEdge Function logs وSecurity Advisor.

## 9. النشر على Vercel بدل Cloudflare

`vercel.json` موجود ويضع الترويسات الأساسية. استخدمه فقط كبديل، ولا تنشر نسختين بمفاتيح/redirects غير منضبطة. حدّث Site URL وRedirect URLs و`ALLOWED_ORIGINS` للرابط الذي سيستخدمه الناس فعلًا.
