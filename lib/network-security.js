'use strict';

const crypto = require('crypto');
const net = require('net');
const { URL } = require('url');

function safeEqualSecret(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  if (!a || !b) return false;
  const ah = crypto.createHash('sha256').update(a).digest();
  const bh = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ah, bh);
}

function normalizePublicBaseUrl(rawValue, { production = false } = {}) {
  const raw = String(rawValue || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.username || url.password) return '';
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    if (production && url.protocol !== 'https:') return '';
    if (!url.hostname || /[\s\u0000-\u001f\u007f]/.test(url.host)) return '';
    return url.origin;
  } catch (_) {
    return '';
  }
}

function normalizeHostHeader(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw || raw.length > 253 || /[\s\u0000-\u001f\u007f\\/@]/.test(raw)) return '';
  try {
    const parsed = new URL(`http://${raw}`);
    if (!parsed.hostname || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) return '';
    return parsed.host;
  } catch (_) {
    return '';
  }
}

function socketIp(req) {
  return normalizeIp(req?.socket?.remoteAddress || '')?.text || String(req?.socket?.remoteAddress || '');
}

function trustedProxyRequest(req, rules) {
  if (!rules || !Array.from(rules).length) return true;
  return ipMatchesAllowlist(socketIp(req), rules);
}

function forwardedProto(req, { trustedProxyRules = null } = {}) {
  if (!trustedProxyRequest(req, trustedProxyRules)) return '';
  const values = String(req?.headers?.['x-forwarded-proto'] || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  const raw = values.at(-1) || '';
  return ['http', 'https'].includes(raw) ? raw : '';
}

function requestOrigin(req, { publicOrigin = '', production = false, trustProxy = false, trustedProxyRules = null, port = 8080 } = {}) {
  if (publicOrigin) return publicOrigin;
  const host = normalizeHostHeader(req?.headers?.host || '') || `localhost:${Number(port) || 8080}`;
  const proto = trustProxy ? forwardedProto(req, { trustedProxyRules }) : '';
  return `${proto || (production ? 'https' : 'http')}://${host}`;
}

function sameOrigin(originHeader, expectedOrigin) {
  if (!originHeader || !expectedOrigin) return false;
  try {
    return new URL(String(originHeader)).origin === new URL(String(expectedOrigin)).origin;
  } catch (_) {
    return false;
  }
}

function ipv4Bytes(value) {
  if (net.isIP(value) !== 4) return null;
  const parts = value.split('.').map(Number);
  return parts.length === 4 && parts.every(part => Number.isInteger(part) && part >= 0 && part <= 255) ? parts : null;
}

function ipv6Bytes(value) {
  let input = String(value || '').toLowerCase().replace(/^\[|\]$/g, '').split('%')[0];
  if (net.isIP(input) !== 6) return null;
  let ipv4Tail = null;
  if (input.includes('.')) {
    const lastColon = input.lastIndexOf(':');
    ipv4Tail = ipv4Bytes(input.slice(lastColon + 1));
    if (!ipv4Tail) return null;
    input = `${input.slice(0, lastColon)}:${((ipv4Tail[0] << 8) | ipv4Tail[1]).toString(16)}:${((ipv4Tail[2] << 8) | ipv4Tail[3]).toString(16)}`;
  }
  const halves = input.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':').filter(Boolean) : [];
  const right = halves[1] ? halves[1].split(':').filter(Boolean) : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;
  const groups = [...left, ...Array(missing).fill('0'), ...right];
  if (groups.length !== 8 || groups.some(group => !/^[0-9a-f]{1,4}$/.test(group))) return null;
  const out = [];
  for (const group of groups) {
    const number = parseInt(group, 16);
    out.push((number >> 8) & 0xff, number & 0xff);
  }
  return out;
}

function normalizeIp(value) {
  let ip = String(value || '').trim().replace(/^for=/i, '').replace(/^"|"$/g, '');
  if (ip.startsWith('[') && ip.includes(']')) ip = ip.slice(1, ip.indexOf(']'));
  ip = ip.split('%')[0];
  if (ip.toLowerCase().startsWith('::ffff:')) {
    const mapped = ip.slice(7);
    if (net.isIP(mapped) === 4) return { version: 4, bytes: ipv4Bytes(mapped), text: mapped };
  }
  const version = net.isIP(ip);
  if (version === 4) return { version, bytes: ipv4Bytes(ip), text: ip };
  if (version === 6) return { version, bytes: ipv6Bytes(ip), text: ip.toLowerCase() };
  return null;
}

function cidrMatch(ipValue, cidrRule) {
  const [networkText, prefixText, ...rest] = String(cidrRule || '').split('/');
  if (rest.length || prefixText === undefined || !/^\d{1,3}$/.test(prefixText)) return false;
  const ip = normalizeIp(ipValue);
  const network = normalizeIp(networkText);
  if (!ip || !network || ip.version !== network.version) return false;
  const maxBits = ip.version === 4 ? 32 : 128;
  const prefix = Number(prefixText);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > maxBits) return false;
  const wholeBytes = Math.floor(prefix / 8);
  const remainingBits = prefix % 8;
  for (let index = 0; index < wholeBytes; index += 1) {
    if (ip.bytes[index] !== network.bytes[index]) return false;
  }
  if (!remainingBits) return true;
  const mask = (0xff << (8 - remainingBits)) & 0xff;
  return (ip.bytes[wholeBytes] & mask) === (network.bytes[wholeBytes] & mask);
}

function ipMatchesRule(ipValue, ruleValue) {
  const rawRule = String(ruleValue || '').trim();
  if (!rawRule) return false;
  if (rawRule.includes('/')) return cidrMatch(ipValue, rawRule);
  if (rawRule.endsWith('*')) {
    const prefix = rawRule.slice(0, -1);
    return prefix.length >= 3 && String(ipValue || '').startsWith(prefix);
  }
  const ip = normalizeIp(ipValue);
  const rule = normalizeIp(rawRule);
  if (ip && rule && ip.version === rule.version) return Buffer.from(ip.bytes).equals(Buffer.from(rule.bytes));
  return false;
}

function ipMatchesAllowlist(ipValue, rules) {
  for (const rule of rules || []) if (ipMatchesRule(ipValue, rule)) return true;
  return false;
}

function clientIp(req, { trustProxy = false, trustedProxyRules = null, proxyHops = 1 } = {}) {
  const direct = socketIp(req) || 'local';
  if (!trustProxy || !trustedProxyRequest(req, trustedProxyRules)) return direct;
  const forwarded = String(req?.headers?.['x-forwarded-for'] || '')
    .split(',')
    .map(value => normalizeIp(value)?.text || '')
    .filter(Boolean);
  if (!forwarded.length) return direct;
  const hops = Math.max(1, Math.min(10, Number(proxyHops) || 1));
  const index = Math.max(0, forwarded.length - hops);
  return forwarded[index] || direct;
}

function isPrivateOrReservedIp(value) {
  const ip = normalizeIp(value);
  if (!ip) return true;
  if (ip.version === 4) {
    const [a,b] = ip.bytes;
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51) ||
      (a === 203 && b === 0);
  }
  const bytes = ip.bytes;
  const allZero = bytes.every(byte => byte === 0);
  const loopback = bytes.slice(0,15).every(byte => byte === 0) && bytes[15] === 1;
  const uniqueLocal = (bytes[0] & 0xfe) === 0xfc;
  const linkLocal = bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80;
  const multicast = bytes[0] === 0xff;
  const documentation = bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x0d && bytes[3] === 0xb8;
  return allZero || loopback || uniqueLocal || linkLocal || multicast || documentation;
}

function isLocalHostname(value) {
  const host = String(value || '').trim().toLowerCase().replace(/\.$/, '');
  return host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host === '0.0.0.0' || host === '::';
}

module.exports = {
  safeEqualSecret,
  normalizePublicBaseUrl,
  normalizeHostHeader,
  forwardedProto,
  clientIp,
  trustedProxyRequest,
  requestOrigin,
  sameOrigin,
  normalizeIp,
  cidrMatch,
  ipMatchesRule,
  ipMatchesAllowlist,
  isPrivateOrReservedIp,
  isLocalHostname
};
