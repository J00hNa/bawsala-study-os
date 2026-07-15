# QA Report — Bawsala Study OS 4.0

## السلسلة الآلية

```bash
npm run build
npm run check
npm audit
```

النتيجة عند التسليم:

- ESLint: ناجح.
- Vitest: 6/6 اختبارات تخزين ناجحة.
- Static smoke: ناجح.
- Backend smoke: ناجح.
- npm audit: صفر ثغرات معروفة في شجرة الاعتمادات وقت الفحص.

## ما تختبره السلسلة

- عزل namespace لحسابين.
- optimistic local revision ومنع stale overwrite.
- backup write/read verification وquarantine.
- state/import byte limits.
- emergency drafts المنفصلة.
- PKCE، code exchange، sessionStorage، CAPTCHA payload، مهلات وأخطاء آمنة.
- عدم وجود inline handlers/styles مع CSP الصارمة.
- Service Worker allowlist، update prompt، وعدم HTML fallback للسكريبتات.
- SQL: RLS، schema validation، rate limiting، immutable cloud backups، sync audit، deletion queue/cancel.
- Edge: origin fail-closed، body byte limit، schedule vs purge separation، cron secret.
- manifest/icons.
- production build: filenames hashed وSW/headers متطابقان معها.

## اختبارات لم تُنفذ داخل بيئة التسليم

- لم يُربط مشروع Supabase حي، لذلك لم تُختبر RLS/SMTP/redirects/Turnstile أو وظائف الحذف على خدمة فعلية.
- محاولة Chromium headless في الحاوية لم تنتج جلسة end-to-end موثوقة؛ لا أدعي نجاح اختبار متصفح حقيقي.
- لا load test ولا penetration test على بنية حية دون تفويض وبيئة staging.

## بوابة الإصدار

لا تعتبر المشروع جاهزًا للمستخدمين السحابيين حتى تنجح قائمة قبول `docs/DEPLOYMENT.md` على HTTPS ومشروع staging بحسابين على الأقل.
