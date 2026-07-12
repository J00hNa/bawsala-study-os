import assert from 'node:assert/strict';
import security from '../lib/network-security.js';

assert.equal(security.safeEqualSecret('same-secret', 'same-secret'), true);
assert.equal(security.safeEqualSecret('same-secret', 'different'), false);
assert.equal(security.safeEqualSecret('', ''), false);

assert.equal(security.normalizePublicBaseUrl('https://example.com/path', { production: true }), 'https://example.com');
assert.equal(security.normalizePublicBaseUrl('http://example.com', { production: true }), '');
assert.equal(security.normalizePublicBaseUrl('javascript:alert(1)'), '');
assert.equal(security.normalizeHostHeader('example.com:8443'), 'example.com:8443');
assert.equal(security.normalizeHostHeader('evil.com/path'), '');
assert.equal(security.normalizeHostHeader('evil.com\r\nX-Test: yes'), '');

assert.equal(security.cidrMatch('192.168.1.25', '192.168.1.0/24'), true);
assert.equal(security.cidrMatch('192.168.2.25', '192.168.1.0/24'), false);
assert.equal(security.cidrMatch('10.22.33.44', '10.0.0.0/8'), true);
assert.equal(security.cidrMatch('11.22.33.44', '10.0.0.0/8'), false);
assert.equal(security.cidrMatch('2001:db8::1234', '2001:db8::/32'), true);
assert.equal(security.cidrMatch('2001:db9::1', '2001:db8::/32'), false);
assert.equal(security.ipMatchesRule('::ffff:127.0.0.1', '127.0.0.1'), true);
assert.equal(security.ipMatchesAllowlist('172.16.9.5', new Set(['10.0.0.0/8', '172.16.0.1/12'])), true);

assert.equal(security.sameOrigin('https://example.com', 'https://example.com'), true);
assert.equal(security.sameOrigin('http://example.com', 'https://example.com'), false);
assert.equal(security.requestOrigin({ headers: { host: 'example.test', 'x-forwarded-proto': 'https' } }, { trustProxy: true }), 'https://example.test');

console.log('OK: security unit tests passed.');
