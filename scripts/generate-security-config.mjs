import { access, readFile, writeFile } from 'node:fs/promises';

const config = await readFile('config.js', 'utf8');
const match = config.match(/SUPABASE_URL:\s*['"]([^'"]+)['"]/);
let apiOrigin = '';
try {
  const candidate = new URL(match?.[1] || '');
  if ((candidate.protocol === 'https:' || (candidate.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(candidate.hostname))) && !candidate.hostname.toLowerCase().includes('your_project')) {
    apiOrigin = candidate.origin;
  }
} catch { /* Local-only build. */ }

const wsOrigin = apiOrigin ? apiOrigin.replace(/^http/, 'ws') : '';
const connectSrc = ["'self'", apiOrigin, wsOrigin, 'https://challenges.cloudflare.com'].filter(Boolean).join(' ');
const csp = [
  "default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'", "form-action 'self'",
  "script-src 'self' https://challenges.cloudflare.com", "style-src 'self'", "img-src 'self' data: blob:", "font-src 'self'",
  `connect-src ${connectSrc}`, "frame-src https://challenges.cloudflare.com", "manifest-src 'self'", "worker-src 'self'", "media-src 'self'",
  'upgrade-insecure-requests'
].join('; ');
const common = [
  ['Content-Security-Policy', csp],
  ['Referrer-Policy', 'no-referrer'],
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'DENY'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), accelerometer=(), gyroscope=(), magnetometer=(), interest-cohort=(), browsing-topics=()'],
  ['Cross-Origin-Opener-Policy', 'same-origin'],
  ['Cross-Origin-Resource-Policy', 'same-origin'],
  ['Origin-Agent-Cluster', '?1'],
  ['Strict-Transport-Security', 'max-age=31536000'],
  ['Cache-Control', 'no-cache, no-store, must-revalidate']
];

function cloudflareHeaders({ production = false } = {}) {
  const lines = ['/*', ...common.map(([key, value]) => `  ${key}: ${value}`), '', '/index.html', '  Cache-Control: no-cache, no-store, must-revalidate', '', '/sw.js', '  Cache-Control: no-cache, no-store, must-revalidate', '', '/manifest.webmanifest', '  Cache-Control: no-cache, must-revalidate', '', '/config.js', '  Cache-Control: no-store'];
  if (production) {
    lines.push('', '/assets/*.js', '  Cache-Control: public, max-age=31536000, immutable', '', '/assets/*.css', '  Cache-Control: public, max-age=31536000, immutable');
  } else {
    lines.push('', '/*.css', '  Cache-Control: no-cache, must-revalidate', '', '/*.js', '  Cache-Control: no-cache, must-revalidate');
  }
  lines.push('', '/assets/*.png', '  Cache-Control: public, max-age=2592000', '', '/assets/*.svg', '  Cache-Control: public, max-age=2592000');
  return `${lines.join('\n')}\n`;
}

function vercelHeaders({ production = false } = {}) {
  const headers = [
    { source: '/(.*)', headers: common.map(([key, value]) => ({ key, value })) },
    { source: '/config.js', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    { source: '/index.html', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] },
    { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] }
  ];
  if (production) headers.push({ source: '/assets/(.*)\\.(js|css)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] });
  return `${JSON.stringify({ headers }, null, 2)}\n`;
}

await writeFile('_headers', cloudflareHeaders());
await writeFile('vercel.json', vercelHeaders());
try {
  await access('dist');
  await writeFile('dist/_headers', cloudflareHeaders({ production: true }));
  await writeFile('dist/vercel.json', vercelHeaders({ production: true }));
} catch { /* Dist is optional when this script is run alone. */ }
console.log(`security headers: ${apiOrigin || 'local-only connect-src'}`);
