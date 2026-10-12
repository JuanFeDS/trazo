import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// El plugin clasifica carpetas, no archivos sueltos: un archivo fuera de una carpeta de elemento
// se escapa de la regla sin avisar. Por eso la API pública del núcleo vive en `api/` y la web en
// `shared/` y `app/`, en vez de archivos sueltos.
const elements = [
  { type: 'core-domain', pattern: 'packages/core/src/domain' },
  { type: 'core-schema', pattern: 'packages/core/src/schema' },
  { type: 'core-ports', pattern: 'packages/core/src/ports' },
  { type: 'core-application', pattern: 'packages/core/src/application' },
  { type: 'core-api', pattern: 'packages/core/src/api' },
  { type: 'web-ui', pattern: 'apps/web/src/ui' },
  { type: 'web-state', pattern: 'apps/web/src/state' },
  { type: 'web-adapters', pattern: 'apps/web/src/adapters' },
  { type: 'web-shared', pattern: 'apps/web/src/shared' },
  { type: 'web-main', pattern: 'apps/web/src/app' },
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
            allowOnly('core-api', 'core-domain', 'core-schema', 'core-ports', 'core-application'),
            // Todo el código de la web consume el núcleo solo por su API pública (`@trazo/core`).
            allowOnly('web-state', 'core-api'),
            allowOnly('web-ui', 'web-state', 'web-shared', 'core-api'),
            allowOnly('web-adapters', 'web-shared', 'core-api'),
            allowOnly('web-shared', 'core-api'),
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
