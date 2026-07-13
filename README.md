# Bawsala Study OS v4 — Secure Cloud Edition

هذا الإصدار يحوّل المشروع من تطبيق Frontend يعتمد على `localStorage` فقط إلى تطبيق **local-first** مع حسابات ومزامنة سحابية آمنة، مع بقاء التطبيق قابلًا للعمل دون إنترنت.

## ما الذي أصبح موجودًا؟

- Supabase Auth: تسجيل، دخول، خروج، تأكيد بريد، واستعادة كلمة المرور.
- PostgreSQL على Supabase لتخزين حالة كل مستخدم.
- Row Level Security مع `auth.uid()` لمنع أي مستخدم من قراءة بيانات غيره.
- مزامنة ذرّية عبر RPC ورقم مراجعة لمنع الكتابة العمياء وفقد البيانات.
- شاشة تعارض واضحة عند تعديل الحساب من جهازين.
- نسخ احتياطية سحابية دورية وآخر 8 نسخ لكل مستخدم.
- نسخ محلية تلقائية قبل استبدال البيانات أو حل التعارض.
- حذف حساب حقيقي عبر Edge Function؛ مفتاح `service_role` لا يدخل الواجهة نهائيًا.
- Cloudflare Turnstile اختياري لحماية التسجيل والدخول واستعادة كلمة المرور من البوتات.
- تحقق وتطبيع صارم لملفات JSON المستوردة وحدود للأحجام والحقول.
- Security headers وCSP ومنع تخزين طلبات Supabase في Service Worker cache.
- وضع Local-only يبقى فعالًا عندما لا يتم إعداد Supabase أو عند انقطاع الشبكة.

## البنية

```text
Browser / PWA
  ├─ localStorage: نسخة العمل المحلية + نسخ طوارئ
  ├─ Supabase Auth: جلسات المستخدم
  ├─ PostgREST SELECT: تنزيل النسخة المملوكة للمستخدم فقط
  ├─ PostgreSQL RPC: رفع آمن مع optimistic concurrency
  └─ Edge Function: حذف الحساب بعد التحقق من الجلسة وOrigin
```

## تشغيل محلي سريع

```bash
python3 -m http.server 8080
```

ثم افتح:

```text
http://localhost:8080
```

بدون إعداد `config.js` سيعمل التطبيق محليًا بالكامل، وهذا مقصود وليس خطأ.

## إعداد الباك إند

اتبع الملف:

- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — إنشاء Supabase، قاعدة البيانات، Auth، Edge Function، وCloudflare Pages.
- [`docs/SECURITY.md`](docs/SECURITY.md) — نموذج الأمان، الأسرار، القيود، وقائمة ما قبل الإطلاق.
- [`QA.md`](QA.md) — الاختبارات التي نُفذت فعلًا وحدود الاختبار.

## الملفات الأساسية الجديدة

- `backend.js` — عميل Auth/REST/RPC دون مكتبة خارجية.
- `config.js` — القيم العامة فقط: Supabase URL، publishable key، وTurnstile site key.
- `supabase/migrations/001_bawsala_backend.sql` — الجداول وRLS والنسخ الاحتياطية ودالة المزامنة.
- `supabase/functions/delete-account/index.ts` — حذف الحساب على الخادم.
- `_headers` — ترويسات Cloudflare Pages الأمنية.
- `vercel.json` — ترويسات مماثلة عند استخدام Vercel.
- `tests/` — اختبارات syntax وstatic wiring وعميل الباك إند.

## الاختبارات

```bash
./tests/run.sh
```

## ملاحظات صريحة

- الاستضافة المجانية ممتازة للبداية والنسخة التجريبية، لكنها ليست ضمان تشغيل تجاري بلا انقطاع.
- لا تضع `service_role` أو أي secret في `config.js`. المفتاح المسموح في المتصفح هو publishable/anon فقط مع RLS صحيح.
- مزامنة الحالة كلها كوثيقة JSON مناسبة لهذا التطبيق الحالي. عندما يتحول المشروع إلى تعاون جماعي، مشاركة، مدفوعات، أو ملايين السجلات، يجب تقسيم البيانات إلى جداول domain مستقلة بدل الاستمرار في وثيقة واحدة.
- التطبيق لا يوفّر تشفيرًا طرفًا لطرف. النقل مشفّر عبر HTTPS، وقاعدة البيانات محمية بالصلاحيات، لكن مشغّل البنية السحابية يظل ضمن نموذج الثقة.
