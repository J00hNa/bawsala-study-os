# تقرير معالجة تدقيق Bawsala Study OS

**نسخة التسليم:** `16.0.1`

## الحكم الصريح

أُغلقت كل الأعطال الحرجة التي أمكن إغلاقها داخل الكود، لكن عبارة «تم حل كل شيء» ستكون كذبة. بقيت قيود معمارية وقانونية وتشغيلية لا تُحل بترقيع مستودع واحد: تعدد النسخ، قاعدة البيانات المتزامنة، workers الخارجية، تشفير بيانات المتصفح، تحقق عمر/ولي أمر، واختبارات مزودات staging الحقيقية. النسخة الحالية أقوى بكثير وقابلة للاختبار، لكنها ليست تصريحاً آلياً بالإطلاق التجاري.

## النتيجة

- **مصحح ومختبر:** 64 من 105.
- **مخفف مع قيد معروف:** 30 من 105.
- **غير مغلق ويحتاج إعادة معمارية أو قراراً خارجياً:** 11 من 105.

## ما تم تنفيذه فعلياً

- إصلاح الزمن والتقويم وDST والتذكيرات المجدولة وعدم الثقة بساعة العميل.
- تقوية البريد بطوابير ذات lease واسترجاع وdead-letter وbackpressure.
- تقوية الفوترة: idempotency، replay protection، تطابق السعر/المبلغ/العملة، وعدم تمرير PII في الروابط.
- استيراد واستعادة ذرية مع schema validation وrestore points وrollback.
- MFA إلزامي للإدارة، ربط بصمة المدير، وإغلاق DNS rebinding.
- تحسين الهاتف: 44px، pagination للمصادر، حاسبة واحدة، وتقليل overlays.
- إصلاح Docker healthcheck، صورة متعددة المراحل ومثبتة digest، وتشغيل الحاوية وفحصها في CI.
- CodeQL وGitleaks وSBOM وimage scan وprovenance وDependabot.
- ميزانيات أداء لكل مسار وتغطية V8 وبوابة Chromium فعلية عبر الخادم.
- الفوترة fail-closed حتى اكتمال هوية المشغل والضرائب والبريد القانوني وسياسة الاسترداد.

## نتائج التحقق في هذه البيئة

- `npm run check:all`: جميع المراحل التي انتهت قبل حد تنفيذ البيئة نجحت، ثم انتهى الأمر بسبب timeout خارجي بعد نجاح Chromium المعزول.
- شُغّل ذيل البوابة منفصلاً ونجح: launch، production upgrade، stage 9/10، security regression، hardening، server smoke، release check.
- `npm run test:coverage`: نجح — 43.6% إجمالي، 38.2% للخادم، 56.5% لوحدات `lib`.
- `npm audit --omit=dev`: صفر ثغرات معروفة وقت الفحص.
- مسار Chromium عبر HTTP الحقيقي موجود، لكن Chromium المحلي محكوم بسياسة managed `URLBlocklist: ["*"]` فتم تخطي الجزء المرئي محلياً بعد نجاح assertions الخادم؛ CI غير المقيّد سيشغله كاملاً.
- Docker غير مثبت في بيئة العمل الحالية، لذلك لم تُبنَ الصورة محلياً؛ CI صار يبنيها ويشغلها ويفحص health/vulnerabilities.

## البنود التي تمنع ادعاء «جاهز بلا شروط»

- نسخة خادم واحدة فقط، ولا يوجد session store أو queue موزع.
- `server.js` و`workspace.js` ما زالا كبيرين، وSQLite متزامن.
- البريد والنسخ والتنظيف والتذكيرات داخل web process.
- لا توجد reconciliation دورية كاملة مع مزود الدفع.
- localStorage ليس مشفراً بمفتاح مستقل عن JavaScript.
- لا يوجد تحقق أبوي/هوية للعمر؛ self-attestation فقط.
- لا توجد اختبارات staging حقيقية لـGoogle/Stripe/mail/backup.
- لا يوجد bundler حديث مع code splitting/source maps، وبعض UX ما زال طويلاً/card-heavy.

## مصفوفة البنود الـ105

### QA-001 — بوابة الجودة الشاملة مكسورة فعلياً
- **الخطورة:** حرج — **المجال:** الجودة والإصدار
- **الحالة:** مصحح ومختبر
- **المعالجة:** أُصلح نطاق check.mjs، وأصبحت بوابة check:all تعمل على ملفات المنتج فقط بدل إدخال تقارير الإصلاح ضمن صفحات الإنتاج.
- **التحقق:** npm run check:all + .github/workflows/ci.yml

### QA-002 — تقرير التحقق الداخلي يقدم نتيجة غير صحيحة
- **الخطورة:** حرج — **المجال:** الجودة والإصدار
- **الحالة:** مصحح ومختبر
- **المعالجة:** استُبدلت نتيجة التحقق الثابتة بملخص دورة تشغيل يولده precheck/postcheck، وحُظر ادعاء جاهزية رقمي غير ناتج عن الاختبارات.
- **التحقق:** npm run check:all + .github/workflows/ci.yml

### QA-003 — مسار CI الأساسي محكوم عليه بالفشل
- **الخطورة:** عالٍ — **المجال:** الجودة والإصدار
- **الحالة:** مصحح ومختبر
- **المعالجة:** أعيد بناء CI إلى وظائف مستقلة للوحدات والمتصفح والتكامل والأمن والتغطية والحاوية.
- **التحقق:** npm run check:all + .github/workflows/ci.yml

### QA-004 — اختبار المتصفح لا يختبر التطبيق الحقيقي عبر الخادم
- **الخطورة:** عالٍ — **المجال:** الاختبارات
- **الحالة:** مصحح ومختبر
- **المعالجة:** أضيف http-browser-e2e.mjs لتشغيل خادم حقيقي ثم فتح الصفحات عبر Chromium وتنفيذ signup وحساب مصادق.
- **التحقق:** npm run check:all + .github/workflows/ci.yml

### QA-005 — اختبار المتصفح يستبدل البيئة الحساسة بمحاكيات
- **الخطورة:** عالٍ — **المجال:** الاختبارات
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** بقي اختبار DOM المعزول بمحاكياته لأنه مفيد كوحدة، لكن لم يعد الدليل الوحيد؛ أضيف مسار E2E بخادم وواجهات API حقيقية.
- **التحقق:** npm run check:all + .github/workflows/ci.yml

### QA-006 — اختبار الواجهة يزيل CSP قبل التشغيل
- **الخطورة:** عالٍ — **المجال:** الاختبارات والأمن
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** الاختبار المعزول ما زال يزيل CSP لحقن الملفات، لكن مسار E2E الجديد لا يزيل CSP ويتحقق من ترويسة CSP الفعلية.
- **التحقق:** npm run check:all + .github/workflows/ci.yml

### QA-007 — عدد كبير من اختبارات الجاهزية يعتمد على مؤشرات نصية
- **الخطورة:** متوسط — **المجال:** الاختبارات
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** أضيفت اختبارات سلوكية للخادم والفوترة وMFA والتقويم والاستعادة وChromium؛ ما زالت بعض اختبارات الجاهزية النصية موجودة كحواجز إضافية لا كدليل وحيد.
- **التحقق:** npm run check:all + .github/workflows/ci.yml

### QA-008 — ميزانية الأداء لكل ملف لا لكل مسار
- **الخطورة:** عالٍ — **المجال:** الأداء والاختبارات
- **الحالة:** مصحح ومختبر
- **المعالجة:** ميزانية الأداء أصبحت لكل مسار وتشمل HTML والأصول المحلية المباشرة واعتماديات CSS.
- **التحقق:** npm run check:all + .github/workflows/ci.yml

### QA-009 — مقياس totalTransfer لا يمثل أي زيارة فعلية
- **الخطورة:** متوسط — **المجال:** الأداء والاختبارات
- **الحالة:** مصحح ومختبر
- **المعالجة:** يُحسب الآن payload زيارة كل مسار، ويُعرض أثقل مسار فعلي بجانب الحجم الكلي للمستودع المنشور.
- **التحقق:** npm run check:all + .github/workflows/ci.yml

### QA-010 — لا توجد قياسات تغطية للكود والفروع
- **الخطورة:** متوسط — **المجال:** الاختبارات
- **الحالة:** مصحح ومختبر
- **المعالجة:** أضيفت بوابة V8 دقيقة نسبياً للمدى المنفذ: 43.6% إجمالي، 38.2% للخادم، 56.5% لوحدات lib.
- **التحقق:** npm run check:all + .github/workflows/ci.yml

### QA-011 — CI يفتقد فحوص SAST وSBOM وcontainer scan وprovenance
- **الخطورة:** متوسط — **المجال:** سلسلة التوريد
- **الحالة:** مصحح ومختبر
- **المعالجة:** أضيف CodeQL، Gitleaks، npm audit، CycloneDX SBOM، فحص صورة Anchore، وتشهد provenance.
- **التحقق:** npm run check:all + .github/workflows/ci.yml

### QA-012 — GitHub Actions مثبتة على tags متحركة
- **الخطورة:** متوسط — **المجال:** سلسلة التوريد
- **الحالة:** مصحح ومختبر
- **المعالجة:** ثُبتت جميع GitHub Actions ببصمات commit SHA مع Dependabot للتحديثات.
- **التحقق:** npm run check:all + .github/workflows/ci.yml

### QA-013 — CI يبني الحاوية ولا يشغلها أو يتحقق من healthcheck
- **الخطورة:** عالٍ — **المجال:** النشر والاختبارات
- **الحالة:** مصحح ومختبر
- **المعالجة:** وظيفة الحاوية تبني الصورة، تشغلها بإعداد إنتاج، تنتظر Docker HEALTHCHECK، تفحص liveness ثم تفحص الثغرات.
- **التحقق:** npm run check:all + .github/workflows/ci.yml

### QA-014 — لا توجد اختبارات staging حقيقية للمزودات الخارجية
- **الخطورة:** متوسط — **المجال:** التكاملات
- **الحالة:** غير مغلق — يتطلب إعادة معمارية/قرار خارجي
- **المعالجة:** لا يمكن اختبار Stripe/Google/SMTP/backup vault الحقيقي من دون حسابات staging ومفاتيح وبيئة خارجية. أضيفت mocks خادمية وعقود صارمة، لكن اختبار staging يبقى عملاً تشغيلياً خارج المستودع.
- **التحقق:** npm run check:all + .github/workflows/ci.yml

### DEP-001 — Docker HEALTHCHECK يفشل في إعداد الإنتاج الموثق
- **الخطورة:** حرج — **المجال:** Docker والنشر
- **الحالة:** مصحح ومختبر
- **المعالجة:** مسار /api/health/live صار متاحاً للـloopback قبل رفض Host/HTTPS، وCI يشغل الحاوية ويتحقق من health status.
- **التحقق:** npm run check:all + .github/workflows/ci.yml

### DEP-002 — صورة Docker تنسخ المستودع كاملاً
- **الخطورة:** متوسط — **المجال:** Docker والنشر
- **الحالة:** مصحح ومختبر
- **المعالجة:** Dockerfile متعدد المراحل وينسخ ملفات التشغيل المحددة فقط، مع .dockerignore أضيق.
- **التحقق:** npm run check:all + .github/workflows/ci.yml

### DEP-003 — صورة الأساس غير مثبتة بـdigest
- **الخطورة:** متوسط — **المجال:** Docker والنشر
- **الحالة:** مصحح ومختبر
- **المعالجة:** ثُبتت صورة node:22-bookworm-slim على multi-platform index digest موثق.
- **التحقق:** npm run check:all + .github/workflows/ci.yml

### DEP-004 — الإنتاج يفرض نسخة واحدة فقط
- **الخطورة:** عالٍ — **المجال:** القابلية للتوسع
- **الحالة:** غير مغلق — يتطلب إعادة معمارية/قرار خارجي
- **المعالجة:** التطبيق ما زال يفرض نسخة واحدة لأن الجلسات والمهام والحالة ليست موزعة. إغلاقه يحتاج PostgreSQL/Redis/queue وهجرة تشغيلية، لا patch آمن داخل هذه النسخة.
- **التحقق:** npm run check:all + .github/workflows/ci.yml

### DEP-005 — مهام البريد والتنظيف والنسخ تعمل داخل web process
- **الخطورة:** عالٍ — **المجال:** التشغيل
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** أضيفت leases واسترجاع jobs العالقة وdead-letter، لكن البريد والتنظيف والتذكيرات والنسخ ما زالت timers داخل web process.
- **التحقق:** npm run check:all + .github/workflows/ci.yml

### DEP-006 — نسخة احتياطية عند كل بدء تشغيل دون شرط فعلي
- **الخطورة:** متوسط — **المجال:** التشغيل
- **الحالة:** مصحح ومختبر
- **المعالجة:** النسخ عند الإقلاع معطلة افتراضياً ولا تعمل إلا عند BAWSALA_BACKUP_ON_STARTUP=true؛ الجدولة المنفصلة تبقى متاحة.
- **التحقق:** npm run check:all + .github/workflows/ci.yml

### BE-001 — `server.js` God Object بحجم 4,647 سطراً
- **الخطورة:** عالٍ — **المجال:** معمارية Backend
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** أُخرجت وحدات للمنطقة الزمنية والعقود والشبكة والتخزين، لكن server.js ما زال نحو 5000 سطر. تفكيكه الكامل يحتاج إعادة هيكلة متعددة المراحل.
- **التحقق:** Static/integration gates; architectural items require production migration tests

### BE-002 — `workspace.js` Controller ضخم بحجم 924 سطراً
- **الخطورة:** متوسط — **المجال:** معمارية Frontend
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** أضيفت خدمات مشتركة وتحسينات، لكن workspace.js ما زال controller كبيراً ولم يُفكك إلى وحدات ميزات مستقلة.
- **التحقق:** Static/integration gates; architectural items require production migration tests

### BE-003 — حالة عالمية mutable محملة كاملة في الذاكرة
- **الخطورة:** عالٍ — **المجال:** التخزين
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** التخزين صار أكثر تحققاً وعمليات الاستعادة ذرية، لكن كائن الحالة العالمي داخل العملية ما زال قائماً.
- **التحقق:** Static/integration gates; architectural items require production migration tests

### BE-004 — SQLite متزامن يحجب event loop
- **الخطورة:** عالٍ — **المجال:** الأداء Backend
- **الحالة:** غير مغلق — يتطلب إعادة معمارية/قرار خارجي
- **المعالجة:** DatabaseSync المتزامن ما زال قادراً على حجب event loop تحت الحمل. الحل الحقيقي worker threads أو driver async/قاعدة خارجية.
- **التحقق:** Static/integration gates; architectural items require production migration tests

### BE-005 — كل حفظ يطبع ويقارن الحالة الواسعة
- **الخطورة:** عالٍ — **المجال:** الأداء Backend
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** قلّ خطر الكتابات الخاطئة عبر transactions وCAS والتحقق، لكن مسار حفظ الحالة الواسع لم يُلغ بالكامل.
- **التحقق:** Static/integration gates; architectural items require production migration tests

### BE-006 — قنوات السجل تعاد كتابتها كاملة عند أي تغيير
- **الخطورة:** عالٍ — **المجال:** التخزين والسجلات
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** أصبحت أحداث الأمن JSONL وبعض العمليات incremental، لكن قنوات حالة أخرى ما زالت قابلة لإعادة كتابة واسعة.
- **التحقق:** Static/integration gates; architectural items require production migration tests

### BE-007 — سجلات مهمة محدودة بعدد صغير داخل الحالة
- **الخطورة:** متوسط — **المجال:** التدقيق والأمن
- **الحالة:** غير مغلق — يتطلب إعادة معمارية/قرار خارجي
- **المعالجة:** حدود الاحتفاظ أصبحت أوضح لبعض الطوابير والسجلات، لكن بعض السجلات داخل الحالة ما زالت bounded arrays وليست مخزن أحداث مستقل.
- **التحقق:** Static/integration gates; architectural items require production migration tests

### BE-008 — المقاييس داخل الذاكرة وتبدأ من الصفر بعد restart
- **الخطورة:** متوسط — **المجال:** الرصد
- **الحالة:** غير مغلق — يتطلب إعادة معمارية/قرار خارجي
- **المعالجة:** المقاييس ما زالت process-local وتُصفّر عند restart. يلزم Prometheus/OTel backend خارجي لإغلاق البند.
- **التحقق:** Static/integration gates; architectural items require production migration tests

### BE-009 — درجة Production Pulse مقياس مخصص يوحي بثقة زائفة
- **الخطورة:** عالٍ — **المجال:** الرصد والقرارات
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** أزيل ادعاء الجاهزية الرقمي من بوابات الإصدار ووُصف النبض كإشارة تشغيل داخلية، لكن لوحة الإدارة ما زالت تعرض score مخصصاً.
- **التحقق:** Static/integration gates; architectural items require production migration tests

### BE-010 — وجود catches صامتة في مسارات التخزين والواجهة
- **الخطورة:** متوسط — **المجال:** الرصد
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** أزيلت catches صامتة من المسارات الحرجة وأصبحت أخطاء التخزين والمزامنة مرئية؛ بقيت catches مقصودة لأعمال best-effort والواجهة.
- **التحقق:** Static/integration gates; architectural items require production migration tests

### SEC-001 — لا توجد MFA/WebAuthn للحسابات الإدارية
- **الخطورة:** عالٍ — **المجال:** أمن الحسابات
- **الحالة:** مصحح ومختبر
- **المعالجة:** أضيف TOTP للإدارة مع سر مشفر ورموز استرداد أحادية الاستخدام، وتُحجب مسارات admin حتى تفعيل MFA.
- **التحقق:** tools/security-unit-tests.mjs + tools/security-regression.mjs + tools/production-hardening-tests.mjs

### SEC-002 — ربط الجلسة بالبصمة معطل افتراضياً
- **الخطورة:** متوسط — **المجال:** أمن الجلسات
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** بصمة جلسة المدير صارمة دائماً. ربط جلسات الطلاب العامة يبقى اختيارياً لتجنب كسر الأجهزة المتغيرة، لذلك الخطر خُفف ولم يُلغ كلياً.
- **التحقق:** tools/security-unit-tests.mjs + tools/security-regression.mjs + tools/production-hardening-tests.mjs

### SEC-003 — فحص DNS عرضة لـDNS rebinding/TOCTOU
- **الخطورة:** عالٍ — **المجال:** SSRF
- **الحالة:** مصحح ومختبر
- **المعالجة:** اتصال HTTP/TLS يستخدم عنوان IP نفسه الذي اجتاز DNS/private-range validation، فأُغلق TOCTOU/DNS rebinding.
- **التحقق:** tools/security-unit-tests.mjs + tools/security-regression.mjs + tools/production-hardening-tests.mjs

### SEC-004 — سطح DOM XSS واسع جداً
- **الخطورة:** متوسط — **المجال:** XSS
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** عولجت نقاط حساسة وأضيفت اختبارات escaping وDOM-only في auth-status، لكن استخدام innerHTML الواسع ما زال ديناً أمنياً.
- **التحقق:** tools/security-unit-tests.mjs + tools/security-regression.mjs + tools/production-hardening-tests.mjs

### SEC-005 — escape في auth-status يفشل بوضع fail-open
- **الخطورة:** متوسط — **المجال:** XSS
- **الحالة:** مصحح ومختبر
- **المعالجة:** auth-status صار يبني DOM بـtextContent ولا يملك مسار escape fail-open.
- **التحقق:** tools/security-unit-tests.mjs + tools/security-regression.mjs + tools/production-hardening-tests.mjs

### SEC-006 — رابط إعادة التعيين التطويري يدخل raw HTML
- **الخطورة:** منخفض — **المجال:** XSS
- **الحالة:** مصحح ومختبر
- **المعالجة:** رابط إعادة التعيين التطويري يُنشأ بعناصر DOM وURL من نفس origin بدلاً من raw HTML.
- **التحقق:** tools/security-unit-tests.mjs + tools/security-regression.mjs + tools/production-hardening-tests.mjs

### SEC-007 — اسم `cleanText` مضلل وليس sanitizer HTML
- **الخطورة:** متوسط — **المجال:** التحقق من المدخلات
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** لم يعد cleanText يُعامل كـHTML sanitizer في المسارات الحساسة، لكن الاسم والدالة العامة ما زالا موجودين ويجب استبدالهما بعقود سياقية عند التفكيك.
- **التحقق:** tools/security-unit-tests.mjs + tools/security-regression.mjs + tools/production-hardening-tests.mjs

### CAL-001 — الوقت المحلي يفسر كأنه UTC
- **الخطورة:** حرج — **المجال:** التقويم
- **الحالة:** مصحح ومختبر
- **المعالجة:** أضيف تحويل wall-time ↔ instant باستخدام IANA timezone بدلاً من تفسير الوقت المحلي كـUTC.
- **التحقق:** tools/timezone-tests.mjs + tools/server-smoke.mjs

### CAL-002 — إرسال Google يجمع ISO UTC مع timeZone بشكل متناقض
- **الخطورة:** عالٍ — **المجال:** Google Calendar
- **الحالة:** مصحح ومختبر
- **المعالجة:** Google export يرسل dateTime instant صحيحاً مع timeZone متسق.
- **التحقق:** tools/timezone-tests.mjs + tools/server-smoke.mjs

### CAL-003 — سحب Google يقتطع التاريخ والوقت من UTC string
- **الخطورة:** عالٍ — **المجال:** Google Calendar
- **الحالة:** مصحح ومختبر
- **المعالجة:** Google import يحول instant إلى wall time في المنطقة المحددة بدل اقتطاع ISO UTC.
- **التحقق:** tools/timezone-tests.mjs + tools/server-smoke.mjs

### CAL-004 — فلاتر المدى مبنية على حدود يوم UTC
- **الخطورة:** عالٍ — **المجال:** التقويم
- **الحالة:** مصحح ومختبر
- **المعالجة:** فلاتر المدى تستخدم zonedDayBounds لا حدود UTC العمياء.
- **التحقق:** tools/timezone-tests.mjs + tools/server-smoke.mjs

### CAL-005 — لا يوجد dispatcher مجدول للتذكيرات
- **الخطورة:** حرج — **المجال:** التذكيرات
- **الحالة:** مصحح ومختبر
- **المعالجة:** أضيف dispatcher خادمي كل دقيقة للتذكيرات المستحقة.
- **التحقق:** tools/timezone-tests.mjs + tools/server-smoke.mjs

### CAL-006 — الخادم يثق بوقت `now` القادم من العميل
- **الخطورة:** عالٍ — **المجال:** التذكيرات والأمن المنطقي
- **الحالة:** مصحح ومختبر
- **المعالجة:** الخادم يتجاهل now القادم من العميل ويستخدم ساعة الخادم.
- **التحقق:** tools/timezone-tests.mjs + tools/server-smoke.mjs

### CAL-007 — الأحداث القديمة جداً ما زالت مؤهلة للإرسال
- **الخطورة:** عالٍ — **المجال:** التذكيرات
- **الحالة:** مصحح ومختبر
- **المعالجة:** أضيف حد أقصى للتأخير REMINDER_MAX_LATE لمنع إرسال أحداث قديمة جداً.
- **التحقق:** tools/timezone-tests.mjs + tools/server-smoke.mjs

### CAL-008 — تعديل الموعد لا يعيد تفعيل التذكير
- **الخطورة:** عالٍ — **المجال:** التذكيرات
- **الحالة:** مصحح ومختبر
- **المعالجة:** تعديل موعد/تذكير يعيد reset لحالة الإرسال.
- **التحقق:** tools/timezone-tests.mjs + tools/server-smoke.mjs

### CAL-009 — أحداث Google all-day تفقد دلالتها
- **الخطورة:** متوسط — **المجال:** التقويم
- **الحالة:** مصحح ومختبر
- **المعالجة:** أحداث all-day تحتفظ بـdate/endDate بدلاً من تحويلها إلى وقت مزيف.
- **التحقق:** tools/timezone-tests.mjs + tools/server-smoke.mjs

### CAL-010 — التحقق من timezone شكلي فقط
- **الخطورة:** متوسط — **المجال:** التقويم
- **الحالة:** مصحح ومختبر
- **المعالجة:** التحقق صار عبر Intl/IANA فعلي مع اختبارات مناطق صالحة وغير صالحة وDST.
- **التحقق:** tools/timezone-tests.mjs + tools/server-smoke.mjs

### CAL-011 — رسالة الواجهة توحي بالإرسال قبل التسليم
- **الخطورة:** متوسط — **المجال:** UX التقويم
- **الحالة:** مصحح ومختبر
- **المعالجة:** الواجهة تقول تم تجهيز التذكير للإرسال ولا تدعي أنه سُلّم قبل نتيجة مزود البريد.
- **التحقق:** tools/timezone-tests.mjs + tools/server-smoke.mjs

### MAIL-001 — عنصر البريد قد يعلق في `sending` إلى الأبد
- **الخطورة:** عالٍ — **المجال:** البريد والمهام
- **الحالة:** مصحح ومختبر
- **المعالجة:** أضيف lease واسترجاع تلقائي لعناصر sending المتقادمة وdead-letter بعد الحد الأقصى.
- **التحقق:** tools/server-smoke.mjs + tools/production-hardening-tests.mjs

### MAIL-002 — إمكانية إرسال مكرر بعد crash
- **الخطورة:** عالٍ — **المجال:** البريد والمهام
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** أضيف idempotency header ثابت وتثبيت حالة قبل/بعد الإرسال؛ التكرار بعد crash يبقى ممكناً إذا كان المزود نفسه لا يدعم idempotency.
- **التحقق:** tools/server-smoke.mjs + tools/production-hardening-tests.mjs

### MAIL-003 — الطابور يحذف الأقدم بصمت عند 500
- **الخطورة:** عالٍ — **المجال:** البريد والبيانات
- **الحالة:** مصحح ومختبر
- **المعالجة:** أزيل حذف الأقدم الصامت واستُبدل backpressure وحد أقصى واضح.
- **التحقق:** tools/server-smoke.mjs + tools/production-hardening-tests.mjs

### MAIL-004 — العامل داخل العملية بحد 20 كل دورة دون SLA واضح
- **الخطورة:** متوسط — **المجال:** البريد والمهام
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** كبرت الدفعات وأضيفت leases ومقاييس/حالات، لكن العامل ما زال داخل العملية ولا يوجد SLA queue خارجي.
- **التحقق:** tools/server-smoke.mjs + tools/production-hardening-tests.mjs

### PAY-001 — حساب نهاية الشهر غير صحيح عند نهايات الأشهر
- **الخطورة:** عالٍ — **المجال:** الفوترة
- **الحالة:** مصحح ومختبر
- **المعالجة:** حساب الأشهر صار calendar-safe عند نهايات الشهر.
- **التحقق:** tools/server-smoke.mjs + tools/production-hardening-tests.mjs

### PAY-002 — checkout الخارجي يضع user id والبريد في query string
- **الخطورة:** عالٍ — **المجال:** الخصوصية والفوترة
- **الحالة:** مصحح ومختبر
- **المعالجة:** checkout العام server-to-server ولا يضع user id أو البريد في query string.
- **التحقق:** tools/server-smoke.mjs + tools/production-hardening-tests.mjs

### PAY-003 — بوابة الفوترة العامة تضع user id والبريد في URL
- **الخطورة:** عالٍ — **المجال:** الخصوصية والفوترة
- **الحالة:** مصحح ومختبر
- **المعالجة:** بوابة الفوترة لا تحمل PII داخل URL؛ الخادم ينشئ الجلسة لدى المزود.
- **التحقق:** tools/server-smoke.mjs + tools/production-hardening-tests.mjs

### PAY-004 — Idempotency-Key اختياري في عمليات الفوترة
- **الخطورة:** عالٍ — **المجال:** سلامة المعاملات
- **الحالة:** مصحح ومختبر
- **المعالجة:** Idempotency-Key إلزامي لعمليات checkout/change/cancel/portal الحساسة.
- **التحقق:** tools/server-smoke.mjs + tools/production-hardening-tests.mjs

### PAY-005 — توقيع webhook العام بلا timestamp أو replay window
- **الخطورة:** عالٍ — **المجال:** webhooks
- **الحالة:** مصحح ومختبر
- **المعالجة:** توقيع webhook العام يشمل timestamp وeventId وrawBody مع replay window.
- **التحقق:** tools/server-smoke.mjs + tools/production-hardening-tests.mjs

### PAY-006 — حدث بلا ID يحصل على ID عشوائي ويصبح قابلاً للتكرار
- **الخطورة:** عالٍ — **المجال:** webhooks
- **الحالة:** مصحح ومختبر
- **المعالجة:** الأحداث بلا ID تُرفض بدلاً من إعطائها معرفاً عشوائياً.
- **التحقق:** tools/server-smoke.mjs + tools/production-hardening-tests.mjs

### PAY-007 — منع التكرار يعتمد آخر 500 حدث فقط
- **الخطورة:** عالٍ — **المجال:** webhooks
- **الحالة:** مصحح ومختبر
- **المعالجة:** معرفات webhook محفوظة بشكل دائم بدلاً من نافذة آخر 500 فقط.
- **التحقق:** tools/server-smoke.mjs + tools/production-hardening-tests.mjs

### PAY-008 — منح entitlement لا يطابق price/amount/currency المتوقعة
- **الخطورة:** حرج — **المجال:** Stripe/fraud controls
- **الحالة:** مصحح ومختبر
- **المعالجة:** لا تُمنح entitlements إلا بعد مطابقة المستخدم والخطة وprice/amount/currency وحالة الدفع.
- **التحقق:** tools/server-smoke.mjs + tools/production-hardening-tests.mjs

### PAY-009 — حالة محلية قد تنفصل عن حالة المزود العام
- **الخطورة:** متوسط — **المجال:** الفوترة
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** قويت webhooks والتكرار والعقود، لكن لا توجد مهمة reconciliation دورية تقارن كل الاشتراكات بالمزود الخارجي.
- **التحقق:** tools/server-smoke.mjs + tools/production-hardening-tests.mjs

### PAY-010 — الواجهة تفترض دائماً 100 وحدة صغرى
- **الخطورة:** متوسط — **المجال:** الفوترة والعملات
- **الحالة:** مصحح ومختبر
- **المعالجة:** الواجهة والخادم يستخدمان minorUnit للعملة؛ JOD يعامل بثلاث خانات لا قسمة ثابتة على 100.
- **التحقق:** tools/server-smoke.mjs + tools/production-hardening-tests.mjs

### DATA-001 — فشل localStorage يحول التطبيق بصمت إلى ذاكرة مؤقتة
- **الخطورة:** عالٍ — **المجال:** التخزين المحلي
- **الحالة:** مصحح ومختبر
- **المعالجة:** فشل localStorage يظهر للمستخدم ولا يتحول بصمت إلى ذاكرة مؤقتة في المسارات الحرجة.
- **التحقق:** tools/data-integrity-tests.mjs + tools/server-smoke.mjs + Chromium runtime

### DATA-002 — بيانات الدراسة المحلية غير مشفرة
- **الخطورة:** متوسط — **المجال:** الخصوصية
- **الحالة:** غير مغلق — يتطلب إعادة معمارية/قرار خارجي
- **المعالجة:** بيانات المتصفح ما زالت plaintext في localStorage. تشفيرها بلا passphrase/مفتاح جهاز لا يمنع XSS؛ يحتاج WebCrypto مع سر مستخدم أو تخزين منصة آمن.
- **التحقق:** tools/data-integrity-tests.mjs + tools/server-smoke.mjs + Chromium runtime

### DATA-003 — استيراد backup غير ذري ولا ينشئ restore point أولاً
- **الخطورة:** عالٍ — **المجال:** النسخ والاستعادة
- **الحالة:** مصحح ومختبر
- **المعالجة:** الاستيراد ينشئ restore point، يتحقق من schema والحجم، يكتب ذرياً، يتحقق بعد الكتابة ويرجع تلقائياً عند الفشل.
- **التحقق:** tools/data-integrity-tests.mjs + tools/server-smoke.mjs + Chromium runtime

### DATA-004 — الاستيراد لا يفرض version/schema متوافقاً
- **الخطورة:** متوسط — **المجال:** النسخ والاستعادة
- **الحالة:** مصحح ومختبر
- **المعالجة:** الاستيراد يفرض schema/version مدعومين ويرفض payload غير متوافق.
- **التحقق:** tools/data-integrity-tests.mjs + tools/server-smoke.mjs + Chromium runtime

### DATA-005 — Cloud restore يكتب localStorage مباشرة ويبتلع الفشل
- **الخطورة:** عالٍ — **المجال:** المزامنة والاستعادة
- **الحالة:** مصحح ومختبر
- **المعالجة:** Cloud restore يمر عبر Store API مع تحقق وrollback ولا يكتب localStorage مباشرة.
- **التحقق:** tools/data-integrity-tests.mjs + tools/server-smoke.mjs + Chromium runtime

### DATA-006 — تسجيل الدخول يستبدل بيانات الجهاز افتراضياً
- **الخطورة:** عالٍ — **المجال:** UX المزامنة
- **الحالة:** مصحح ومختبر
- **المعالجة:** وضع تسجيل الدخول الافتراضي merge؛ replace يحتاج اختياراً وتحذيراً صريحاً.
- **التحقق:** tools/data-integrity-tests.mjs + tools/server-smoke.mjs + Chromium runtime

### DATA-007 — Restore points موجودة لكن غير قابلة للاكتشاف أو الاسترجاع من UI
- **الخطورة:** متوسط — **المجال:** UX الاستعادة
- **الحالة:** مصحح ومختبر
- **المعالجة:** أضيفت واجهة restore point مرئية وقابلة للاسترجاع.
- **التحقق:** tools/data-integrity-tests.mjs + tools/server-smoke.mjs + Chromium runtime

### DATA-008 — تغييرات أثناء sync قد تضيع من جدولة الرفع
- **الخطورة:** عالٍ — **المجال:** المزامنة
- **الحالة:** مصحح ومختبر
- **المعالجة:** أضيف sync generation/pending durable لمنع ضياع تغيير حدث أثناء الرفع.
- **التحقق:** tools/data-integrity-tests.mjs + tools/server-smoke.mjs + Chromium runtime

### DATA-009 — التعارض لا يملك workflow حل حقيقياً
- **الخطورة:** متوسط — **المجال:** المزامنة
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** أضيف preview وتحذير conflict و409/CAS، لكن لا توجد واجهة merge ثلاثية الحقول لحل كل تعارض يدوياً.
- **التحقق:** tools/data-integrity-tests.mjs + tools/server-smoke.mjs + Chromium runtime

### DATA-010 — حالة التعارض لا تتحول إلى pending durable
- **الخطورة:** متوسط — **المجال:** المزامنة
- **الحالة:** مصحح ومختبر
- **المعالجة:** حالة التعارض/pending تُحفظ وتستعاد بدلاً من البقاء في الذاكرة فقط.
- **التحقق:** tools/data-integrity-tests.mjs + tools/server-smoke.mjs + Chromium runtime

### DATA-011 — pending sync مجرد علامة واحدة لا سجل عمليات
- **الخطورة:** متوسط — **المجال:** المزامنة
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** pending صار durable ويحمل generation/reason/conflict، لكنه ليس operation log كامل يعيد كل عملية منفردة.
- **التحقق:** tools/data-integrity-tests.mjs + tools/server-smoke.mjs + Chromium runtime

### DATA-012 — دمج last-write-wins بدائي وقد يفقد تعديلات متوازية
- **الخطورة:** متوسط — **المجال:** المزامنة
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** CAS يمنع الكتابة العمياء وmerge يحافظ على الأحدث، لكن last-write-wins على مستوى السجلات لا يحل التعديلات المتوازية داخل العنصر نفسه.
- **التحقق:** tools/data-integrity-tests.mjs + tools/server-smoke.mjs + Chromium runtime

### DATA-013 — تسميات الإصدارات متضاربة
- **الخطورة:** منخفض — **المجال:** إدارة النسخ
- **الحالة:** مصحح ومختبر
- **المعالجة:** وُحد schema/version المستخدم في التخزين والمزامنة إلى v13 مع قبول ترقية مضبوط.
- **التحقق:** tools/data-integrity-tests.mjs + tools/server-smoke.mjs + Chromium runtime

### LEGAL-001 — صفحة القانون تعترف بأن هوية المشغل والضرائب والاختصاص غير مكتملة
- **الخطورة:** عالٍ — **المجال:** الامتثال
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** الفوترة fail-closed وتبقى مقفلة حتى إدخال اسم وعنوان واختصاص ومعرف ضريبي وبريد قانوني. البيانات الفعلية لم تُخترع ويجب أن يملأها المالك.
- **التحقق:** tools/server-smoke.mjs + /api/legal/config + assets/js/legal.js

### LEGAL-002 — سياسة الاسترداد والمهلة غير محسومة
- **الخطورة:** متوسط — **المجال:** الامتثال
- **الحالة:** مصحح ومختبر
- **المعالجة:** أصبحت نافذة الاسترداد ونسخة السياسة حقول إعداد إلزامية، وتعرض الصفحة المدة والنسخة من الخادم.
- **التحقق:** tools/server-smoke.mjs + /api/legal/config + assets/js/legal.js

### LEGAL-003 — العمر يعتمد self-attestation فقط
- **الخطورة:** عالٍ — **المجال:** الامتثال والمستخدمون القاصرون
- **الحالة:** غير مغلق — يتطلب إعادة معمارية/قرار خارجي
- **المعالجة:** ما زال العمر self-attestation. التحقق الأبوي/الهوية قرار قانوني ومنتجي يتطلب مزوداً وسياسة بلد، ولا يمكن اختلاقه داخل الكود.
- **التحقق:** tools/server-smoke.mjs + /api/legal/config + assets/js/legal.js

### LEGAL-004 — لا توجد إعادة موافقة عند تغيير النسخة القانونية
- **الخطورة:** عالٍ — **المجال:** الموافقة القانونية
- **الحالة:** مصحح ومختبر
- **المعالجة:** نسخة قانونية versioned وتُحجب الميزات الحساسة عند قدم الموافقة حتى إعادة القبول.
- **التحقق:** tools/server-smoke.mjs + /api/legal/config + assets/js/legal.js

### LEGAL-005 — الموافقة المحلية تسجل قبل نجاح إنشاء الحساب
- **الخطورة:** متوسط — **المجال:** الموافقة القانونية
- **الحالة:** مصحح ومختبر
- **المعالجة:** لا تُسجل الموافقة المحلية إلا بعد نجاح إنشاء الحساب/الموافقة الخادمية.
- **التحقق:** tools/server-smoke.mjs + /api/legal/config + assets/js/legal.js

### UX-001 — تضخم النطاق: 28 صفحة ومسارات أدوات متداخلة
- **الخطورة:** عالٍ — **المجال:** هندسة المنتج
- **الحالة:** غير مغلق — يتطلب إعادة معمارية/قرار خارجي
- **المعالجة:** بقيت 28 صفحة. جرى تقليل dead ends، لكن تقليص نطاق المنتج ودمج الأدوات قرار منتج كبير وليس إصلاحاً آمناً تلقائياً.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

### UX-002 — صفحة study مسار legacy/dead-end
- **الخطورة:** متوسط — **المجال:** هندسة المعلومات
- **الحالة:** مصحح ومختبر
- **المعالجة:** study.html صار redirect حقيقياً إلى workspace بدلاً من مسار ميت.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

### UX-003 — تكرار طبقات التنقل والتحكم
- **الخطورة:** عالٍ — **المجال:** التنقل
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** خففت الطبقات الثابتة على الهاتف وأخفيت الثانوية، لكن بنية التنقل المتعددة ما زالت موجودة على desktop.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

### UX-004 — عدد كبير من العناصر الثابتة على كل صفحة
- **الخطورة:** متوسط — **المجال:** واجهة الهاتف
- **الحالة:** مصحح ومختبر
- **المعالجة:** الطبقات العائمة الثانوية تُخفى على الشاشات الصغيرة وتقل fixed/sticky overlays.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

### A11Y-001 — أهداف لمس كثيرة أصغر من 44×44
- **الخطورة:** عالٍ — **المجال:** إتاحة وتجربة لمس
- **الحالة:** مصحح ومختبر
- **المعالجة:** رفعت أحجام أهداف التفاعل إلى 44px وفحص Chromium يتحقق من عدم وجود أهداف صغيرة في المسارات الحرجة.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

### UX-005 — صفحة المصادر بطول 18,932px على 390px
- **الخطورة:** عالٍ — **المجال:** طول المحتوى
- **الحالة:** مصحح ومختبر
- **المعالجة:** المصادر أصبحت paginated ولا تُرسم القائمة كاملة دفعة واحدة.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

### UX-006 — صفحة calculators بطول 10,510px على الهاتف
- **الخطورة:** متوسط — **المجال:** طول المحتوى
- **الحالة:** مصحح ومختبر
- **المعالجة:** الحاسبات تعرض أداة واحدة نشطة بدلاً من كل الأدوات عمودياً.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

### UX-007 — Dashboard بطول 9,221px على الهاتف و5,705px على desktop
- **الخطورة:** عالٍ — **المجال:** طول المحتوى
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** خف الحمل وبعض الطبقات، لكن Dashboard ما زالت صفحة طويلة وتحتاج إعادة تصميم معلوماتي لا مجرد CSS.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

### UX-008 — الرئيسية وlegal/workspace طويلة بشكل مفرط
- **الخطورة:** متوسط — **المجال:** طول المحتوى
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** أضيفت خريطة أقسام وتخفيف طبقات، لكن legal/workspace والرئيسية ما زالت طويلة نسبياً.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

### A11Y-002 — تسلسل العناوين يقفز من H1 إلى H3
- **الخطورة:** متوسط — **المجال:** الدلالات
- **الحالة:** مصحح ومختبر
- **المعالجة:** أضيفت عناوين مفقودة وصحح التسلسل في الصفحات المفحوصة.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

### UX-009 — خلط العربية والإنجليزية داخل نفس الرحلة
- **الخطورة:** متوسط — **المجال:** الاتساق اللغوي
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** تحسنت النصوص الحرجة، لكن المنتج ما زال يمزج مصطلحات عربية وإنجليزية في أجزاء متعددة.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

### UI-001 — اعتماد مفرط على cards يضعف الهرمية
- **الخطورة:** متوسط — **المجال:** التصميم البصري
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** تحسنت الهرمية في الصفحات الحرجة، لكن نمط card-heavy ما زال جزءاً من design system.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

### A11Y-003 — حوارات مخصصة عديدة بدل `<dialog>` أو مكتبة focus موحدة
- **الخطورة:** متوسط — **المجال:** الحوارات
- **الحالة:** غير مغلق — يتطلب إعادة معمارية/قرار خارجي
- **المعالجة:** الحوار المخصص ما زال مستخدماً. إغلاق البند يحتاج مكوّن dialog موحد مع focus trap/restore واختبارات لوحة مفاتيح.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

### PERF-001 — استخدام واسع لـbackdrop-filter وعناصر ثابتة
- **الخطورة:** متوسط — **المجال:** الأداء الرسومي
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** عُطل backdrop-filter وأُخفيت طبقات ثابتة ثانوية على الهاتف؛ الكلفة على desktop ما زالت موجودة جزئياً.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

### PERF-002 — كل صفحة تحمل حزماً مشتركة ثقيلة
- **الخطورة:** عالٍ — **المجال:** أداء التحميل
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** الحزم ضمن budget، لكن core/enhancements مشتركة وكبيرة على كل الصفحات ولم يحصل code splitting.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

### PERF-003 — حمولة المسارات الحرجة مرتفعة قبل الصور/API
- **الخطورة:** عالٍ — **المجال:** أداء التحميل
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** أثقل مسار الآن 121KB gzip ضمن حد 140KB، لكن المسارات الحرجة لا تزال أثقل من تطبيق مبسط ومجزأ.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

### PERF-004 — البناء مجرد concatenation
- **الخطورة:** متوسط — **المجال:** نظام البناء
- **الحالة:** غير مغلق — يتطلب إعادة معمارية/قرار خارجي
- **المعالجة:** البناء حتمي ويولد Brotli/Gzip وmanifest، لكنه ما زال bundling بسيطاً بلا tree-shaking/code splitting/minification حقيقي.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

### PERF-005 — لا توجد source maps
- **الخطورة:** منخفض — **المجال:** التشخيص
- **الحالة:** غير مغلق — يتطلب إعادة معمارية/قرار خارجي
- **المعالجة:** لا توجد source maps. إضافتها تتطلب bundler فعلي وسياسة عدم نشر المصادر الحساسة.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

### SEO-001 — كل صفحات HTML الـ28 بلا canonical
- **الخطورة:** متوسط — **المجال:** SEO
- **الحالة:** مصحح ومختبر
- **المعالجة:** أضيف canonical لكل صفحات HTML العامة.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

### PWA-001 — الـprecache يغطي الرئيسية وworkspace وdashboard فقط
- **الخطورة:** متوسط — **المجال:** PWA/offline
- **الحالة:** مصحح ومختبر
- **المعالجة:** وُسعت قائمة precache للمسارات والأدوات الأساسية مع فصل الصفحات الخاصة.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

### PWA-002 — تثبيت Service Worker هش بسبب cache.addAll
- **الخطورة:** منخفض — **المجال:** PWA
- **الحالة:** مصحح ومختبر
- **المعالجة:** install يستخدم Promise.allSettled وfetch+cache، ولا ينهار بسبب أصل ثانوي واحد.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

### PWA-003 — Manifest بلا screenshots
- **الخطورة:** منخفض — **المجال:** PWA
- **الحالة:** مصحح ومختبر
- **المعالجة:** أضيفت screenshots عريضة وضيقة إلى manifest.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

### UX-010 — حالة الحفظ المحلي لا تحذر عند التحول للذاكرة
- **الخطورة:** متوسط — **المجال:** الشفافية
- **الحالة:** مصحح ومختبر
- **المعالجة:** أصبحت حالة التخزين/التحول للذاكرة تحذر المستخدم بدلاً من الصمت.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

### UX-011 — لا توجد معاينة قبل replace/merge
- **الخطورة:** متوسط — **المجال:** المزامنة
- **الحالة:** مصحح ومختبر
- **المعالجة:** أضيف preview قبل merge/replace وrestore point قبل الاستبدال.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

### UX-012 — واجهة الإدارة تخلط تسميات عربية وإنجليزية
- **الخطورة:** متوسط — **المجال:** الإدارة
- **الحالة:** مخفف — بقي قيد معروف
- **المعالجة:** عُربت/وضحت أجزاء، لكن لوحة الإدارة ما زالت تستخدم مصطلحات تشغيلية إنجليزية مثل Production Pulse وSLO.
- **التحقق:** tools/frontend-functional-runtime.mjs + tools/performance-budget.mjs + tools/check.mjs

## قرار الإطلاق

لا تشغل الدفع العام قبل إدخال البيانات القانونية الفعلية وتشغيل CI على GitHub ونجاح وظيفة الحاوية وE2E غير المقيّد. ولحمل إنتاج حقيقي أو أكثر من نسخة، لا تستخدم هذه المعمارية كما هي؛ نفّذ هجرة PostgreSQL/Redis/worker أولاً.