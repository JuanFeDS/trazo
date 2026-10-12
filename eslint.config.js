import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Carpetas: cualquier archivo dentro pertenece al elemento. Archivos sueltos: coincidencia exacta.
const elements = [
  { type: 'core-domain', pattern: 'packages/core/src/domain' },
  { type: 'core-schema', pattern: 'packages/core/src/schema' },
  { type: 'core-ports', pattern: 'packages/core/src/ports' },
  { type: 'core-application', pattern: 'packages/core/src/application' },
  { type: 'core-index', pattern: 'packages/core/src/index.ts', partialMatch: false },
  { type: 'web-ui', pattern: 'apps/web/src/ui' },
  { type: 'web-state', pattern: 'apps/web/src/state' },
  { type: 'web-adapters', pattern: 'apps/web/src/adapters' },
  { type: 'web-shared', pattern: 'apps/web/src/{geometry,nodeSizes}.ts', partialMatch: false },
  { type: 'web-main', pattern: 'apps/web/src/main.tsx', partialMatch: false },
];

// Regla de dependencias del RFC-004 §5.1: ui → application → domain; los adaptadores implementan
// puertos y solo se conectan en main.tsx.
const allowOnly = (from, ...targets) => ({
  from: { element: { type: from } },
  allow: { to: { element: { types: { anyOf: [from, ...targets] } } } },
});

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '.claude/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['packages/core/src/**/*.ts', 'apps/web/src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { alwaysTryTypes: true } },
      'boundaries/elements': elements,
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            allowOnly('core-domain'),
            allowOnly('core-schema', 'core-domain'),
            allowOnly('core-ports', 'core-domain'),
            allowOnly('core-application', 'core-domain', 'core-ports', 'core-schema'),
            allowOnly('core-index', 'core-domain', 'core-schema', 'core-ports', 'core-application'),
            allowOnly('web-state'),
            allowOnly('web-ui', 'web-state', 'web-shared'),
            allowOnly('web-adapters', 'web-shared'),
            allowOnly('web-shared'),
            allowOnly('web-main', 'web-ui', 'web-adapters'),
          ],
        },
      ],
    },
  },
  {
    // El núcleo no conoce la interfaz, el lienzo ni el navegador: así se puede reutilizar en Node.
    files: ['packages/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-dom', 'react/*', '@xyflow/*', 'zustand', 'elkjs', 'elkjs/*'], message: 'El núcleo no puede depender de la interfaz ni del lienzo.' },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...['window', 'document', 'localStorage', 'indexedDB', 'navigator'].map((name) => ({
          name,
          message: 'El núcleo no puede usar APIs del navegador.',
        })),
      ],
    },
  },
);
