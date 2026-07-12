import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = process.cwd();
let failed = false;
const budgets = {
  jsTransfer: 64 * 1024,
  cssTransfer: 64 * 1024,
  htmlTransfer: 20 * 1024,
  routeRaw: 500 * 1024,
  routeTransfer: 140 * 1024,
  totalTransfer: 900 * 1024
};
const htmlFiles = [
  path.join(root, 'index.html'),
  ...fs.readdirSync(path.join(root, 'pages')).filter(name => name.endsWith('.html')).map(name => path.join(root, 'pages', name))
];
const deployed = new Set([...htmlFiles, path.join(root, 'manifest.webmanifest'), path.join(root, 'service-worker.js')]);

function localFile(owner, reference) {
  const ref = String(reference || '').trim().split('?')[0].split('#')[0];
  if (!ref || /^(?:https?:|mailto:|tel:|data:|blob:|javascript:|#)/i.test(ref)) return null;
  const target = path.resolve(path.dirname(owner), ref);
  if (!target.startsWith(root + path.sep) && target !== root) return null;
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return null;
  return target;
}
function addCssDependencies(file, bucket, seen = new Set()) {
  if (seen.has(file)) return;
  seen.add(file);
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/(?:url\(|@import\s+)(?:\s*["']?)([^"')\s]+)["']?\s*\)?/gi)) {
    const target = localFile(file, match[1]);
    if (!target) continue;
    bucket.add(target);
    deployed.add(target);
    if (/\.css$/i.test(target)) addCssDependencies(target, bucket, seen);
  }
}
function routeFiles(htmlFile) {
  const source = fs.readFileSync(htmlFile, 'utf8');
  const files = new Set([htmlFile]);
  const references = [];
  for (const match of source.matchAll(/<(?:script|img|source|video|audio)\b[^>]*\b(?:src|poster)=["']([^"']+)["'][^>]*>/gi)) references.push(match[1]);
  for (const match of source.matchAll(/<link\b([^>]*)>/gi)) {
    const attrs = match[1];
    const href = attrs.match(/\bhref=["']([^"']+)["']/i)?.[1];
    const rel = attrs.match(/\brel=["']([^"']+)["']/i)?.[1]?.toLowerCase() || '';
    if (href && /(?:^|\s)(?:stylesheet|icon|manifest|preload|modulepreload|apple-touch-icon)(?:\s|$)/.test(rel)) references.push(href);
  }
  for (const match of source.matchAll(/\bsrcset=["']([^"']+)["']/gi)) {
    for (const candidate of match[1].split(',')) references.push(candidate.trim().split(/\s+/)[0]);
  }
  for (const reference of references) {
    const target = localFile(htmlFile, reference);
    if (!target) continue;
    files.add(target);
    deployed.add(target);
    if (/\.css$/i.test(target)) addCssDependencies(target, files);
  }
  return files;
}
function sizes(files) {
  let raw = 0;
  let transfer = 0;
  for (const file of files) {
    const content = fs.readFileSync(file);
    raw += content.length;
    transfer += zlib.gzipSync(content, { level: 9 }).length;
  }
  return { raw, transfer };
}

const routes = [];
for (const htmlFile of htmlFiles) {
  const files = routeFiles(htmlFile);
  const result = sizes(files);
  const rel = path.relative(root, htmlFile);
  routes.push({ rel, files: files.size, ...result });
  if (result.raw > budgets.routeRaw) {
    failed = true;
    console.error('Performance budget failed: route raw payload too large', rel, result.raw, 'limit', budgets.routeRaw);
  }
  if (result.transfer > budgets.routeTransfer) {
    failed = true;
    console.error('Performance budget failed: route gzip payload too large', rel, result.transfer, 'limit', budgets.routeTransfer);
  }
}

const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
for (const match of sw.matchAll(/["'](\.\/[^"']+)["']/g)) {
  const target = path.resolve(root, match[1]);
  if (fs.existsSync(target) && fs.statSync(target).isFile()) deployed.add(target);
}

let totalTransfer = 0;
let totalRaw = 0;
for (const file of deployed) {
  const rel = path.relative(root, file);
  const content = fs.readFileSync(file);
  const transfer = zlib.gzipSync(content, { level: 9 }).length;
  totalTransfer += transfer;
  totalRaw += content.length;
  if (/\.js$/i.test(file) && transfer > budgets.jsTransfer) {
    failed = true;
    console.error('Performance budget failed: JS gzip transfer too large', rel, transfer);
  }
  if (/\.css$/i.test(file) && transfer > budgets.cssTransfer) {
    failed = true;
    console.error('Performance budget failed: CSS gzip transfer too large', rel, transfer);
  }
  if (/\.html$/i.test(file) && transfer > budgets.htmlTransfer) {
    failed = true;
    console.error('Performance budget failed: HTML gzip transfer too large', rel, transfer);
  }
}
if (totalTransfer > budgets.totalTransfer) {
  failed = true;
  console.error('Performance budget failed: deployable gzip transfer too large', totalTransfer);
}
const readiness = fs.readFileSync(path.join(root, 'PRODUCTION_READINESS.md'), 'utf8');
if (!readiness.includes('64 KB gzip') || !readiness.includes('140 KB gzip per route')) {
  failed = true;
  console.error('Production readiness report is missing the active per-asset or per-route transfer budget.');
}
if (failed) process.exit(1);
const heaviest = routes.sort((a, b) => b.transfer - a.transfer)[0];
console.log(`OK: performance budgets passed (${deployed.size} deployable files, ${Math.round(totalRaw / 1024)} KB raw / ${Math.round(totalTransfer / 1024)} KB gzip; heaviest route ${heaviest.rel}: ${Math.round(heaviest.raw / 1024)} KB raw / ${Math.round(heaviest.transfer / 1024)} KB gzip).`);
