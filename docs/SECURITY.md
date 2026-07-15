# Security Model

## الأصول وحدود الثقة

نحمي بيانات الدراسة، جلسة المصادقة، سلامة المزامنة، النسخ الاحتياطية، وأسرار الخادم. كود المتصفح غير موثوق به كسلطة: المستخدم يستطيع تعديل الحالة المحلية وXP؛ لذلك لا يجوز استخدام النقاط كأموال أو نتائج تنافسية موثوقة.

## المتصفح

- IndexedDB هو مخزن الحالة والنسخ، مع transaction durability وrevision متوقع.
- namespace منفصل للملف المجهول ولكل user ID.
- BroadcastChannel + lock يمنعان التبويب القديم من الكتابة فوق revision أحدث.
- مسودة طوارئ لكل namespace تقلل فقد آخر تحرير للملاحظة.
- جلسة Auth محصورة في `sessionStorage`، مع fallback ذاكرة يفشل مغلقًا.
- تدفق Auth هو PKCE/code exchange؛ لا يقبل التطبيق access/refresh tokens من URL.
- CSP لا يسمح inline script أو inline style، ويقيد `connect-src` بمضيف Supabase المحدد أثناء build.
- Service Worker لا يعترض cross-origin، ولا يخزن API/Auth، ولا يعيد HTML لطلب JavaScript فاشل.

## قاعدة البيانات

- RLS و`FORCE ROW LEVEL SECURITY` على البيانات، النسخ، طلبات الحذف وسجل المزامنة.
- الكتابة لا تتم بـUPDATE مباشر، بل عبر `sync_study_state` مع expected revision وقفل advisory.
- الخادم يتحقق من schemaVersion، البنية، الحجم الإجمالي وحدود collections.
- حد 60 طلب مزامنة في الدقيقة لكل مستخدم.
- النسخ السحابية غير قابلة للحذف من دور `authenticated`.
- سجل المزامنة لا يحتوي payload؛ يحتفظ بالنتيجة وrevision وrequest ID لمدة 90 يومًا.

## Edge Functions

- `delete-account` يتحقق من Origin دقيق، method، body bytes، جلسة Bearer، وعبارة التأكيد، ثم يجدول الحذف فقط.
- `purge-deleted-accounts` محمي بسر cron منفصل وينفذ الطلبات المستحقة بعد فترة السماح.
- `service_role` لا يظهر في الواجهة ولا `config.js`.
- متغيرات البيئة تفشل مغلقًا، وطلبات الشبكة لها timeouts.

## مخاطر متبقية مقصودة

- لا Trusted Types policy حاليًا. جميع نصوص المستخدم تمر عبر `textContent` أو escaping قبل قوالب HTML، وCSP تمنع inline script، لكن الانتقال إلى DOM builders/Trusted Types يبقى تحسينًا دفاعيًا إضافيًا.
- لا end-to-end encryption.
- نموذج JSON الواحد محدود ومناسب لتطبيق فردي، لا لمنصة تعاون ضخمة.
- لا توجد MFA UI داخل التطبيق؛ يمكن فرض سياسات إضافية في Supabase خارج الواجهة.
- الاختبارات المحلية لا تثبت RLS أو SMTP أو redirects في مشروع إنتاج لم يُنشر.

## ما قبل الإطلاق

- طبّق كل migrations وتحقق من `supabase migration list`.
- فعّل تأكيد البريد وCustom SMTP واختبر signup/recovery.
- فعّل Turnstile في الواجهة وSupabase مع hostnames دقيقة.
- ضع origins دقيقة في Secrets.
- انشر `dist/` بعد build من config الإنتاج.
- شغّل اختبارًا بحسابين ومتصفحين وتبويبين، offline/online، conflict، backup/restore، وفترة حذف/إلغاء.
- افحص Git history بحثًا عن أسرار، وشغّل Security Advisor و`npm audit`.

## الإبلاغ الأمني

لا تضع أسرارًا أو بيانات مستخدم في Issue عام. أرسل وصفًا مختصرًا، خطوات إعادة الإنتاج، request ID والوقت عبر قناة خاصة لمالك المشروع.
