import js from '@eslint/js';

const browserGlobals = Object.fromEntries([
  'window','document','navigator','location','history','localStorage','sessionStorage','crypto','fetch','Headers','Response','Request','URL','URLSearchParams','AbortController','TextEncoder','TextDecoder','structuredClone','BroadcastChannel','FormData','HTMLElement','Option','Blob','FileReader','matchMedia','setTimeout','clearTimeout','setInterval','clearInterval','console'
].map(name => [name, 'readonly']));
const nodeGlobals = Object.fromEntries('process,Buffer,console,setTimeout,clearTimeout,URL,Response,Headers,AbortController'.split(',').map(name => [name, 'readonly']));

export default [
  { ignores: ['node_modules/**', 'dist/**'] },
  js.configs.recommended,
  {
    files: ['*.js', 'src/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: browserGlobals },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'warn'
    }
  },
  {
    files: ['scripts/**/*.mjs', 'tests/**/*.{js,mjs}'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...nodeGlobals, ...browserGlobals } },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }], 'no-console': 'off' }
  }
];
