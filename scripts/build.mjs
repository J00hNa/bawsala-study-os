import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const distAssets = path.join(dist, 'assets');

await rm(dist, { recursive: true, force: true });
await mkdir(distAssets, { recursive: true });

// Keep one readable development bundle in the source tree.
await build({
  entryPoints: ['src/backend-entry.js'],
  outfile: 'backend.js',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  minify: true,
  sourcemap: false,
  legalComments: 'none'
});

// Production files are content-hashed so a new HTML shell cannot load stale code.
const jsBuild = await build({
  entryPoints: {
    backend: 'src/backend-entry.js',
    storage: 'storage.js',
    app: 'app.js'
  },
  outdir: distAssets,
  entryNames: '[name]-[hash]',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  minify: true,
  sourcemap: false,
  legalComments: 'none',
  metafile: true
});

const cssBuild = await build({
  entryPoints: { styles: 'styles.css' },
  outdir: distAssets,
  entryNames: '[name]-[hash]',
  bundle: true,
  minify: true,
  metafile: true
});

function outputFor(metafile, entryPoint) {
  const found = Object.entries(metafile.outputs).find(([, value]) => value.entryPoint === entryPoint);
  if (!found) throw new Error(`No build output for ${entryPoint}`);
  return path.relative(dist, path.resolve(root, found[0])).replaceAll(path.sep, '/');
}

const output = {
  backend: outputFor(jsBuild.metafile, 'src/backend-entry.js'),
  storage: outputFor(jsBuild.metafile, 'storage.js'),
  app: outputFor(jsBuild.metafile, 'app.js'),
  styles: outputFor(cssBuild.metafile, 'styles.css')
};

let html = await readFile('index.html', 'utf8');
html = html
  .replace('href="styles.css"', `href="${output.styles}"`)
  .replace('src="backend.js"', `src="${output.backend}"`)
  .replace('src="storage.js"', `src="${output.storage}"`)
  .replace('src="app.js"', `src="${output.app}"`);
await writeFile(path.join(dist, 'index.html'), html);

await cp('assets', path.join(dist, 'assets'), { recursive: true });
await cp('docs', path.join(dist, 'docs'), { recursive: true });
for (const file of ['config.js', 'manifest.webmanifest']) await cp(file, path.join(dist, file));

const sourceWorker = await readFile('sw.js', 'utf8');
const shell = [
  './', './index.html', './config.js', `./${output.styles}`, `./${output.backend}`, `./${output.storage}`, `./${output.app}`,
  './manifest.webmanifest', './assets/favicon.svg', './assets/icon-192.png', './assets/icon-512.png', './assets/icon-maskable-512.png'
];
const version = createHash('sha256').update(JSON.stringify(shell)).digest('hex').slice(0, 16);
const productionWorker = sourceWorker
  .replace(/const VERSION = '[^']+';/, `const VERSION = '${version}';`)
  .replace(/const SHELL = \[[\s\S]*?\n\];/, `const SHELL = ${JSON.stringify(shell, null, 2)};`);
await writeFile(path.join(dist, 'sw.js'), productionWorker);

await import(`./generate-security-config.mjs?build=${Date.now()}`);
console.log(`production build: ${Object.values(output).join(', ')}`);
