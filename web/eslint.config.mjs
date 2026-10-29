import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FlatCompat } from '@eslint/eslintrc';

// ESLint 9 flat config. FlatCompat loads Next's presets, which are still published in the
// legacy format; the rules below are carried over unchanged from the old .eslintrc.json.
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const DIRECT_DB_MESSAGE = 'The web app must read data through the backend API, never PostgreSQL directly.';
const SUPABASE_MESSAGE = 'The web app must read data through the backend API, never Supabase directly.';

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'pg', message: DIRECT_DB_MESSAGE },
            { name: 'postgres', message: DIRECT_DB_MESSAGE },
            { name: '@supabase/supabase-js', message: SUPABASE_MESSAGE },
          ],
          patterns: [{ group: ['@supabase/*'], message: SUPABASE_MESSAGE }],
        },
      ],
    },
  },
];

export default config;
