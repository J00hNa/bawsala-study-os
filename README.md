# Bawsala Study OS 4.0

نظام دراسة **local-first** للمهام، جلسات التركيز، البطاقات، الاستدعاء الكتابي، التخطيط، الملاحظات والإحصاءات. هذه النسخة أعيدت هندستها بعد تدقيق أمني ووظيفي شامل؛ لا تعتمد على `localStorage` كقاعدة بيانات ولا تعيد تنفيذ جلسات Supabase يدويًا.

## الحكم التقني

- التشغيل المحلي يعمل دون حساب أو إنترنت.
- كل حساب يملك namespace محليًا منفصلًا؛ البيانات المجهولة لا تُنسخ إلى حساب إلا بقرار صريح.
- الحالة والنسخ الاحتياطية في IndexedDB بمعاملات وrevisions ومنع overwrite من تبويب قديم.
- المصادقة تستخدم `@supabase/supabase-js` وPKCE، والجلسة محصورة في التبويب عبر `sessionStorage`.
- المزامنة تمر عبر RPC مع optimistic concurrency، تحقق schema/حجم، rate limiting، وسجل تدقيق محدود.
- حذف الحساب مؤجل 14 يومًا ويتطلب إعادة مصادقة، ويمكن إلغاؤه قبل التنفيذ.
- إصدار الإنتاج يولّد أصولًا content-hashed داخل `dist/`؛ لا تنشر ملفات المصدر مباشرة.

## تشغيل التطوير

يتطلب Node.js 20 أو أحدث.

```bash
npm ci
npm run build
python3 -m http.server 8080
```

افتح `http://localhost:8080`. الوضع السحابي يبقى معطلًا إلى أن تعدّل `config.js` وتطبّق migrations/functions.

## الاختبارات

```bash
npm run build
npm run check
npm audit
```

أو:

```bash
./tests/run.sh
```

تغطي الاختبارات الحالية طبقة التخزين المعاملاتية، عزل namespaces، تعارض revisions، النسخ والتحقق، quarantine، حدود الحجم، PKCE، CAPTCHA wiring، سياسة Service Worker، CSP، SQL hardening، وحزمة الإنتاج hashed. لا يوجد ادعاء بأن هذه بديل عن اختبار قاعدة Supabase حقيقية بحسابين أو اختبار متصفح end-to-end على بيئة الإنتاج.

## النشر

1. اتبع [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
2. عدّل `config.js` بالقيم العامة فقط.
3. نفّذ `npm run build` بعد تعديل config لكي يُولّد CSP لمضيف Supabase الدقيق.
4. انشر **محتويات `dist/` فقط**.

## الملفات المهمة

```text
app.js                                  منطق التطبيق والواجهات
storage.js                              IndexedDB، revisions، backups، quarantine
src/backend-entry.js                    عميل Supabase الرسمي وPKCE
supabase/migrations/001_*.sql            المخطط الأساسي وRLS
supabase/migrations/002_*.sql            التحقق، rate limits، audit، deletion queue
supabase/functions/delete-account/       جدولة حذف الحساب
supabase/functions/purge-deleted-accounts/ التنفيذ النهائي المجدول
scripts/build.mjs                        build hashed وService Worker متطابق
scripts/generate-security-config.mjs     CSP/headers حسب config
FIXES_AR.md                              حالة نتائج التدقيق بندًا بندًا
```

## حدود صريحة

- لا يوجد تشفير طرف إلى طرف؛ مشغل قاعدة البيانات يقع ضمن نموذج الثقة.
- XP والcredits عناصر تحفيزية محلية وليست قيمة مالية أو سجلًا موثوقًا للمنافسات والجوائز.
- نموذج السحابة ما زال وثيقة JSON واحدة محدودة بـ1.3 MB. هذا مناسب للاستخدام الفردي الحالي، وليس لتعاون جماعي واسع أو بيانات ضخمة.
- الواجهة تدعم RTL والثيمات والتباين والحركة المخفضة، لكن الترجمة العربية الكاملة لكل النصوص لم تُنجز بعد؛ خيار العربية الحالي يضبط اللغة/الاتجاه والتنسيق، لا يترجم كل النسخ.

## الترخيص

MIT — راجع [`LICENSE`](LICENSE).
