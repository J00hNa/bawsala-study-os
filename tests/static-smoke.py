from html.parser import HTMLParser
from pathlib import Path
import json
import re

root = Path(__file__).resolve().parents[1]
html = (root / 'index.html').read_text(encoding='utf-8')

class Parser(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids = []; self.refs = []; self.labels = set(); self.controls = []; self.label_depth = 0
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'label': self.label_depth += 1
        if 'id' in attrs: self.ids.append(attrs['id'])
        if tag == 'label' and attrs.get('for'): self.labels.add(attrs['for'])
        if tag in {'input', 'select', 'textarea'} and attrs.get('id'): self.controls.append((attrs['id'], attrs, self.label_depth > 0))
        if tag in {'script', 'link', 'img'}:
            ref = attrs.get('src') or attrs.get('href')
            if ref and not re.match(r'^(?:https?:|data:|#)', ref): self.refs.append(ref.split('?', 1)[0])
    def handle_endtag(self, tag):
        if tag == 'label' and self.label_depth: self.label_depth -= 1

parser = Parser(); parser.feed(html)
assert len(parser.ids) == len(set(parser.ids)), 'duplicate HTML ids found'
for ref in parser.refs: assert (root / ref).exists(), f'missing local asset: {ref}'
assert 'mainContent' in parser.ids and 'skip-link' in html, 'skip navigation is missing'
for control_id, attrs, wrapped in parser.controls:
    assert wrapped or control_id in parser.labels or attrs.get('aria-label') or attrs.get('aria-labelledby'), f'unlabelled form control: {control_id}'

app = (root / 'app.js').read_text(encoding='utf-8')
queried_ids = set(re.findall(r"q\('#([A-Za-z0-9_-]+)'", app))
missing = queried_ids - set(parser.ids) - {'modalError', 'turnstileContainer', 'retryBoot'}
assert not missing, f'JavaScript references missing HTML ids: {sorted(missing)}'
assert 'window.confirm' not in app and 'confirm(' not in app, 'blocking native confirmation remains'
assert 'onclick=' not in app.lower(), 'inline JavaScript violates CSP'
assert '.style.' not in app and 'style=' not in html.lower(), 'inline styles violate the strict style CSP'
assert 'onboardingDone' in app and "kind: 'onboarding'" in app, 'first-run onboarding is missing'
assert 'access_token=' not in app and 'refresh_token=' not in app, 'application parses URL tokens manually'

source = (root / 'src/backend-entry.js').read_text(encoding='utf-8')
assert "flowType: 'pkce'" in source and 'detectSessionInUrl: false' in source
assert 'exchangeCodeForSession' in source, 'PKCE callback is not explicitly exchanged'
assert "sessionStorage" in source and "localStorage" not in source.split('function authStorage', 1)[1].split('}', 4)[0], 'auth session is not tab-scoped'

sw = (root / 'sw.js').read_text(encoding='utf-8')
assert "url.origin !== self.location.origin" in sw
assert "type === 'SKIP_WAITING'" in sw and 'self.skipWaiting();\n});' in sw
assert "STATIC_PATHS.has(url.pathname)" in sw, 'service worker caches arbitrary routes'
assert "caches.match('./index.html')" in sw and 'request.mode === \'navigate\'' in sw
assert "catch(() => caches.match('./index.html'))" not in sw, 'scripts can still fall back to HTML'

headers = (root / '_headers').read_text(encoding='utf-8')
for required in ['Content-Security-Policy', "script-src 'self'", "object-src 'none'", 'frame-ancestors', 'X-Content-Type-Options', 'Strict-Transport-Security: max-age=31536000']:
    assert required in headers, f'missing security header: {required}'
assert "script-src 'self' 'unsafe-inline'" not in headers
assert "style-src 'self' 'unsafe-inline'" not in headers
assert 'includeSubDomains' not in headers, 'HSTS must not claim unmanaged subdomains'

sql = ((root / 'supabase/migrations/001_bawsala_backend.sql').read_text() + (root / 'supabase/migrations/002_bawsala_hardening.sql').read_text()).lower()
for required in ['force row level security', 'sync_study_state', 'validate_bawsala_state', 'account_deletion_requests', 'study_sync_rate_limits', 'study_sync_audit', 'record_study_sync_audit', 'cancel_account_deletion']:
    assert required in sql, f'missing database control: {required}'
assert 'revoke delete on public.study_states from authenticated' in sql
assert 'revoke delete on public.study_state_backups from authenticated' in sql

edge = (root / 'supabase/functions/delete-account/index.ts').read_text()
purge = (root / 'supabase/functions/purge-deleted-accounts/index.ts').read_text()
assert 'account_deletion_requests' in edge and '/admin/users/' not in edge, 'public endpoint must schedule, not delete'
assert "body.confirmation !== 'DELETE MY ACCOUNT'" in edge
assert '/admin/users/' in purge and 'x-cron-secret' in purge, 'purge must be cron-protected'
assert 'console.error' not in edge and 'console.error' not in purge, 'edge functions log unnecessary details'
assert 'new TextEncoder().encode(rawBody).byteLength' in edge, 'edge body limit trusts Content-Length only'

schema = json.loads((root / 'schema/bawsala-state-v4.schema.json').read_text())
assert schema['properties']['schemaVersion']['const'] == 4
assert set(['profile', 'settings', 'cards', 'notes']).issubset(schema['required'])
assert (root / 'src/types.d.ts').exists(), 'state type contract is missing'

manifest = json.loads((root / 'manifest.webmanifest').read_text())
assert manifest.get('id') and manifest.get('scope') and len(manifest.get('icons', [])) >= 3
for icon in manifest['icons']: assert (root / icon['src']).exists(), f"missing manifest icon: {icon['src']}"

for frontend_name in ['app.js', 'backend.js', 'config.js', 'index.html']:
    frontend = (root / frontend_name).read_text(encoding='utf-8').lower()
    assert 'supabase_service_role_key' not in frontend, f'service role environment name leaked into {frontend_name}'


dist = root / 'dist'
assert dist.exists(), 'production dist was not generated'
dist_html = (dist / 'index.html').read_text(encoding='utf-8')
for logical in ['app', 'backend', 'storage', 'styles']:
    assert re.search(rf'assets/{logical}-[A-Z0-9]+\.(?:js|css)', dist_html), f'production {logical} asset is not fingerprinted'
for stale in ['src="app.js"', 'src="backend.js"', 'src="storage.js"', 'href="styles.css"']:
    assert stale not in dist_html, f'unfingerprinted production reference remains: {stale}'
dist_sw = (dist / 'sw.js').read_text(encoding='utf-8')
assert re.search(r'assets/app-[A-Z0-9]+\.js', dist_sw), 'service worker does not precache fingerprinted app code'
dist_headers = (dist / '_headers').read_text(encoding='utf-8')
assert 'max-age=31536000, immutable' in dist_headers and '/sw.js' in dist_headers

print('static smoke: ok')
