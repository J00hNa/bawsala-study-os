from html.parser import HTMLParser
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
html = (root / 'index.html').read_text(encoding='utf-8')

class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.refs = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag in {'script', 'link', 'img'}:
            ref = attrs.get('src') or attrs.get('href')
            if ref and not re.match(r'^(?:https?:|data:|#)', ref):
                self.refs.append(ref.split('?', 1)[0])

parser = Parser()
parser.feed(html)
assert len(parser.ids) == len(set(parser.ids)), 'duplicate HTML ids found'
for ref in parser.refs:
    assert (root / ref).exists(), f'missing local asset: {ref}'

app = (root / 'app.js').read_text(encoding='utf-8')
queried_ids = set(re.findall(r"q\('#([A-Za-z0-9_-]+)'", app))
missing = queried_ids - set(parser.ids) - {'modalError', 'turnstileContainer'}
assert not missing, f'JavaScript references missing HTML ids: {sorted(missing)}'

sw = (root / 'sw.js').read_text(encoding='utf-8')
assert "url.origin !== self.location.origin" in sw, 'service worker must exclude cross-origin API traffic'
assert 'backend.js' in sw and 'config.js' in sw, 'new app-shell files are not cached'
assert 'caches.open' in sw and "cache: 'no-store'" in sw, 'service worker cache controls missing'

headers = (root / '_headers').read_text(encoding='utf-8')
for required in ['Content-Security-Policy', 'X-Content-Type-Options', 'frame-ancestors', 'connect-src', 'frame-src https://challenges.cloudflare.com']:
    assert required in headers, f'missing security header: {required}'

sql = (root / 'supabase/migrations/001_bawsala_backend.sql').read_text(encoding='utf-8')
for required in ['enable row level security', 'force row level security', 'sync_study_state', 'auth.uid()', 'security definer']:
    assert required in sql.lower(), f'missing database security control: {required}'
assert 'grant select on public.study_states to authenticated' in sql.lower()
assert 'grant insert on public.study_states' not in sql.lower()
assert 'grant update on public.study_states' not in sql.lower()

backend = (root / 'backend.js').read_text(encoding='utf-8')
assert 'gotrue_meta_security' in backend and 'captcha_token' in backend, 'CAPTCHA token is not passed to Auth'
for frontend_name in ['app.js', 'backend.js', 'config.js', 'index.html']:
    frontend = (root / frontend_name).read_text(encoding='utf-8').lower()
    assert 'supabase_service_role_key' not in frontend, f'service role environment name leaked into {frontend_name}'

edge = (root / 'supabase/functions/delete-account/index.ts').read_text(encoding='utf-8')
assert 'allowed_origins.length === 0' in edge.lower(), 'Edge Function must fail closed when origins are unset'
assert "request.headers.get('authorization')" in edge.lower(), 'Edge Function does not validate caller authorization'
assert 'user?.id' in edge and 'admin/users/' in edge, 'Edge Function must delete the authenticated user only'
assert 'request.json' not in edge, 'delete-account must not accept a target user id from request JSON'

config = (root / 'config.js').read_text(encoding='utf-8')
assert 'TURNSTILE_SITE_KEY' in config, 'optional Turnstile config is missing'

print('static smoke: ok')
