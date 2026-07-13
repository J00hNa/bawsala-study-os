'use strict';

// The Supabase URL and publishable/anon key are public browser configuration.
// Never place the service_role key in this file or anywhere in the frontend.
window.BAWSALA_CONFIG = Object.freeze({
  SUPABASE_URL: 'https://YOUR_PROJECT_REF.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'YOUR_PUBLISHABLE_OR_ANON_KEY',
  TURNSTILE_SITE_KEY: 'YOUR_OPTIONAL_CLOUDFLARE_TURNSTILE_SITE_KEY',
  SYNC_DEBOUNCE_MS: 1400
});
