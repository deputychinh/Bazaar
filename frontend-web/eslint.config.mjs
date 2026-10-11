// Lint rules that enforce plan §6A (coding conventions) for the customer site.
import js from '@eslint/js';
import eslintReact from '@eslint-react/eslint-plugin';
import nextPlugin from '@next/eslint-plugin-next';
import { defineConfig, globalIgnores } from 'eslint/config';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y-x';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const UPPER_SNAKE = '/^[A-Z][A-Z0-9_]*$/';

// §6A.1 single-source declarations and §6A.4 "arrow functions only, no classes".
const RESTRICTIONS = {
  class: {
    selector: 'ClassDeclaration, ClassExpression',
    message: 'Frontend code has no classes (plan §6A.4).',
  },
  functionExpression: {
    selector: 'VariableDeclarator > FunctionExpression',
    message: 'Use an arrow function (plan §6A.4).',
  },
  enum: {
    selector: 'TSEnumDeclaration',
    message: 'Enums live only in enums/<name>.enum.ts (one enum per file).',
  },
  interface: {
    selector: 'TSInterfaceDeclaration[id.name!=/Props$/]',
    message: 'Shared interfaces live only in interfaces/<name>.interface.ts.',
  },
  typeAlias: {
    selector: 'ExportNamedDeclaration > TSTypeAliasDeclaration',
    message: 'Exported types live only in *.interface.ts files.',
  },
  constant: {
    selector: `ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name=${UPPER_SNAKE}]`,
    message: 'Constants live only in constants/<topic>.constant.ts.',
  },
  tooManyParams: {
    selector: ':function[params.length>3]',
    message: 'Use at most 3 parameters; pass one options object instead.',
  },
};

const restrictAllExcept = (...allowed) => [
  'error',
  ...Object.entries(RESTRICTIONS)
    .filter(([name]) => !allowed.includes(name))
    .map(([, restriction]) => restriction),
];

export default defineConfig(
  globalIgnores([
    '.next/**',
    'coverage/**',
    'node_modules/**',
    'next-env.d.ts',
    'src/api/*.schema.ts',
    '**/*.mjs',
  ]),
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  eslintReact.configs['recommended-type-checked'],
  reactHooks.configs.flat.recommended,
  jsxA11y.configs.recommended,
  {
    plugins: { '@next/next': nextPlugin },
    rules: nextPlugin.configs['core-web-vitals'].rules,
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver({ project: './tsconfig.json' })],
    },
    rules: {
      'func-style': ['error', 'expression'],
      'prefer-arrow-callback': 'error',
      'no-console': 'error',
      'no-restricted-syntax': restrictAllExcept(),
      'no-restricted-properties': [
        'error',
        { object: 'process', property: 'env', message: 'Read env only in src/config.' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['../../*'], message: 'Use the @/ alias instead of deep relatives.' },
          ],
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-imports': 'error',
      'import-x/no-cycle': 'error',
      'import-x/no-unresolved': 'off',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  { files: ['**/*.enum.ts'], rules: { 'no-restricted-syntax': restrictAllExcept('enum') } },
  {
    files: ['**/*.interface.ts'],
    rules: { 'no-restricted-syntax': restrictAllExcept('interface', 'typeAlias') },
  },
  { files: ['**/*.constant.ts'], rules: { 'no-restricted-syntax': restrictAllExcept('constant') } },
  { files: ['src/config/**/*.ts'], rules: { 'no-restricted-properties': 'off' } },
  {
    files: ['**/*.test.{ts,tsx}', 'vitest.*.ts'],
    rules: {
      'max-lines': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
