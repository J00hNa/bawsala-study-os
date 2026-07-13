# QA Report — v4 Secure Cloud Edition

## اختبارات آلية نُفذت

يُشغّل الأمر التالي جميع الاختبارات المتاحة في الحزمة:

```bash
./tests/run.sh
```

الاختبارات تشمل:

- فحص syntax لملفات `app.js` و`backend.js` و`sw.js` عبر Node.js.
- التأكد من عدم تكرار HTML IDs.
- التأكد من وجود كل local script/style/asset المشار إليها.
- مطابقة selectors الأساسية في JavaScript مع عناصر HTML.
- التأكد من استثناء Service Worker لكل cross-origin/API traffic.
- التحقق من وجود CSP وRLS و`FORCE ROW LEVEL SECURITY` ودالة المزامنة.
- اختبار عميل الباك إند بمحاكاة fetch: تسجيل الدخول، حفظ الجلسة، Auth header، CAPTCHA payload، pull، push، revision، والخروج.
- التحقق من أن Edge Function تفشل مغلقًا دون `ALLOWED_ORIGINS` ولا تقبل user ID من جسم الطلب.

## مراجعة ثابتة

- لا يوجد `service_role` في `config.js` أو كود الواجهة.
- دالة حذف الحساب تستخرج المستخدم من Bearer token.
- الكتابة السحابية تمر عبر RPC مع optimistic concurrency.
- SQL يضع حدود حجم ونوع على JSON.
- الاستيراد يمر عبر normalization وقوائم allowlist وحدود طول/عدد.

## ما لم يتم ادعاء اختباره

محاولة تشغيل Chromium headless داخل بيئة البناء لم تستطع فتح خادم localhost بسبب قيود بيئة المتصفح نفسها، رغم أن `curl` وصل إلى الخادم. لذلك **لا يوجد ادعاء بأن اختبار end-to-end في متصفح حقيقي نجح داخل هذه البيئة**.

قبل النشر العام يجب تنفيذ قائمة الاختبار اليدوي في `docs/DEPLOYMENT.md` على رابط HTTPS حقيقي ومشروع Supabase فعلي، خصوصًا عزل المستخدمين، البريد، Turnstile، التعارض، وحذف الحساب.
