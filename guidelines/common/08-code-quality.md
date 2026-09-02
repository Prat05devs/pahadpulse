# 08 — Code Quality

What "done" means, mechanically. These are the rules a reviewer (human or agent) checks.

---

## 1. Definition of Done

A task is done when **all** of the following are true:

- [ ] Implements exactly what was asked — no more, no less.
- [ ] `npm run typecheck` passes with zero errors.
- [ ] `npm run lint` passes with zero errors **and zero warnings**.
- [ ] `npm run format:check` passes.
- [ ] `npm test` passes; new code meets the coverage bar in [09-testing-strategy.md](09-testing-strategy.md).
- [ ] Every new error path has a registry code and a test.
- [ ] No `any`, no `!`, no `@ts-ignore`, no `console.*`, no commented-out code, no TODO without a ticket.
- [ ] Public functions have explicit return types.
- [ ] The spec/plan is updated if implementation changed the design.
- [ ] Self-reviewed against the relevant layer checklist.

---

## 2. Complexity limits

Enforced by ESLint where possible; otherwise by review.

| Metric | Limit |
|---|---|
| Function length | 50 lines |
| File length | 400 lines (components 250) |
| Cyclomatic complexity | 10 |
| Nesting depth | 3 |
| Function parameters | 3 (then use an options object) |
| React component props | 7 (then split the component or group props) |
| `useEffect` per component | 2 (more means the component is doing too much) |

Exceeding a limit is not automatically wrong, but it requires a reviewer to agree in the PR.
Router files and the `ERRORS` registry are exempt from file length.

---

## 3. ESLint configuration (baseline)

Shared rules that every project's `eslint.config.mjs` must include. **These are `error`, not
`warn`, and may not be turned off in a feature PR.**

```js
rules: {
  // Type safety
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-unsafe-assignment': 'error',
  '@typescript-eslint/no-unsafe-member-access': 'error',
  '@typescript-eslint/no-unsafe-call': 'error',
  '@typescript-eslint/no-unsafe-return': 'error',
  '@typescript-eslint/no-unsafe-argument': 'error',
  '@typescript-eslint/no-non-null-assertion': 'error',
  '@typescript-eslint/explicit-module-boundary-types': 'error',
  '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/await-thenable': 'error',
  '@typescript-eslint/no-misused-promises': 'error',
  '@typescript-eslint/switch-exhaustiveness-check': 'error',
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  '@typescript-eslint/require-await': 'error',
  '@typescript-eslint/prefer-nullish-coalescing': 'error',
  '@typescript-eslint/prefer-optional-chain': 'error',

  // Hygiene
  'no-console': 'error',
  'no-debugger': 'error',
  'eqeqeq': ['error', 'always'],
  'prefer-const': 'error',
  'no-var': 'error',
  'no-param-reassign': 'error',
  'no-return-await': 'error',
  'complexity': ['error', 10],
  'max-depth': ['error', 3],
  'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],

  // Imports
  'import/order': ['error', {
    groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
    'newlines-between': 'always',
    alphabetize: { order: 'asc', caseInsensitive: true },
  }],
  'import/no-cycle': 'error',
  'import/no-default-export': 'error',   // web/mobile: off for app/ and pages/ and *.stories.tsx
}
```

Requires type-aware linting:

```js
languageOptions: {
  parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
}
```

**Layer boundary enforcement** — add `import/no-restricted-paths` so the architecture is
checked by a machine, not by memory:

```js
'import/no-restricted-paths': ['error', {
  zones: [
    { target: './src/repositories', from: './src/routes',       message: 'repositories must not import routes' },
    { target: './src/repositories', from: './src/controllers',  message: 'repositories must not import controllers' },
    { target: './src/repositories', from: './src/middleware',   message: 'repositories must not import middleware' },
    { target: './src/controllers',  from: './src/routes',       message: 'controllers must not import routes' },
    { target: './src/models',       from: './src/repositories', message: 'models are leaf modules' },
  ],
}],
```

> The reference repos disable `no-explicit-any` and `no-unused-vars`. That is the single
> highest-leverage thing to reverse in a new project. Turn them on at project start, when the
> cost is zero.

### Per-directory relaxations (the only allowed ones)

| Path | Relaxation |
|---|---|
| `**/*.test.ts(x)`, `**/*.stories.tsx`, `src/test/**` | `max-lines-per-function`, `import/no-default-export`, `no-unsafe-*` off |
| `src/app/**`, `app/**` (Next.js / Expo Router) | `import/no-default-export` off |
| `scripts/**` | `no-console` off |

---

## 4. Prettier

One config, all repos. Formatting is never discussed in review.

```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "trailingComma": "all",
  "bracketSpacing": true,
  "arrowParens": "always",
  "jsxSingleQuote": false,
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

Only one config file — delete `.prettierrc.json` if `.prettierrc` exists (the frontend
reference has both).

---

## 5. Git hooks

`husky` + `lint-staged`, installed via `npm run prepare`.

```jsonc
// package.json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --max-warnings=0 --fix", "prettier --write"],
  "*.{json,md,css}": ["prettier --write"]
}
```

Hooks:

| Hook | Runs |
|---|---|
| `pre-commit` | `lint-staged`, `gitleaks protect --staged` |
| `commit-msg` | `commitlint` (Conventional Commits) |
| `pre-push` | `npm run typecheck && npm test -- --changed` |

`--no-verify` is not an accepted way to land code.

---

## 6. CI gates

Every PR must pass, in this order (fail fast):

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint -- --max-warnings=0`
4. `npm run format:check`
5. `npm test -- --coverage`
6. `npm run build`
7. `npm audit --omit=dev --audit-level=high`
8. Coverage threshold check
9. (web) `npm run build-storybook` + `npm run e2e`

`main` is protected: no direct pushes, linear history, required checks, ≥ 1 approval.

---

## 7. Pull requests

- **Small.** Target < 400 changed lines. A PR that touches three layers should usually be three PRs.
- **One concern.** No drive-by refactors mixed with a feature.
- Description uses the template: what, why, linked ticket, how tested, screenshots for UI,
  migration/rollback notes.
- Author self-reviews the diff before requesting review.
- Reviewer responds within one working day.

### Review comment taxonomy

| Prefix | Meaning |
|---|---|
| `blocking:` | must change before merge |
| `question:` | need understanding before approving |
| `nit:` | optional, author decides |
| `praise:` | say this more often |

---

## 8. Anti-patterns that are automatic blocking comments

| Anti-pattern | Why |
|---|---|
| `catch (e) { console.log(e) }` | swallows the failure |
| `catch` that rewraps a typed error into a generic one | loses the error code |
| `any`, `as any`, `as unknown as X` | defeats the whole point of TS |
| Business logic inside a route handler | wrong layer |
| SQL inside a controller | wrong layer |
| `fetch()` inside a React component | wrong layer — use a service + hook |
| Duplicated Zod schema for the same entity | one schema, compose it |
| A hook that renders, or a component that fetches directly | mixed responsibilities |
| `useEffect` used to derive state | compute during render or `useMemo` |
| Magic number / magic string | named constant |
| Commented-out code | git remembers |
| A new top-level folder | violates the structure guideline |
| Copying a file and editing it ("v2") | fix the original |
| Disabling a lint rule inline without a reason comment + ticket | fix the code |

---

## 9. Refactoring rules

- Refactors are their **own** PR, with no behaviour change, and existing tests must pass unedited.
- If a test has to change, it is not a refactor — it is a behaviour change; say so.
- Large restructures are logged in the affected module's doc.
- Deleting code is a valid, encouraged PR type.
