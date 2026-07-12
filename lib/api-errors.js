'use strict';

const MESSAGES = Object.freeze({
  UNAUTHORIZED: 'سجّل الدخول للمتابعة.',
  FORBIDDEN: 'لا تملك صلاحية تنفيذ هذا الإجراء.',
  EMAIL_VERIFICATION_REQUIRED: 'أكد بريدك الإلكتروني أولاً.',
  RATE_LIMITED: 'طلبات كثيرة خلال وقت قصير. انتظر قليلاً ثم أعد المحاولة.',
  BAD_CSRF: 'انتهت جلسة الحماية. أعد المحاولة.',
  BAD_ORIGIN: 'تم رفض مصدر الطلب لحماية الحساب.',
  MAINTENANCE_MODE: 'الخدمة تحت الصيانة مؤقتاً.',
  METHOD_NOT_ALLOWED: 'طريقة الطلب غير مدعومة لهذا المسار.',
  NOT_FOUND: 'المورد المطلوب غير موجود.',
  INVALID_LOGIN: 'البريد أو كلمة المرور غير صحيحة.',
  INVALID_PASSWORD: 'كلمة المرور غير صحيحة.',
  ACCOUNT_LOCKED: 'تم قفل المحاولة مؤقتاً بسبب تكرار تسجيل الدخول الفاشل.',
  LOGIN_THROTTLED: 'تم إبطاء محاولات الدخول من هذا المصدر مؤقتاً. أعد المحاولة لاحقاً.',
  WEAK_PASSWORD: 'كلمة المرور لا تحقق متطلبات الأمان.',
  PASSWORD_REUSED: 'لا يمكن إعادة استخدام كلمة مرور سابقة.',
  INVALID_PLAN: 'خطة الاشتراك غير صالحة.',
  PLAN_ALREADY_ACTIVE: 'هذه الخطة مفعّلة بالفعل.',
  NO_PAID_SUBSCRIPTION: 'لا يوجد اشتراك مدفوع لإلغائه.',
  IDEMPOTENCY_CONFLICT: 'استُخدم مفتاح العملية نفسه مع بيانات مختلفة.',
  IDEMPOTENCY_KEY_REQUIRED: 'مفتاح منع تكرار العملية مطلوب.',
  PRECONDITION_REQUIRED: 'يجب إرسال رقم مراجعة البيانات قبل الحفظ.',
  SYNC_CONFLICT: 'تغيرت البيانات على جهاز آخر. حدّث النسخة ثم أعد المحاولة.',
  UNSUPPORTED_MEDIA_TYPE: 'نوع محتوى الطلب غير مدعوم.',
  PAYLOAD_TOO_LARGE: 'حجم البيانات أكبر من الحد المسموح.',
  BAD_JSON: 'بيانات الطلب غير صالحة.',
  BAD_JSON_ROOT: 'يجب أن يكون محتوى الطلب كائناً JSON.',
  REQUEST_TIMEOUT: 'استغرق الطلب وقتاً أطول من الحد المسموح.',
  GOOGLE_CALENDAR_NOT_CONFIGURED: 'تكامل Google Calendar غير مفعّل على الخادم.',
  GOOGLE_CALENDAR_NOT_CONNECTED: 'اربط Google Calendar أولاً.',
  GOOGLE_CALENDAR_RECONNECT_REQUIRED: 'انتهت صلاحية ربط Google Calendar. أعد الربط.',
  GOOGLE_CALENDAR_SYNC_IN_PROGRESS: 'هناك مزامنة Google Calendar قيد التنفيذ بالفعل.',
  GOOGLE_CALENDAR_DIRECTION_INVALID: 'اتجاه المزامنة غير صالح.',
  PERSISTENCE_UNAVAILABLE: 'تعذر تثبيت التغيير في قاعدة البيانات. لم يتم تأكيد العملية.',
  SUPPORT_CONSENT_REQUIRED: 'يجب تأكيد خلو الرسالة من كلمات المرور ورموز التحقق وبيانات الدفع.',
  SUPPORT_CATEGORY_INVALID: 'تصنيف طلب الدعم غير صالح.',
  SUPPORT_DETAILS_INVALID: 'اكتب عنواناً واضحاً وتفاصيل كافية لطلب الدعم.',
  SUPPORT_STATUS_INVALID: 'حالة طلب الدعم غير صالحة.',
  SUPPORT_TICKET_NOT_FOUND: 'طلب الدعم غير موجود أو لا يخص هذا الحساب.',
  LAST_ADMIN_REQUIRED: 'لا يمكن إزالة صلاحية آخر مدير.',
  SERVER_ERROR: 'حدث خطأ داخلي. استخدم رقم الطلب عند التواصل مع الدعم.'
});

const SAFE_PUBLIC_SERVER_CODES = new Set(['GOOGLE_CALENDAR_NOT_CONFIGURED','PERSISTENCE_UNAVAILABLE','MAINTENANCE_MODE']);
function codeFor(error, status){
  const raw = String(error?.message || 'REQUEST_FAILED').trim();
  if(Number(status) >= 500) return SAFE_PUBLIC_SERVER_CODES.has(raw) ? raw : 'SERVER_ERROR';
  return /^[A-Z][A-Z0-9_]{2,80}$/.test(raw) ? raw : 'REQUEST_FAILED';
}

function retryableFor(code, status){
  if(Number(status) === 408 || Number(status) === 429 || Number(status) >= 500) return true;
  return new Set(['REQUEST_TIMEOUT', 'STORAGE_BUSY', 'PROVIDER_TIMEOUT']).has(code);
}

function normalize(error){
  const status = Number(error?.status || 500);
  const code = codeFor(error, status);
  return {
    status,
    code,
    message: MESSAGES[code] || (status >= 500 ? MESSAGES.SERVER_ERROR : 'تعذر إكمال العملية.'),
    retryable: retryableFor(code, status)
  };
}

module.exports = { MESSAGES, codeFor, retryableFor, normalize };
