// Lint rules that enforce plan §6A (coding conventions) for the whole backend.
import js from '@eslint/js';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX from 'eslint-plugin-import-x';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const UPPER_SNAKE = '/^[A-Z][A-Z0-9_]*$/';

// §6A.1 single-source declarations and §6A.3 "everything is a class".
const RESTRICTIONS = {
  enum: {
    selector: 'TSEnumDeclaration',
    message: 'Enums live only in enums/<name>.enum.ts (one enum per file).',
  },
  interface: {
    selector: 'TSInterfaceDeclaration[id.name!=/Options$/]',
    message: 'Shared interfaces live only in interfaces/<name>.interface.ts.',
  },
  typeAlias: {
    selector: 'ExportNamedDeclaration > TSTypeAliasDeclaration',
    message: 'Exported types live only in *.interface.ts, *.dto.ts or *.schema.ts files.',
  },
  constant: {
    selector: `ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name=${UPPER_SNAKE}]`,
    message: 'Constants live only in constants/<topic>.constant.ts.',
  },
  functionDeclaration: {
    selector: 'Program > FunctionDeclaration, ExportNamedDeclaration > FunctionDeclaration',
    message: 'Backend code is written in classes (plan §6A.3).',
  },
  // Max 3 parameters, except constructors (dependency injection) — plan §6A.2.
  tooManyParams: {
    selector:
      ':function[params.length>3]:not(MethodDefinition[kind="constructor"] > FunctionExpression)',
    message: 'Use at most 3 parameters; pass one options object instead.',
  },
  arrowFunction: {
    selector:
      'Program > VariableDeclaration > VariableDeclarator[init.type="ArrowFunctionExpression"], ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[init.type="ArrowFunctionExpression"]',
    message: 'Backend code is written in classes (plan §6A.3).',
  },
};

const restrictAllExcept = (...allowed) => [
  'error',
  ...Object.entries(RESTRICTIONS)
    .filter(([name]) => !allowed.includes(name))
    .map(([, restriction]) => restriction),
];

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/generated/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/*.js',
      '**/*.mjs',
      '**/vitest.config.ts',
      '**/vitest.int.config.ts',
      'vitest.shared.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: globals.node,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          project: '**/tsconfig.json',
          noWarnOnMultipleProjects: true,
        }),
      ],
    },
    rules: {
      'no-console': 'error',
      'no-restricted-syntax': restrictAllExcept(),
      'no-restricted-properties': [
        'error',
        { object: 'process', property: 'env', message: 'Read env only in the config module.' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/explicit-member-accessibility': 'error',
      // Plan §6A.3: fields → constructor → public → protected → private methods.
      '@typescript-eslint/member-ordering': [
        'error',
        {
          default: [
            'signature',
            'static-field',
            'instance-field',
            'constructor',
            'public-method',
            'protected-method',
            'private-method',
          ],
        },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/no-extraneous-class': [
        'error',
        { allowStaticOnly: true, allowWithDecorator: true },
      ],
      'import-x/no-cycle': 'error',
      'import-x/no-unresolved': 'off',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
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
  {
    files: ['**/*.dto.ts', '**/*.schema.ts'],
    rules: { 'no-restricted-syntax': restrictAllExcept('typeAlias') },
  },
  { files: ['**/*.constant.ts'], rules: { 'no-restricted-syntax': restrictAllExcept('constant') } },
  {
    files: ['**/main.ts', '**/openapi.ts', '**/decorators/**/*.ts'],
    rules: { 'no-restricted-syntax': restrictAllExcept('functionDeclaration', 'arrowFunction') },
  },
  { files: ['**/config/**/*.ts'], rules: { 'no-restricted-properties': 'off' } },
  {
    files: ['**/*.spec.ts', '**/*.int-spec.ts', '**/test/**/*.ts'],
    rules: {
      'no-restricted-syntax': 'off',
      'max-lines': 'off',
      'no-restricted-properties': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/unbound-method': 'off',
      // `expect.any()` matchers and supertest's `response.body` are typed as any by design.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
);
