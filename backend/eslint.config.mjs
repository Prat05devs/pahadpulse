import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      'no-console': 'off',
      eqeqeq: ['error', 'always'],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message: 'Import configuration from src/config/env.ts instead.',
        },
      ],
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // Relaxed strict rules for ease of development:
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
    },
  },
  {
    // env.ts is the one place process.env and console are permitted in app code;
    // jest.setup.mjs is its test-environment equivalent.
    files: ['src/config/env.ts', 'jest.setup.mjs'],
    rules: { 'no-console': 'off', 'no-restricted-syntax': 'off' },
  },
  {
    files: ['**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
    rules: { ...tseslint.configs.disableTypeChecked.rules, 'no-undef': 'off' },
  },
  {
    files: ['**/*.test.ts', 'src/__tests__/**/*.ts', 'scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
      // Known false positive: `expect(mockRepo.method)` is the idiomatic jest assertion,
      // and the rule cannot tell a passed-around unbound method from a mock reference.
      // typescript-eslint documents disabling it for jest and using the plugin's version.
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },
);
