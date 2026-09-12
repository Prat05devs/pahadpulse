const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'expo-env.d.ts'],
  },
  {
    rules: {
      // The house rule: no stray logging in committed code. `warn`/`error` stay available
      // because a genuine failure should still reach a crash reporter's breadcrumbs.
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Features talk to each other through their public surface only. Reaching into
              // another feature's components is what turns a slice into a tangle.
              group: ['@/features/*/components/*', '@/features/*/components'],
              message:
                'Import a feature through its index (hooks/services/schemas), never its components.',
            },
            {
              group: ['../../*'],
              message: 'Use the @/ alias instead of climbing out of a folder.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          // Env vars are read once, validated once, in src/config/env.ts.
          selector:
            "MemberExpression[object.object.name='process'][object.property.name='env']",
          message: 'Read configuration from @/config/env, not process.env directly.',
        },
      ],
    },
  },
  {
    // The one place that is allowed to read process.env.
    files: ['src/config/env.ts', 'app.config.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    /**
     * Test setup sets the env vars the app validates at import time, and Jest's module
     * mocks are hoisted above imports so they have to use `require`. Both are the supported
     * way to do these things, not a workaround.
     */
    files: ['src/test/**', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      'no-restricted-syntax': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
