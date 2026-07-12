/* ===== assets/js/data.js ===== */
window.MT_DATA = {
  brand: {
    arabic: 'بوصلة',
    english: 'Bawsala',
    product: 'Bawsala Study OS',
    tagline: 'نظام دراسة يومي واضح للطالب الأردني',
    shortTagline: 'قرر. ركز. سجل الخطأ. راجع.',
    copyright: '© 2026 Bawsala Study Toolkit. جميع الحقوق محفوظة.',
    developer: 'منتج تعليمي مستقل من Bawsala Study OS.'
  },
  whatsapp: '962792305585',
  schoolmindUrl: 'https://schoolmind-ai.onrender.com/',
  nav: [
    ['الرئيسية','index.html','home'],
    ['لوحة الطالب','pages/dashboard.html','dashboard'],
    ['غرفة الدراسة','pages/workspace.html','workspace'],
    ['المصادر','pages/resources.html','resources'],
    ['التقويم','pages/calendar.html','calendar'],
    ['الدعم','pages/support.html','support']
  ],
  navEnglish: {
    home:'Home', dashboard:'Dashboard', workspace:'Study Room', advisor:'Advisor', resources:'Resources', schoolmind:'SchoolMind AI', study:'Study', mindmaps:'Mind Maps', flashcards:'Flashcards', community:'Community', company:'About', profiles:'Profiles', notebook:'Notebooks', calculators:'Grades', services:'Services', legal:'Legal', admin:'Admin', calendar:'Calendar', billing:'Billing', support:'Support', status:'Status'
  },
  languageNames: { ar:'العربية', en:'English' },
  dashboardTemplates: [
    {id:'catchup',title:'إنقاذ يوم متأخر',mission:'درس واحد + 20 سؤال + تسجيل 3 أخطاء',minutes:35,rounds:3},
    {id:'exam',title:'قبل امتحان قريب',mission:'ملخص سريع + نموذج امتحان + مراجعة الأخطاء فقط',minutes:30,rounds:4},
    {id:'btec',title:'تسليم BTEC',mission:'قراءة المعيار + checklist + مسودة إجابة + تدقيق',minutes:45,rounds:3},
    {id:'weak',title:'تأسيس مادة ضعيفة',mission:'فيديو قصير + أمثلة محلولة + 15 سؤال سهل',minutes:40,rounds:3},
    {id:'review',title:'مراجعة هادئة',mission:'دفتر الأخطاء + أسئلة سنوات + تقرير مختصر',minutes:25,rounds:2},
    {id:'free',title:'مسار مجاني بالكامل',mission:'مصدر رسمي + قناة واحدة + بنك أسئلة + دفتر أخطاء',minutes:30,rounds:4}
  ],
  weeklySprint: [
    'اختر مادة واحدة لا أكثر وابدأ من أضعف درس',
    'شاهد شرحاً قصيراً ثم أغلق الفيديو فوراً وابدأ حل أسئلة',
    'حل 20 سؤالاً وسجل كل خطأ في دفتر الأخطاء',
    'أعد حل أخطاء الأمس بدون مشاهدة الحل',
    'راجع من الكتاب/الملف الرسمي قبل أي مصدر تجاري',
    'اعمل محاكاة امتحان قصيرة ومؤقتة',
    'اكتب تقرير أسبوعي: ماذا أنجزت، ما المشكلة، وما قرار الأسبوع القادم'
  ],
  quickLinks: [
    ['ابدأ تدفق الدراسة','pages/workspace.html#flow','مهمة، تركيز، خطأ، تقرير بدون تشتت'],
    ['غرفة الدراسة','pages/workspace.html#flow','الأدوات الأساسية فقط داخل مسار واحد'],
    ['مصادر مجانية أولاً','pages/resources.html','اختر مصدرين فقط ولا تغرق بروابط كثيرة'],
    ['حاسبة المعدل','pages/calculators.html','أداة تقديرية تحتاج مراجعة التعليمات الرسمية']
  ],
  resources: [
    {id:'moe-exams',name:'وزارة التربية - أسئلة سنوات',type:'official',cost:'free',track:'all',subject:'عام',fit:'مرجع أساسي للتدريب النهائي لأنه الأقرب لطبيعة الامتحان الرسمية.',risk:'لا يشرح لك لماذا أخطأت؛ يجب أن تستخدمه مع دفتر الأخطاء.',pros:['رسمي ومجاني','يقيس شكل الامتحان الحقيقي','ممتاز آخر شهر'],cons:['شرح محدود','قد يخدع الطالب الضعيف إذا بدأ به مبكراً'],bestFor:'طالب أنهى الشرح ويريد اختبار نفسه بجدية.',notFor:'طالب لم يفهم الأساسيات بعد.',useRule:'حل نموذج واحد مؤقت، ثم سجل كل خطأ في غرفة الدراسة.',score:99,url:'https://moe.gov.jo/'},
    {id:'darsak',name:'درسك',type:'official',cost:'free',track:'academic',subject:'عام',fit:'شرح رسمي مجاني ومناسب للبداية، خصوصاً عندما تريد تثبيت الأساس قبل شراء أي دورة.',risk:'قد تحتاج بنك أسئلة إضافي بعد الشرح حتى لا تبقى في وهم الفهم.',pros:['مجاني','رسمي','مناسب كبداية منظمة'],cons:['التفاعل محدود','ليس كافياً وحده للتدريب العالي'],bestFor:'طالب يحتاج شرحاً أولياً بدون دفع.',notFor:'طالب يريد متابعة شخصية يومية.',useRule:'شاهد درساً واحداً فقط ثم أغلق الفيديو وحل أسئلة مباشرة.',score:92,url:'https://darsak.gov.jo/'},
    {id:'btec-official',name:'BTEC الأردن الرسمي',type:'official',cost:'free',track:'btec',subject:'BTEC',fit:'نقطة البداية لفهم المسار والتخصصات والمرجع الرسمي قبل أي مصدر ثانوي.',risk:'لا يعطيك دائماً قالب إجابة عملي لكل معيار؛ تحتاج تدريب كتابة.',pros:['رسمي','ضروري لفهم المسار','مفيد لولي الأمر والطالب'],cons:['ليس دفتر تدريب','لغة المعايير قد تكون ثقيلة'],bestFor:'طالب BTEC يريد معرفة المطلوب قبل التنفيذ.',notFor:'من يريد أمثلة جاهزة للنسخ.',useRule:'اقرأ المعيار ثم افتح أداة BTEC في غرفة الدراسة وحوله إلى مهمة.',score:96,url:'https://btec.moe.gov.jo/'},
    {id:'jolearn',name:'JoLearn',type:'official',cost:'free',track:'all',subject:'عام',fit:'بيئة تعليم إلكتروني رسمية تساعد في الواجبات والاختبارات عندما تكون مفعّلة من المدرسة.',risk:'الفائدة تختلف حسب المدرسة والتفعيل؛ لا تعتمد عليها كخطة كاملة.',pros:['مرتبطة بالمدارس','مفيدة للواجبات','رسمية'],cons:['قد لا تكون مفعلة للجميع','تجربتها تختلف'],bestFor:'طالب مدرسته تستخدم المنصة فعلياً.',notFor:'طالب يبحث عن شرح حر خارج المدرسة.',useRule:'استخدمها للواجبات الرسمية ثم انقل أهم واجب إلى مهمة اليوم.',score:88,url:'https://jolearn.gov.jo/'},
    {id:'school-books',name:'الكتاب المدرسي',type:'official',cost:'free',track:'all',subject:'عام',fit:'المرجع الأول للتعاريف والقوانين والأسئلة الأساسية. تجاهله خطأ فادح.',risk:'لا يكفي وحده للطالب المتأخر أو الذي يحتاج أسئلة كثيرة.',pros:['رسمي','مجاني','يبني اللغة الصحيحة للإجابة'],cons:['قد يبدو جافاً','لا يعطيك خطة تنفيذ'],bestFor:'كل طالب؛ خصوصاً قبل الامتحان وعند حفظ التعاريف.',notFor:'من يريد تدريباً كثيفاً فقط.',useRule:'ابدأ كل درس من الكتاب، ثم استخدم مصدر شرح واحد فقط.',score:94,url:'https://moe.gov.jo/'},
    {id:'youtube',name:'يوتيوب التعليمي',type:'channel',cost:'free',track:'all',subject:'عام',fit:'شرح مجاني وسريع إذا التزمت بقناة واحدة ولم تتحول إلى متفرج محترف.',risk:'أخطر مصدر على الطالب المشتت؛ خوارزمية المنصة ستسرق وقته.',pros:['مجاني','تنوع شروحات','مفيد لفكرة صعبة'],cons:['تشتت عالي','لا يوجد مسار واضح','تعليقات وإعلانات'],bestFor:'فهم نقطة محددة بسرعة.',notFor:'طالب يجمع playlists ولا يحل.',useRule:'فيديو واحد ثم 20 سؤال. لا تفاوض.',score:76,url:'https://www.youtube.com/'},
    {id:'khan',name:'Khan Academy',type:'platform',cost:'free',track:'academic',subject:'رياضيات/علوم',fit:'ممتاز للتأسيس المفاهيمي في الرياضيات والعلوم باللغة الإنجليزية.',risk:'ليس مبنياً على المنهاج الأردني حرفياً؛ يحتاج ربط بالدرس المطلوب.',pros:['مجاني','شرح مفاهيمي قوي','تمارين كثيرة'],cons:['لغة إنجليزية','ليس مطابقاً دائماً للمنهاج'],bestFor:'طالب يريد فهم الأساس بعمق.',notFor:'طالب قبل امتحان قريب جداً.',useRule:'استخدمه للتأسيس فقط ثم ارجع لأسئلة المنهاج الأردني.',score:84,url:'https://www.khanacademy.org/'},
    {id:'joacademy',name:'جو أكاديمي',type:'platform',cost:'paid',track:'academic',subject:'عام',fit:'دورات ومعلمين وملفات في مكان واحد، مفيد إذا اخترت المعلم بناءً على تجربة لا إعلان.',risk:'الدفع لا يساوي التزاماً؛ قد تشتري الدورة وتبقى لا تنفذ.',pros:['تنظيم جيد','معلمون متعددون','ملفات ودورات'],cons:['مدفوع','اختيار المعلم يحتاج تجربة'],bestFor:'طالب يريد مساراً منظماً ومستعداً للالتزام.',notFor:'طالب لا يحل واجباته أساساً.',useRule:'جرب درساً مجانياً، ثم اشترِ فقط إذا حولته إلى خطة أسبوعية.',score:86,url:'https://www.joacademy.com/'},
    {id:'watad',name:'وتد',type:'platform',cost:'paid',track:'academic',subject:'عام',fit:'منصة دورات منظمة ومناسبة للطالب الذي يحتاج تسلسل دروس واضح.',risk:'قد لا تناسب من يحتاج سؤالاً مباشراً وتفاعل شخصي.',pros:['تسلسل واضح','محتوى مرتب','يناسب الدراسة من البيت'],cons:['مدفوع','التفاعل محدود نسبياً'],bestFor:'طالب يلتزم بالدروس المسجلة ويحل بعدها.',notFor:'طالب يحتاج معلم يلاحقه يومياً.',useRule:'بعد كل درس: مهمة حل + خطأ واحد على الأقل.',score:84,url:'https://watad.me/'},
    {id:'hisasonline',name:'حصص أونلاين',type:'platform',cost:'paid',track:'academic',subject:'عام',fit:'حصص ودورات وملفات تعليمية، قد تفيد الطالب الذي يريد منصة عربية مألوفة.',risk:'لا تختَرها بسبب إعلان؛ قارن المعلم وطريقة الشرح.',pros:['دورات متنوعة','ملفات ومتابعة حسب الباقة','سهل الاستخدام'],cons:['مدفوع','الجودة تختلف حسب المعلم'],bestFor:'طالب يريد دورة محددة لمادة محددة.',notFor:'من لم يحدد نقطة ضعفه.',useRule:'لا تشتري أكثر من مادة في نفس الأسبوع.',score:82,url:'https://hisasonline.com/'},
    {id:'edraak',name:'إدراك',type:'platform',cost:'free',track:'all',subject:'مهارات/عام',fit:'مفيد للمهارات العامة والتعلم الذاتي وبعض المجالات الداعمة.',risk:'ليس موجهاً مباشرة لخطة التوجيهي اليومية.',pros:['مجاني','عربي','دورات مهارية'],cons:['ليس بديلاً للمنهاج','قد يشتت قبل الامتحانات'],bestFor:'طالب يريد مهارات دراسة أو لغة أو تطوير عام.',notFor:'طالب عليه امتحان قريب جداً.',useRule:'استخدمه خارج ضغط الامتحانات فقط.',score:73,url:'https://www.edraak.org/'},
    {id:'coursera',name:'Coursera',type:'platform',cost:'mixed',track:'all',subject:'مهارات/تقنية',fit:'مناسب للطالب المتقدم أو BTEC الذي يريد تعميق مهارة تقنية أو أعمال.',risk:'ليس للإنقاذ السريع ولا للمناهج المدرسية اليومية.',pros:['محتوى عالمي','شهادات اختيارية','مفيد للتخصصات'],cons:['إنجليزي غالباً','قد يكون مدفوعاً','بعيد عن المنهاج'],bestFor:'BTEC أو طالب يريد توسعة مهاراته.',notFor:'طالب متأخر في واجباته الأساسية.',useRule:'اجعله مشروع عطلة، لا بديل دراسة يومية.',score:72,url:'https://www.coursera.org/'},
    {id:'easy-tawjihi',name:'Easy Tawjihi',type:'practice',cost:'mixed',track:'academic',subject:'عام',fit:'تدريب وأسئلة ومحاكاة تساعد الطالب بعد مرحلة الفهم.',risk:'إذا بدأت بالأسئلة قبل الفهم ستجمع أخطاء بلا علاج.',pros:['تدريب عملي','مناسب للمراجعة','محاكاة مفيدة'],cons:['لا يغني عن الشرح','قد يضغط الطالب الضعيف'],bestFor:'طالب أنهى شرح درس ويريد اختبار نفسه.',notFor:'طالب لا يعرف القوانين الأساسية.',useRule:'كل جلسة تدريب يجب أن تخرج بثلاثة أخطاء مسجلة.',score:81,url:'https://easytawjihi.com/'},
    {id:'joquiz',name:'JoQuiz',type:'practice',cost:'mixed',track:'academic',subject:'عام',fit:'اختبارات محوسبة وبنك أسئلة جيد للمراجعة السريعة.',risk:'الاختبار بدون تحليل أخطاء مجرد رقم يزعجك.',pros:['أسئلة سريعة','تدريب محوسب','مناسب للمراجعة'],cons:['قد يتحول إلى قياس فقط','ليس شرحاً كافياً'],bestFor:'مراجعة بعد الشرح وقبل الامتحان.',notFor:'طالب يريد تأسيساً من الصفر.',useRule:'بعد كل اختبار: افتح دفتر الأخطاء فوراً.',score:80,url:'https://joquiz.com/'},
    {id:'dbtec',name:'D.BTEC',type:'btec',cost:'mixed',track:'btec',subject:'BTEC',fit:'مفيد كمصدر مساعد للمصطلحات والمعايير والحسابات التقديرية.',risk:'ليس مرجعاً رسمياً نهائياً؛ لا تبنِ تسليمك عليه وحده.',pros:['موجه لـBTEC','عملي كمساعد','قد يختصر البحث'],cons:['غير رسمي نهائي','يحتاج تحقق من المدرسة'],bestFor:'طالب BTEC يريد مساعداً سريعاً للفهم.',notFor:'من يريد اعتماداً رسمياً كاملاً.',useRule:'قارنه دائماً مع المعيار الرسمي والمدرس.',score:79,url:'https://dbtec.top/'},
    {id:'quizlet',name:'Quizlet',type:'tool',cost:'mixed',track:'all',subject:'حفظ/لغات',fit:'مفيد للحفظ السريع للمصطلحات والتعاريف إذا بنيت بطاقاتك بنفسك.',risk:'بطاقات جاهزة قد تكون خاطئة أو غير مناسبة لمنهجك.',pros:['بطاقات ومراجعة','مفيد للغات','سريع'],cons:['بعض الميزات مدفوعة','جودة البطاقات تختلف'],bestFor:'مصطلحات إنجليزي/BTEC/تعريفات.',notFor:'مسائل رياضيات طويلة.',useRule:'الأفضل أن تنشئ البطاقات داخل بوصلة من أخطائك.',score:77,url:'https://quizlet.com/'},
    {id:'notion',name:'Notion',type:'tool',cost:'mixed',track:'all',subject:'تنظيم',fit:'مساحة مرنة للتخطيط والكتابة إذا كنت منضبطاً جداً.',risk:'سيصبح مقبرة جداول جميلة إذا لم تربطه بتنفيذ يومي.',pros:['مرن جداً','قوالب كثيرة','مناسب للمشاريع'],cons:['إعداد طويل','مشتت للطالب الصغير'],bestFor:'طالب منظم يريد أرشيفاً كبيراً.',notFor:'طالب يحتاج زر ابدأ الآن.',useRule:'لا تستخدمه بدل غرفة الدراسة؛ استخدمه للأرشفة فقط.',score:68,url:'https://www.notion.so/'},
    {id:'google-drive',name:'Google Drive',type:'tool',cost:'free',track:'all',subject:'ملفات',fit:'أفضل مكان لحفظ ملفاتك وتسليماتك وصور الملاحظات بشكل منظم.',risk:'بدون أسماء ملفات واضحة سيصبح فوضى سحابية.',pros:['مجاني غالباً','نسخ احتياطي','مشاركة سهلة'],cons:['لا يخطط لك','يحتاج تنظيم أسماء'],bestFor:'حفظ ملفات وتسليمات BTEC وتقارير.',notFor:'إدارة يوم الدراسة وحدها.',useRule:'استخدم مجلد واحد لكل مادة وأسماء ملفات بتواريخ.',score:75,url:'https://drive.google.com/'},
    {id:'teacher-private',name:'معلم خصوصي محدد',type:'teacher',cost:'paid',track:'all',subject:'حسب المادة',fit:'مفيد عندما يكون الخلل عميقاً ومحدداً ولا يحله فيديو أو منصة.',risk:'سيئ إذا لا يوجد اختبار مستوى وخطة واجبات ومتابعة أخطاء.',pros:['تفاعل مباشر','تشخيص شخصي','ينقذ ضعفاً عميقاً'],cons:['مكلف','الجودة تختلف جداً','قد يصنع اعتماداً زائداً'],bestFor:'طالب عنده فجوة محددة ومحتاج متابعة.',notFor:'من يريد حلاً سحرياً بلا واجبات.',useRule:'اطلب اختبار مستوى وخطة أسبوع قبل الدفع الطويل.',score:74,url:'services.html'},
    {id:'schoolmind-ai',name:'SchoolMind AI',type:'tool',cost:'mixed',track:'all',subject:'AI/تنظيم',fit:'أداة خارجية مستقلة يمكن استخدامها للفهم وصياغة أسئلة مراجعة. لا يوجد تكامل تقني أو مزامنة بيانات مع بوصلة.',risk:'أي AI يصبح خطيراً إذا استخدمته للنسخ أو الهروب من التفكير.',pros:['موجه للدراسة','مفيد للتخطيط والأسئلة','يمكن تحويل ناتجه يدوياً إلى مهمة'],cons:['ليس بديلاً عن المعلم','يحتاج تحقق من الإجابات','يعتمد على جودة سؤالك'],bestFor:'طالب يريد مساعداً لصياغة خطة أو فهم سؤال.',notFor:'من يريد غشاً أو إجابات جاهزة للتسليم.',useRule:'اسأله ليفسر ويختبرك، لا ليحل بدلاً عنك.',score:85,url:'https://schoolmind-ai.onrender.com/'}
  ],
  services: [
    {id:'cover',icon:'▣',name:'Cover Design',title:'تصميم أغلفة',desc:'غلاف رسمي للواجب أو التقرير مع اسم الطالب والمادة وعنوان واضح.',deliverable:'PNG/PDF حسب الحاجة',cta:'أريد تصميم غلاف'},
    {id:'prompts',icon:'✦',name:'BTEC Prompts',title:'ملفات أوامر ذكية',desc:'قوالب أوامر لفهم المعيار وبناء إجابة منظمة بدون نسخ أعمى.',deliverable:'ملف منظم حسب التخصص',cta:'أريد BTEC Prompts'},
    {id:'checklist',icon:'✓',name:'Checklist',title:'قائمة معايير',desc:'قائمة متابعة تعرفك ماذا أنجزت وماذا بقي قبل التسليم.',deliverable:'Checklist قابلة للتعديل',cta:'أريد Checklist'},
    {id:'community',icon:'●',name:'Study Support',title:'متابعة دراسية',desc:'تنبيهات ومتابعة عامة داخل مجتمع منظم عند توفره.',deliverable:'دعوة/رابط عند التفعيل',cta:'اسأل عن المتابعة'},
    {id:'ppt',icon:'◇',name:'3D PowerPoint',title:'عروض ثلاثية الأبعاد',desc:'عرض تقديمي مرتب بتسلسل منطقي، مناسب للشرح أو التسليم المدرسي.',deliverable:'PPTX',cta:'أريد عرض PowerPoint'},
    {id:'report',icon:'▤',name:'Report Formatting',title:'تنسيق التقارير',desc:'تنظيف التقرير، ترتيب العناوين، الجداول، الألوان، والغلاف.',deliverable:'Word/PDF',cta:'أريد تنسيق تقرير'}
  ],
  btecSpecialties: ['تكنولوجيا المعلومات','الأعمال','الهندسة','السياحة والسفر','الفن والتصميم','الضيافة','الوسائط الإبداعية','الرعاية الصحية والاجتماعية','الرياضة','الزراعة','البناء والبيئة العمرانية','التصنيع'],
  academicTracks: {
    scientific:['الرياضيات','الفيزياء','الكيمياء','الأحياء','اللغة العربية','اللغة الإنجليزية','التربية الإسلامية','تاريخ الأردن'],
    literary:['اللغة العربية تخصص','اللغة الإنجليزية','التاريخ','الجغرافيا','الثقافة المالية','التربية الإسلامية','تاريخ الأردن'],
    vocational:['مادة تخصص 1','مادة تخصص 2','تدريب عملي','اللغة العربية','اللغة الإنجليزية','التربية الإسلامية','تاريخ الأردن'],
    custom:['مادة 1','مادة 2','مادة 3','مادة 4']
  },
  lectures: [
    {id:'time',title:'إدارة الوقت بدون جلد ذات',area:'مهارات دراسة',duration:25,level:'كل الطلاب',takeaway:'جدول أسبوعي صغير أفضل من خطة خرافية لا تنفذ.'},
    {id:'platform-buying',title:'كيف تختار منصة بدون خداع إعلاني',area:'قرار تعليمي',duration:30,level:'توجيهي',takeaway:'لا تدفع قبل تجربة درس، اختبار مستوى، وخطة أسبوع.'},
    {id:'btec-terms',title:'فهم أوامر BTEC قبل الكتابة',area:'BTEC',duration:35,level:'BTEC',takeaway:'Explain وEvaluate وJustify ليست كلمات زينة؛ كل واحدة لها شكل إجابة.'},
    {id:'ai-study',title:'استخدام الذكاء الاصطناعي للدراسة بدون غش',area:'ذكاء اصطناعي',duration:28,level:'كل الطلاب',takeaway:'AI يساعدك تفهم وتراجع، لا يكتب بدلاً عنك.'},
    {id:'exam-anxiety',title:'التعامل مع ضغط الامتحانات',area:'صحة دراسية',duration:22,level:'كل الطلاب',takeaway:'الضغط يحتاج نظام نوم ومراجعة، مش زيادة مصادر.'},
    {id:'parents-report',title:'كيف تشرح تقدمك لأهلك',area:'تواصل',duration:18,level:'كل الطلاب',takeaway:'تقرير بسيط يقلل التوتر ويزيد الدعم.'}
  ],

  mindmapTemplates: [
    {id:'lesson',title:'خريطة درس',center:'عنوان الدرس',nodes:['تعريفات','قوانين/قواعد','أمثلة محلولة','أسئلة متوقعة','أخطاء متكررة','ملخص نهائي']},
    {id:'exam',title:'خريطة امتحان',center:'نطاق الامتحان',nodes:['دروس داخلة','أسئلة سنوات','نقاط ضعفي','قوانين للحفظ','خطة آخر 24 ساعة','أسئلة مراجعة']},
    {id:'btec',title:'خريطة معيار BTEC',center:'اسم المعيار',nodes:['Command Word','Evidence Needed','Pass','Merit','Distinction','Checklist']},
    {id:'compare',title:'خريطة مقارنة',center:'موضوع المقارنة',nodes:['التشابه','الاختلاف','متى أستخدم كل خيار','أمثلة','ملاحظات','استنتاج']}
  ],
  flashcardDecks: ['عام','رياضيات','فيزياء','كيمياء','أحياء','إنجليزي','عربي','تاريخ الأردن','تربية إسلامية','BTEC','أخطاء الامتحانات'],
  schoolmind: {
    title:'SchoolMind AI',
    url:'https://schoolmind-ai.onrender.com/',
    summary:'SchoolMind AI أداة تعليمية خارجية مستقلة. قد تساعد في تفسير المطلوب أو إنشاء أسئلة تدريب، لكنها ليست جزءاً تقنياً من بوصلة ولا تشارك معها الحساب أو البيانات.',
    pillars:[
      ['فهم السؤال','يفكك السؤال إلى مطلوب، معطيات، كلمات مفتاحية، وخطوة أولى.'],
      ['خطة دراسة','يقترح جلسات قصيرة مبنية على الوقت والمادة ونقطة الضعف.'],
      ['مراجعة نشطة','ينتج أسئلة تدريب وفلاش كاردز بدل إعادة قراءة عمياء.'],
      ['BTEC','يساعد في فهم command words مثل Explain وEvaluate وJustify بدون نسخ.'],
      ['أمان دراسي','استخدمه كمعلّم مساعد لا كآلة غش أو بديل للمدرس.']
    ],
    rules:['اكتب وضعك الحقيقي لا جملة عامة.','اطلب شرحاً ثم اختباراً قصيراً.','تحقق من أي معلومة مهمة من مصدر رسمي.','لا تنسخ إجابة AI في تسليم مدرسي.','حوّل الخلاصة إلى مهمة داخل غرفة الدراسة.']
  },
  btecTerms: [
    ['Explain','اشرح','MERIT','استخدم سبب ونتيجة وأمثلة: Because / Therefore / This leads to.'],
    ['Describe','صف','PASS','اعطِ وصفاً واضحاً للميزات أو الخطوات بدون حكم عميق.'],
    ['Identify','سمي','PASS','اذكر النقاط الرئيسية فقط بدون شرح طويل.'],
    ['Justify','برر','DISTINCTION','ادعم قرارك بأدلة ووضح لماذا اخترت هذا الحل تحديداً.'],
    ['Evaluate','قيّم','DISTINCTION','اعرض إيجابيات وسلبيات ثم حكم نهائي مدعوم.'],
    ['Analyze','حلل','MERIT','فكك الفكرة إلى أجزاء ووضح العلاقة والتأثير.'],
    ['Compare','قارن','MERIT','اذكر التشابه والاختلاف بين عنصرين أو أكثر.'],
    ['Recommend','اقترح','DISTINCTION','قدم حلّاً واضحاً مع تبرير لماذا هو الأفضل.'],
    ['Discuss','ناقش','MERIT','اعرض أكثر من وجهة نظر ثم خلص إلى نتيجة.'],
    ['Define','عرّف','PASS','اكتب معنى المصطلح بشكل مباشر ودقيق.'],
    ['Critically Evaluate','قيّم بشكل نقدي','DISTINCTION','حلل الافتراضات والقوة والضعف ثم أعطِ حكماً مهنياً.'],
    ['Calculate','احسب','MERIT','استخدم أرقاماً وخطوات حسابية واضحة.'],
    ['Summarise','لخّص','PASS','اكتب أهم النقاط دون تفاصيل كثيرة.'],
    ['Develop','طوّر','DISTINCTION','حسّن فكرة أو حل ووسعها بشكل عملي.'],
    ['Optimize','حسّن','DISTINCTION','اجعل الحل أفضل أداءً وأقل مشاكل.'],
    ['Assess','قدّر/قيّم','MERIT','استخدم معايير واضحة للحكم على القيمة أو الأثر.'],
    ['Demonstrate','برهن عملياً','PASS','أظهر الخطوات أو الدليل العملي الذي يثبت المهارة.'],
    ['Review','راجع','MERIT','افحص العمل مقابل معايير محددة ثم اذكر التحسين المطلوب.'],
    ['Reflect','تأمل/انعكس','DISTINCTION','اشرح ما تعلمته وكيف ستغير طريقتك بناءً على الدليل.'],
    ['Produce','أنتج','PASS','قدّم مخرجاً واضحاً مكتمل العناصر المطلوبة.']
  ]
};

;
/* ===== assets/js/security.js ===== */
(function(){
  const APP_VERSION = 'v12';
  const MAX_BACKUP_BYTES = 1200 * 1024;
  const MAX_STRING = 1400;
  const MAX_LONG = 25000;
  const ALLOWED_KEYS = new Set([
    'theme','language','site:settings','activeProfileId','profiles','admin:pinHash','admin:pinSalt','admin:session','security:events','privacy:localNotice','runtime:errors',
    'advisor:last','advisor:quickPrompt','homeworks','rounds','groups','problems','errors','compare','academic:rows','study:sessions','study:calendar','study:continuation','dashboard:mission','dashboard:executionGuard','dashboard:weeklyPlan','dashboard:notes','dashboard:dailyReport','dailyReviews','study:sourceBudget','user:preferences','notebook:notes','notebook:diary','notebook:flashcards','notebook:bookmarks','mindmaps','site:customResources','site:customServices','site:announcements','site:featuredLectures','student:goals','student:habits','product:analytics','product:feedback','product:onboarding','product:role','product:pitchMode','ui:tourDone'
  ]);
  const SYNC_ALLOWED_KEYS = new Set([
    'theme','language','site:settings','activeProfileId','profiles',
    'advisor:last','advisor:quickPrompt','homeworks','rounds','groups','problems','errors','compare',
    'academic:rows','study:sessions','study:calendar','study:continuation','dashboard:mission','dashboard:executionGuard','dashboard:weeklyPlan','dashboard:notes','dashboard:dailyReport',
    'dailyReviews','study:sourceBudget','user:preferences','notebook:notes','notebook:diary','notebook:flashcards','notebook:bookmarks',
    'mindmaps','site:customResources','site:announcements','site:featuredLectures','student:goals','student:habits','ui:tourDone'
  ]);
  const PROFILE_SYNC_RE = /^profile\.[a-zA-Z0-9:_-]{1,90}\.(.+)$/;
  function syncBaseKey(name){ const raw=String(name||'').replace(/[^a-zA-Z0-9:_\-.]/g,'').slice(0,180); const m=raw.match(PROFILE_SYNC_RE); return m?m[1]:raw; }
  function isSyncKeyAllowed(name){ const raw=String(name||'').replace(/[^a-zA-Z0-9:_\-.]/g,'').slice(0,180); if(!raw || /^(admin|security|backup|auth):/i.test(raw)) return false; return SYNC_ALLOWED_KEYS.has(syncBaseKey(raw)); }
  function localDate(date=new Date()){ const d=new Date(date); const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
  const enumOf = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
  function toStringSafe(value){ return String(value ?? ''); }
  function stripControls(value){ return toStringSafe(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' '); }
  function cleanText(value, max = MAX_STRING){ return stripControls(value).replace(/\s+/g, ' ').trim().slice(0, max); }
  function cleanMultiline(value, max = MAX_LONG){ return stripControls(value).replace(/\r\n/g,'\n').replace(/\n{6,}/g,'\n\n\n\n\n').trim().slice(0, max); }
  function escapeHTML(value){ return toStringSafe(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
  function escapeAttr(value){ return escapeHTML(value); }
  function clampNumber(value, min, max, fallback = min){ const num = Number(value); return Number.isFinite(num) ? Math.min(max, Math.max(min, num)) : fallback; }
  function cleanId(value){ const raw = cleanText(value, 140).replace(/[^a-zA-Z0-9:_-]/g, ''); return raw || ('sr_' + Math.random().toString(16).slice(2)); }
  function cleanDate(value){ const raw = cleanText(value, 40); return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : ''; }
  function safeURL(value){
    const raw = cleanText(value, 700);
    if(!raw) return '#';
    if(raw.startsWith('#')) return raw;
    if(/^(javascript|data|vbscript|file):/i.test(raw)) return '#';
    try{ const parsed = new URL(raw, location.href); return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? raw : '#'; }catch(_){ return '#'; }
  }
  function cleanBool(value){ return value === true || value === 'true'; }
  function safePercent(value){ return clampNumber(value, 0, 100, 0); }
  function list(value, max){ return Array.isArray(value) ? value.slice(0, max) : []; }
  function cleanRecordBase(item){ return Object.fromEntries(Object.entries({id: cleanId(item?.id), createdAt: cleanText(item?.createdAt || new Date().toISOString(), 50), updatedAt: cleanText(item?.updatedAt,50)||undefined, deletedAt: cleanBool(item?._deleted) ? (cleanText(item?.deletedAt || new Date().toISOString(),50)||new Date().toISOString()) : undefined, _deleted: cleanBool(item?._deleted)||undefined}).filter(([,v])=>v!==undefined)); }
  function cleanResource(item){ return {
    id: cleanId(item?.id), name: cleanText(item?.name, 120) || 'مصدر', type: enumOf(cleanText(item?.type, 24), ['official','platform','practice','channel','btec','teacher','library','tool'], 'tool'), cost: enumOf(cleanText(item?.cost, 20), ['free','paid','mixed'], 'free'), track: enumOf(cleanText(item?.track, 20), ['all','academic','btec','vocational'], 'all'), subject: cleanText(item?.subject, 80) || 'عام', fit: cleanText(item?.fit, 260) || 'مفيد للدراسة', risk: cleanText(item?.risk, 260) || 'تحقق قبل الاعتماد', score: clampNumber(item?.score,0,100,70), url: safeURL(item?.url)
  }; }
  const validators = {
    'theme': value => enumOf(value, ['dark','light'], 'dark'),
    'language': value => enumOf(value, ['ar','en'], 'ar'),
    'privacy:localNotice': cleanBool,
    'activeProfileId': value => cleanId(value),
    'admin:pinHash': value => /^[a-f0-9]{64}$/i.test(cleanText(value, 80)) ? cleanText(value,80).toLowerCase() : '',
    'admin:pinSalt': value => cleanId(value),
    'admin:session': cleanBool,
    'site:settings': value => value && typeof value === 'object' ? ({
      brandArabic: cleanText(value.brandArabic, 30) || 'بوصلة',
      brandEnglish: cleanText(value.brandEnglish, 40) || 'Bawsala',
      tagline: cleanText(value.tagline, 120) || 'عدة دراسة يومية مجانية للطالب الأردني',
      announcement: cleanText(value.announcement, 220),
      whatsapp: cleanText(value.whatsapp, 20).replace(/[^0-9]/g,'').slice(0,16) || '962792305585',
      showAnnouncement: cleanBool(value.showAnnouncement)
    }) : null,
    'profiles': value => list(value, 40).map(item => ({
      ...cleanRecordBase(item),
      name: cleanText(item?.name, 70) || 'طالب',
      track: enumOf(cleanText(item?.track, 20), ['علمي','أدبي','BTEC','مهني','غير محدد'], 'غير محدد'),
      grade: enumOf(cleanText(item?.grade, 20), ['الأول ثانوي','التوجيهي','خريج','غير محدد'], 'غير محدد'),
      goal: clampNumber(item?.goal, 0, 100, 80),
      weakSubject: cleanText(item?.weakSubject, 80),
      dailyHours: clampNumber(item?.dailyHours,0,14,2),
      avatar: cleanText(item?.avatar, 4) || '●',
      status: enumOf(cleanText(item?.status, 20), ['نشط','متوقف','مراقبة'], 'نشط')
    })),
    'advisor:quickPrompt': value => cleanMultiline(value, 900),
    'compare': value => list(value, 3).map(cleanId),
    'dashboard:notes': value => cleanMultiline(value, 25000),
    'dashboard:dailyReport': value => cleanMultiline(value, 12000),
    'dashboard:executionGuard': value => value && typeof value === 'object' ? ({
      purpose: cleanText(value.purpose, 300) || 'مهمة اليوم',
      sourceLimit: clampNumber(value.sourceLimit, 1, 3, 2),
      minutes: clampNumber(value.minutes, 10, 180, 30),
      forbidden: cleanText(value.forbidden, 220) || 'فتح مصادر جديدة قبل أول جلسة',
      blocker: cleanText(value.blocker, 260),
      updatedAt: cleanText(value.updatedAt || new Date().toISOString(), 50)
    }) : null,
    'study:sourceBudget': value => value && typeof value === 'object' ? ({
      date: cleanText(value.date || localDate(),50),
      limit: clampNumber(value.limit,1,3,2),
      sources: list(value.sources,3).map(x=>cleanText(x,120)).filter(Boolean).slice(0,3),
      rule: cleanText(value.rule,220),
      updatedAt: cleanText(value.updatedAt || new Date().toISOString(),50)
    }) : null,
    'user:preferences': value => value && typeof value === 'object' ? ({startPage: cleanText(value.startPage,80)||'dashboard.html', defaultFocus: clampNumber(value.defaultFocus,5,120,25), dailyGoal: clampNumber(value.dailyGoal,10,600,120), compact: cleanBool(value.compact), reduceMotion: cleanBool(value.reduceMotion), autoSync: value.autoSync === false ? false : true, notifications: cleanBool(value.notifications), fontScale: enumOf(cleanText(value.fontScale,20),['normal','large','xlarge'],'normal'), contrast: enumOf(cleanText(value.contrast,20),['standard','high'],'standard')}) : {},
    'site:customResources': value => list(value, 80).map(cleanResource),
    'site:featuredLectures': value => list(value, 80).map(cleanResource),
    'site:customServices': value => list(value, 40).map(item => ({...cleanRecordBase(item), title:cleanText(item?.title,120)||'خدمة', desc:cleanText(item?.desc,500), cta:cleanText(item?.cta,120)||'اطلب عبر واتساب'})),
    'site:announcements': value => list(value, 20).map(item => ({...cleanRecordBase(item), text:cleanText(item?.text,220), active:cleanBool(item?.active)})),
    'homeworks': value => list(value, 160).map(item => ({...cleanRecordBase(item), title:cleanText(item?.title,160)||'واجب', subject:cleanText(item?.subject,80)||'عام', due:cleanDate(item?.due), priority:enumOf(cleanText(item?.priority,20),['عالية','متوسطة','خفيفة'],'متوسطة'), done:cleanBool(item?.done)})),
    'rounds': value => list(value, 80).map((item,i)=>({...cleanRecordBase(item), subject:cleanText(item?.subject,80)||'عام', goal:cleanText(item?.goal,200)||'مراجعة', minutes:clampNumber(item?.minutes,5,180,35), index:clampNumber(item?.index,1,50,i+1), done:cleanBool(item?.done)})),
    'groups': value => list(value, 80).map(item => ({...cleanRecordBase(item), name:cleanText(item?.name,100)||'مجموعة دراسة', subject:cleanText(item?.subject,80)||'عام', track:enumOf(cleanText(item?.track,20),['أكاديمي','BTEC','مختلط','توجيهي','عام'],'عام'), capacity:clampNumber(item?.capacity,2,80,6), members:clampNumber(item?.members,1,80,1), goal:cleanText(item?.goal,260)||'هدف واضح'})),
    'problems': value => list(value, 120).map(item => ({...cleanRecordBase(item), source:enumOf(cleanText(item?.source,30),['community','support-center','quick-capture',''],''), privacy:enumOf(cleanText(item?.privacy,20),['anonymous','info','private'],'anonymous'), visibility:enumOf(cleanText(item?.visibility,24),['student-admin','private','admin-only'],'student-admin'), status:enumOf(cleanText(item?.status,20),['جديدة','قيد المتابعة','تم الحل','مؤجلة'],'جديدة'), priority:enumOf(cleanText(item?.priority,20),['normal','high'],'normal'), title:cleanText(item?.title,160)||'مشكلة طالب', category:cleanText(item?.category,80)||'عام', name:cleanText(item?.name,80), contact:cleanText(item?.contact,120), details:cleanMultiline(item?.details,9000)||'بدون تفاصيل', adminNote:cleanMultiline(item?.adminNote,3000)})),
    'errors': value => list(value, 220).map(item => ({...cleanRecordBase(item), subject:cleanText(item?.subject,80)||'عام', lesson:cleanText(item?.lesson,120)||'غير محدد', category:enumOf(cleanText(item?.category,30),['فهم','حفظ','تسرع','قانون','وقت','صياغة','BTEC','آخر'],'آخر'), status:enumOf(cleanText(item?.status,30),['جديد','قيد المراجعة','تمت المراجعة','انتهى'],'جديد'), error:cleanMultiline(item?.error,5000), fix:cleanMultiline(item?.fix,5000), reviewAt:cleanText(item?.reviewAt,50), reviewedAt:cleanText(item?.reviewedAt,50), cardId:cleanText(item?.cardId,140).replace(/[^a-zA-Z0-9:_-]/g,''), missionId:cleanText(item?.missionId,140).replace(/[^a-zA-Z0-9:_-]/g,''), message:cleanText(item?.message,300), source:cleanText(item?.source,160), page:cleanText(item?.page,120), stack:cleanMultiline(item?.stack,2500)})),
    'security:events': value => list(value, 120).map(item => ({...cleanRecordBase(item), type:cleanText(item?.type,80), detail:cleanText(item?.detail,240)})),
    'academic:rows': value => list(value, 40).map(item => ({id:cleanId(item?.id), name:cleanText(item?.name,90)||'مادة', mark:clampNumber(item?.mark,0,100,0), weight:clampNumber(item?.weight,0,100,0)})),
    'study:sessions': value => list(value, 500).map(item => ({...cleanRecordBase(item), minutes:clampNumber(item?.minutes,1,240,25), elapsedSeconds:clampNumber(item?.elapsedSeconds,0,10800,0), plannedMinutes:clampNumber(item?.plannedMinutes,5,180,25), completionRatio:clampNumber(item?.completionRatio,0,100,0), mission:cleanText(item?.mission,220)||'جلسة تركيز', subject:cleanText(item?.subject,80), focusScore:clampNumber(item?.focusScore,1,5,3), blocker:cleanText(item?.blocker,300), distractions:clampNumber(item?.distractions,0,999,0), sources:list(item?.sources,3).map(source=>cleanText(source,120)).filter(Boolean), startedAt:cleanText(item?.startedAt,50), finishedAt:cleanText(item?.finishedAt,50)})),
    'study:calendar': value => list(value, 500).map(item => ({...cleanRecordBase(item), title:cleanText(item?.title,140)||'حدث دراسي', type:enumOf(cleanText(item?.type,30),['deadline','exam','session','task','reminder'],'task'), date:cleanDate(item?.date)||localDate(), time:cleanText(item?.time,8).replace(/[^0-9:]/g,'').slice(0,5), startTime:cleanText(item?.startTime||item?.start_time,60), endTime:cleanText(item?.endTime||item?.end_time,60), timezone:cleanText(item?.timezone,80)||'Asia/Amman', duration:clampNumber(item?.duration,0,480,0), track:enumOf(cleanText(item?.track,20),['all','academic','btec'],'all'), subject:cleanText(item?.subject,80)||'عام', color:enumOf(cleanText(item?.color,20),['red','blue','green','teal','purple','gray',''],'') , notes:cleanMultiline(item?.notes||item?.description,2000), description:cleanMultiline(item?.description||item?.notes,2000), reminder:enumOf(cleanText(item?.reminder,20),['none','same-day','day-before','week-before'],'none'), reminderMinutes: item?.reminderMinutes === undefined ? undefined : clampNumber(item?.reminderMinutes,0,10080,0), reminderSentAt:cleanText(item?.reminderSentAt,60)||undefined, googleEventId:cleanText(item?.googleEventId,160), externalProvider:cleanText(item?.externalProvider,40)||undefined, externalSyncStatus:cleanText(item?.externalSyncStatus,40)||undefined})),
    'dailyReviews': value => list(value, 240).map(item => ({...cleanRecordBase(item), energy:enumOf(cleanText(item?.energy,20),['منخفضة','متوسطة','عالية'],'متوسطة'), commitment:enumOf(cleanText(item?.commitment,20),['ضعيف','مقبول','جيد','ممتاز'],'مقبول'), blocker:cleanText(item?.blocker,520), lesson:cleanText(item?.lesson,500), tomorrow:cleanText(item?.tomorrow,260), text:cleanMultiline(item?.text,3600), date:cleanText(item?.date,50)})),
    'dashboard:mission': value => value && typeof value === 'object' ? ({ id:cleanId(value.id), text:cleanText(value.text || value.mission,220)||'مهمة اليوم', mission:cleanText(value.mission || value.text,220)||'مهمة اليوم', subject:cleanText(value.subject,80), minutes:clampNumber(value.minutes,5,180,25), status:enumOf(cleanText(value.status,20),['ready','started','done','failed'],'ready'), date:cleanDate(value.date), originType:cleanText(value.originType,40), originId:cleanText(value.originId,140).replace(/[^a-zA-Z0-9:_-]/g,''), originLabel:cleanText(value.originLabel,160), createdAt:cleanText(value.createdAt || new Date().toISOString(),50), updatedAt:cleanText(value.updatedAt || value.createdAt || new Date().toISOString(),50) }) : null,
    'study:continuation': value => value && typeof value === 'object' ? ({ id:cleanId(value.id), kind:cleanText(value.kind,40)||'study', entityId:cleanText(value.entityId,140).replace(/[^a-zA-Z0-9:_-]/g,''), title:cleanText(value.title,180)||'متابعة الدراسة', subject:cleanText(value.subject,80), target:cleanText(value.target,40)||'focus', sourcePage:cleanText(value.sourcePage,160), status:enumOf(cleanText(value.status,20),['active','done','cancelled'],'active'), createdAt:cleanText(value.createdAt || new Date().toISOString(),50), updatedAt:cleanText(value.updatedAt || value.createdAt || new Date().toISOString(),50), expiresAt:cleanText(value.expiresAt,50) }) : null,
    'dashboard:weeklyPlan': value => value && typeof value === 'object' ? ({ createdAt:cleanText(value.createdAt || new Date().toISOString(),50), items:list(value.items,21).map((item,i)=>({id:cleanId(item?.id), day:clampNumber(item?.day,1,21,i+1), text:cleanText(item?.text,200), done:cleanBool(item?.done)})) }) : null,
    'advisor:last': value => value && typeof value === 'object' ? ({ title:cleanText(value.title,180)||'قرار دراسي', badge:enumOf(cleanText(value.badge,20),['green','blue','teal','red','gray'],'green'), decisionLevel:cleanText(value.decisionLevel,80)||'قرار عملي', plan:list(value.plan,10).map(x=>cleanText(x,200)).filter(Boolean), resources:list(value.resources,8).map(r=>({name:cleanText(r?.name,120), fit:cleanText(r?.fit,260), url:safeURL(r?.url)})), createdAt:cleanText(value.createdAt || new Date().toISOString(),50), raw: typeof value.raw === 'object' && value.raw ? Object.fromEntries(Object.entries(value.raw).slice(0,30).map(([k,v])=>[cleanText(k,50), cleanText(v,600)])) : {} }) : null,
    'notebook:notes': value => list(value, 360).map(item=>({...cleanRecordBase(item), title:cleanText(item?.title,140)||'ملاحظة', subject:cleanText(item?.subject,80)||'عام', body:cleanMultiline(item?.body || item?.text,25000), tags:list(item?.tags,10).map(x=>cleanText(x,40)).filter(Boolean), source:cleanText(item?.source,120), pinned:cleanBool(item?.pinned), archived:cleanBool(item?.archived)})),
    'notebook:diary': value => list(value, 240).map(item=>({...cleanRecordBase(item), mood:cleanText(item?.mood,40)||'جيد', wins:cleanMultiline(item?.wins,5000), blockers:cleanMultiline(item?.blockers,5000), done:cleanMultiline(item?.done || item?.wins,5000), tomorrow:cleanText(item?.tomorrow,240)})),
    'notebook:flashcards': value => list(value, 900).map(item=>({...cleanRecordBase(item), deck:cleanText(item?.deck,80)||'عام', subject:cleanText(item?.subject,80)||'عام', front:cleanText(item?.front || item?.question,360), back:cleanMultiline(item?.back || item?.answer,9000), hint:cleanText(item?.hint,420), tags:list(item?.tags,10).map(x=>cleanText(x,40)).filter(Boolean), level:clampNumber(item?.level,1,7,1), intervalDays:clampNumber(item?.intervalDays,0,365,0), ease:clampNumber(item?.ease,1.3,3.2,2.3), reps:clampNumber(item?.reps,0,999,0), lapses:clampNumber(item?.lapses,0,999,0), correct:clampNumber(item?.correct,0,999,0), wrong:clampNumber(item?.wrong,0,999,0), archived:cleanBool(item?.archived), dueAt:cleanText(item?.dueAt || new Date().toISOString(),50), lastReviewedAt:cleanText(item?.lastReviewedAt,50)})),
    'notebook:bookmarks': value => list(value, 200).map(item=>({...cleanRecordBase(item), title:cleanText(item?.title,140), url:safeURL(item?.url), note:cleanText(item?.note,260)})),
    'mindmaps': value => list(value, 80).map(item=>({...cleanRecordBase(item), title:cleanText(item?.title,120)||'خريطة ذهنية', subject:cleanText(item?.subject,80)||'عام', center:cleanText(item?.center,120)||'الفكرة الرئيسية', nodes:list(item?.nodes,80).map((node,i)=>({id:cleanId(node?.id || ('node_'+i)), parentId:cleanId(node?.parentId || 'center'), text:cleanText(node?.text,140)||'فرع', color:enumOf(cleanText(node?.color,20),['brand','blue','green','purple','gray'],'brand')}))})),
    'student:goals': value => list(value, 60).map(item=>({...cleanRecordBase(item), title:cleanText(item?.title,140)||'هدف', metric:cleanText(item?.metric,80)||'دراسة', target:clampNumber(item?.target,0,1000,1), current:clampNumber(item?.current,0,1000,0), due:cleanDate(item?.due), done:cleanBool(item?.done)})),
    'student:habits': value => list(value, 60).map(item=>({...cleanRecordBase(item), title:cleanText(item?.title || item?.name,100)||'عادة', name:cleanText(item?.name || item?.title,100)||'عادة', streak:clampNumber(item?.streak,0,365,0), lastDone:cleanText(item?.lastDone,50)})),
    'runtime:errors': value => list(value, 80).map(item=>({...cleanRecordBase(item), message:cleanText(item?.message,300)||'Runtime error', source:cleanText(item?.source,180), stack:cleanMultiline(item?.stack,1800), page:cleanText(item?.page,160), createdAt:cleanText(item?.createdAt || new Date().toISOString(),50)})),
    'product:analytics': value => list(value, 300).map(item=>({...cleanRecordBase(item), event:cleanText(item?.event,80)||'event', page:cleanText(item?.page,160), role:enumOf(cleanText(item?.role,24),['student','parent','teacher','school','investor','admin','unknown'],'unknown'), detail:cleanText(item?.detail,260), sessionId:cleanText(item?.sessionId,80), ts:cleanText(item?.ts || new Date().toISOString(),50)})),
    'product:feedback': value => list(value, 120).map(item=>({...cleanRecordBase(item), role:enumOf(cleanText(item?.role,24),['student','parent','teacher','school','investor','admin','unknown'],'unknown'), rating:clampNumber(item?.rating,1,5,3), page:cleanText(item?.page,160), text:cleanMultiline(item?.text,2000), status:enumOf(cleanText(item?.status,20),['new','triaged','closed'],'new')})),
    'product:onboarding': value => value && typeof value === 'object' ? ({ done:cleanBool(value.done), role:enumOf(cleanText(value.role,24),['student','parent','teacher','school','investor','admin','unknown'],'student'), goal:cleanText(value.goal,180), obstacle:cleanText(value.obstacle,180), updatedAt:cleanText(value.updatedAt || new Date().toISOString(),50) }) : {done:false,role:'student'},
    'product:role': value => enumOf(cleanText(value,24),['student','parent','teacher','school','investor','admin'],'student'),
    'product:pitchMode': cleanBool,
    'ui:tourDone': cleanBool
  };
  function sanitizeForKey(name, value, fallback = null){ if(!ALLOWED_KEYS.has(name)) return fallback; const validator=validators[name]; try{return validator ? validator(value) : value;}catch(_){return fallback;} }
  function sanitizeBackup(data){ if(!data || typeof data !== 'object') throw new Error('INVALID_BACKUP'); return data; }
  function assertBackupFile(file){ if(!file) throw new Error('NO_FILE'); if(file.size > MAX_BACKUP_BYTES) throw new Error('BACKUP_TOO_LARGE'); if(file.type && !['application/json','text/json',''].includes(file.type)) throw new Error('BAD_FILE_TYPE'); }
  function recordSecurityEvent(type, detail){ try{ const key='bawsala.v12.security:events'; const raw=localStorage.getItem(key); const arr=raw?JSON.parse(raw):[]; arr.unshift({id:'sec_'+Date.now().toString(16),type:cleanText(type,80),detail:cleanText(detail,240),createdAt:new Date().toISOString()}); localStorage.setItem(key, JSON.stringify(arr.slice(0,120))); }catch(_){/* ignore */} }
  async function sha256(text){ const enc = new TextEncoder().encode(text); const hash = await crypto.subtle.digest('SHA-256', enc); return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join(''); }
  window.MT_SECURITY = {APP_VERSION,ALLOWED_KEYS,SYNC_ALLOWED_KEYS,syncBaseKey,isSyncKeyAllowed,localDate,MAX_BACKUP_BYTES,cleanText,cleanMultiline,escapeHTML,escapeAttr,clampNumber,cleanId,cleanDate,safeURL,safePercent,sanitizeForKey,sanitizeBackup,assertBackupFile,recordSecurityEvent,sha256};
})();

;
/* ===== assets/js/backend-client.js ===== */
(function(){
  const CLIENT_VERSION='16.0.1';
  const sec = () => window.MT_SECURITY;
  const state = { clientVersion:CLIENT_VERSION, serverVersion:null, versionMismatch:false, checked:false, authenticated:false, user:null, online:navigator.onLine, syncing:false, pendingSync:false, pendingSince:null, pendingReason:null, syncGeneration:0, lastSyncedGeneration:0, lastSync:null, lastRevision:null, lastConflict:null, csrfToken:null, activeRequests:0, lastRequest:null, lastError:null };
  const inflightGets=new Map();
  const DEFAULT_TIMEOUT_MS=12000;
  const PENDING_SYNC_KEY='bawsala:cloud-sync:pending';
  const ERROR_MESSAGES={
    UNAUTHORIZED:'سجل الدخول للمتابعة.', FORBIDDEN:'لا تملك صلاحية تنفيذ هذا الإجراء.', EMAIL_VERIFICATION_REQUIRED:'أكد بريدك الإلكتروني أولاً.',
    RATE_LIMITED:'طلبات كثيرة خلال وقت قصير. انتظر قليلاً ثم أعد المحاولة.', BAD_CSRF:'انتهت جلسة الحماية. أعد المحاولة.',
    MAINTENANCE_MODE:'الخدمة تحت الصيانة مؤقتاً.', SERVER_ERROR:'حدث خطأ داخلي. استخدم رقم الطلب عند التواصل مع الدعم.',
    REQUEST_TIMEOUT:'استغرق الطلب وقتاً أطول من اللازم.', NETWORK_ERROR:'تعذر الاتصال بالخادم. تحقق من الشبكة.',
    BAD_RESPONSE:'وصل رد غير صالح من الخادم.', METHOD_NOT_ALLOWED:'هذا الإجراء غير مدعوم.', NOT_FOUND:'المسار المطلوب غير موجود.'
  };
  function readCookie(name){
    return document.cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1) || '';
  }
  function emitRequest(detail){
    window.dispatchEvent(new CustomEvent('bawsala:request',{detail:{active:state.activeRequests,...detail}}));
  }
  function makeRequestId(){
    try{return 'web_'+crypto.randomUUID().replaceAll('-','').slice(0,24);}catch(_){return 'web_'+Date.now().toString(36)+Math.random().toString(36).slice(2,10);}
  }
  function idempotencyKey(){
    try{return crypto.randomUUID();}catch(_){return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);}
  }
  function userMessage(code,status){
    if(ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
    if(status>=500) return ERROR_MESSAGES.SERVER_ERROR;
    return 'تعذر إكمال العملية. حاول مرة أخرى.';
  }
  function emitSync(extra={}){ window.dispatchEvent(new CustomEvent('bawsala:sync',{detail:{syncing:state.syncing,pendingSync:state.pendingSync,pendingSince:state.pendingSince,pendingReason:state.pendingReason,syncGeneration:state.syncGeneration,lastSyncedGeneration:state.lastSyncedGeneration,lastSync:state.lastSync,lastRevision:state.lastRevision,lastConflict:state.lastConflict,...extra}})); }
  function persistPendingSync(status='pending'){
    try{localStorage.setItem(PENDING_SYNC_KEY,JSON.stringify({at:state.pendingSince,reason:state.pendingReason,generation:state.syncGeneration,status,conflict:state.lastConflict||null}));}catch(_){}
  }
  function markPendingSync(reason='offline',status='pending'){
    state.pendingSync=true;
    state.pendingSince=state.pendingSince || new Date().toISOString();
    state.pendingReason=String(reason||'offline').slice(0,80);
    persistPendingSync(status);
    emitSync({queued:true,reason:state.pendingReason,status});
  }
  function clearPendingSync(){
    state.pendingSync=false; state.pendingSince=null; state.pendingReason=null;
    try{localStorage.removeItem(PENDING_SYNC_KEY);}catch(_){}
  }
  function restorePendingSync(){
    try{const saved=JSON.parse(localStorage.getItem(PENDING_SYNC_KEY)||'null');if(saved?.at){state.pendingSync=true;state.pendingSince=saved.at;state.pendingReason=saved.reason||'pending';state.syncGeneration=Math.max(state.syncGeneration,Number(saved.generation||0));state.lastConflict=saved.conflict||null;}}catch(_){}
  }
  function composeSignal(externalSignal, timeoutMs){
    const controller=new AbortController();
    let timedOut=false;
    const timer=setTimeout(()=>{timedOut=true; controller.abort(new DOMException('Request timeout','TimeoutError'));},timeoutMs);
    const relay=()=>controller.abort(externalSignal.reason || new DOMException('Aborted','AbortError'));
    if(externalSignal){
      if(externalSignal.aborted) relay();
      else externalSignal.addEventListener('abort',relay,{once:true});
    }
    return {signal:controller.signal,timedOut:()=>timedOut,cleanup:()=>{clearTimeout(timer); externalSignal?.removeEventListener?.('abort',relay);}};
  }
  async function ensureCsrf(){
    if(state.csrfToken) return state.csrfToken;
    const cookieToken = decodeURIComponent(readCookie('bawsala_csrf') || '');
    if(/^[a-zA-Z0-9_-]{32,128}$/.test(cookieToken)){ state.csrfToken=cookieToken; return cookieToken; }
    const response = await fetch('/api/auth/csrf', { credentials:'same-origin', headers:{'Accept':'application/json','X-Request-Id':makeRequestId()} });
    const data = await response.json().catch(()=>({}));
    state.csrfToken = data.csrfToken || decodeURIComponent(readCookie('bawsala_csrf') || '');
    if(!state.csrfToken) throw new Error('CSRF_UNAVAILABLE');
    return state.csrfToken;
  }
  async function executeRequest(path, options={}, retryState={csrf:false,attempt:0}){
    const method=String(options.method || 'GET').toUpperCase();
    const safeMethod=['GET','HEAD','OPTIONS'].includes(method);
    const timeoutMs=Math.max(1000,Math.min(60000,Number(options.timeoutMs||DEFAULT_TIMEOUT_MS)));
    const requestId=options.requestId || makeRequestId();
    const headers={'Accept':'application/json','X-Request-Id':requestId,...(options.headers||{})};
    const composed=composeSignal(options.signal,timeoutMs);
    const init={method,headers,credentials:'same-origin',signal:composed.signal};
    if(!safeMethod){
      headers['X-Bawsala-Request']='1';
      headers['X-Bawsala-CSRF']=await ensureCsrf();
      if(options.idempotent || /^\/api\/billing\/(checkout|change-plan|portal|cancel)$/.test(path)) headers['Idempotency-Key']=options.idempotencyKey || idempotencyKey();
    }
    if(options.body !== undefined){ headers['Content-Type']='application/json'; init.body=JSON.stringify(options.body); }
    state.activeRequests+=1;
    state.lastRequest={path,method,requestId,startedAt:new Date().toISOString()};
    emitRequest({phase:'start',path,method,requestId});
    try{
      const response=await fetch(path,init);
      const serverVersion=String(response.headers.get('x-backend-version')||response.headers.get('x-app-version')||'');
      if(serverVersion){
        state.serverVersion=serverVersion;
        state.versionMismatch=serverVersion!==CLIENT_VERSION;
        if(state.versionMismatch) window.dispatchEvent(new CustomEvent('bawsala:version-mismatch',{detail:{clientVersion:CLIENT_VERSION,serverVersion}}));
      }
      const contentType=String(response.headers.get('content-type')||'');
      const data=contentType.includes('application/json') ? await response.json().catch(()=>({ok:false,error:'BAD_RESPONSE'})) : {ok:response.ok,error:response.ok?'':'BAD_RESPONSE'};
      if(data.csrfToken) state.csrfToken=data.csrfToken;
      if(response.status===403 && data.error==='BAD_CSRF' && !retryState.csrf){
        state.csrfToken=null;
        await ensureCsrf();
        return executeRequest(path,{...options,requestId}, {csrf:true,attempt:retryState.attempt});
      }
      if(response.status===401){
        state.authenticated=false; state.user=null;
        window.dispatchEvent(new CustomEvent('bawsala:auth',{detail:{...state}}));
      }
      if(!response.ok || data.ok===false){
        const code=data.error || 'REQUEST_FAILED';
        const err=new Error(code);
        err.code=code; err.status=response.status; err.data=data; err.requestId=data.requestId || response.headers.get('x-request-id') || requestId;
        err.retryAfter=Number(response.headers.get('retry-after')||0); err.retryable=Boolean(data.retryable) || (safeMethod && (response.status===429 || response.status>=500));
        err.userMessage=sec().cleanText(data.message||'',300) || userMessage(code,response.status);
        if(err.retryable && retryState.attempt < Number(options.retries ?? 1)){
          const delay=Math.min(1800,250*Math.pow(2,retryState.attempt)+(Math.random()*120));
          await new Promise(resolve=>setTimeout(resolve,delay));
          return executeRequest(path,{...options,requestId}, {...retryState,attempt:retryState.attempt+1});
        }
        throw err;
      }
      state.online=true; state.lastError=null;
      state.lastRequest={...state.lastRequest,finishedAt:new Date().toISOString(),status:response.status};
      emitRequest({phase:'success',path,method,requestId,status:response.status});
      return data;
    }catch(rawErr){
      let err=rawErr;
      if(rawErr?.name==='AbortError' || rawErr?.name==='TimeoutError'){
        const code=composed.timedOut()?'REQUEST_TIMEOUT':'REQUEST_ABORTED';
        err=new Error(code); err.code=code; err.status=0; err.requestId=requestId; err.retryable=safeMethod; err.userMessage=userMessage(code,0);
      }else if(rawErr instanceof TypeError){
        err=new Error('NETWORK_ERROR'); err.code='NETWORK_ERROR'; err.status=0; err.requestId=requestId; err.retryable=safeMethod; err.userMessage=userMessage('NETWORK_ERROR',0);
      }
      if(err.code==='NETWORK_ERROR') state.online=false;
      state.lastError={code:err.code||err.message,status:err.status||0,requestId:err.requestId||requestId,at:new Date().toISOString()};
      emitRequest({phase:'error',path,method,requestId,error:state.lastError,userMessage:err.userMessage||userMessage(err.code||err.message,err.status||0)});
      throw err;
    }finally{
      composed.cleanup();
      state.activeRequests=Math.max(0,state.activeRequests-1);
      emitRequest({phase:'end',path,method,requestId});
    }
  }
  function request(path, options={}){
    const method=String(options.method||'GET').toUpperCase();
    const idempotent=options.idempotent || /^\/api\/billing\/(checkout|change-plan|portal|cancel)$/.test(path);
    const normalizedOptions=idempotent && !options.idempotencyKey ? {...options,idempotent:true,idempotencyKey:idempotencyKey()} : options;
    const shouldDedupe=method==='GET' && normalizedOptions.dedupe!==false;
    const key=method+' '+path;
    if(shouldDedupe && inflightGets.has(key)) return inflightGets.get(key);
    const promise=executeRequest(path,normalizedOptions).finally(()=>{if(inflightGets.get(key)===promise) inflightGets.delete(key);});
    if(shouldDedupe) inflightGets.set(key,promise);
    return promise;
  }
  async function health(){ try{ const data=await request('/api/health'); state.online=true; return data; }catch(err){ state.online=false; return null; } }
  async function me(){ try{ const data=await request('/api/auth/me'); state.checked=true; state.authenticated=!!data.authenticated; state.user=data.user||null; window.dispatchEvent(new CustomEvent('bawsala:auth',{detail:{...state}})); return state.user; }catch(err){ state.checked=true; state.authenticated=false; state.user=null; window.dispatchEvent(new CustomEvent('bawsala:auth',{detail:{...state,error:err.message}})); return null; } }
  async function signup(payload){ const clean={ name:sec().cleanText(payload.name,120), email:sec().cleanText(payload.email,240), phone:sec().cleanText(payload.phone,40), ageConfirmed:payload.ageConfirmed===true, password:String(payload.password||''), track:sec().cleanText(payload.track,40), specialization:sec().cleanText(payload.specialization,80), grade:sec().cleanText(payload.grade,40), goal:sec().clampNumber(payload.goal,0,100,85), language:payload.language==='en'?'en':'ar', theme:payload.theme==='light'?'light':'dark', privacyAccepted:payload.privacyAccepted===true }; const data=await request('/api/auth/signup',{method:'POST',body:clean}); state.authenticated=true; state.user=data.user; window.dispatchEvent(new CustomEvent('bawsala:auth',{detail:{...state}})); return data; }
  async function login(email,password,mfaCode=''){ const data=await request('/api/auth/login',{method:'POST',body:{email:sec().cleanText(email,240),password:String(password||''),mfaCode:sec().cleanText(mfaCode,40)}}); state.authenticated=true; state.user=data.user; window.dispatchEvent(new CustomEvent('bawsala:auth',{detail:{...state}})); return data.user; }
  async function requestPasswordReset(email){ return request('/api/auth/password-reset/request',{method:'POST',body:{email:sec().cleanText(email,240)}}); }
  async function confirmPasswordReset(token,newPassword){ const data=await request('/api/auth/password-reset/confirm',{method:'POST',body:{token:sec().cleanText(token,160),newPassword:String(newPassword||'')}}); return data; }
  async function logout(){ await request('/api/auth/logout',{method:'POST'}).catch(()=>null); state.authenticated=false; state.user=null; state.csrfToken=null; window.dispatchEvent(new CustomEvent('bawsala:auth',{detail:{...state}})); }
  async function emailVerificationStatus(){ const data=await request('/api/auth/verify-email/status'); state.user=data.user||state.user; window.dispatchEvent(new CustomEvent('bawsala:auth',{detail:{...state}})); return data; }
  async function requestEmailVerification(){ const data=await request('/api/auth/verify-email/request',{method:'POST'}); state.user=data.user||state.user; window.dispatchEvent(new CustomEvent('bawsala:auth',{detail:{...state}})); return data; }
  async function confirmEmailVerification(token){ const data=await request('/api/auth/verify-email/confirm',{method:'POST',body:{token:sec().cleanText(token,160)}}); state.user=data.user||state.user; window.dispatchEvent(new CustomEvent('bawsala:auth',{detail:{...state}})); return data; }
  async function googleConfig(){ return request('/api/auth/google/config'); }
  async function googleStart(){ return request('/api/auth/google/start'); }
  async function googlePending(){ return request('/api/auth/google/pending'); }
  async function completeGoogleSignup(payload){ const clean={ name:sec().cleanText(payload.name,120), phone:sec().cleanText(payload.phone,40), ageConfirmed:payload.ageConfirmed===true, track:sec().cleanText(payload.track,40), specialization:sec().cleanText(payload.specialization,80), grade:sec().cleanText(payload.grade,40), goal:sec().clampNumber(payload.goal,0,100,85), language:payload.language==='en'?'en':'ar', theme:payload.theme==='light'?'light':'dark', privacyAccepted:payload.privacyAccepted===true }; const data=await request('/api/auth/google/complete',{method:'POST',body:clean}); state.authenticated=true; state.user=data.user; window.dispatchEvent(new CustomEvent('bawsala:auth',{detail:{...state}})); return data; }
  async function mfaStatus(){ return request('/api/account/mfa'); }
  async function startMfaSetup(){ return request('/api/account/mfa',{method:'POST'}); }
  async function confirmMfaSetup(code){ const data=await request('/api/account/mfa/confirm',{method:'POST',body:{code:sec().cleanText(code,20)}}); state.user=data.user||state.user; return data; }
  async function disableMfa(password,code){ const data=await request('/api/account/mfa',{method:'DELETE',body:{password:String(password||''),code:sec().cleanText(code,40)}}); state.user=data.user||state.user; return data; }
  async function legalConfig(){ return request('/api/legal/config'); }
  async function acceptLegalConsent(version){ const data=await request('/api/account/legal-consent',{method:'POST',body:{accepted:true,version}}); state.user=data.user; return data; }
  async function updateAccount(payload){ const data=await request('/api/account',{method:'PATCH',body:payload}); state.user=data.user; window.dispatchEvent(new CustomEvent('bawsala:auth',{detail:{...state}})); return data.user; }
  async function changePassword(currentPassword,newPassword){ return request('/api/account/password',{method:'POST',body:{currentPassword,newPassword}}); }
  async function exportAccountData(){ return request('/api/account/export'); }
  async function deleteAccount(passwordOrOptions){ const payload=(passwordOrOptions && typeof passwordOrOptions==='object')?passwordOrOptions:{password:String(passwordOrOptions||'')}; return request('/api/account',{method:'DELETE',body:payload}); }
  async function getSessions(){ return request('/api/account/sessions'); }
  async function revokeSession(sessionId){ return request('/api/account/sessions/revoke',{method:'POST',body:{sessionId}}); }
  async function getSecurityLog(){ return request('/api/account/security-log'); }
  async function supportTickets(){ return request('/api/support/tickets'); }
  async function createSupportTicket(payload){ return request('/api/support/tickets',{method:'POST',body:{category:sec().cleanText(payload.category,40),priority:payload.priority==='high'?'high':'normal',title:sec().cleanText(payload.title,140),details:sec().cleanMultiline(payload.details,6000),consent:payload.consent===true}}); }
  async function updateSupportTicket(ticketId,payload){ return request(`/api/support/tickets/${encodeURIComponent(sec().cleanText(ticketId,90))}`,{method:'PATCH',body:{status:payload.status}}); }
  function localSnapshot(){ return window.MT_STORE?.snapshot?.() || {keys:{}}; }
  async function saveSnapshot(keys, mode='merge'){
    if(!state.authenticated) await me();
    if(!state.authenticated) throw new Error('NOT_AUTHENTICATED');
    if(!navigator.onLine){ markPendingSync('offline'); const err=new Error('SYNC_QUEUED_OFFLINE'); err.code='SYNC_QUEUED_OFFLINE'; err.queued=true; err.userMessage='تم حفظ التغييرات محلياً وستُرفع تلقائياً عند عودة الاتصال.'; throw err; }
    if(state.syncing){ markPendingSync('changed-during-sync'); const err=new Error('SYNC_ALREADY_RUNNING'); err.queued=true; throw err; }
    const generationAtStart=state.syncGeneration;
    state.syncing=true; emitSync({syncing:true,generation:generationAtStart});
    try{
      if(!state.lastRevision) await getSnapshot();
      const payload={keys: keys || localSnapshot().keys || {}, mode, baseRevision:state.lastRevision,clientGeneration:generationAtStart};
      const data=await request('/api/sync/snapshot',{method:'PUT',body:payload,headers:{'If-Match':`"${state.lastRevision}"`}});
      state.lastSync=data.snapshot?.updatedAt || new Date().toISOString();
      state.lastRevision=data.snapshot?.revision || state.lastRevision;
      state.lastSyncedGeneration=Math.max(state.lastSyncedGeneration,generationAtStart);
      state.lastConflict=null;
      if(state.syncGeneration<=generationAtStart) clearPendingSync(); else markPendingSync('changed-during-sync');
      return data.snapshot;
    }catch(err){
      if(err?.status===409 || err?.code==='SYNC_CONFLICT'){
        state.lastConflict={at:new Date().toISOString(),previousRevision:state.lastRevision||'',revision:err?.data?.currentRevision||'',localGeneration:state.syncGeneration,status:'blocked'};
        markPendingSync('conflict','blocked-conflict');
        err.userMessage='توجد نسخة أحدث على جهاز آخر. راجع النسختين واختر الدمج أو الاستبدال قبل الحفظ.';
        emitSync({conflict:true,status:'blocked-conflict'});
      }
      if(['NETWORK_ERROR','REQUEST_TIMEOUT','SERVER_OVERLOADED'].includes(err?.code) || Number(err?.status||0)>=500){ markPendingSync(err?.code||'retryable'); err.queued=true; }
      throw err;
    }finally{
      state.syncing=false; emitSync();
      if(state.authenticated && navigator.onLine && state.pendingSync && !state.lastConflict) setTimeout(()=>flushPendingSync(),250);
    }
  }
  async function getSnapshot(){ if(!state.authenticated) await me(); if(!state.authenticated) throw new Error('NOT_AUTHENTICATED'); const data=await request('/api/sync/snapshot'); state.lastSync=data.snapshot?.updatedAt || state.lastSync; state.lastRevision=data.snapshot?.revision || state.lastRevision; return data.snapshot || {keys:{}}; }
  function valueTime(item){ const raw=item?.deletedAt||item?.updatedAt||item?.reviewedAt||item?.finishedAt||item?.createdAt||item?.date||item?.dueAt; const value=raw?Date.parse(raw):NaN; return Number.isFinite(value)?value:0; }
  function mergeById(localValue, remoteValue){
    if(Array.isArray(localValue) && Array.isArray(remoteValue)){
      const map=new Map();
      localValue.forEach((item,i)=>{ if(item && typeof item==='object' && item.id) map.set(String(item.id),item); else map.set('_local_'+i,item); });
      remoteValue.forEach((item,i)=>{
        if(item && typeof item==='object' && item.id){
          const old=map.get(String(item.id));
          map.set(String(item.id), !old || valueTime(item) >= valueTime(old) ? item : old);
        } else map.set('_remote_'+i,item);
      });
      return Array.from(map.values()).slice(0,1000);
    }
    if(localValue && remoteValue && typeof localValue==='object' && typeof remoteValue==='object' && !Array.isArray(localValue) && !Array.isArray(remoteValue)){
      const localTime=valueTime(localValue), remoteTime=valueTime(remoteValue);
      if(localTime || remoteTime) return remoteTime >= localTime ? {...localValue,...remoteValue} : {...remoteValue,...localValue};
      return {...localValue,...remoteValue};
    }
    return remoteValue;
  }
  function snapshotSummary(snapshot){
    const keys=snapshot?.keys&&typeof snapshot.keys==='object'?snapshot.keys:{};
    let records=0;
    const groups=[];
    Object.entries(keys).forEach(([key,value])=>{const count=Array.isArray(value)?value.length:(value&&typeof value==='object'?1:0);records+=count;groups.push({key,count});});
    return {updatedAt:snapshot?.updatedAt||snapshot?.exportedAt||null,revision:snapshot?.revision||null,keyCount:Object.keys(keys).length,recordCount:records,groups:groups.sort((a,b)=>b.count-a.count).slice(0,12)};
  }
  function restoreSnapshot(snapshot, mode='merge'){
    if(!window.MT_STORE?.restoreSnapshot) throw new Error('LOCAL_RESTORE_UNAVAILABLE');
    const result=window.MT_STORE.restoreSnapshot({version:snapshot?.version||'v13',schemaVersion:snapshot?.schemaVersion||13,keys:snapshot?.keys||{}},mode,{label:'before-cloud-pull',merge:mergeById});
    return result.count;
  }
  async function previewSnapshot(){ const [remote,local]=await Promise.all([getSnapshot(),Promise.resolve(localSnapshot())]); return {remote:snapshotSummary(remote),local:snapshotSummary(local),remoteSnapshot:remote}; }
  async function pullSnapshot(mode='merge'){ const snap=await getSnapshot(); const count=restoreSnapshot(snap, mode); state.lastSync=snap.updatedAt || new Date().toISOString(); state.lastRevision=snap.revision || state.lastRevision; state.lastConflict=null; clearPendingSync(); window.dispatchEvent(new CustomEvent('bawsala:sync',{detail:{syncing:false,lastSync:state.lastSync,lastRevision:state.lastRevision,mode}})); return {snapshot:snap,count,summary:snapshotSummary(snap)}; }
  let syncTimer=null;
  function scheduleSync(){
    state.syncGeneration+=1;
    if(!state.authenticated) return;
    markPendingSync(state.syncing?'changed-during-sync':'local-change');
    if(state.syncing || state.lastConflict) return;
    clearTimeout(syncTimer);
    if(!navigator.onLine) return;
    syncTimer=setTimeout(()=>saveSnapshot().catch(()=>{}),1200);
  }
  async function flushPendingSync(){ if(!state.pendingSync || state.syncing || state.lastConflict || !navigator.onLine || !state.authenticated) return false; try{await saveSnapshot();return true;}catch(_){return false;} }
  function queryString(params={}){ const q=new URLSearchParams(); Object.entries(params||{}).forEach(([key,value])=>{if(value!==undefined&&value!==null&&value!=='')q.set(key,String(value));}); return q.toString()?'?'+q.toString():''; }
  async function adminOverview(){ return request('/api/admin/overview'); }
  async function adminMetrics(){ return request('/api/admin/metrics',{dedupe:false}); }
  async function adminSettings(){ return request('/api/admin/settings'); }
  async function updateAdminSettings(payload){ return request('/api/admin/settings',{method:'PATCH',body:payload}); }
  async function adminUsers(params={}){ return request('/api/admin/users'+queryString(params),{dedupe:false}); }
  async function updateAdminUser(id,payload){ return request('/api/admin/users/'+encodeURIComponent(id),{method:'PATCH',body:payload}); }
  async function adminProblems(params={}){ return request('/api/admin/problems'+queryString(params),{dedupe:false}); }
  async function updateAdminProblem(ownerId,problemId,payload){ return request('/api/admin/problems/'+encodeURIComponent(ownerId)+'/'+encodeURIComponent(problemId),{method:'PATCH',body:payload}); }
  async function studyOverview(params={}){ return request('/api/study/overview'+queryString(params),{dedupe:false}); }
  async function studyTransaction(actions,options={}){
    if(!state.lastRevision) await getSnapshot();
    const baseRevision=options.baseRevision||state.lastRevision||'';
    const payload={date:options.date,timezoneOffsetMinutes:options.timezoneOffsetMinutes,profileId:options.profileId,baseRevision,actions};
    const data=await request('/api/study/transactions',{method:'POST',body:payload,headers:{'If-Match':`"${baseRevision}"`},idempotent:true,retries:1,idempotencyKey:options.idempotencyKey});
    if(data.revision)state.lastRevision=data.revision;
    state.lastConflict=null;
    return data;
  }
  async function calendarEvents(params={}){ const q=new URLSearchParams(); Object.entries(params||{}).forEach(([k,v])=>{ if(v!==undefined && v!==null && v!=='') q.set(k,v); }); return request('/api/calendar/events'+(q.toString()?'?'+q.toString():'')); }
  async function calendarEvent(id){ return request('/api/calendar/events/'+encodeURIComponent(id)); }
  async function dispatchCalendarReminders(payload={}){ return request('/api/calendar/reminders/dispatch',{method:'POST',body:payload}); }
  async function googleCalendarStatus(){ return request('/api/integrations/google-calendar/status'); }
  async function googleCalendarConnect(){ return request('/api/integrations/google-calendar/connect'); }
  async function googleCalendarSync(direction='two-way'){ return request('/api/integrations/google-calendar/sync',{method:'POST',body:{direction}}); }
  async function googleCalendarDisconnect(){ return request('/api/integrations/google-calendar',{method:'DELETE'}); }
  async function createCalendarEvent(payload){ return request('/api/calendar/events',{method:'POST',body:payload}); }
  async function updateCalendarEvent(id,payload){ return request('/api/calendar/events/'+encodeURIComponent(id),{method:'PATCH',body:payload}); }
  async function deleteCalendarEvent(id){ return request('/api/calendar/events/'+encodeURIComponent(id),{method:'DELETE'}); }
  async function adminBackup(){ return request('/api/admin/backup'); }
  document.addEventListener('DOMContentLoaded',()=>{ restorePendingSync(); health().then(()=>me()).then(()=>flushPendingSync()); window.addEventListener('mt:storage', scheduleSync); window.addEventListener('mt:profile', scheduleSync); window.addEventListener('online',()=>{state.online=true;flushPendingSync();}); window.addEventListener('offline',()=>{state.online=false;if(state.authenticated)markPendingSync('offline');}); });
  window.BAWSALA_BACKEND={state,request,ensureCsrf,health,me,signup,login,requestPasswordReset,confirmPasswordReset,logout,emailVerificationStatus,requestEmailVerification,confirmEmailVerification,googleConfig,googleStart,googlePending,completeGoogleSignup,mfaStatus,startMfaSetup,confirmMfaSetup,disableMfa,legalConfig,acceptLegalConsent,updateAccount,changePassword,exportAccountData,deleteAccount,getSessions,revokeSession,getSecurityLog,supportTickets,createSupportTicket,updateSupportTicket,saveSnapshot,getSnapshot,previewSnapshot,restoreSnapshot,pullSnapshot,scheduleSync,adminOverview,adminMetrics,adminSettings,updateAdminSettings,adminUsers,updateAdminUser,adminProblems,updateAdminProblem,studyOverview,studyTransaction,calendarEvents,calendarEvent,createCalendarEvent,updateCalendarEvent,deleteCalendarEvent,dispatchCalendarReminders,googleCalendarStatus,googleCalendarConnect,googleCalendarSync,googleCalendarDisconnect,adminBackup,flushPendingSync};
})();

;
/* ===== assets/js/storage.js ===== */
(function(){
  const sec = () => window.MT_SECURITY;
  const PREFIX = 'bawsala.v12.';
  const SNAPSHOT_VERSION = 'v13';
  const SUPPORTED_SNAPSHOT_VERSIONS = new Set(['v12','v13']);
  const LEGACY_PREFIXES = ['bawsala.v11.','bawsala.v10.','siraaj.v10.','masar.v9.','masar.v8.','masar.v7.'];
  const PROFILE_SCOPED = new Set(['advisor:last','advisor:quickPrompt','homeworks','rounds','problems','errors','compare','academic:rows','study:sessions','study:sourceBudget','study:continuation','dashboard:mission','dashboard:executionGuard','dashboard:weeklyPlan','dashboard:notes','dashboard:dailyReport','dailyReviews','notebook:notes','notebook:diary','notebook:flashcards','notebook:bookmarks','mindmaps','student:goals','student:habits']);
  const TOMBSTONE_COLLECTIONS = new Set(['homeworks','rounds','groups','problems','errors','academic:rows','study:sessions','study:calendar','dailyReviews','notebook:notes','notebook:diary','notebook:flashcards','notebook:bookmarks','mindmaps','student:goals','student:habits','profiles']);
  const TOMBSTONE_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
  const memory = new Map();
  let persistent = true;
  let persistenceFailure = null;
  function announcePersistenceFailure(operation, err){
    persistent=false;
    persistenceFailure={operation:String(operation||'storage').slice(0,80),message:String(err?.message||err||'STORAGE_UNAVAILABLE').slice(0,240),at:new Date().toISOString()};
    sec()?.recordSecurityEvent('storage-persistence-failed', `${persistenceFailure.operation}: ${persistenceFailure.message}`);
    window.dispatchEvent(new CustomEvent('mt:storage:persistence',{detail:{persistent:false,...persistenceFailure}}));
  }
  function rawGet(k){
    if(!persistent) return memory.has(k)?memory.get(k):null;
    try{return localStorage.getItem(k);}catch(err){announcePersistenceFailure('read',err); return memory.has(k)?memory.get(k):null;}
  }
  function rawSet(k,value,{strict=false}={}){
    let raw;
    try{raw=JSON.stringify(value);}catch(err){if(strict)throw err; sec()?.recordSecurityEvent('storage-serialize-failed',String(err?.message||err)); return false;}
    memory.set(k,raw);
    if(!persistent){ if(strict) throw new Error('PERSISTENT_STORAGE_UNAVAILABLE'); return false; }
    try{localStorage.setItem(k,raw); return true;}catch(err){announcePersistenceFailure('write',err); if(strict)throw new Error('PERSISTENT_STORAGE_UNAVAILABLE'); return false;}
  }
  function rawRemove(k,{strict=false}={}){
    memory.delete(k);
    if(!persistent){ if(strict)throw new Error('PERSISTENT_STORAGE_UNAVAILABLE'); return false; }
    try{localStorage.removeItem(k); return true;}catch(err){announcePersistenceFailure('remove',err); if(strict)throw new Error('PERSISTENT_STORAGE_UNAVAILABLE'); return false;}
  }
  function parse(raw, fallback){ try{return raw===null||raw===undefined?fallback:JSON.parse(raw);}catch(err){sec()?.recordSecurityEvent('storage-parse-failed', String(err?.message||err)); return fallback;} }
  function baseKey(name){ return PREFIX + name; }
  function activeProfileId(){
    const raw = rawGet(baseKey('activeProfileId'));
    const id = sec().sanitizeForKey('activeProfileId', parse(raw, 'guest'), 'guest');
    return id || 'guest';
  }
  function scopedKey(profileId, name){ return PREFIX + 'profile.' + sec().cleanId(profileId || activeProfileId()) + '.' + name; }
  function key(name){ return PROFILE_SCOPED.has(name) ? scopedKey(activeProfileId(), name) : baseKey(name); }
  function legacyKey(prefix, name){ return prefix + name; }
  function isTombstone(item){ return !!(item && typeof item === 'object' && item._deleted === true && item.deletedAt); }
  function tombstoneExpired(item){ const t=item?.deletedAt?Date.parse(item.deletedAt):NaN; return Number.isFinite(t) && t > 0 && Date.now() - t > TOMBSTONE_RETENTION_MS; }
  function hideTombstones(name, value){ return TOMBSTONE_COLLECTIONS.has(sec().syncBaseKey(name)) && Array.isArray(value) ? value.filter(item=>!isTombstone(item)) : value; }
  function pruneExpiredTombstones(name, value){ return TOMBSTONE_COLLECTIONS.has(sec().syncBaseKey(name)) && Array.isArray(value) ? value.filter(item=>!isTombstone(item) || !tombstoneExpired(item)) : value; }
  function readStored(name, fallback){
    const current = rawGet(key(name));
    if(current !== null) return pruneExpiredTombstones(name, sec().sanitizeForKey(sec().syncBaseKey(name), parse(current, fallback), fallback));
    for(const prefix of LEGACY_PREFIXES){
      const legacy = rawGet(legacyKey(prefix, name));
      if(legacy !== null){
        const migrated = pruneExpiredTombstones(name, sec().sanitizeForKey(sec().syncBaseKey(name), parse(legacy, fallback), fallback));
        rawSet(key(name), migrated);
        return migrated;
      }
    }
    return fallback;
  }
  function mergeHiddenTombstones(name, clean, existingValue=null){
    if(!TOMBSTONE_COLLECTIONS.has(sec().syncBaseKey(name)) || !Array.isArray(clean)) return clean;
    const existing = existingValue ?? readStored(name, []);
    const visibleIds = new Set(clean.filter(item=>item && typeof item==='object').map(item=>String(item.id||'')));
    const hidden = (Array.isArray(existing)?existing:[]).filter(item=>isTombstone(item) && !tombstoneExpired(item) && !visibleIds.has(String(item.id||'')));
    return [...clean, ...hidden].slice(0, 1000);
  }
  function get(name, fallback){
    try{ return hideTombstones(name, readStored(name, fallback)); }
    catch(err){ sec()?.recordSecurityEvent('storage-read-failed', name); return fallback; }
  }
  function set(name, value){
    const base=sec().syncBaseKey(name);
    if(!sec().ALLOWED_KEYS.has(base)){ sec().recordSecurityEvent('storage-unknown-key', base); return value; }
    const clean = sec().sanitizeForKey(base, value, null);
    const stored = mergeHiddenTombstones(name, clean);
    rawSet(key(name), stored);
    const visible = hideTombstones(name, stored);
    window.dispatchEvent(new CustomEvent('mt:storage',{detail:{name,value:visible}}));
    return visible;
  }
  function remove(name){ const base=sec().syncBaseKey(name); if(!sec().ALLOWED_KEYS.has(base)){ sec().recordSecurityEvent('storage-remove-unknown-key', base); return; } rawRemove(key(name)); window.dispatchEvent(new CustomEvent('mt:storage',{detail:{name,value:null}})); }
  function getForProfile(profileId, name, fallback){
    const raw = rawGet(scopedKey(profileId, name));
    if(raw !== null){ const clean=pruneExpiredTombstones(name, sec().sanitizeForKey(sec().syncBaseKey(name), parse(raw, fallback), fallback)); return hideTombstones(name, clean); }
    return fallback;
  }
  function setForProfile(profileId, name, value){ const base=sec().syncBaseKey(name); if(!sec().ALLOWED_KEYS.has(base)){ sec().recordSecurityEvent('storage-profile-unknown-key', base); return value; } const clean=sec().sanitizeForKey(base,value,null); const raw = rawGet(scopedKey(profileId,name)); const existing = raw !== null ? pruneExpiredTombstones(name, sec().sanitizeForKey(base, parse(raw, []), [])) : []; const stored=mergeHiddenTombstones(name,clean,existing); rawSet(scopedKey(profileId,name), stored); return hideTombstones(name, stored); }
  function cryptoId(){ if(window.crypto && crypto.randomUUID) return 'sr_' + crypto.randomUUID().replaceAll('-',''); return 'sr_' + Math.random().toString(16).slice(2) + Date.now().toString(16); }
  function addToCollection(name, item){ const arr=get(name,[]); const entry={...item,id:item?.id||cryptoId(),createdAt:item?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()}; const next=set(name,[entry,...arr]); return next[0]; }
  function updateCollection(name,id,updater){ const safeId=sec().cleanId(id); const next=get(name,[]).map(item=>item.id===safeId?{...updater(item),updatedAt:new Date().toISOString()}:item); return set(name,next); }
  function deleteFromCollection(name,id){
    const safeId=sec().cleanId(id);
    if(!TOMBSTONE_COLLECTIONS.has(sec().syncBaseKey(name))) return set(name,get(name,[]).filter(item=>item.id!==safeId));
    const now=new Date().toISOString();
    const raw=readStored(name,[]);
    let found=false;
    const next=(Array.isArray(raw)?raw:[]).map(item=>{
      if(item && String(item.id)===safeId){ found=true; return {...item,_deleted:true,deletedAt:now,updatedAt:now}; }
      return item;
    });
    if(!found) return hideTombstones(name, next);
    const clean=sec().sanitizeForKey(sec().syncBaseKey(name), next, next);
    rawSet(key(name), pruneExpiredTombstones(name, clean));
    const visible=hideTombstones(name, clean);
    window.dispatchEvent(new CustomEvent('mt:storage',{detail:{name,value:visible,deletedId:safeId}}));
    return visible;
  }
  function getProfiles(){
    let profiles = get('profiles', []);
    if(!profiles.length){ profiles = set('profiles', [{id:'guest',name:'طالب رئيسي',track:'غير محدد',grade:'التوجيهي',goal:85,weakSubject:'',dailyHours:2,avatar:'◆',status:'نشط',createdAt:new Date().toISOString()}]); rawSet(baseKey('activeProfileId'),'guest'); }
    const active=activeProfileId();
    if(!profiles.some(p=>p.id===active)) rawSet(baseKey('activeProfileId'), profiles[0].id);
    return profiles;
  }
  function activeProfile(){ const profiles=getProfiles(); return profiles.find(p=>p.id===activeProfileId()) || profiles[0]; }
  function setActiveProfile(id){ const safe=sec().cleanId(id); const profiles=getProfiles(); if(profiles.some(p=>p.id===safe)){ rawSet(baseKey('activeProfileId'), safe); window.dispatchEvent(new CustomEvent('mt:profile',{detail:{id:safe}})); return safe; } return activeProfileId(); }
  function saveProfile(profile){ const profiles=getProfiles(); const clean=sec().sanitizeForKey('profiles',[profile],[])[0]; const exists=profiles.some(p=>p.id===clean.id); const next=exists?profiles.map(p=>p.id===clean.id?{...p,...clean,updatedAt:new Date().toISOString()}:p):[{...clean,updatedAt:new Date().toISOString()},...profiles]; set('profiles', next); if(!exists) setActiveProfile(clean.id); return clean; }
  function deleteProfile(id){ const safe=sec().cleanId(id); const profiles=getProfiles(); if(profiles.length <= 1) return; deleteFromCollection('profiles', safe); if(activeProfileId()===safe){ const next=getProfiles()[0]; if(next) setActiveProfile(next.id); } }
  function listProfileScoped(name){ return getProfiles().map(profile=>({profile, items:getForProfile(profile.id,name,[])})); }
  function snapshot(){
    const out={version:SNAPSHOT_VERSION,schemaVersion:13,app:'Bawsala Study OS',exportedAt:new Date().toISOString(),profileId:activeProfileId(),keys:{}};
    const includeKey = k => k.startsWith(PREFIX) && k !== baseKey('backup:restorePoints') && sec().isSyncKeyAllowed(k.slice(PREFIX.length));
    try{ Object.keys(localStorage).filter(includeKey).forEach(k=>{ const short=k.slice(PREFIX.length); const base=sec().syncBaseKey(short); out.keys[short] = pruneExpiredTombstones(base, sec().sanitizeForKey(base, parse(localStorage.getItem(k), null), null)); }); }
    catch(_){ for(const [k,v] of memory.entries()) if(includeKey(k)){ const short=k.slice(PREFIX.length); const base=sec().syncBaseKey(short); out.keys[short] = pruneExpiredTombstones(base, sec().sanitizeForKey(base, parse(v,null), null)); } }
    return out;
  }
  function validateSnapshot(data){
    if(!data || typeof data!=='object' || Array.isArray(data) || !data.keys || typeof data.keys!=='object' || Array.isArray(data.keys)) throw new Error('INVALID_BACKUP');
    const version=String(data.version || (Number(data.schemaVersion)===13?'v13':'')).toLowerCase();
    if(!SUPPORTED_SNAPSHOT_VERSIONS.has(version)) throw new Error('UNSUPPORTED_BACKUP_VERSION');
    const staged=new Map();
    let totalBytes=0;
    for(const [shortKey,value] of Object.entries(data.keys)){
      const safe=String(shortKey||'').replace(/[^a-zA-Z0-9:_\-.]/g,'').slice(0,180);
      if(!safe || safe!==shortKey || !sec().isSyncKeyAllowed(safe)) continue;
      const base=sec().syncBaseKey(safe);
      const clean=pruneExpiredTombstones(base,sec().sanitizeForKey(base,value,null));
      if(clean===null || clean===undefined) continue;
      const raw=JSON.stringify(clean);
      totalBytes+=raw.length;
      if(totalBytes>8*1024*1024) throw new Error('BACKUP_TOO_LARGE');
      staged.set(PREFIX+safe,{shortKey:safe,value:clean,raw});
    }
    if(!staged.size) throw new Error('BACKUP_EMPTY');
    return {version,staged};
  }
  function createRestorePoint(label='restore-point'){
    const keyName = baseKey('backup:restorePoints');
    const points = parse(rawGet(keyName), []);
    const point = {id: cryptoId(), label: sec().cleanText(label, 120), createdAt: new Date().toISOString(), snapshot: snapshot()};
    rawSet(keyName, [point, ...points].slice(0, 10));
    return point;
  }
  function listRestorePoints(){
    return parse(rawGet(baseKey('backup:restorePoints')),[]).filter(point=>point&&point.id&&point.snapshot).slice(0,10).map(point=>({id:sec().cleanId(point.id),label:sec().cleanText(point.label,120),createdAt:point.createdAt,snapshot:point.snapshot}));
  }
  function deleteRestorePoint(id){
    const safe=sec().cleanId(id);
    const next=listRestorePoints().filter(point=>point.id!==safe);
    rawSet(baseKey('backup:restorePoints'),next);
    return next;
  }
  function restoreSnapshot(data,mode='replace',options={}){
    if(!persistent) throw new Error('PERSISTENT_STORAGE_UNAVAILABLE');
    const {staged}=validateSnapshot(data);
    const normalizedMode=mode==='merge'?'merge':'replace';
    const merge=typeof options.merge==='function'?options.merge:((_,remote)=>remote);
    const currentKeys=[];
    try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k&&k.startsWith(PREFIX)&&k!==baseKey('backup:restorePoints')&&sec().isSyncKeyAllowed(k.slice(PREFIX.length))) currentKeys.push(k); } }
    catch(err){announcePersistenceFailure('enumerate',err); throw new Error('PERSISTENT_STORAGE_UNAVAILABLE');}
    const affected=new Set([...currentKeys,...staged.keys()]);
    const before=new Map();
    for(const k of affected) before.set(k,localStorage.getItem(k));
    const point=options.skipRestorePoint?null:createRestorePoint(options.label||`before-${normalizedMode}-restore`);
    try{
      if(normalizedMode==='replace') for(const k of currentKeys) if(!staged.has(k)) rawRemove(k,{strict:true});
      let count=0;
      for(const [fullKey,item] of staged){
        let next=item.value;
        if(normalizedMode==='merge'){
          const existingRaw=localStorage.getItem(fullKey);
          if(existingRaw!==null) next=merge(parse(existingRaw,null),item.value,item.shortKey);
        }
        rawSet(fullKey,next,{strict:true});
        if(localStorage.getItem(fullKey)!==JSON.stringify(next)) throw new Error('RESTORE_VERIFY_FAILED');
        count++;
      }
      window.dispatchEvent(new CustomEvent('mt:storage:restored',{detail:{count,mode:normalizedMode,restorePointId:point?.id||null}}));
      return {count,mode:normalizedMode,restorePointId:point?.id||null};
    }catch(err){
      try{
        for(const [k,raw] of before){ if(raw===null)localStorage.removeItem(k); else localStorage.setItem(k,raw); }
      }catch(rollbackErr){announcePersistenceFailure('rollback',rollbackErr); throw new Error('RESTORE_ROLLBACK_FAILED');}
      throw err;
    }
  }
  function restorePoint(id){
    const point=listRestorePoints().find(item=>item.id===sec().cleanId(id));
    if(!point) throw new Error('RESTORE_POINT_NOT_FOUND');
    return restoreSnapshot(point.snapshot,'replace',{label:'before-restore-point'});
  }
  function downloadBackup(){ createRestorePoint('manual-backup'); const blob=new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='bawsala-backup-v13.json'; a.rel='noopener'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),0); }
  function importBackup(file){ return new Promise((resolve,reject)=>{ try{sec().assertBackupFile(file);}catch(err){reject(err);return;} const reader=new FileReader(); reader.onload=()=>{ try{ const data=JSON.parse(reader.result); const result=restoreSnapshot(data,'replace',{label:'before-file-import'}); resolve({...data,importedKeys:result.count,restorePointId:result.restorePointId}); }catch(err){sec().recordSecurityEvent('backup-import-rejected', String(err?.message||err)); reject(err);} }; reader.onerror=reject; reader.readAsText(file); }); }
  function clearAll(){
    createRestorePoint('before-clear-all');
    try{ Object.keys(localStorage).filter(k=>(k.startsWith(PREFIX)&&k!==baseKey('backup:restorePoints')) || LEGACY_PREFIXES.some(prefix=>k.startsWith(prefix))).forEach(k=>localStorage.removeItem(k)); }catch(err){announcePersistenceFailure('clear-all',err); throw new Error('PERSISTENT_STORAGE_UNAVAILABLE');}
    [...memory.keys()].filter(k=>k.startsWith(PREFIX)&&k!==baseKey('backup:restorePoints')).forEach(k=>memory.delete(k)); window.dispatchEvent(new CustomEvent('mt:storage:clear'));
  }
  function clearSyncData(){ const shouldClear=k=>k.startsWith(PREFIX) && sec().isSyncKeyAllowed(k.slice(PREFIX.length)); try{ Object.keys(localStorage).filter(shouldClear).forEach(k=>localStorage.removeItem(k)); }catch(err){announcePersistenceFailure('clear-sync',err); throw new Error('PERSISTENT_STORAGE_UNAVAILABLE');} [...memory.keys()].filter(shouldClear).forEach(k=>memory.delete(k)); window.dispatchEvent(new CustomEvent('mt:storage:clear-sync')); }
  function renderPersistenceWarning(){
    if(persistent || document.getElementById('storagePersistenceWarning')) return;
    const box=document.createElement('div'); box.id='storagePersistenceWarning'; box.className='notice danger storage-persistence-warning'; box.setAttribute('role','alert'); box.textContent='التخزين الدائم غير متاح. أي تغيير جديد قد يضيع عند إغلاق الصفحة. أصلح إعدادات المتصفح قبل المتابعة.';
    const main=document.querySelector('main'); (main||document.body).prepend(box);
  }
  window.addEventListener('mt:storage:persistence',renderPersistenceWarning);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderPersistenceWarning,{once:true});else renderPersistenceWarning();
  window.MT_STORE = {get,set,remove,getForProfile,setForProfile,addToCollection,updateCollection,deleteFromCollection,cryptoId,downloadBackup,importBackup,snapshot,validateSnapshot,restoreSnapshot,createRestorePoint,listRestorePoints,restorePoint,deleteRestorePoint,clearAll,getProfiles,activeProfile,setActiveProfile,saveProfile,deleteProfile,listProfileScoped,PREFIX,SNAPSHOT_VERSION,persistent:()=>persistent,persistenceFailure:()=>persistenceFailure,PROFILE_SCOPED,TOMBSTONE_COLLECTIONS,clearSyncData};
})();

;
/* ===== assets/js/study-loop.js ===== */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MT_STUDY_LOOP=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=(value,min,max,fallback=min)=>{const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;};
  const dateOnly=value=>String(value||'').slice(0,10);
  const localDateOf=value=>{
    const raw=String(value||'').trim();
    if(!raw)return '';
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return dateOnly(raw);
    const year=date.getFullYear();const month=String(date.getMonth()+1).padStart(2,'0');const day=String(date.getDate()).padStart(2,'0');
    return `${year}-${month}-${day}`;
  };
  const missionText=mission=>String(mission?.text||mission?.mission||'').trim();
  const missionForDate=(mission,date)=>{
    if(!mission||!missionText(mission))return null;
    const missionDate=String(mission.date||'').slice(0,10)||localDateOf(mission.updatedAt||mission.createdAt);
    return missionDate===date?{...mission,date:missionDate}:null;
  };
  const sourceLimit=(budget={},guard={})=>clamp(budget?.limit||guard?.sourceLimit,1,3,2);
  const selectedSources=(budget={},guard={},date='')=>{
    if(date&&budget?.date&&String(budget.date).slice(0,10)!==date)return [];
    return Array.isArray(budget?.sources)?budget.sources.map(item=>String(item||'').trim()).filter(Boolean).slice(0,sourceLimit(budget,guard)):[];
  };
  const validSessions=(sessions=[],date='')=>sessions.filter(item=>localDateOf(item?.finishedAt||item?.createdAt)===date&&clamp(item?.minutes,0,600,0)>=5);
  const todayMinutes=sessions=>sessions.reduce((sum,item)=>sum+clamp(item?.minutes,0,600,0),0);
  const actionableErrors=(errors=[],date='')=>errors.filter(item=>String(item?.error||item?.message||'').trim()&&String(item?.fix||'').trim()&&(!date||localDateOf(item?.updatedAt||item?.createdAt)===date));
  const reviewsForDate=(reviews=[],date='')=>reviews.filter(item=>localDateOf(item?.date||item?.createdAt)===date);
  function evaluate(input={}){
    const date=String(input.date||'').slice(0,10);
    const missionObject=missionForDate(input.mission,date);
    const mission=missionText(missionObject);
    const sources=selectedSources(input.sourceBudget,input.executionGuard,date);
    const sessions=validSessions(input.sessions,date);
    const errors=actionableErrors(input.errors,date);
    const reviews=reviewsForDate(input.reviews,date);
    const steps=[
      {key:'mission',done:Boolean(mission)&&sources.length>0,label:'مهمة ومصادر'},
      {key:'focus',done:sessions.length>0,label:'جلسة تركيز'},
      {key:'errors',done:errors.length>0,label:'خطأ قابل للمراجعة'},
      {key:'review',done:reviews.length>0,label:'إغلاق اليوم'}
    ];
    const done=steps.filter(step=>step.done).length;
    return {date,missionObject,mission,sources,sessions,errors,reviews,steps,done,total:steps.length,percent:Math.round(done/steps.length*100),minutes:todayMinutes(sessions),staleMission:Boolean(input.mission&&!missionObject)};
  }
  function nextAction(status){
    const state=status?.steps?status:evaluate(status||{});
    if(!state.mission)return {key:'mission',label:'اكتب مهمة اليوم أولاً',hint:state.staleMission?'المهمة القديمة لا تُحسب لليوم.':'بدون مهمة واضحة ستتنقل بين الأدوات وتضيع.'};
    if(!state.sources.length)return {key:'mission',label:'حدد مصدرين فقط',hint:'بدون سقف مصادر ستجمع روابط بدل أن تدرس.'};
    if(!state.sessions.length)return {key:'focus',label:'ابدأ جلسة تركيز',hint:'لا تفتح مصادر جديدة قبل جلسة واحدة على الأقل.'};
    if(!state.errors.length)return {key:'errors',label:'سجّل خطأ اليوم مع طريقة منعه',hint:'خطأ قديم لا يغلق خطوة اليوم.'};
    if(!state.reviews.length)return {key:'review',label:'اكتب تقرير اليوم',hint:'اختم اليوم بقرار واضح للغد.'};
    return {key:'flow',label:'حلقة اليوم مكتملة',hint:'لا تضف أدوات. راجع أو توقف بذكاء.'};
  }
  function fromStore(store,date){
    if(!store||typeof store.get!=='function')return evaluate({date});
    return evaluate({
      date,
      mission:store.get('dashboard:mission',null),
      sourceBudget:store.get('study:sourceBudget',null),
      executionGuard:store.get('dashboard:executionGuard',null),
      sessions:store.get('study:sessions',[]),
      errors:store.get('errors',[]),
      reviews:store.get('dailyReviews',[])
    });
  }
  return {clamp,dateOnly,localDateOf,missionText,missionForDate,sourceLimit,selectedSources,validSessions,todayMinutes,actionableErrors,reviewsForDate,evaluate,nextAction,fromStore};
});

;
/* ===== assets/js/focus-timer.js ===== */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MT_FOCUS_TIMER=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION=1;
  const clamp=(value,min,max,fallback=min)=>{const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;};
  const safeText=(value,max=300)=>String(value||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
  const epoch=value=>{const n=Number(value);return Number.isFinite(n)&&n>0?n:0;};
  const iso=ms=>new Date(ms).toISOString();
  function missionSignature(text='',sources=[]){
    const raw=[safeText(text,240),...sources.map(item=>safeText(item,120))].join('|').toLowerCase();
    let hash=2166136261;
    for(let i=0;i<raw.length;i++){hash^=raw.charCodeAt(i);hash=Math.imul(hash,16777619);}
    return `m_${(hash>>>0).toString(16)}`;
  }
  function create(options={}){
    const now=epoch(options.now)||Date.now();
    const durationSeconds=Math.round(clamp(options.durationMinutes,5,180,25)*60);
    return {
      version:VERSION,
      day:safeText(options.day,10),
      durationSeconds,
      accumulatedSeconds:0,
      runningStartedAt:0,
      sessionStartedAt:'',
      completedAt:'',
      distractions:clamp(options.distractions,0,999,0),
      note:safeText(options.note,240),
      blocker:safeText(options.blocker,300),
      focusScore:Math.round(clamp(options.focusScore,1,5,3)),
      missionSignature:safeText(options.missionSignature,80),
      missionText:safeText(options.missionText,240),
      sources:Array.isArray(options.sources)?options.sources.map(item=>safeText(item,120)).filter(Boolean).slice(0,3):[],
      createdAt:iso(now),
      updatedAt:iso(now)
    };
  }
  function restore(raw,options={}){
    if(!raw||typeof raw!=='object'||Number(raw.version)!==VERSION)return null;
    if(options.day&&String(raw.day||'')!==String(options.day))return null;
    const now=epoch(options.now)||Date.now();
    const state=create({
      now,
      day:raw.day,
      durationMinutes:clamp(raw.durationSeconds,300,10800,1500)/60,
      distractions:raw.distractions,
      note:raw.note,
      blocker:raw.blocker,
      focusScore:raw.focusScore,
      missionSignature:raw.missionSignature,
      missionText:raw.missionText,
      sources:raw.sources
    });
    state.accumulatedSeconds=Math.round(clamp(raw.accumulatedSeconds,0,state.durationSeconds,state.durationSeconds));
    state.runningStartedAt=epoch(raw.runningStartedAt);
    state.sessionStartedAt=safeText(raw.sessionStartedAt,40);
    state.completedAt=safeText(raw.completedAt,40);
    state.createdAt=safeText(raw.createdAt,40)||state.createdAt;
    state.updatedAt=safeText(raw.updatedAt,40)||state.updatedAt;
    if(state.runningStartedAt>now+60000)state.runningStartedAt=0;
    return settle(state,now);
  }
  function elapsed(state,now=Date.now()){
    if(!state)return 0;
    const base=clamp(state.accumulatedSeconds,0,state.durationSeconds,0);
    const live=state.runningStartedAt?Math.max(0,Math.floor((epoch(now)-epoch(state.runningStartedAt))/1000)):0;
    return Math.min(state.durationSeconds,base+live);
  }
  function remaining(state,now=Date.now()){return Math.max(0,(state?.durationSeconds||0)-elapsed(state,now));}
  function progress(state,now=Date.now()){return state?.durationSeconds?Math.round(elapsed(state,now)/state.durationSeconds*100):0;}
  function isRunning(state){return Boolean(state?.runningStartedAt);}
  function isComplete(state,now=Date.now()){return Boolean(state)&&elapsed(state,now)>=state.durationSeconds;}
  function settle(state,now=Date.now()){
    if(!state||!isComplete(state,now)||!state.runningStartedAt)return state;
    return {...state,accumulatedSeconds:state.durationSeconds,runningStartedAt:0,completedAt:state.completedAt||iso(now),updatedAt:iso(now)};
  }
  function start(state,now=Date.now()){
    if(!state||isRunning(state)||isComplete(state,now))return state;
    return {...state,runningStartedAt:epoch(now),sessionStartedAt:state.sessionStartedAt||iso(now),updatedAt:iso(now)};
  }
  function pause(state,now=Date.now()){
    if(!state)return state;
    const spent=elapsed(state,now);
    return {...state,accumulatedSeconds:spent,runningStartedAt:0,completedAt:spent>=state.durationSeconds?(state.completedAt||iso(now)):'',updatedAt:iso(now)};
  }
  function reset(state,options={}){
    return create({
      now:options.now,
      day:options.day??state?.day,
      durationMinutes:options.durationMinutes??((state?.durationSeconds||1500)/60),
      note:options.note??state?.note,
      focusScore:options.focusScore??state?.focusScore,
      missionSignature:options.missionSignature??state?.missionSignature,
      missionText:options.missionText??state?.missionText,
      sources:options.sources??state?.sources
    });
  }
  function setDuration(state,minutes,now=Date.now()){
    if(!state||isRunning(state))return state;
    const nextSeconds=Math.round(clamp(minutes,5,180,25)*60);
    return {...state,durationSeconds:nextSeconds,accumulatedSeconds:Math.min(state.accumulatedSeconds,nextSeconds),completedAt:'',updatedAt:iso(now)};
  }
  function patch(state,values={},now=Date.now()){
    if(!state)return state;
    return {...state,
      note:values.note===undefined?state.note:safeText(values.note,240),
      blocker:values.blocker===undefined?state.blocker:safeText(values.blocker,300),
      focusScore:values.focusScore===undefined?state.focusScore:Math.round(clamp(values.focusScore,1,5,3)),
      distractions:values.distractions===undefined?state.distractions:Math.round(clamp(values.distractions,0,999,0)),
      updatedAt:iso(now)
    };
  }
  function addDistraction(state,now=Date.now()){return patch(state,{distractions:(state?.distractions||0)+1},now);}
  function view(state,now=Date.now()){
    const settled=settle(state,now);
    return {state:settled,elapsedSeconds:elapsed(settled,now),remainingSeconds:remaining(settled,now),progress:progress(settled,now),running:isRunning(settled),complete:isComplete(settled,now)};
  }
  return {VERSION,missionSignature,create,restore,elapsed,remaining,progress,isRunning,isComplete,settle,start,pause,reset,setDuration,patch,addDistraction,view};
});

;
/* ===== assets/js/study-service.js ===== */
(function(){
  'use strict';
  const store=()=>window.MT_STORE;
  const sec=()=>window.MT_SECURITY;
  const loop=()=>window.MT_STUDY_LOOP;
  const backend=()=>window.BAWSALA_BACKEND;
  const state={remoteOverview:null,lastRemoteAt:null,lastCommitAt:null,lastCommitError:null};
  const contextPages=new Set(['home','dashboard','workspace','study','resources','calendar','notebook','flashcards','mindmaps','advisor']);
  const page=()=>document.body?.dataset?.page||'home';
  const date=()=>sec()?.localDate?.()||new Date().toISOString().slice(0,10);
  const nowIso=()=>new Date().toISOString();
  const id=()=>store()?.cryptoId?.()||('sr_'+Date.now().toString(36)+Math.random().toString(36).slice(2));
  const clean=(value,max=220)=>sec()?.cleanText?.(value,max)||String(value||'').trim().slice(0,max);
  const cleanId=value=>sec()?.cleanId?.(value)||String(value||'').replace(/[^a-zA-Z0-9:_-]/g,'').slice(0,140);
  const clamp=(value,min,max,fallback=min)=>sec()?.clampNumber?.(value,min,max,fallback)??fallback;
  const visible=list=>(Array.isArray(list)?list:[]).filter(item=>!(item&&item._deleted===true));
  const localDateOf=value=>loop()?.localDateOf?.(value)||String(value||'').slice(0,10);
  function validContinuation(value){
    if(!value||typeof value!=='object'||!clean(value.title,180))return null;
    const expires=value.expiresAt?Date.parse(value.expiresAt):NaN;
    if(Number.isFinite(expires)&&expires<=Date.now())return null;
    return ['done','cancelled'].includes(value.status)?null:value;
  }
  function dueCards(){return visible(store()?.get?.('notebook:flashcards',[])||[]).filter(card=>!card.archived&&(!card.dueAt||Date.parse(card.dueAt)<=Date.now()));}
  function openHomeworks(){return visible(store()?.get?.('homeworks',[])||[]).filter(item=>!item.done).sort((a,b)=>String(a.due||'9999-12-31').localeCompare(String(b.due||'9999-12-31')));}
  function upcomingEvents(){return visible(store()?.get?.('study:calendar',[])||[]).filter(item=>item.date&&item.date>=date()).sort((a,b)=>`${a.date} ${a.time||''}`.localeCompare(`${b.date} ${b.time||''}`));}
  function daysUntil(value){if(!value)return Infinity;const a=Date.parse(value+'T00:00:00Z'),b=Date.parse(date()+'T00:00:00Z');return Number.isFinite(a)&&Number.isFinite(b)?Math.ceil((a-b)/86400000):Infinity;}
  function timeline(status){
    const items=[];
    const mission=status.missionObject;
    if(mission)items.push({type:'mission',at:mission.updatedAt||mission.createdAt,title:status.mission,meta:`${mission.minutes||25} دقيقة`});
    status.sessions.forEach(item=>items.push({type:'session',at:item.finishedAt||item.createdAt,title:item.mission||'جلسة تركيز',meta:`${item.minutes||0} دقيقة`}));
    status.errors.forEach(item=>items.push({type:'error',at:item.updatedAt||item.createdAt,title:item.lesson||item.subject||'خطأ',meta:item.fix||''}));
    status.reviews.forEach(item=>items.push({type:'review',at:item.createdAt||item.date,title:'إغلاق اليوم',meta:item.tomorrow||item.commitment||''}));
    return items.sort((a,b)=>(b.at?Date.parse(b.at):0)-(a.at?Date.parse(a.at):0)).slice(0,10);
  }
  function overview(){
    const activeStore=store();
    const status=loop()?.fromStore?.(activeStore,date())||{mission:'',missionObject:null,sources:[],sessions:[],errors:[],reviews:[],steps:[],done:0,total:4,percent:0,minutes:0,staleMission:false};
    const profile=activeStore?.activeProfile?.()||{id:'guest',name:'طالب',dailyHours:2};
    const continuation=validContinuation(activeStore?.get?.('study:continuation',null));
    const tasks=openHomeworks();const cards=dueCards();const events=upcomingEvents();
    let priority=null;
    const urgent=tasks.find(item=>daysUntil(item.due)<=2);
    if(continuation)priority={kind:continuation.kind||'continuation',id:continuation.entityId||'',title:continuation.title,subject:continuation.subject||'',target:continuation.target||'focus',reason:'هذا هو العمل الذي تركته مفتوحاً.'};
    else if(urgent)priority={kind:'homework',id:urgent.id,title:urgent.title,subject:urgent.subject||'',target:'focus',reason:urgent.due?`موعده خلال ${Math.max(0,daysUntil(urgent.due))} يوم.`:'واجب مفتوح.'};
    else if(events[0]&&daysUntil(events[0].date)<=2)priority={kind:'calendar',id:events[0].id,title:events[0].title,subject:events[0].subject||'',target:'focus',reason:'موعد قريب في التقويم.'};
    else if(cards.length)priority={kind:'flashcards',id:cards[0].id,title:`مراجعة ${Math.min(20,cards.length)} بطاقة مستحقة`,subject:cards[0].subject||'',target:'flashcards',reason:'بطاقات تجاوزت موعد المراجعة.'};
    else if(status.mission)priority={kind:'mission',id:status.missionObject?.id||'',title:status.mission,subject:status.missionObject?.subject||'',target:loop()?.nextAction?.(status)?.key==='mission'?'mission':'focus',reason:'مهمة اليوم الحالية.'};
    const warnings=[];
    if(status.staleMission)warnings.push({code:'STALE_MISSION',message:'المهمة المحفوظة تخص يوماً سابقاً ولن تُحسب اليوم.'});
    if(status.mission&&!status.sources.length)warnings.push({code:'NO_SOURCES',message:'مهمة اليوم بلا مصادر محددة.'});
    if(tasks.some(item=>item.due&&item.due<date()))warnings.push({code:'OVERDUE_HOMEWORK',message:'توجد واجبات متأخرة.'});
    return {
      date:date(),profile:{id:profile.id,name:profile.name||'طالب',dailyHours:Number(profile.dailyHours)||2},mission:status.missionObject,
      sourceBudget:activeStore?.get?.('study:sourceBudget',null),continuation,loop:{...status,nextAction:loop()?.nextAction?.(status)||{key:'mission',label:'حدد مهمة اليوم'}},
      focus:{minutes:status.minutes,goalMinutes:Math.round((Number(profile.dailyHours)||2)*60),sessions:status.sessions.length},
      counts:{openHomeworks:tasks.length,overdueHomeworks:tasks.filter(item=>item.due&&item.due<date()).length,dueCards:cards.length,todayErrors:status.errors.length,upcomingEvents:events.length},
      priority,timeline:timeline(status),warnings,remote:state.remoteOverview,generatedAt:nowIso()
    };
  }
  function normalizeAction(action){
    const type=clean(action?.type,60);const payload={...(action?.payload||{})};
    if(['session.complete','error.save','review.save','continuation.set'].includes(type)&&!payload.id)payload.id=id();
    if(type==='mission.save'){
      payload.id=payload.id||id();payload.date=payload.date||date();payload.createdAt=payload.createdAt||nowIso();payload.updatedAt=nowIso();
    }
    if(type==='source-budget.save')payload.date=payload.date||date();
    return {type,payload};
  }
  function upsert(collection,record){
    const list=visible(store().get(collection,[]));
    const existing=list.some(item=>item.id===record.id);
    if(existing){store().set(collection,list.map(item=>item.id===record.id?{...item,...record,updatedAt:record.updatedAt||nowIso()}:item));return store().get(collection,[]).find(item=>item.id===record.id);}
    return store().addToCollection(collection,record);
  }
  function applyLocal(action){
    const {type,payload}=action;
    if(type==='mission.save'){
      const text=clean(payload.text||payload.mission,220);if(!text)throw new Error('MISSION_REQUIRED');
      return store().set('dashboard:mission',{...payload,text,mission:text,date:payload.date||date(),status:payload.status||'ready',minutes:clamp(payload.minutes,5,180,25),createdAt:payload.createdAt||nowIso(),updatedAt:nowIso()});
    }
    if(type==='source-budget.save')return store().set('study:sourceBudget',{...payload,date:payload.date||date(),limit:clamp(payload.limit,1,3,2),sources:(payload.sources||[]).map(item=>clean(item,120)).filter(Boolean).slice(0,3),updatedAt:nowIso()});
    if(type==='session.complete')return upsert('study:sessions',{...payload,createdAt:payload.createdAt||nowIso(),finishedAt:payload.finishedAt||nowIso(),updatedAt:nowIso()});
    if(type==='error.save')return upsert('errors',{...payload,createdAt:payload.createdAt||nowIso(),updatedAt:nowIso(),status:payload.status||'جديد'});
    if(type==='review.save')return upsert('dailyReviews',{...payload,date:payload.date||nowIso(),createdAt:payload.createdAt||nowIso(),updatedAt:nowIso()});
    if(type==='homework.toggle'){
      let result=null;store().updateCollection('homeworks',payload.id,item=>{result={...item,done:payload.done===undefined?!item.done:!!payload.done};return result;});return result;
    }
    if(type==='continuation.set')return store().set('study:continuation',{...payload,status:'active',createdAt:payload.createdAt||nowIso(),updatedAt:nowIso(),expiresAt:payload.expiresAt||new Date(Date.now()+7*86400000).toISOString()});
    if(type==='continuation.clear'){store().remove('study:continuation');return null;}
    throw new Error('UNSUPPORTED_STUDY_ACTION');
  }
  async function sendRemote(actions){
    const api=backend();
    if(!api?.state?.authenticated||api.state.user?.emailVerificationRequired||!navigator.onLine)return null;
    const payload={date:date(),timezoneOffsetMinutes:new Date().getTimezoneOffset(),profileId:store()?.activeProfile?.()?.id||'',baseRevision:api.state.lastRevision||'',actions};
    try{
      const data=api.studyTransaction?await api.studyTransaction(actions,payload):await api.request('/api/study/transactions',{method:'POST',body:payload,idempotent:true,retries:1});
      state.remoteOverview=data.overview||null;state.lastRemoteAt=nowIso();state.lastCommitError=null;
      if(data.revision)api.state.lastRevision=data.revision;
      window.dispatchEvent(new CustomEvent('bawsala:study-remote',{detail:{ok:true,data}}));
      return data;
    }catch(error){
      state.lastCommitError={code:error?.code||error?.message||'REMOTE_FAILED',at:nowIso(),requestId:error?.requestId||''};
      window.dispatchEvent(new CustomEvent('bawsala:study-remote',{detail:{ok:false,error:state.lastCommitError}}));
      return null;
    }
  }
  function commit(rawActions,{remote=true}={}){
    const actions=(Array.isArray(rawActions)?rawActions:[rawActions]).map(normalizeAction);
    const results=actions.map(applyLocal);state.lastCommitAt=nowIso();
    const current=overview();
    window.dispatchEvent(new CustomEvent('bawsala:study-change',{detail:{actions,overview:current}}));
    const remotePromise=remote?sendRemote(actions):Promise.resolve(null);
    return {actions,results,overview:current,remote:remotePromise};
  }
  function saveMission(payload){const result=commit({type:'mission.save',payload});return result.results[0];}
  function saveSourceBudget(payload){const result=commit({type:'source-budget.save',payload});return result.results[0];}
  function saveSession(payload){const result=commit({type:'session.complete',payload});return result.results[0];}
  function saveError(payload){const result=commit({type:'error.save',payload});return result.results[0];}
  function saveReview(payload,{closeContinuation=true}={}){const actions=[{type:'review.save',payload}];if(closeContinuation)actions.push({type:'continuation.clear',payload:{}});const result=commit(actions);return result.results[0];}
  function toggleHomework(idValue,done){const result=commit({type:'homework.toggle',payload:{id:cleanId(idValue),done}});return result.results[0];}
  function setContinuation(payload){const result=commit({type:'continuation.set',payload});return result.results[0];}
  function clearContinuation(){commit({type:'continuation.clear',payload:{}});}
  function beginContext(payload={}){
    const title=clean(payload.title||payload.mission,180);if(!title)return null;
    const target=clean(payload.target,40)||'focus';
    const continuation={id:id(),kind:clean(payload.kind,40)||'study',entityId:cleanId(payload.entityId||payload.id),title,subject:clean(payload.subject,80),target,sourcePage:clean(payload.sourcePage||location.pathname,160)};
    const missionText=clean(payload.mission||title,220);
    const actions=[{type:'continuation.set',payload:continuation},{type:'mission.save',payload:{id:id(),text:missionText,mission:missionText,subject:continuation.subject,minutes:clamp(payload.minutes,5,180,25),date:date(),originType:continuation.kind,originId:continuation.entityId,originLabel:title}}];
    const sources=(payload.sources||[]).map(item=>clean(item,120)).filter(Boolean).slice(0,3);
    if(sources.length)actions.push({type:'source-budget.save',payload:{date:date(),limit:Math.min(3,Math.max(1,sources.length)),sources,rule:clean(payload.rule,220)||'لا أفتح مصدراً جديداً قبل إنهاء الجلسة.'}});
    commit(actions);return continuation;
  }
  function relativeWorkspace(target='flow'){
    const safe=String(target||'flow').replace(/[^a-z0-9_-]/gi,'')||'flow';
    return location.pathname.includes('/pages/')?`workspace.html#${safe}`:`pages/workspace.html#${safe}`;
  }
  function continueHref(){
    const current=overview();const target=current.priority?.target||current.loop.nextAction?.key||'flow';
    if(target==='flashcards')return location.pathname.includes('/pages/')?'flashcards.html#review':'pages/flashcards.html#review';
    return relativeWorkspace(target);
  }
  async function refreshRemote(){
    const api=backend();if(!api?.state?.authenticated||api.state.user?.emailVerificationRequired||!navigator.onLine)return null;
    try{const params={date:date(),timezoneOffsetMinutes:String(new Date().getTimezoneOffset()),profileId:store()?.activeProfile?.()?.id||''};const data=api.studyOverview?await api.studyOverview(params):await api.request('/api/study/overview?'+new URLSearchParams(params).toString(),{dedupe:false});state.remoteOverview=data.overview||null;state.lastRemoteAt=nowIso();window.dispatchEvent(new CustomEvent('bawsala:study-overview',{detail:{overview:state.remoteOverview}}));return state.remoteOverview;}catch(_){return null;}
  }
  function bind(){
    window.addEventListener('bawsala:auth',()=>refreshRemote());
    window.addEventListener('online',()=>refreshRemote());
    window.addEventListener('mt:profile',()=>{state.remoteOverview=null;refreshRemote();});
    window.addEventListener('mt:storage',event=>{if(['dashboard:mission','study:continuation','study:sessions','errors','dailyReviews','homeworks','notebook:flashcards','study:calendar'].includes(event.detail?.name))window.dispatchEvent(new CustomEvent('bawsala:study-overview',{detail:{overview:overview()}}));});
    if(contextPages.has(page()))setTimeout(refreshRemote,300);
  }
  document.addEventListener('DOMContentLoaded',bind,{once:true});
  window.BAWSALA_STUDY={state,overview,commit,saveMission,saveSourceBudget,saveSession,saveError,saveReview,toggleHomework,setContinuation,clearContinuation,beginContext,continueHref,relativeWorkspace,refreshRemote};
})();

;
/* ===== assets/js/api.js ===== */
(function(){
  const store = () => window.MT_STORE;
  const sec = () => window.MT_SECURITY;
  const delay = value => new Promise(resolve => setTimeout(()=>resolve(value), 25));
  function cleanFromCollection(key, payload){ return sec().sanitizeForKey(key, [payload], [])[0]; }
  function allResources(){ return [...window.MT_DATA.resources, ...store().get('site:customResources',[])]; }
  function allServices(){ return [...window.MT_DATA.services, ...store().get('site:customServices',[])]; }
  window.MT_API = {
    mode:'bawsala-v16-continuous-study-backend',
    async saveProblem(payload){ return delay(store().addToCollection('problems', cleanFromCollection('problems', {...payload, visibility:payload?.visibility || 'student-admin', status:payload?.status || 'جديدة'}))); },
    async listProblems(){ return delay(store().get('problems', [])); },
    async listAllProblems(){ return delay(store().listProfileScoped('problems').flatMap(row => row.items.map(item => ({...item, profileId:row.profile.id, profileName:row.profile.name})))); },
    async saveHomework(payload){ return delay(store().addToCollection('homeworks', cleanFromCollection('homeworks', payload))); },
    async listHomeworks(){ return delay(store().get('homeworks', [])); },
    async saveGroup(payload){ return delay(store().addToCollection('groups', cleanFromCollection('groups', payload))); },
    async listGroups(){ return delay(store().get('groups', [])); },
    async saveAdvisorResult(payload){ const clean=sec().sanitizeForKey('advisor:last', payload, null); store().set('advisor:last', clean); return delay(clean); },
    async saveStudySession(payload){ return delay(store().addToCollection('study:sessions', cleanFromCollection('study:sessions', payload))); },
    async listStudySessions(){ return delay(store().get('study:sessions', [])); },
    async saveDailyReview(payload){ return delay(store().addToCollection('dailyReviews', cleanFromCollection('dailyReviews', payload))); },
    async listDailyReviews(){ return delay(store().get('dailyReviews', [])); },
    async saveMission(payload){ const clean=sec().sanitizeForKey('dashboard:mission', payload, null); if(window.BAWSALA_STUDY?.saveMission) return delay(window.BAWSALA_STUDY.saveMission(clean)); store().set('dashboard:mission', clean); return delay(clean); },
    async getMission(){ return delay(store().get('dashboard:mission', null)); },
    async saveWeeklyPlan(payload){ const clean=sec().sanitizeForKey('dashboard:weeklyPlan', payload, null); store().set('dashboard:weeklyPlan', clean); return delay(clean); },
    async getWeeklyPlan(){ return delay(store().get('dashboard:weeklyPlan', null)); },
    async allResources(){ return delay(allResources()); },
    async allServices(){ return delay(allServices()); }
  };
})();

;
/* ===== assets/js/ui.js ===== */
(function(){
  const data = window.MT_DATA;
  const store = window.MT_STORE;
  const sec = window.MT_SECURITY;
  const isPage = location.pathname.includes('/pages/');
  const base = isPage ? '../' : '';
  const current = document.body.dataset.page || 'home';
  let shellKeyBound = false;
  let themeTransitioning = false;
  const shell = {
    ar: {
      home:'الرئيسية', dashboard:'لوحة الطالب', workspace:'غرفة الدراسة', settings:'الإعدادات', account:'الحساب', login:'دخول', signup:'حساب جديد', profiles:'البروفايلات', notebook:'الدفاتر', study:'الدراسة', resources:'المصادر', calculators:'المعدل', community:'مساحة محلية', services:'الخدمات', company:'عن بوصلة', advisor:'التشخيص', mindmaps:'خرائط ذهنية', flashcards:'فلاش كاردز', legal:'القانوني', admin:'لوحة التحكم', support:'الدعم', status:'حالة الخدمة', product:'المنتج', trust:'الثقة والدعم',
      mainNav:'التنقل الرئيسي', profileTitle:'البروفايل النشط', search:'بحث سريع', whatsapp:'واتساب', toggleTheme:'تبديل الوضع', themeToLight:'حوّل الموقع إلى الوضع الفاتح', themeToDark:'حوّل الموقع إلى الوضع الداكن', toggleLang:'English', openMenu:'فتح القائمة', homeAria:'الرئيسية',
      footerText:'نظام دراسة يومي يساعد الطالب على اتخاذ قرار واضح، تنفيذ جلسة تركيز، تسجيل الأخطاء، ومراجعة تقدمه بدون فوضى.', local:'بياناتك محفوظة على جهازك', quick:'ابدأ بسرعة', important:'مهم', legal:'قانوني وإدارة', export:'تصدير بياناتي', terms:'اتفاقية المستخدم', privacy:'الخصوصية', schoolmind:'SchoolMind AI', contact:'تواصل واتساب', defaultWa:'مرحبا، أريد التواصل مع بوصلة', footerStart:'لوحة الطالب', profilesText:'البروفايلات', notebooks:'الدفاتر', studyText:'الدراسة', resourcesText:'المصادر', problems:'مشاكل الطلاب', grades:'حاسبة المعدل', servicesText:'الخدمات', about:'من نحن', adminText:'لوحة التحكم', student:'طالب', copied:'تم النسخ', copyFail:'لم يتم النسخ تلقائياً', confirm:'تأكيد', cancel:'إلغاء', dangerousAction:'عملية خطرة', close:'إغلاق', closeAnnouncement:'إخفاء الإعلان', offline:'أنت الآن بدون اتصال. البيانات المحلية ستبقى محفوظة.', online:'عاد الاتصال.', mainReady:'تم الوصول إلى المحتوى الرئيسي', menuClosed:'تم إغلاق القائمة'
    },
    en: {
      home:'Home', dashboard:'Dashboard', workspace:'Study Room', settings:'Settings', account:'Account', login:'Login', signup:'Sign up', profiles:'Profiles', notebook:'Notebooks', study:'Study', resources:'Resources', calculators:'Grades', community:'Local space', services:'Services', company:'About', advisor:'Advisor', mindmaps:'Mind Maps', flashcards:'Flashcards', legal:'Legal', admin:'Admin', support:'Support', status:'Service status', product:'Product', trust:'Trust & support',
      mainNav:'Main navigation', profileTitle:'Active profile', search:'Quick search', whatsapp:'WhatsApp', toggleTheme:'Toggle theme', themeToLight:'Switch to light mode', themeToDark:'Switch to dark mode', toggleLang:'العربية', openMenu:'Open menu', homeAria:'Home',
      footerText:'A daily study system for choosing one clear task, completing a focus session, recording mistakes, and reviewing progress without clutter.', local:'Data is saved on this device', quick:'Start fast', important:'Important', legal:'Legal & Control', export:'Export my data', terms:'User Agreement', privacy:'Privacy', schoolmind:'SchoolMind AI', contact:'Contact on WhatsApp', defaultWa:'Hello, I want to contact Bawsala', footerStart:'Student Dashboard', profilesText:'Profiles', notebooks:'Notebooks', studyText:'Study', resourcesText:'Resources', problems:'Student Problems', grades:'Grade Calculator', servicesText:'Services', about:'About', adminText:'Control Panel', student:'Student', copied:'Copied', copyFail:'Could not copy automatically', confirm:'Confirm', cancel:'Cancel', dangerousAction:'Dangerous action', close:'Close', closeAnnouncement:'Dismiss announcement', offline:'You are offline. Local data remains saved.', online:'Connection restored.', mainReady:'Main content reached', menuClosed:'Menu closed'
    }
  };
  function lang(){ return store.get('language','ar') === 'en' ? 'en' : 'ar'; }
  function t(key){ return shell[lang()][key] || shell.ar[key] || key; }
  function applyLanguageMeta(){ const l=lang(); document.documentElement.dataset.lang=l; document.documentElement.lang=l==='en'?'en':'ar'; document.documentElement.dir=l==='en'?'ltr':'rtl'; }
  function settings(){ return store.get('site:settings', null) || {}; }
  function brandArabic(){ return settings().brandArabic || data.brand.arabic; }
  function brandEnglish(){ return settings().brandEnglish || data.brand.english; }
  function brandName(){ return lang()==='en' ? brandEnglish() : brandArabic(); }
  function tagline(){ return settings().tagline || data.brand.shortTagline; }
  function phone(){ return (settings().whatsapp || data.whatsapp).replace(/[^0-9]/g,''); }
  function url(path){ return base + sec.safeURL(path); }
  function extUrl(path){ return sec.safeURL(path); }
  function whatsappLink(text){ return `https://wa.me/${sec.cleanText(phone(), 20)}?text=${encodeURIComponent(sec.cleanMultiline(text || t('defaultWa'), 1200))}`; }
  function initTheme(){ document.documentElement.dataset.theme = store.get('theme', 'dark'); applyLanguageMeta(); }
  function updateThemeColor(theme){ const meta=document.querySelector('meta[name="theme-color"]'); if(meta) meta.setAttribute('content', theme==='dark'?'#1d0245':'#1d0245'); }
  function reduceMotionEnabled(){
    const prefs=store.get('user:preferences',{});
    return !!prefs.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function commitTheme(next){
    const root=document.documentElement;
    root.dataset.theme=next;
    store.set('theme',next);
    updateThemeColor(next);
    document.querySelectorAll('#themeToggle').forEach(btn=>{
      btn.setAttribute('aria-pressed', String(next==='light'));
      btn.setAttribute('title', t(next==='light'?'themeToDark':'themeToLight'));
      btn.setAttribute('aria-label', t(next==='light'?'themeToDark':'themeToLight'));
      btn.innerHTML=themeIcon(next);
    });
  }
  function pointFromOrigin(origin){
    if(Number.isFinite(origin?.clientX) && Number.isFinite(origin?.clientY)) return {x:origin.clientX,y:origin.clientY};
    const el=origin?.currentTarget || (origin?.getBoundingClientRect ? origin : null) || document.getElementById('themeToggle') || document.body;
    const box=el.getBoundingClientRect?.();
    return box ? {x:box.left+box.width/2,y:box.top+box.height/2} : {x:innerWidth/2,y:Math.min(100,innerHeight/3)};
  }
  function spawnThemeOrbit(x,y,next){
    if(reduceMotionEnabled()) return null;
    document.querySelectorAll('.theme-transition-orbit').forEach(node=>node.remove());
    const orbit=document.createElement('div');
    orbit.className='theme-transition-orbit';
    orbit.setAttribute('aria-hidden','true');
    orbit.innerHTML='<span class="theme-transition-orbit__ring"></span><span class="theme-transition-orbit__needle"></span><span class="theme-transition-orbit__core"></span><span class="theme-transition-orbit__spark s1"></span><span class="theme-transition-orbit__spark s2"></span><span class="theme-transition-orbit__spark s3"></span><span class="theme-transition-orbit__spark s4"></span>';
    orbit.style.setProperty('--theme-x', x+'px');
    orbit.style.setProperty('--theme-y', y+'px');
    orbit.dataset.nextTheme=next;
    document.body.appendChild(orbit);
    orbit.addEventListener('animationend',()=>orbit.remove(),{once:true});
    setTimeout(()=>orbit.remove(),1200);
    return orbit;
  }
  function setTheme(next, origin){
    const root=document.documentElement; const currentTheme=root.dataset.theme||'dark'; next=next==='light'?'light':'dark'; if(next===currentTheme || themeTransitioning) return;
    themeTransitioning=true;
    const {x,y}=pointFromOrigin(origin);
    const radius = Math.ceil(Math.hypot(Math.max(x, innerWidth-x), Math.max(y, innerHeight-y)));
    root.style.setProperty('--theme-x', x+'px'); root.style.setProperty('--theme-y', y+'px'); root.style.setProperty('--theme-radius', radius+'px');
    root.dataset.themeDirection = next==='light' ? 'sunrise' : 'nightfall';
    spawnThemeOrbit(x,y,next);
    if(document.startViewTransition && !reduceMotionEnabled()){
      try{
        const transition=document.startViewTransition(()=>commitTheme(next));
        document.documentElement.classList.add('theme-view-transitioning');
        transition.finished.finally(()=>{ document.documentElement.classList.remove('theme-view-transitioning'); themeTransitioning=false; });
      }catch(_){
        commitTheme(next); document.body.classList.add('theme-smooth'); setTimeout(()=>{ document.body.classList.remove('theme-smooth'); themeTransitioning=false; },420);
      }
    } else {
      commitTheme(next); document.body.classList.add('theme-smooth'); setTimeout(()=>{ document.body.classList.remove('theme-smooth'); themeTransitioning=false; },420);
    }
  }
  function logoMarkup(){ return `<span class="ascii-brand-mark" aria-hidden="true">BWS\nALA</span>`; }
  function iconMarkup(name){
    const icons={
      search:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4.2 4.2"></path></svg>',
      menu:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>',
      light:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"></path></svg>',
      dark:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.4A8.2 8.2 0 0 1 8.6 3.8 8.5 8.5 0 1 0 20.2 15.4Z"></path></svg>'
    };
    return icons[name]||'';
  }
  function themeIcon(theme){return iconMarkup(theme==='light'?'dark':'light');}
  function workspaceRouteHref(hash){
    const clean = String(hash || 'flow').replace(/[^a-z0-9_-]/gi,'') || 'flow';
    return current === 'workspace' ? `#${clean}` : url(`pages/workspace.html#${clean}`);
  }
  function shellRoutebar(){
    if(current === 'workspace') return '';
    const allowed = new Set(['home','dashboard','workspace','study','advisor','resources','calendar','notebook','flashcards','mindmaps','schoolmind','calculators','services']);
    if(!allowed.has(current)) return '';
    const routes=[['FLOW','flow'],['MISSION','mission'],['FOCUS','focus'],['ERRORS','errors'],['REPORT','review'],['HW','homework']];
    return `<nav class="shell-routebar" aria-label="${escapeAttr(lang()==='en'?'Study quick routes':'روابط دراسة سريعة')}">${routes.map(([label,hash])=>`<a href="${escapeAttr(workspaceRouteHref(hash))}" ${current==='workspace' && location.hash.slice(1)===hash?'aria-current="true"':''}>${escapeHTML(label)}</a>`).join('')}</nav>`;
  }
  function syncShellRoutebar(){
    const activeHash = (location.hash || '#flow').slice(1) || 'flow';
    document.querySelectorAll('.shell-routebar a').forEach(link=>{
      let hash='';
      try{ hash = new URL(link.getAttribute('href') || '', location.href).hash.slice(1); }catch(_){ hash=''; }
      if(current === 'workspace' && hash === activeHash) link.setAttribute('aria-current','true');
      else link.removeAttribute('aria-current');
    });
  }
  function navLabel(label,key){ return lang()==='en' ? (data.navEnglish?.[key] || label) : label; }
  function renderShell(){
    store.getProfiles();
    const profile = store.activeProfile();
    const header=document.getElementById('siteHeader');
    if(header){
      const links=data.nav.map(([label,path,key])=>`<a class="${current===key?'active':''}" href="${escapeAttr(url(path))}" ${current===key?'aria-current="page"':''}>${escapeHTML(navLabel(label,key))}</a>`).join('');
      const currentTheme=document.documentElement.dataset.theme||'dark';
      header.innerHTML=`<header class="site-header"><div class="header-inner"><a class="brand" href="${escapeAttr(url('index.html'))}" aria-label="${escapeAttr(brandName()+' '+t('homeAria'))}">${logoMarkup()}<span><strong>${escapeHTML(brandName())}</strong><small>STUDY OS</small></span></a><nav class="main-nav" id="mainNav" aria-label="${escapeAttr(t('mainNav'))}">${links}</nav><div class="header-actions"><a class="profile-chip" href="${escapeAttr(url('pages/profiles.html'))}" title="${escapeAttr(t('profileTitle'))}"><b>${escapeHTML(profile.avatar||'●')}</b><span>${escapeHTML(profile.name||t('student'))}</span></a><button class="icon-btn" id="globalSearchOpen" type="button" aria-label="${escapeAttr(t('search'))}" title="${escapeAttr(t('search'))}">${iconMarkup('search')}</button><button class="icon-btn lang-btn" id="languageToggle" type="button" aria-label="${escapeAttr(t('toggleLang'))}">${escapeHTML(t('toggleLang'))}</button><button class="icon-btn theme-toggle" id="themeToggle" type="button" title="${escapeAttr(t(currentTheme==='light'?'themeToDark':'themeToLight'))}" aria-label="${escapeAttr(t(currentTheme==='light'?'themeToDark':'themeToLight'))}" aria-pressed="${currentTheme==='light'}">${themeIcon(currentTheme)}</button><button class="icon-btn menu-btn" id="menuToggle" type="button" aria-label="${escapeAttr(t('openMenu'))}" aria-controls="mainNav" aria-expanded="false">${iconMarkup('menu')}</button></div></div>${shellRoutebar()}</header><div class="drawer-backdrop" id="drawerBackdrop"></div>`;
    }
    const footer=document.getElementById('siteFooter');
    if(footer){
      footer.innerHTML=`<footer class="site-footer launch-footer"><div class="container launch-footer__inner"><div class="launch-footer__brand"><a class="brand" href="${escapeAttr(url('index.html'))}">${logoMarkup()}<span><strong>${escapeHTML(brandName())}</strong><small>${escapeHTML(data.brand.product)}</small></span></a><p>${escapeHTML(t('footerText'))}</p><a class="backend-badge" href="${escapeAttr(url('pages/status.html'))}"><span class="status-dot online"></span> ${escapeHTML(t('status'))}</a></div><nav aria-label="${escapeAttr(t('product'))}"><h3>${escapeHTML(t('product'))}</h3><a href="${escapeAttr(url('pages/dashboard.html'))}">${escapeHTML(t('dashboard'))}</a><a href="${escapeAttr(url('pages/workspace.html#flow'))}">${escapeHTML(t('workspace'))}</a><a href="${escapeAttr(url('pages/resources.html'))}">${escapeHTML(t('resources'))}</a><a href="${escapeAttr(url('pages/calendar.html'))}">التقويم</a><a href="${escapeAttr(url('pages/billing.html'))}">الخطط</a></nav><nav aria-label="${escapeAttr(t('company'))}"><h3>${escapeHTML(t('company'))}</h3><a href="${escapeAttr(url('pages/company.html'))}">${escapeHTML(t('company'))}</a><a href="${escapeAttr(url('pages/services.html'))}">${escapeHTML(t('services'))}</a><a href="${escapeAttr(url('pages/legal.html'))}#terms">${escapeHTML(t('terms'))}</a><a href="${escapeAttr(url('pages/legal.html'))}#privacy">${escapeHTML(t('privacy'))}</a></nav><nav aria-label="${escapeAttr(t('trust'))}"><h3>${escapeHTML(t('trust'))}</h3><a href="${escapeAttr(url('pages/support.html'))}">${escapeHTML(t('support'))}</a><a href="${escapeAttr(url('pages/account.html'))}">${escapeHTML(t('account'))}</a><a href="${escapeAttr(url('pages/settings.html'))}">${escapeHTML(t('settings'))}</a><a href="${escapeAttr(whatsappLink(t('defaultWa')))}" target="_blank" rel="noopener noreferrer">واتساب</a><button class="btn sm" id="exportBackup" type="button">${escapeHTML(t('export'))}</button></nav></div><div class="container launch-footer__bottom"><span>${escapeHTML(data.brand.copyright)}</span><span>${escapeHTML(data.brand.developer)}</span></div></footer>`;
    }
    renderAnnouncement();
    syncShellRoutebar();
  }
  function renderAnnouncement(){
    document.querySelectorAll('.top-announcement').forEach(n=>n.remove());
    const st=settings();
    const msg=sec.cleanText(st.announcement,220);
    if(!st.showAnnouncement || !msg) return;
    const dismissed=sessionStorage.getItem('bawsala:announcement:dismissed')===msg;
    if(dismissed) return;
    const node=document.createElement('aside');
    node.className='top-announcement';
    node.setAttribute('role','status');
    node.setAttribute('aria-live','polite');
    node.innerHTML=`<span>${escapeHTML(msg)}</span><button class="icon-btn top-announcement-close" type="button" aria-label="${escapeAttr(t('closeAnnouncement'))}">×</button>`;
    node.querySelector('button')?.addEventListener('click',()=>{ sessionStorage.setItem('bawsala:announcement:dismissed',msg); node.remove(); });
    document.body.appendChild(node);
  }
  function closeMenu(restoreFocus=false){
    const nav=document.getElementById('mainNav'), menu=document.getElementById('menuToggle'), backdrop=document.getElementById('drawerBackdrop');
    const wasOpen=nav?.classList.contains('open');
    nav?.classList.remove('open'); backdrop?.classList.remove('open'); menu?.setAttribute('aria-expanded','false');
    document.body.classList.remove('menu-open');
    if(wasOpen && restoreFocus) menu?.focus();
  }
  function trapMenuTab(event){
    const nav=document.getElementById('mainNav');
    if(event.key!=='Tab' || !nav?.classList.contains('open')) return;
    const menu=document.getElementById('menuToggle');
    const focusables=[...nav.querySelectorAll('a[href],button,[tabindex]:not([tabindex="-1"])')].filter(el=>!el.disabled && el.offsetParent!==null);
    if(menu && menu.offsetParent!==null) focusables.push(menu);
    if(!focusables.length) return;
    const first=focusables[0], last=focusables[focusables.length-1];
    if(event.shiftKey && document.activeElement===first){ event.preventDefault(); last.focus(); }
    else if(!event.shiftKey && document.activeElement===last){ event.preventDefault(); first.focus(); }
  }
  function bindGlobalPolish(){
    if(document.body.dataset.polishBound) return;
    document.body.dataset.polishBound='true';
    document.addEventListener('click',event=>{
      const skip=event.target.closest?.('.skip-link');
      if(!skip) return;
      const main=document.getElementById('main');
      if(main){ requestAnimationFrame(()=>{ main.focus({preventScroll:true}); toast(t('mainReady')); }); }
    });
    const updateHeader=()=>document.body.classList.toggle('scrolled-shell', scrollY>8);
    updateHeader();
    addEventListener('scroll',updateHeader,{passive:true});
    addEventListener('offline',()=>toast(t('offline')));
    addEventListener('online',()=>toast(t('online')));
    addEventListener('hashchange', syncShellRoutebar);
    document.addEventListener('keydown',trapMenuTab);
  }
  function bindShell(){
    const themeToggle=document.getElementById('themeToggle');
    themeToggle?.addEventListener('click',(event)=>{ const next=(document.documentElement.dataset.theme||'dark')==='dark'?'light':'dark'; setTheme(next,event); });
    document.getElementById('languageToggle')?.addEventListener('click',()=>{ const next=lang()==='ar'?'en':'ar'; store.set('language',next); applyLanguageMeta(); renderShell(); bindShell(); window.BAWSALA_I18N?.apply(); window.dispatchEvent(new CustomEvent('mt:language',{detail:{language:next}})); });
    const nav=document.getElementById('mainNav'), menu=document.getElementById('menuToggle'), backdrop=document.getElementById('drawerBackdrop');
    menu?.addEventListener('click',()=>{ if(!nav) return; const open=!nav.classList.contains('open'); nav.classList.toggle('open',open); backdrop?.classList.toggle('open',open); menu.setAttribute('aria-expanded',String(open)); document.body.classList.toggle('menu-open',open); if(open) requestAnimationFrame(()=>nav.querySelector('a')?.focus()); });
    nav?.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>closeMenu()));
    backdrop?.addEventListener('click',()=>closeMenu(true));
    if(!shellKeyBound){ document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeMenu(true); }); window.addEventListener('resize',()=>{ if(innerWidth>1120) closeMenu(); }); shellKeyBound=true; }
    document.getElementById('exportBackup')?.addEventListener('click',()=>store.downloadBackup());
    syncShellRoutebar();
  }

  function refreshShell(){
    renderShell();
    bindShell();
  }
  function cssEscape(value){ return window.CSS?.escape ? CSS.escape(value) : String(value).replace(/[^a-zA-Z0-9_-]/g,'\\$&'); }
  function ensureControlNames(root=document){
    root.querySelectorAll?.('input,select,textarea').forEach(control=>{
      const type=String(control.getAttribute('type')||'').toLowerCase();
      if(['hidden','submit','button','reset'].includes(type)) return;
      if(control.closest('label') || control.hasAttribute('aria-label') || control.hasAttribute('aria-labelledby')) return;
      if(control.id && document.querySelector(`label[for="${cssEscape(control.id)}"]`)) return;
      const raw = control.getAttribute('placeholder') || control.getAttribute('name') || control.id || control.getAttribute('data-label') || '';
      const label = sec.cleanText(raw.replace(/[-_]/g,' '), 90).trim();
      if(label) control.setAttribute('aria-label', label);
    });
  }
  function watchControlNames(){
    ensureControlNames(document);
    let queued=false;
    const observer=new MutationObserver(()=>{
      if(queued) return;
      queued=true;
      requestAnimationFrame(()=>{ queued=false; ensureControlNames(document); });
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }
  function confirmAction(options={}){
    const opts=typeof options==='string'?{message:options}:options;
    return new Promise(resolve=>{
      const last=document.activeElement;
      const id='confirm'+Date.now()+Math.random().toString(16).slice(2);
      const node=document.createElement('div');
      node.className='confirm-dialog';
      node.innerHTML=`<div class="confirm-backdrop" ${opts.danger?'':'data-confirm-cancel'}></div><section class="confirm-panel" role="${opts.danger?'alertdialog':'dialog'}" aria-modal="true" aria-labelledby="${escapeAttr(id)}Title" aria-describedby="${escapeAttr(id)}Message"><span class="badge ${opts.danger?'red':'blue'}">${escapeHTML(opts.kicker || (opts.danger?t('dangerousAction'):t('confirm')))}</span><h2 id="${escapeAttr(id)}Title">${escapeHTML(opts.title || t('confirm'))}</h2><p id="${escapeAttr(id)}Message" class="muted">${escapeHTML(opts.message || '')}</p><div class="actions confirm-actions"><button class="btn secondary" data-confirm-cancel type="button">${escapeHTML(opts.cancelText || t('cancel'))}</button><button class="btn ${opts.danger?'danger':'primary'}" data-confirm-ok type="button">${escapeHTML(opts.confirmText || t('confirm'))}</button></div></section>`;
      function focusables(){ return [...node.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(el=>!el.disabled && el.offsetParent!==null); }
      let settled=false;
      function close(value){
        if(settled) return;
        settled=true;
        document.removeEventListener('keydown',onKey);
        node.remove();
        document.body.classList.remove('modal-open');
        delete document.body.dataset.dialogOpen;
        if(last && document.contains(last)) last.focus();
        resolve(value);
      }
      function onKey(event){
        if(event.key==='Escape'){ event.preventDefault(); close(false); return; }
        if(event.key!=='Tab') return;
        const list=focusables(); if(!list.length) return;
        const first=list[0], lastItem=list[list.length-1];
        if(event.shiftKey && document.activeElement===first){ event.preventDefault(); lastItem.focus(); }
        else if(!event.shiftKey && document.activeElement===lastItem){ event.preventDefault(); first.focus(); }
      }
      node.querySelectorAll('[data-confirm-cancel]').forEach(el=>el.addEventListener('click',()=>close(false)));
      node.querySelector('[data-confirm-ok]')?.addEventListener('click',()=>close(true));
      document.body.appendChild(node);
      document.body.classList.add('modal-open');
      document.body.dataset.dialogOpen='true';
      document.addEventListener('keydown',onKey);
      requestAnimationFrame(()=>{
        const target=opts.danger?node.querySelector('[data-confirm-cancel]'):node.querySelector('[data-confirm-ok]');
        target?.focus();
      });
    });
  }
function setBusy(control, busy=true, label=''){
    if(!control) return;
    control.toggleAttribute('disabled', !!busy);
    control.setAttribute('aria-busy', String(!!busy));
    if(label){
      if(!control.dataset.originalText) control.dataset.originalText=control.textContent || '';
      control.textContent=busy ? label : control.dataset.originalText;
    } else if(!busy && control.dataset.originalText){ control.textContent=control.dataset.originalText; }
  }
  function toast(message){
    const stack=document.querySelector('.toast-stack') || document.body.appendChild(Object.assign(document.createElement('div'),{className:'toast-stack'}));
    const node=document.createElement('div');
    node.className='toast';
    node.setAttribute('role','status');
    node.setAttribute('aria-live','polite');
    node.textContent=sec.cleanText(message,180);
    stack.appendChild(node);
    setTimeout(()=>{ node.classList.add('leaving'); setTimeout(()=>node.remove(),180); },2600);
  }
  function escapeHTML(value){return sec.escapeHTML(value);} function escapeAttr(value){return sec.escapeAttr(value);} function clampNumber(value,min,max,fallback){return sec.clampNumber(value,min,max,fallback);} function safeURL(value){return sec.safeURL(value);} function openWhatsApp(text){window.open(whatsappLink(text),'_blank','noopener,noreferrer');}
  function copyText(text, success){ const value=sec.cleanMultiline(text,6000); navigator.clipboard?.writeText(value).then(()=>toast(success||t('copied'))).catch(()=>toast(t('copyFail'))); }
  function downloadText(filename, text, type='text/plain'){
    const safeName=sec.cleanText(filename || 'bawsala-export.txt', 120).replace(/[^\w.\-؀-ۿ]+/g,'-') || 'bawsala-export.txt';
    const blob=new Blob([sec.cleanMultiline(text || '', 50000)],{type:`${type};charset=utf-8`});
    const href=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=href; a.download=safeName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(href),1200);
    toast(t('export'));
  }
  document.addEventListener('DOMContentLoaded',()=>{ initTheme(); updateThemeColor(store.get('theme','dark')); document.body.classList.toggle('reduced-motion-ui', !!store.get('user:preferences',{}).reduceMotion); document.getElementById('main')?.setAttribute('tabindex','-1'); renderShell(); bindShell(); watchControlNames(); bindGlobalPolish(); });
  window.MT_UI={url,extUrl,whatsappLink,openWhatsApp,toast,confirmAction,escapeHTML,escapeAttr,copyText,downloadText,setBusy,setTheme,clampNumber,safeURL,brandArabic,brandEnglish,brandName,tagline,lang,t,applyLanguageMeta,renderShell,refreshShell};
})();

;
/* ===== assets/js/auth-status.js ===== */
(function(){
  function base(){ return location.pathname.includes('/pages/') ? '../' : ''; }
  function href(path){ return base()+path; }
  function label(ar,en){ return window.MT_UI?.lang?.()==='en' ? en : ar; }
  function makeLink(className,url,text,ariaLabel=''){
    const link=document.createElement('a');link.className=className;link.href=url;link.textContent=text;if(ariaLabel)link.setAttribute('aria-label',ariaLabel);return link;
  }
  function renderAuthChip(){
    const actions=document.querySelector('.header-actions');
    if(!actions || document.getElementById('authChip')) return;
    const user=window.BAWSALA_BACKEND?.state?.user;
    const node=document.createElement('span');node.id='authChip';node.className='auth-chip-wrap';
    if(user){
      node.append(makeLink('btn sm',href('pages/account.html'),String(user.name||label('حسابي','Account')).slice(0,120)));
      node.append(makeLink('icon-btn',href('pages/settings.html'),'⚙',label('الإعدادات','Settings')));
    }else{
      node.append(makeLink('btn sm',href('pages/login.html'),label('دخول','Login')));
      node.append(makeLink('btn sm primary',href('pages/signup.html'),label('حساب جديد','Sign up')));
    }
    actions.insertBefore(node,document.getElementById('menuToggle')||null);
  }
  function updateBackendBadge(){
    const badge=document.querySelector('.backend-badge'),st=window.BAWSALA_BACKEND?.state;if(!badge||!st)return;
    const text=st.authenticated?label('متصل بالحساب والمزامنة جاهزة','Signed in and sync-ready'):(st.online?label('يمكنك إنشاء حساب للمزامنة','Account sync available'):label('وضع محلي على هذا الجهاز','Local mode on this device'));
    badge.replaceChildren();const dot=document.createElement('span');dot.className='status-dot '+(st.authenticated?'online':(st.online?'warn':''));badge.append(dot,document.createTextNode(' '+text));
  }
  function boot(){renderAuthChip();updateBackendBadge();}
  document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,80));
  window.addEventListener('bawsala:auth',()=>{document.getElementById('authChip')?.remove();setTimeout(boot,0);});
  window.addEventListener('mt:language',()=>{document.getElementById('authChip')?.remove();setTimeout(boot,0);});
})();

;
/* ===== assets/js/monitoring.js ===== */
(function(){
  'use strict';
  const MAX_ERRORS=40;
  const MAX_EVENTS=120;
  const store=()=>window.MT_STORE;
  const sec=()=>window.MT_SECURITY;
  function now(){return new Date().toISOString();}
  function clean(value,max=240){return sec()?.cleanText?.(value,max)||String(value||'').slice(0,max);}
  function logError(message,source='',stack=''){
    const s=store();if(!s)return null;
    const entry={id:s.cryptoId(),message:clean(message,300)||'Runtime error',source:clean(source,180),stack:sec()?.cleanMultiline?.(stack,1800)||'',page:location.pathname,createdAt:now()};
    const list=[entry,...(s.get('runtime:errors',[])||[])].slice(0,MAX_ERRORS);
    s.set('runtime:errors',list);
    return entry;
  }
  function recordProductEvent(type,label=''){
    const s=store();if(!s)return null;
    const prefs=s.get('user:preferences',{})||{};
    if(prefs.productAnalytics===false)return null;
    const entry={id:s.cryptoId(),event:clean(type,60),detail:clean(label,100),page:location.pathname,role:s.get('product:role','student')||'student',ts:now()};
    s.set('product:analytics',[entry,...(s.get('product:analytics',[])||[])].slice(0,MAX_EVENTS));
    return entry;
  }
  function buildLaunchSnapshot(){
    const s=store();
    const sessions=s?.get('study:sessions',[])||[];
    const notes=s?.get('notebook:notes',[])||[];
    const cards=s?.get('notebook:flashcards',[])||[];
    const tickets=(s?.get('problems',[])||[]).filter(item=>item?.source==='support-center');
    return {generatedAt:now(),version:sec()?.APP_VERSION||'16.0.1',localOnly:true,metrics:{profiles:s?.getProfiles?.().length||0,focusSessions:sessions.length,notes:notes.length,flashcards:cards.length,supportTickets:tickets.length,runtimeErrors:(s?.get('runtime:errors',[])||[]).length}};
  }
  function bind(){
    addEventListener('error',event=>logError(event.message,event.filename,event.error?.stack));
    addEventListener('unhandledrejection',event=>logError(event.reason?.message||String(event.reason),'unhandledrejection',event.reason?.stack));
    document.addEventListener('click',event=>{
      const target=event.target.closest?.('[data-track],a.btn,button.btn');
      if(!target)return;
      recordProductEvent(target.dataset.track||'ui_action',(target.getAttribute('aria-label')||target.textContent||target.id||'').trim().slice(0,100));
    },{capture:true});
    recordProductEvent('page_view',document.body.dataset.page||'unknown');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.MT_MONITOR={logError,recordProductEvent,buildLaunchSnapshot};
  window.MT_PRODUCT_SUITE={recordProductEvent,buildTractionSnapshot:buildLaunchSnapshot,currentRole:()=>store()?.get('product:role','student')||'student',setRole:role=>{store()?.set('product:role',clean(role,20));return clean(role,20);}};
})();

;
/* ===== assets/js/search.js ===== */
(function(){
  let palette = null;
  let input = null;
  let results = null;
  let lastActive = null;
  let items = [];
  let visibleItems = [];
  let activeIndex = 0;
  const RECENT_KEY = 'bawsala:quickSearch:recent';
  const WORKSPACE_TOOLS = [
    ['flow','تدفق اليوم','Daily flow'],['mission','مهمة اليوم','Today mission'],['focus','جلسة تركيز','Focus session'],['errors','دفتر الأخطاء','Error log'],['review','تقرير اليوم','Daily review'],['homework','الواجبات اليومية','Homework'],['rounds','جولات الدراسة','Study rounds'],['notes','ملاحظات','Notes'],['journal','يوميات','Journal'],['flashcards','فلاش كاردز','Flashcards'],['mindmap','خرائط ذهنية','Mind maps'],['drill','تدريب امتحان','Exam drill'],['lectures','محاضرات قصيرة','Short lectures'],['btec','BTEC','BTEC'],['schoolmind','SchoolMind AI','SchoolMind AI']
  ];

  function isEnglish(){ return window.MT_UI?.lang && window.MT_UI.lang()==='en'; }
  function normalize(value){ return String(value||'').toLowerCase().normalize('NFKD').replace(/[ً-ٰٟ]/g,'').replace(/[إأآا]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}\s#:_-]/gu,' ').replace(/\s+/g,' ').trim(); }
  function recent(){ try{ return JSON.parse(localStorage.getItem(RECENT_KEY)||'[]').slice(0,5); }catch(_){ return []; } }
  function clearRecent(){ try{ localStorage.removeItem(RECENT_KEY); }catch(_){/* ignore */} }
  function aliasPack(ar='',en=''){ return [ar,en].join(' '); }
  function remember(item){
    if(!item || !item.url) return;
    const next=[{title:item.title,kind:item.kind,desc:item.desc,url:item.url,external:!!item.external}, ...recent().filter(x=>x.url!==item.url)].slice(0,5);
    try{ localStorage.setItem(RECENT_KEY, JSON.stringify(next)); }catch(_){/* ignore */}
  }

  function text(){
    const en = isEnglish();
    return {
      dialog: en ? 'Quick search' : 'بحث سريع',
      title: en ? 'Quick search in Bawsala' : 'بحث سريع داخل بوصلة',
      close: en ? 'Close search' : 'إغلاق البحث',
      input: en ? 'Search pages, resources, services, or BTEC commands' : 'ابحث عن صفحة، مصدر، خدمة، أو أمر BTEC',
      placeholder: en ? 'Search: grades, BTEC, homework, privacy...' : 'ابحث: معدل، BTEC، واجبات، خصوصية...',
      hint: en ? 'Shortcut: Ctrl/⌘ + K. Use ↑/↓ and Enter.' : 'اختصار: Ctrl/⌘ + K. استخدم ↑/↓ ثم Enter.',
      results: en ? 'Search results' : 'نتائج البحث',
      noResults: en ? 'No results. Try a shorter word.' : 'لا توجد نتيجة. جرّب كلمة أقصر.',
      recent: en ? 'Recent' : 'آخر استخدام',
      open: en ? 'Open result' : 'فتح النتيجة',
      resultCount: en ? 'results' : 'نتائج',
      clearRecent: en ? 'Clear recent' : 'مسح الأخيرة',
      recentCleared: en ? 'Recent searches cleared' : 'تم مسح آخر البحث',
      filterHint: en ? 'Showing strongest matches first.' : 'تظهر أقوى النتائج أولاً.',
      page: en ? 'Page' : 'صفحة',
      account: en ? 'Account' : 'حساب',
      legal: en ? 'Legal' : 'قانوني',
      company: en ? 'Company' : 'شركة',
      external: en ? 'External' : 'خارجي',
      resource: en ? 'Resource' : 'مصدر',
      service: en ? 'Service' : 'خدمة',
      lecture: en ? 'Lecture' : 'محاضرة',
      mindmap: en ? 'Mind Map' : 'خريطة',
      flashcards: en ? 'Flashcards' : 'بطاقات'
    };
  }

  function buildItems(){
    const d = window.MT_DATA, ui = window.MT_UI, tx = text();
    if(!d || !ui) return [];
    const local = (path) => ui.url(path);
    const en = isEnglish();
    const list = [];
    d.nav.forEach(([title,path,key])=>list.push({
      title: en ? (d.navEnglish?.[key] || title) : title,
      kind: tx.page,
      desc: en ? 'Move inside the platform' : 'انتقال داخل المنصة',
      url: local(path),
      external: false,
      key
    }));
    list.push(
      {title: en?'Settings':'الإعدادات',kind:tx.page,desc:en?'Language, theme, sync and backup':'لغة، مظهر، مزامنة ونسخ احتياطي',url:local('pages/settings.html'),aliases:aliasPack('ثيم لون لغة نسخ احتياطي مزامنة','theme language backup sync')},
      {title: en?'Account Settings':'إعدادات الحساب',kind:tx.account,desc:en?'Login, password and sync':'الدخول، كلمة المرور والمزامنة',url:local('pages/account.html'),aliases:aliasPack('حساب كلمة مرور جلسات رفع بيانات','account password sessions data')},
      {title: en?'Login':'تسجيل الدخول',kind:tx.account,desc:en?'Sign in to sync data':'الدخول لحفظ البيانات',url:local('pages/login.html'),aliases:aliasPack('دخول تسجيل حساب','signin auth')},
      {title: en?'User Agreement':'اتفاقية المستخدم',kind:tx.legal,desc:en?'Terms and responsibility limits':'شروط الاستخدام وحدود المسؤولية',url:local('pages/legal.html#terms')},
      {title: en?'Privacy Policy':'سياسة الخصوصية',kind:tx.legal,desc:en?'How student data is saved locally':'كيف تُحفظ بيانات الطالب داخل المتصفح',url:local('pages/legal.html#privacy')},
      {title: en?'About':'من نحن',kind:tx.company,desc:en?'Bawsala mission and principles':'مهمة بوصلة ومبادئها',url:local('pages/company.html')},
      {title: en?'Sample study day':'يوم دراسي نموذجي',kind:en?'Guide':'دليل',desc:en?'Open the daily loop and load safe sample data':'افتح حلقة اليوم وحمّل بيانات دراسية نموذجية',url:local('pages/workspace.html#flow'),aliases:aliasPack('مثال يوم دراسة تجريبي جاهزية','sample study day guide readiness')},
      {title:'SchoolMind AI',kind:tx.external,desc:en?'Open SchoolMind AI':'انتقال مباشر إلى SchoolMind AI',url:ui.safeURL(d.schoolmindUrl),external:true}
    );
    WORKSPACE_TOOLS.forEach(([key,arTitle,enTitle])=>list.push({
      title: en ? enTitle : arTitle,
      kind: en ? 'Study room tool' : 'أداة غرفة الدراسة',
      desc: en ? 'Jump directly to the tool inside the daily loop' : 'انتقال مباشر داخل حلقة الدراسة اليومية',
      url: local(`pages/workspace.html#${key}`),
      key:`workspace:${key}`,
      aliases:aliasPack(`${arTitle} دراسة واجب تركيز مؤقت مراجعة`,`${enTitle} study homework focus timer review`)
    }));
    d.resources.forEach(r=>list.push({title:r.name,kind:tx.resource,desc:`${r.fit} · ${r.cost}`,url:ui.safeURL(r.url),external:ui.safeURL(r.url).startsWith('http')}));
    d.services.forEach(s=>list.push({title:s.title,kind:tx.service,desc:s.desc,url:local('pages/services.html')}));
    d.lectures.forEach(l=>list.push({title:l.title,kind:tx.lecture,desc:l.takeaway,url:local('pages/workspace.html#lectures')}));
    d.mindmapTemplates?.forEach(m=>list.push({title:m.title,kind:tx.mindmap,desc:m.nodes.join(' · '),url:local('pages/workspace.html#mindmap')}));
    d.flashcardDecks?.forEach(deck=>list.push({title:deck,kind:tx.flashcards,desc:en?'Review deck':'مجموعة مراجعة',url:local('pages/workspace.html#flashcards')}));
    d.btecTerms.forEach(([term,ar,level,tip])=>list.push({title:`${term} - ${ar}`,kind:`BTEC ${level}`,desc:tip,url:local('pages/calculators.html#terms')}));
    return list;
  }

  function createPalette(){
    const tx = text();
    const node = document.createElement('div');
    node.className = 'command-palette';
    node.id = 'commandPalette';
    node.setAttribute('aria-hidden','true');
    node.innerHTML = `
      <div class="command-backdrop" data-close></div>
      <section class="command-panel" role="dialog" aria-modal="true" aria-labelledby="commandTitle">
        <div class="command-head">
          <strong id="commandTitle">${window.MT_UI.escapeHTML(tx.title)}</strong>
          <button class="icon-btn" data-close type="button" aria-label="${window.MT_UI.escapeAttr(tx.close)}">×</button>
        </div>
        <label class="sr-only" for="commandInput">${window.MT_UI.escapeHTML(tx.input)}</label>
        <input id="commandInput" class="command-input" type="search" role="combobox" placeholder="${window.MT_UI.escapeAttr(tx.placeholder)}" autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="commandHint" aria-controls="commandResults" aria-autocomplete="list" aria-expanded="false">
        <div class="command-toolbar"><div class="fine" id="commandHint">${window.MT_UI.escapeHTML(tx.hint)} · ${window.MT_UI.escapeHTML(tx.filterHint)}</div><button class="btn sm secondary" id="clearRecentSearch" type="button">${window.MT_UI.escapeHTML(tx.clearRecent)}</button></div>
        <div class="sr-only" id="commandLive" role="status" aria-live="polite"></div>
        <div id="commandResults" class="command-results" role="listbox" aria-label="${window.MT_UI.escapeAttr(tx.results)}"></div>
      </section>`;
    document.body.appendChild(node);
    return node;
  }

  function refreshPaletteMarkup(){
    const wasOpen = palette?.classList.contains('open');
    if(palette) palette.remove();
    if(wasOpen) document.body.classList.remove('command-open');
    palette = createPalette();
    input = palette.querySelector('#commandInput');
    results = palette.querySelector('#commandResults');
    items = buildItems();
    activeIndex = 0;
    bindPaletteControls();
  }

  function close(){
    if(!palette) return;
    palette.classList.remove('open');
    palette.setAttribute('aria-hidden','true');
    document.body.classList.remove('command-open');
    input?.setAttribute('aria-activedescendant','');
    input?.setAttribute('aria-expanded','false');
    if(lastActive && document.contains(lastActive)) lastActive.focus();
  }

  function open(){
    if(!palette) refreshPaletteMarkup();
    lastActive = document.activeElement;
    palette.classList.add('open');
    palette.setAttribute('aria-hidden','false');
    document.body.classList.add('command-open');
    input?.setAttribute('aria-expanded','true');
    render('');
    requestAnimationFrame(()=>input?.focus());
  }

  function score(item, q){
    const nq=normalize(q);
    const hay = normalize(`${item.title} ${item.kind} ${item.desc} ${item.aliases || ''}`);
    if(!nq) return item.recent ? 3 : 1;
    const title=normalize(item.title);
    const words = nq.split(/\s+/).filter(Boolean);
    return words.reduce((n,w)=> n + (hay.includes(w) ? 2 : 0) + (title.startsWith(w) ? 3 : 0) + (title===w ? 4 : 0), 0);
  }
  function highlight(value, q){
    const ui=window.MT_UI;
    const safe=ui.escapeHTML(value);
    const words=normalize(q).split(/\s+/).filter(w=>w.length>1).slice(0,4);
    if(!words.length) return safe;
    let out=safe;
    words.forEach(word=>{
      const escaped=word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      out=out.replace(new RegExp(`(${escaped})`,'ig'),'<mark>$1</mark>');
    });
    return out;
  }

  function setActive(index){
    if(!visibleItems.length){
      activeIndex = 0;
      input?.setAttribute('aria-activedescendant','');
      input?.setAttribute('aria-expanded','false');
      return;
    }
    activeIndex = (index + visibleItems.length) % visibleItems.length;
    results.querySelectorAll('.command-item').forEach((item,i)=>{
      const selected = i === activeIndex;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-selected', String(selected));
      if(selected) item.scrollIntoView({block:'nearest'});
    });
    input?.setAttribute('aria-activedescendant', `commandResult${activeIndex}`);
  }

  function render(q){
    const ui = window.MT_UI, tx = text();
    const qClean=normalize(q);
    const savedRecent=recent();
    const source=qClean ? items : [...savedRecent.map(x=>({...x,recent:true,kind:`${tx.recent} · ${x.kind||tx.page}`})), ...items];
    const seen=new Set();
    visibleItems = source.map(item=>({...item,_score:score(item,q)})).filter(x=>x._score>0 && !seen.has(x.url) && seen.add(x.url)).sort((a,b)=>b._score-a._score || String(a.title).localeCompare(String(b.title))).slice(0,10);
    const clearBtn=palette?.querySelector('#clearRecentSearch');
    if(clearBtn) clearBtn.hidden=Boolean(qClean || !savedRecent.length);
    input?.setAttribute('aria-expanded', String(visibleItems.length>0));
    const live=palette?.querySelector('#commandLive');
    if(live) live.textContent=`${visibleItems.length} ${tx.resultCount}`;
    results.innerHTML = visibleItems.length ? visibleItems.map((item,index)=>`<a class="command-item" role="option" id="commandResult${index}" aria-selected="false" href="${ui.escapeAttr(ui.safeURL(item.url))}" data-result-index="${index}" aria-label="${ui.escapeAttr(`${tx.open}: ${item.title}`)}" ${item.external?'target="_blank" rel="noopener noreferrer"':''}><span class="badge gray">${ui.escapeHTML(item.kind)}</span><strong>${highlight(item.title,q)}</strong><small>${highlight(item.desc,q)}</small></a>`).join('') : `<div class="empty"><p>${ui.escapeHTML(tx.noResults)}</p><div class="actions"><a class="btn sm" href="${ui.escapeAttr(ui.url('pages/workspace.html#flow'))}">${isEnglish()?'Daily loop':'حلقة اليوم'}</a><a class="btn sm secondary" href="${ui.escapeAttr(ui.url('pages/resources.html'))}">${isEnglish()?'Resources':'المصادر'}</a></div></div>`;
    setActive(0);
  }

  function trapTab(event){
    if(event.key !== 'Tab' || !palette?.classList.contains('open')) return;
    const focusables = [...palette.querySelectorAll('a[href],button,input,[tabindex]:not([tabindex="-1"])')].filter(el=>!el.disabled && el.offsetParent !== null);
    if(!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if(event.shiftKey && document.activeElement === first){ event.preventDefault(); last.focus(); }
    else if(!event.shiftKey && document.activeElement === last){ event.preventDefault(); first.focus(); }
  }

  function openActiveResult(){
    const selected = results.querySelector('.command-item.active') || results.querySelector('.command-item');
    if(selected){
      const item=visibleItems[Number(selected.dataset.resultIndex || activeIndex)];
      remember(item);
      selected.click();
    }
  }

  function bindPaletteControls(){
    palette.querySelectorAll('[data-close]').forEach(x=>x.addEventListener('click', close));
    input.addEventListener('input',()=>render(input.value.trim()));
    input.addEventListener('keydown',(event)=>{
      if(event.key==='Escape'){ event.stopPropagation(); if(input.value){ input.value=''; render(''); } else close(); }
      if(event.key==='ArrowDown'){
        event.preventDefault();
        setActive(activeIndex + 1);
      }
      if(event.key==='ArrowUp'){
        event.preventDefault();
        setActive(activeIndex - 1);
      }
      if(event.key==='Home'){
        event.preventDefault();
        setActive(0);
      }
      if(event.key==='End'){
        event.preventDefault();
        setActive(visibleItems.length - 1);
      }
      if(event.key==='PageDown'){
        event.preventDefault();
        setActive(activeIndex + 5);
      }
      if(event.key==='PageUp'){
        event.preventDefault();
        setActive(activeIndex - 5);
      }
      if(event.key==='Enter'){
        event.preventDefault();
        openActiveResult();
      }
    });
    results.addEventListener('mousemove',event=>{
      const item = event.target.closest('.command-item');
      if(!item) return;
      const next = Number(item.id.replace('commandResult',''));
      if(Number.isFinite(next)) setActive(next);
    });
    palette.querySelector('#clearRecentSearch')?.addEventListener('click',()=>{ clearRecent(); window.MT_UI?.toast?.(text().recentCleared); render(input.value.trim()); });
    results.addEventListener('click',event=>{
      const item = event.target.closest('.command-item');
      if(item){ remember(visibleItems[Number(item.dataset.resultIndex || 0)]); close(); return; }
      if(event.target.closest('a[href]')) close();
    });
    palette.addEventListener('keydown', trapTab);
  }

  document.addEventListener('DOMContentLoaded',()=>{
    refreshPaletteMarkup();
    document.addEventListener('click',(event)=>{
      if(event.target.closest('#globalSearchOpen')) open();
    });
    document.addEventListener('keydown',(event)=>{
      const typing=event.target && /^(input|textarea|select)$/i.test(event.target.tagName);
      if((event.ctrlKey||event.metaKey) && event.key.toLowerCase()==='k'){
        event.preventDefault();
        open();
      }
      if(!typing && !event.ctrlKey && !event.metaKey && event.key==='/'){
        event.preventDefault();
        open();
      }
      if(event.key==='Escape' && palette?.classList.contains('open')) close();
    });
    window.addEventListener('mt:language',()=>{ close(); refreshPaletteMarkup(); });
  });
})();

;
/* ===== assets/js/pwa.js ===== */
(function(){
  'use strict';
  const BUILD_VERSION='16.0.1';
  const state={registration:null,waiting:null,reloadRequested:false};
  function emit(type,detail={}){window.dispatchEvent(new CustomEvent(type,{detail:{version:BUILD_VERSION,...detail}}));}
  function applyUpdate(){
    state.reloadRequested=true;
    try{sessionStorage.setItem('bawsala:pwa-reload','1');}catch(_){/* no-op */}
    const worker=state.waiting||state.registration?.waiting;
    if(worker)worker.postMessage({type:'SKIP_WAITING'});
    else location.reload();
  }
  async function clearCaches(){
    try{
      state.registration?.active?.postMessage({type:'CLEAR_CACHES'});
      if('caches'in window)await Promise.all((await caches.keys()).filter(key=>key.startsWith('bawsala-')).map(key=>caches.delete(key)));
    }catch(_){/* best effort */}
  }
  function watchRegistration(registration){
    state.registration=registration;
    if(registration.waiting){state.waiting=registration.waiting;emit('bawsala:pwa-update',{registration});}
    registration.addEventListener('updatefound',()=>{
      const worker=registration.installing;if(!worker)return;
      worker.addEventListener('statechange',()=>{
        if(worker.state==='installed'&&navigator.serviceWorker.controller){state.waiting=worker;emit('bawsala:pwa-update',{registration});}
      });
    });
  }
  document.addEventListener('DOMContentLoaded',async()=>{
    if(!('serviceWorker'in navigator)||location.protocol==='file:')return;
    const root=location.pathname.includes('/pages/')?'../':'./';
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(!state.reloadRequested)return;
      state.reloadRequested=false;
      location.reload();
    });
    try{
      const registration=await navigator.serviceWorker.register(`${root}service-worker.js?v=${BUILD_VERSION}`,{updateViaCache:'none'});
      watchRegistration(registration);
      registration.update().catch(()=>{});
      registration.active?.postMessage({type:'CLIENT_VERSION',version:BUILD_VERSION});
    }catch(error){emit('bawsala:pwa-error',{message:String(error?.message||error).slice(0,180)});}
  });
  window.BAWSALA_PWA={version:BUILD_VERSION,state,applyUpdate,clearCaches};
})();

;
/* ===== assets/js/onboarding-gate.js ===== */
(function(){
  const LEGAL_VERSION='2026-07-launch-v1';
  const ACCEPT_KEY='bawsala.v12.legalAccepted';
  const ACCEPT_AT_KEY='bawsala.v12.legalAcceptedAt';
  function read(){ try{return JSON.parse(localStorage.getItem(ACCEPT_KEY)||'null');}catch(_){return null;} }
  function accepted(){ const value=read(); return !!(value&&value.accepted===true&&value.version===LEGAL_VERSION); }
  function accept(version=LEGAL_VERSION){ try{const at=new Date().toISOString();localStorage.setItem(ACCEPT_KEY,JSON.stringify({accepted:true,version,at}));localStorage.setItem(ACCEPT_AT_KEY,at);return true;}catch(_){return false;} }
  function isAllowedPath(){ if(!location.pathname || location.protocol==='about:')return true; const p=location.pathname.replace(/\/+/g,'/'); return ['/welcome.html','/legal.html','/login.html','/signup.html','/signup-success.html'].some(path=>p.endsWith('/pages'+path)); }
  document.addEventListener('DOMContentLoaded',()=>{ if(accepted()||isAllowedPath())return; const target=location.pathname.includes('/pages/')?'welcome.html':'pages/welcome.html'; const next=encodeURIComponent(location.pathname.split('/').pop()||'index.html'); location.replace(target+'?next='+next); });
  window.BAWSALA_ONBOARDING={LEGAL_VERSION,ACCEPT_KEY,accepted,accept};
})();

