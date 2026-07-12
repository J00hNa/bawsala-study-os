import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
let failed = false;
function read(file){ return fs.readFileSync(path.join(root,file),'utf8'); }
function fail(message){ failed = true; console.error('Production upgrade smoke failed:', message); }
const required = {
  'pages/welcome.html':['welcomeConsentForm','welcomeContinue','اتفاقية المستخدم'],
  'assets/js/welcome.js':['welcomeAgree','disabled','BAWSALA_ONBOARDING'],
  'assets/js/onboarding-gate.js':['legalAccepted','location.replace'],
  'pages/signup.html':['ageConfirmed','specializationSelect','googleSignIn','رقم الهوية الوطنية','signupSubmit','تأكيد البريد الإلكتروني'],
  'pages/signup-success.html':['resendVerify','devVerifyBox','EMAIL VERIFICATION'],
  'assets/js/signup-success.js':['emailVerificationStatus','requestEmailVerification','devVerificationUrl'],
  'assets/js/auth.js':['INVALID_PHONE','AGE_CONFIRMATION_REQUIRED','googleConfig','googlePending','completeGoogleSignup','fillSpecializations','signup-success.html'],
  'pages/calendar.html':['calendarForm','googleCalendarConnect','googleCalendarSync','googleCalendarDisconnect','googleCalendarDirection','calendarReminderDispatch','calendarMonthGrid','calendarExport'],
  'assets/js/calendar.js':['study:calendar','data-delete','data-edit','calendarEvents','createCalendarEvent','dispatchCalendarReminders','googleCalendarDisconnect','calendarMonthGrid'],
  'pages/billing.html':['planGrid','cancelSubscription','billingPortal','featureGateList','invoiceList','yearlySavings'],
  'assets/js/billing.js':['/api/billing/plans','/api/billing/checkout','/api/billing/cancel','/api/billing/portal','featureGateList','invoiceList'],
  'server.js':['/api/calendar/reminders/dispatch','dispatchCalendarReminders','syncGoogleCalendar','/api/auth/verify-email/confirm','emailVerificationTokens','EMAIL_VERIFICATION_TTL_MS','LEGAL_VERSION','/api/calendar/events','/api/admin/backup','isPublicStaticRequest','/api/billing/webhook','verifyWebhookSignature','BAWSALA_GOOGLE_CLIENT_ID','NATIONAL_ID_NOT_COLLECTED','BILLING_PLANS','/api/billing/feature-gates','/api/billing/change-plan','billingProviderConfig','applyBillingWebhook','createBillingInvoice','checkoutSessions','invoices','BAWSALA_PAYMENT_PORTAL_API_URL','BAWSALA_STRIPE_SECRET_KEY','/api/auth/google/callback','bawsala_google_state','bawsala_google_pending','exchangeGoogleCode','fetchGoogleUserInfo'],
  'lib/snapshot-schema.js':['study:calendar'],
  'assets/js/security.js':['study:calendar'],
  'pages/legal.html':['لا نبيع بيانات الطلاب','قانونياً','رقم الهوية الوطنية'],
  '.env.example':['BAWSALA_GOOGLE_CLIENT_ID','BAWSALA_PAYMENT_WEBHOOK_SECRET','BAWSALA_PAYMENT_PORTAL_API_URL','BAWSALA_STRIPE_SECRET_KEY','BAWSALA_STRIPE_WEBHOOK_SECRET','BAWSALA_DATA_DIR','BAWSALA_MAIL_PROVIDER','BAWSALA_PUBLIC_BASE_URL','BAWSALA_BACKUP_UPLOAD_URL','BAWSALA_BACKUP_ENCRYPTION_KEY']
};
for(const [file, needles] of Object.entries(required)){
  const content = read(file);
  for(const needle of needles) if(!content.includes(needle)) fail(`${file} missing ${needle}`);
}

for(const file of ['pages/signup.html','assets/js/auth.js','assets/js/backend-client.js','pages/account.html','assets/js/account.js']){
  if(/dateOfBirth|setupToken/.test(read(file))) fail(`${file} still collects date of birth or exposes setup token`);
}
const server = read('server.js');
if(!/pathName === '\/api\/billing\/webhook' && method === 'POST'/.test(server)) fail('billing webhook CSRF exception missing');
if(!/if \(body\.nationalId \|\| body\.nationalIdNumber\)/.test(server)) fail('national id rejection missing');
if(!server.includes('/api/auth/verify-email/request') || !server.includes('confirmEmailVerificationToken')) fail('email verification routes missing');
if(!/PUBLIC_STATIC_FILES/.test(server) || !/SERVER_SOURCE_STATIC_LEAK/.test(read('tools/server-smoke.mjs'))) fail('static source leak guard missing');
const billing = read('server.js');
if(!billing.includes("id: 'plus-yearly'") || !billing.includes("priceMinor: 49990")) fail('yearly plan pricing missing or not within target discount range');
if(!billing.includes('yearlyDiscountPercent') || !billing.includes('publicFeatureGates')) fail('stage 7 billing math and feature gates missing');
if(failed) process.exit(1);
console.log('OK: production upgrade smoke checks passed.');
