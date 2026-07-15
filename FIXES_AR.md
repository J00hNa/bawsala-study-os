# تقرير إصلاح Bawsala Study OS 4.0

## النتيجة التنفيذية

- نتائج التدقيق الأصلية: **126 بندًا**.
- مغلق في الشيفرة الحالية: **115**.
- مخفف لكنه يحتاج إعادة تصميم معماري/منتجي: **10**.
- مكتمل برمجيًا لكنه يحتاج إعداد واختبار نشر فعلي: **1**.
- مشكلات إضافية اكتُشفت أثناء الإصلاح وأُغلقت أو خُففت: **10**.

> لا توجد طريقة مهنية لإثبات غياب جميع العيوب المستقبلية. هذا التقرير يثبت ما غُيّر وما اختُبر وما لم يُختبر، ولا يبيع ادعاءً كاذبًا بأن البرنامج أصبح معصومًا.

## ما تغيّر جوهريًا

- استُبدل تخزين الحالة في `localStorage` بطبقة IndexedDB معاملاتية، مع namespaces، revisions، locks، backups، quarantine، ومسودات طوارئ.
- استُبدلت إدارة Auth اليدوية بـ`@supabase/supabase-js` مع PKCE وتبادل code صريح وجلسة محصورة داخل التبويب.
- أصبحت الاستيراد والاستعادة وإعادة الضبط عمليات قابلة للتراجع، ولا تستبدل البيانات قبل إنشاء نسخة متحقق منها.
- أضيف تحقق schema/حجم، rate limiting، request IDs، sync audit، backups سحابية غير قابلة للحذف، وحذف حساب مؤجل 14 يومًا.
- صُححت أخطاء المؤقت، البطاقات، Arena، التخطيط، البحث، CRUD، الإشعارات، المنطقة الزمنية، وتعارض التبويبات.
- أضيف onboarding وbackup manager وprivacy explanation وثيمات وRTL وhigh contrast وreduced motion وإصلاحات وصولية.
- أضيف build إنتاجي content-hashed وService Worker آمن نسبيًا وCSP مولدة حسب مضيف Supabase الدقيق.
- أضيفت سلسلة جودة: package lock، ESLint، Vitest، static/backend smoke، CI، npm audit، schema، types وترخيص.

## حالة البنود الأصلية

| البند | الحالة | المعالجة |
|---|---|---|
| `BAW-P0-001` — خلط وتسريب بيانات بين الحسابات على المتصفح نفسه | **مغلق** | أُغلق عبر عزل الحسابات، IndexedDB transactional، backups متحققة، import آمن، revisions، rollback، وإعادة مصادقة/حذف مؤجل. |
| `BAW-P0-002` — حقن جلسة عبر URL fragment / Login CSRF / Session Swapping | **مغلق** | أُغلق عبر عزل الحسابات، IndexedDB transactional، backups متحققة، import آمن، revisions، rollback، وإعادة مصادقة/حذف مؤجل. |
| `BAW-P0-003` — فشل النسخة الاحتياطية لا يوقف الاستبدال المدمر | **مغلق** | أُغلق عبر عزل الحسابات، IndexedDB transactional، backups متحققة، import آمن، revisions، rollback، وإعادة مصادقة/حذف مؤجل. |
| `BAW-P0-004` — الاستيراد يستبدل كل البيانات بلا تأكيد أو backup أو معاينة | **مغلق** | أُغلق عبر عزل الحسابات، IndexedDB transactional، backups متحققة، import آمن، revisions، rollback، وإعادة مصادقة/حذف مؤجل. |
| `BAW-P0-005` — الحفظ غير transactional والواجهة تعرض نجاحًا رغم الفشل | **مغلق** | أُغلق عبر عزل الحسابات، IndexedDB transactional، backups متحققة، import آمن، revisions، rollback، وإعادة مصادقة/حذف مؤجل. |
| `BAW-P0-006` — حدود حجم متناقضة تسمح بحالة لا يمكن حفظها أو مزامنتها | **مغلق** | أُغلق عبر عزل الحسابات، IndexedDB transactional، backups متحققة، import آمن، revisions، rollback، وإعادة مصادقة/حذف مؤجل. |
| `BAW-P0-007` — البيانات التالفة تُستبدل ببيانات demo بلا إنذار أو استرجاع | **مغلق** | أُغلق عبر عزل الحسابات، IndexedDB transactional، backups متحققة، import آمن، revisions، rollback، وإعادة مصادقة/حذف مؤجل. |
| `BAW-P0-008` — لا يوجد تنسيق بين التبويبات؛ آخر تبويب يكتب يمحو الآخر | **مغلق** | أُغلق عبر عزل الحسابات، IndexedDB transactional، backups متحققة، import آمن، revisions، rollback، وإعادة مصادقة/حذف مؤجل. |
| `BAW-P0-009` — حذف الحساب دائم بلا إعادة مصادقة حديثة | **مغلق** | أُغلق عبر عزل الحسابات، IndexedDB transactional، backups متحققة، import آمن، revisions، rollback، وإعادة مصادقة/حذف مؤجل. |
| `BAW-P0-010` — آخر جزء من الملاحظة قد يضيع عند الإغلاق | **مغلق** | أُغلق عبر عزل الحسابات، IndexedDB transactional، backups متحققة، import آمن، revisions، rollback، وإعادة مصادقة/حذف مؤجل. |
| `BAW-SEC-011` — تخزين refresh token في localStorage | **مغلق** | أُغلق عبر عميل Supabase الرسمي وPKCE، جلسة tab-scoped، CSP دقيقة، HTTPS فقط، validation، timeouts، rate limits وسجل تدقيق. |
| `BAW-SEC-012` — إعادة بناء إدارة Auth يدويًا | **مغلق** | أُغلق عبر عميل Supabase الرسمي وPKCE، جلسة tab-scoped، CSP دقيقة، HTTPS فقط، validation، timeouts، rate limits وسجل تدقيق. |
| `BAW-SEC-013` — سباق refresh token بين التبويبات | **مغلق** | أُغلق عبر عميل Supabase الرسمي وPKCE، جلسة tab-scoped، CSP دقيقة، HTTPS فقط، validation، timeouts، rate limits وسجل تدقيق. |
| `BAW-SEC-014` — انقطاع الشبكة أثناء refresh يتحول إلى “غير مسجل” | **مغلق** | أُغلق عبر عميل Supabase الرسمي وPKCE، جلسة tab-scoped، CSP دقيقة، HTTPS فقط، validation، timeouts، rate limits وسجل تدقيق. |
| `BAW-SEC-015` — تسجيل الخروج يمسح المحلي قبل التأكد من logout الخادم | **مغلق** | أُغلق عبر عميل Supabase الرسمي وPKCE، جلسة tab-scoped، CSP دقيقة، HTTPS فقط، validation، timeouts، rate limits وسجل تدقيق. |
| `BAW-SEC-016` — تسجيل الخروج يتجاهل فشل مزامنة dirty state | **مغلق** | أُغلق عبر عميل Supabase الرسمي وPKCE، جلسة tab-scoped، CSP دقيقة، HTTPS فقط، validation، timeouts، rate limits وسجل تدقيق. |
| `BAW-SEC-017` — رسائل أخطاء backend الخام تظهر في الواجهة | **مغلق** | أُغلق عبر عميل Supabase الرسمي وPKCE، جلسة tab-scoped، CSP دقيقة، HTTPS فقط، validation، timeouts، rate limits وسجل تدقيق. |
| `BAW-SEC-018` — Turnstile معطل في artifact الحالي | **يتطلب نشرًا** | جاهز برمجيًا لكنه غير قابل للإثبات دون مفاتيح Turnstile ومشروع Supabase حي؛ يجب تفعيله واختباره على staging قبل فتح التسجيل العام. |
| `BAW-SEC-019` — CSP تسمح بالاتصال بأي مشروع Supabase | **مغلق** | أُغلق عبر عميل Supabase الرسمي وPKCE، جلسة tab-scoped، CSP دقيقة، HTTPS فقط، validation، timeouts، rate limits وسجل تدقيق. |
| `BAW-SEC-020` — `style-src 'unsafe-inline'` | **مغلق** | أُغلق عبر عميل Supabase الرسمي وPKCE، جلسة tab-scoped، CSP دقيقة، HTTPS فقط، validation، timeouts، rate limits وسجل تدقيق. |
| `BAW-SEC-021` — لا Trusted Types | **مخفف/معماري** | مخفف جزئيًا: CSP صارمة، منع inline code، وتعقيم/ترميز؛ لم تُضف سياسة Trusted Types لأن التطبيق ما زال يحتاج تفكيك DOM أوسع قبل فرضها دون كسر الوظائف. |
| `BAW-SEC-022` — السماح بـHTTP في الموارد | **مغلق** | أُغلق عبر عميل Supabase الرسمي وPKCE، جلسة tab-scoped، CSP دقيقة، HTTPS فقط، validation، timeouts، rate limits وسجل تدقيق. |
| `BAW-SEC-023` — لا rate limiting خاص بمزامنة RPC | **مغلق** | أُغلق عبر عميل Supabase الرسمي وPKCE، جلسة tab-scoped، CSP دقيقة، HTTPS فقط، validation، timeouts، rate limits وسجل تدقيق. |
| `BAW-SEC-024` — لا request IDs أو telemetry أو audit trail | **مغلق** | أُغلق عبر عميل Supabase الرسمي وPKCE، جلسة tab-scoped، CSP دقيقة، HTTPS فقط، validation، timeouts، rate limits وسجل تدقيق. |
| `BAW-SEC-025` — `isConfigured()` يمنع custom domains/self-hosted Supabase | **مغلق** | أُغلق عبر عميل Supabase الرسمي وPKCE، جلسة tab-scoped، CSP دقيقة، HTTPS فقط، validation، timeouts، rate limits وسجل تدقيق. |
| `BAW-SEC-026` — كلمة المرور تتحقق بالطول فقط في العميل | **مغلق** | أُغلق عبر عميل Supabase الرسمي وPKCE، جلسة tab-scoped، CSP دقيقة، HTTPS فقط، validation، timeouts، rate limits وسجل تدقيق. |
| `BAW-SEC-027` — لا حماية من Unicode bidi/control spoofing في النصوص | **مغلق** | أُغلق عبر عميل Supabase الرسمي وPKCE، جلسة tab-scoped، CSP دقيقة، HTTPS فقط، validation، timeouts، rate limits وسجل تدقيق. |
| `BAW-SEC-028` — مفتاح Supabase المنشور ليس secret، لكن artifact مربوط بمشروع فعلي | **مغلق** | أُغلق عبر عميل Supabase الرسمي وPKCE، جلسة tab-scoped، CSP دقيقة، HTTPS فقط، validation، timeouts، rate limits وسجل تدقيق. |
| `BAW-DB-029` — تصميم “وثيقة JSON واحدة لكل مستخدم” لا يتوسع | **مخفف/معماري** | مخفف وحدود واضحة: الوثيقة السحابية بقيت JSON واحدة بحد 1.3 MB؛ يلزم نموذج جداول/أحداث إذا أصبح المنتج تعاونيًا أو كبير البيانات. |
| `BAW-DB-030` — تحقق الخادم من النوع والحجم فقط، لا schema | **مغلق** | أُغلق عبر schemaVersion/migrations، تحقق schema/حجم، RLS/privileges متسقة، backups غير قابلة للحذف، IDs، deletion queue وسجل مزامنة. |
| `BAW-DB-031` — لا schemaVersion أو migration pipeline للحالة | **مغلق** | أُغلق عبر schemaVersion/migrations، تحقق schema/حجم، RLS/privileges متسقة، backups غير قابلة للحذف، IDs، deletion queue وسجل مزامنة. |
| `BAW-DB-032` — سياسات INSERT/UPDATE/DELETE موجودة لكن privileges غير ممنوحة | **مغلق** | أُغلق عبر schemaVersion/migrations، تحقق schema/حجم، RLS/privileges متسقة، backups غير قابلة للحذف، IDs، deletion queue وسجل مزامنة. |
| `BAW-DB-033` — المستخدم يستطيع حذف backups السحابية الخاصة به عبر REST | **مغلق** | أُغلق عبر schemaVersion/migrations، تحقق schema/حجم، RLS/privileges متسقة، backups غير قابلة للحذف، IDs، deletion queue وسجل مزامنة. |
| `BAW-DB-034` — backup السحابي مرة واحدة في الساعة فقط وآخر 8 | **مغلق** | أُغلق عبر schemaVersion/migrations، تحقق schema/حجم، RLS/privileges متسقة، backups غير قابلة للحذف، IDs، deletion queue وسجل مزامنة. |
| `BAW-DB-035` — لا واجهة استعادة للنسخ السحابية | **مغلق** | أُغلق عبر schemaVersion/migrations، تحقق schema/حجم، RLS/privileges متسقة، backups غير قابلة للحذف، IDs، deletion queue وسجل مزامنة. |
| `BAW-DB-036` — العلاقات تعتمد اسم المادة بدل ID | **مغلق** | أُغلق عبر schemaVersion/migrations، تحقق schema/حجم، RLS/privileges متسقة، backups غير قابلة للحذف، IDs، deletion queue وسجل مزامنة. |
| `BAW-DB-037` — `safeId()` يولد ID عشوائيًا للمراجع غير الصالحة | **مغلق** | أُغلق عبر schemaVersion/migrations، تحقق schema/حجم، RLS/privileges متسقة، backups غير قابلة للحذف، IDs، deletion queue وسجل مزامنة. |
| `BAW-DB-038` — حذف الكيان يترك تاريخًا يتيمًا | **مغلق** | أُغلق عبر schemaVersion/migrations، تحقق schema/حجم، RLS/privileges متسقة، backups غير قابلة للحذف، IDs، deletion queue وسجل مزامنة. |
| `BAW-DB-039` — XP والcredits والإنجازات ليست موثوقة | **مخفف/معماري** | مخفف ومصرّح به: XP وcredits محلية تحفيزية فقط؛ لا تصلح لجوائز أو ترتيب موثوق قبل نقل الاحتساب والتحقق إلى الخادم. |
| `BAW-EDGE-040` — لا timeouts لطلبات Auth/Admin | **مغلق** | أُغلق عبر فحص البيئة/origin/body، مهلات، أخطاء آمنة، جدولة حذف منفصلة وcron محمي بسر. |
| `BAW-EDGE-041` — لا validation مبكر لمتغيرات البيئة | **مغلق** | أُغلق عبر فحص البيئة/origin/body، مهلات، أخطاء آمنة، جدولة حذف منفصلة وcron محمي بسر. |
| `BAW-EDGE-042` — تسجيل response detail الخام | **مغلق** | أُغلق عبر فحص البيئة/origin/body، مهلات، أخطاء آمنة، جدولة حذف منفصلة وcron محمي بسر. |
| `BAW-EDGE-043` — فهم خاطئ محتمل لدور Origin | **مغلق** | أُغلق عبر فحص البيئة/origin/body، مهلات، أخطاء آمنة، جدولة حذف منفصلة وcron محمي بسر. |
| `BAW-EDGE-044` — CORS يعيد أول origin مسموح حتى للطلب المرفوض | **مغلق** | أُغلق عبر فحص البيئة/origin/body، مهلات، أخطاء آمنة، جدولة حذف منفصلة وcron محمي بسر. |
| `BAW-EDGE-045` — hard delete فوري بلا grace period | **مغلق** | أُغلق عبر فحص البيئة/origin/body، مهلات، أخطاء آمنة، جدولة حذف منفصلة وcron محمي بسر. |
| `BAW-PWA-046` — تحديثات غير ذرّية وقد تخلط HTML جديدًا مع JS/CSS قديم | **مغلق** | أُغلق عبر build ذي بصمات محتوى، Service Worker allowlist، تحديث بموافقة، cache محدود، وعدم إرجاع HTML للأصول. |
| `BAW-PWA-047` — `skipWaiting()` و`clients.claim()` دون prompt | **مغلق** | أُغلق عبر build ذي بصمات محتوى، Service Worker allowlist، تحديث بموافقة، cache محدود، وعدم إرجاع HTML للأصول. |
| `BAW-PWA-048` — fallback يعيد `index.html` لأي GET فاشل | **مغلق** | أُغلق عبر build ذي بصمات محتوى، Service Worker allowlist، تحديث بموافقة، cache محدود، وعدم إرجاع HTML للأصول. |
| `BAW-PWA-049` — cache كل GET من نفس origin بلا allowlist | **مغلق** | أُغلق عبر build ذي بصمات محتوى، Service Worker allowlist، تحديث بموافقة، cache محدود، وعدم إرجاع HTML للأصول. |
| `BAW-PWA-050` — لا حد أو expiration للruntime cache | **مغلق** | أُغلق عبر build ذي بصمات محتوى، Service Worker allowlist، تحديث بموافقة، cache محدود، وعدم إرجاع HTML للأصول. |
| `BAW-PWA-051` — `cache.addAll()` يفشل التثبيت كله إذا فشل أصل واحد | **مغلق** | أُغلق عبر build ذي بصمات محتوى، Service Worker allowlist، تحديث بموافقة، cache محدود، وعدم إرجاع HTML للأصول. |
| `BAW-PWA-052` — تخزين `./` و`./index.html` معًا | **مغلق** | أُغلق عبر build ذي بصمات محتوى، Service Worker allowlist، تحديث بموافقة، cache محدود، وعدم إرجاع HTML للأصول. |
| `BAW-PWA-053` — manifest ضعيف وأيقونة SVG فقط | **مغلق** | أُغلق عبر build ذي بصمات محتوى، Service Worker allowlist، تحديث بموافقة، cache محدود، وعدم إرجاع HTML للأصول. |
| `BAW-PWA-054` — asset immutable غير versioned | **مغلق** | أُغلق عبر build ذي بصمات محتوى، Service Worker allowlist، تحديث بموافقة، cache محدود، وعدم إرجاع HTML للأصول. |
| `BAW-PWA-055` — شاشة boot ثابتة تبطئ كل تشغيل | **مغلق** | أُغلق عبر build ذي بصمات محتوى، Service Worker allowlist، تحديث بموافقة، cache محدود، وعدم إرجاع HTML للأصول. |
| `BAW-FE-056` — المؤقت غير دقيق في الخلفية أو sleep | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-057` — 31 ثانية قد تتحول إلى دقيقة كاملة ومكافأة | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-058` — المؤقت لا يستمر بعد reload/crash | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-059` — تحرير بطاقة ناضجة يحتفظ بجدول المراجعة القديم | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-060` — “Again” يؤجل لليوم التالي بدل relearning داخل الجلسة | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-061` — مقياس retention مضلل | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-062` — randomization منحاز | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-063` — `reviewAllMode` حالة ميتة تقريبًا | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-064` — Arena يحذف كل الأحرف غير ASCII | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-065` — قبول الإجابة بناءً على substring يمرر إجابات خاطئة | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-066` — منطق الفوز وHP متناقضان | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-067` — لا سجل أداء لكل سؤال | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-068` — planner يخفي جلسات خارج 08:00–21:59 | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-069` — planner يتجاهل مدة الجلسة والتداخل | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-070` — “Unscheduled quests” مبني على substring العنوان | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-071` — mastery formula تخفض المادة بلا بطاقات إلى 60% كحد أقصى | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-072` — starting progress يصبح شبه مهمل بعد وجود quests | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-073` — البحث العالمي لا يفتح النتيجة الدقيقة | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-074` — البحث O(N) لكل ضغطة وبدون debounce | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-075` — `renderAll()` يعيد رسم كل الصفحات المخفية | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-076` — قوائم ضخمة تبنى بـinnerHTML دون virtualization | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-077` — CRUD ناقص | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-078` — reset لا يمسح؛ يعيد demo data | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-079` — مستخدم جديد يبدأ بمستوى 7 و6450 XP وبيانات مزيفة | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-080` — partial imports تضيف demo records تلقائيًا | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-081` — لا undo للحذف | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-082` — notifications بلا نموذج read/unread أو إدارة | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-083` — challenge reward يمكن منحه عند render بعد import | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-084` — streak سهل جدًا للتلاعب | **مخفف/معماري** | مخفف ومصرّح به: streak محلي ويمكن التلاعب به؛ لا يُستخدم كدليل موثوق أو قيمة تنافسية. |
| `BAW-FE-085` — لا إعداد timezone | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-086` — full-state sync على كل تغيير | **مخفف/معماري** | مخفف: المزامنة bounded وبـrevision/rate limit/request ID، لكنها ما زالت full-state وليست delta/event sync. |
| `BAW-FE-087` — conflict UI لا يعرض فرقًا أو timestamps كافية | **مخفف/معماري** | مخفف: تعرض الواجهة revisions والأوقات والجهة وتمنع overwrite الصامت؛ لا يوجد field-by-field merge UI. |
| `BAW-FE-088` — نص “No data will be destroyed silently” غير صحيح | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-FE-089` — “Encrypting transport” صياغة مضللة | **مغلق** | أُغلق عبر تصحيح المؤقت والمراجعة وArena والتخطيط والبحث وCRUD/undo والإشعارات والـtimezone وتحميل القوائم على دفعات. |
| `BAW-A11Y-090` — حقول بلا accessible labels | **مغلق** | أُغلق عبر labels، أسماء أزرار، dialog semantics، focus trap/restore/inert، skip link، أهداف لمس، وإعلانات مساعدة مناسبة. |
| `BAW-A11Y-091` — أزرار الإغلاق اسمها المتاح “×” فقط | **مغلق** | أُغلق عبر labels، أسماء أزرار، dialog semantics، focus trap/restore/inert، skip link، أهداف لمس، وإعلانات مساعدة مناسبة. |
| `BAW-A11Y-092` — search overlay ليس dialog دلاليًا | **مغلق** | أُغلق عبر labels، أسماء أزرار، dialog semantics، focus trap/restore/inert، skip link، أهداف لمس، وإعلانات مساعدة مناسبة. |
| `BAW-A11Y-093` — modal لا يطبق focus trap/restore/inert | **مغلق** | أُغلق عبر labels، أسماء أزرار، dialog semantics، focus trap/restore/inert، skip link، أهداف لمس، وإعلانات مساعدة مناسبة. |
| `BAW-A11Y-094` — القائمة الجانبية على mobile بلا backdrop أو إدارة تركيز | **مغلق** | أُغلق عبر labels، أسماء أزرار، dialog semantics، focus trap/restore/inert، skip link، أهداف لمس، وإعلانات مساعدة مناسبة. |
| `BAW-A11Y-095` — لا Skip link | **مغلق** | أُغلق عبر labels، أسماء أزرار، dialog semantics، focus trap/restore/inert، skip link، أهداف لمس، وإعلانات مساعدة مناسبة. |
| `BAW-A11Y-096` — نصوص كثيرة أصغر من 12px | **مغلق** | أُغلق عبر labels، أسماء أزرار، dialog semantics، focus trap/restore/inert، skip link، أهداف لمس، وإعلانات مساعدة مناسبة. |
| `BAW-A11Y-097` — toast region `aria-live=polite` فقط | **مغلق** | أُغلق عبر labels، أسماء أزرار، dialog semantics، focus trap/restore/inert، skip link، أهداف لمس، وإعلانات مساعدة مناسبة. |
| `BAW-A11Y-098` — timer لا يعلن التغييرات للمساعدة التقنية | **مغلق** | أُغلق عبر labels، أسماء أزرار، dialog semantics، focus trap/restore/inert، skip link، أهداف لمس، وإعلانات مساعدة مناسبة. |
| `BAW-A11Y-099` — مساحات لمس صغيرة وخطوط أزرار صغيرة | **مغلق** | أُغلق عبر labels، أسماء أزرار، dialog semantics، focus trap/restore/inert، skip link، أهداف لمس، وإعلانات مساعدة مناسبة. |
| `BAW-UX-100` — planner mobile مجرد grid عريض أفقيًا | **مغلق** | أُغلق عبر onboarding، mobile agenda، backup/restore UI، حوارات غير مدمرة، dirty warnings، cloud metadata وشرح الخصوصية. |
| `BAW-UX-101` — dashboard لديه overflow داخلي على mobile | **مغلق** | أُغلق عبر onboarding، mobile agenda، backup/restore UI، حوارات غير مدمرة، dirty warnings، cloud metadata وشرح الخصوصية. |
| `BAW-UX-102` — double-click لإضافة جلسة غير مناسب للمس والكيبورد | **مغلق** | أُغلق عبر onboarding، mobile agenda، backup/restore UI، حوارات غير مدمرة، dirty warnings، cloud metadata وشرح الخصوصية. |
| `BAW-UX-103` — English-only وDark-only مقفلتان | **مخفف/معماري** | مخفف: أضيفت ثيمات وRTL وإعداد لغة/منطقة؛ الترجمة العربية الكاملة لكل النصوص لم تُنجز. |
| `BAW-UX-104` — كثافة jargon والأسماء اللعبية تقلل الوضوح | **مغلق** | أُغلق عبر onboarding، mobile agenda، backup/restore UI، حوارات غير مدمرة، dirty warnings، cloud metadata وشرح الخصوصية. |
| `BAW-UX-105` — لا onboarding حقيقي | **مغلق** | أُغلق عبر onboarding، mobile agenda، backup/restore UI، حوارات غير مدمرة، dirty warnings، cloud metadata وشرح الخصوصية. |
| `BAW-UX-106` — لا backup manager أو restore UI | **مغلق** | أُغلق عبر onboarding، mobile agenda، backup/restore UI، حوارات غير مدمرة، dirty warnings، cloud metadata وشرح الخصوصية. |
| `BAW-UX-107` — destructive actions تعتمد browser confirm | **مغلق** | أُغلق عبر onboarding، mobile agenda، backup/restore UI، حوارات غير مدمرة، dirty warnings، cloud metadata وشرح الخصوصية. |
| `BAW-UX-108` — لا تحذير عند إغلاق نموذج فيه تغييرات غير محفوظة | **مغلق** | أُغلق عبر onboarding، mobile agenda، backup/restore UI، حوارات غير مدمرة، dirty warnings، cloud metadata وشرح الخصوصية. |
| `BAW-UX-109` — cloud status لا يعرض آخر مزامنة والجهاز بوضوح | **مغلق** | أُغلق عبر onboarding، mobile agenda، backup/restore UI، حوارات غير مدمرة، dirty warnings، cloud metadata وشرح الخصوصية. |
| `BAW-UX-110` — لا privacy/terms/export explanation حول الحساب السحابي | **مغلق** | أُغلق عبر onboarding، mobile agenda، backup/restore UI، حوارات غير مدمرة، dirty warnings، cloud metadata وشرح الخصوصية. |
| `BAW-UI-111` — هوية بصرية قوية لكن readability ضعيفة | **مغلق** | أُغلق عبر light/system/high-contrast/reduced-motion، تحسين hierarchy والقراءة، وعدم الاعتماد على اللون وحده. |
| `BAW-UI-112` — hierarchy مزدحمة | **مغلق** | أُغلق عبر light/system/high-contrast/reduced-motion، تحسين hierarchy والقراءة، وعدم الاعتماد على اللون وحده. |
| `BAW-UI-113` — topbar mobile يتحول إلى رموز غامضة | **مغلق** | أُغلق عبر light/system/high-contrast/reduced-motion، تحسين hierarchy والقراءة، وعدم الاعتماد على اللون وحده. |
| `BAW-UI-114` — اللون وحده يحمل معنى في بعض الحالات | **مغلق** | أُغلق عبر light/system/high-contrast/reduced-motion، تحسين hierarchy والقراءة، وعدم الاعتماد على اللون وحده. |
| `BAW-UI-115` — لا high-contrast mode | **مغلق** | أُغلق عبر light/system/high-contrast/reduced-motion، تحسين hierarchy والقراءة، وعدم الاعتماد على اللون وحده. |
| `BAW-UI-116` — animation/fade يؤثر على لقطات وحالة الانتقال | **مغلق** | أُغلق عبر light/system/high-contrast/reduced-motion، تحسين hierarchy والقراءة، وعدم الاعتماد على اللون وحده. |
| `BAW-ENG-117` — ملف `app.js` أحادي ضخم | **مخفف/معماري** | مخفف: فُصل التخزين والـbackend والبناء والمخطط والاختبارات، لكن app.js ما زال كبيرًا ويحتاج تقسيمًا إلى وحدات مجال/واجهة. |
| `BAW-ENG-118` — لا TypeScript أو schema types | **مخفف/معماري** | مخفف: أضيف JSON Schema وType declarations وفحوصات runtime؛ لم تُحوّل الشيفرة كاملة إلى TypeScript. |
| `BAW-ENG-119` — لا package lock/lint/format/CI/coverage | **مغلق** | أُغلق عبر package lock، lint، اختبارات، CI، build hashed، recovery paths، توحيد الاستضافة، وترخيص MIT. |
| `BAW-ENG-120` — لا build pipeline أو asset fingerprinting | **مغلق** | أُغلق عبر package lock، lint، اختبارات، CI، build hashed، recovery paths، توحيد الاستضافة، وترخيص MIT. |
| `BAW-ENG-121` — لا error boundary أو recovery mode | **مغلق** | أُغلق عبر package lock، lint، اختبارات، CI، build hashed، recovery paths، توحيد الاستضافة، وترخيص MIT. |
| `BAW-ENG-122` — لا batching/delta persistence | **مخفف/معماري** | مخفف: الكتابة أصبحت queued/transactional وبـrevisions، لكن persistence والمزامنة ليستا delta-based. |
| `BAW-ENG-123` — التهيئة والرسم قبل حسم cloud identity | **مغلق** | أُغلق عبر package lock، lint، اختبارات، CI، build hashed، recovery paths، توحيد الاستضافة، وترخيص MIT. |
| `BAW-ENG-124` — إعدادات الاستضافة منجرفة | **مغلق** | أُغلق عبر package lock، lint، اختبارات، CI، build hashed، recovery paths، توحيد الاستضافة، وترخيص MIT. |
| `BAW-ENG-125` — HSTS includeSubDomains قرار واسع | **مغلق** | أُغلق عبر package lock، lint، اختبارات، CI، build hashed، recovery paths، توحيد الاستضافة، وترخيص MIT. |
| `BAW-ENG-126` — لا LICENSE | **مغلق** | أُغلق عبر package lock، lint، اختبارات، CI، build hashed، recovery paths، توحيد الاستضافة، وترخيص MIT. |

## مشكلات إضافية ظهرت أثناء الإصلاح

| البند | المشكلة | النتيجة |
|---|---|---|
| `NEW-001` | تسجيل الخروج كان يكمل رغم فشل حفظ/مزامنة تغييرات معلقة | أُغلق؛ العملية تتوقف وتبقي الجلسة والبيانات عند أي فشل. |
| `NEW-002` | إنشاء نسخ احتياطية مزدوجة في الاستيراد والاستعادة وإعادة الضبط | أُغلق؛ كل استبدال ينشئ نسخة واحدة متحققًا منها. |
| `NEW-003` | المؤقت ومسودات الطوارئ قد تعبر بين namespaces | أُغلق؛ المفاتيح والحالة transient أصبحت خاصة بالحساب. |
| `NEW-004` | إمكان تجاوز حد body بالاعتماد على Content-Length فقط | أُغلق؛ Edge Function تقيس UTF-8 bytes من النص الفعلي. |
| `NEW-005` | ثغرة حرجة في dependency اختبار قديمة | أُغلق برفع Vitest وإعادة lockfile؛ npm audit صفر عند التسليم. |
| `NEW-006` | أصول إنتاج غير fingerprinted تسمح بخلط الإصدارات | أُغلق؛ build ينتج أسماء content-hashed وSW/headers من نفس manifest. |
| `NEW-007` | سجل أسئلة Arena بلا تعديل أو حذف | أُغلق؛ CRUD كامل مع Undo. |
| `NEW-008` | بناء قوائم كبيرة دفعة واحدة قد يجمّد DOM | أُغلق جزئيًا وظيفيًا عبر incremental batching للبطاقات والأسئلة والمكتبة. |
| `NEW-009` | حالة حذف الحساب كانت تضيع من شاشة السحابة | أُغلق؛ الحالة والموعد والإلغاء ظاهرة ومستقرة. |
| `NEW-010` | سباق queued-save قد يحفظ snapshot أقدم بعد أحدث | أُغلق؛ الطابور يربط الكتابة ببصمة الحالة وrevision الحالي. |

## أدلة الاختبار عند التسليم

الأوامر:

```bash
npm ci
npm run build
npm run check
npm audit
```

النتائج المسجلة في نسخة التسليم:

- ESLint: ناجح.
- Vitest: 6/6 ناجحة.
- Static smoke: ناجح.
- Backend smoke: ناجح.
- npm audit: صفر ثغرات معروفة وقت الفحص.
- build: أصول JS/CSS ذات بصمات محتوى داخل `dist/` وService Worker/headers متطابقان معها.

## ما لم يُثبت داخل بيئة التسليم

- لم تُطبق migrations أو Edge Functions على مشروع Supabase حي، لذلك لا يوجد ادعاء بأن RLS وSMTP وredirect URLs وTurnstile وCron والحذف النهائي نجحت على خدمة فعلية.
- لم ينجح تشغيل Chromium headless بصورة موثوقة داخل الحاوية بسبب قيود البيئة؛ لا يوجد ادعاء باختبار E2E متصفح كامل.
- لم يُنفذ penetration test أو load test على staging حي.
- لا يوجد اختبار على Safari/iOS وFirefox/Android وأجهزة قارئ شاشة حقيقية.

## مخاطر باقية يجب عدم إخفائها

1. نموذج JSON الكامل مناسب لمنتج فردي محدود، وليس لتعاون واسع أو سجلات ضخمة.
2. XP/credits/streak غير موثوقة أمنيًا؛ لا تربط بها جوائز أو مالًا أو ترتيبًا رسميًا.
3. الواجهة ليست مترجمة عربيًا بالكامل رغم دعم RTL واللغة والتنسيق.
4. `app.js` ما زال كبيرًا، وتقسيمه إلى modules/domain services مطلوب قبل توسع فريق التطوير.
5. التعارضات تمنع الفقد الصامت لكنها لا تقدم دمجًا حقلًا بحقل.
6. Trusted Types غير مفروضة؛ الحماية الحالية تعتمد CSP الصارمة، تجنب inline code، والتعامل الآمن مع النصوص.

## بوابة الإطلاق السحابي

لا تفتح التسجيل العام قبل تنفيذ قائمة `docs/DEPLOYMENT.md` على staging: مشروعان/حسابان، تبويبان، شبكة متقطعة، تعارض revision، امتلاء الحصة، استعادة backup، Turnstile، بريد التأكيد، إعادة تعيين كلمة المرور، حذف/إلغاء/cron، وفحص CSP وService Worker عبر HTTPS.
