# 02 — TypeScript & Language Rules

TypeScript is the only application language across backend, web, and mobile. No JavaScript
source files. No `.js` in `src/`.

---

## 1. Required compiler configuration

Every `tsconfig.json` must include **at minimum**:

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",     // backend: "node16" if not bundling
    "lib": ["ES2022"],                  // web/mobile add "DOM", "DOM.Iterable"

    /* Type safety — all mandatory, none may be relaxed */
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "useUnknownInCatchVariables": true,

    /* Interop */
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,

    /* Paths — see section 6 */
    "baseUrl": "./src",
    "paths": { /* per-layer, see below */ }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", ".next"]
}
```

`noUncheckedIndexedAccess` is the one people push back on. Keep it. It is the reason
`array[0]` is `T | undefined`, which is *true*, and it catches a whole class of production bugs.

---

## 2. `any` is banned

`@typescript-eslint/no-explicit-any` is `error`. There are exactly three escape hatches:

| Situation | Use |
|---|---|
| Value of genuinely unknown shape (network, JSON.parse) | `unknown` + Zod `.parse()` |
| Generic passthrough | a type parameter `<T>` |
| Third-party type is wrong | `// @ts-expect-error <reason + ticket>` on the single line |

`as any` never passes review. `as unknown as X` never passes review.

```ts
// bad
const data = await response.json();          // any
return data.map((item: any) => Article.parse(item));

// good
const raw: unknown = await response.json();
return ApiEnvelope(ArticleSchema.array()).parse(raw).data;
```

---

## 3. Types vs interfaces vs enums

| Use | For |
|---|---|
| `type` | unions, intersections, mapped/conditional types, function types, Zod inferences |
| `interface` | object shapes that a class implements, or that are meant to be extended (`IArticleRepository`) |
| `enum` | closed sets of string constants shared between layers (`Status`, `Category`, `Region`, `UserRole`) |

Use **string enums only**. Never numeric enums.

```ts
export enum Status {
  Draft = 'draft',
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}
```

Enums live in `src/types/` (frontend/mobile) or `src/types/` (backend) and are imported by
both the Zod schema and the domain code:

```ts
region: z.enum(Region)
```

---

## 4. Zod is the schema authority

Rules:

1. The Zod schema is written first; the TypeScript type is **inferred from it**, never
   hand-written alongside it.

   ```ts
   export const ArticleSchema = ArticleViewSchema.extend({
     publish_date: z.string().nullable(),
     created_at: z.string(),
     status: z.enum(Status),
   });
   export type Article = z.infer<typeof ArticleSchema>;
   ```

2. Schemas are named `<Thing>Schema`, types are named `<Thing>`.
3. Compose with `.extend()` / `.pick()` / `.omit()`. Do not copy-paste field lists.
4. Use `.parse()` at boundaries you control and want to fail loudly.
   Use `.safeParse()` where you must convert failure into a `Result` or a user message.
5. Coerce query params explicitly: `z.coerce.number().min(1).default(1)`.
6. Transforms belong in the schema, not in the consumer:

   ```ts
   image: z.string().transform((val): ImageFile => ({ previewUrl: val }))
   ```

---

## 5. Null, undefined, optionality

- `undefined` means "absent". `null` means "explicitly empty" (usually from the DB).
- API DTO fields that the DB can return as `NULL` are typed `.nullable()`, not `.optional()`.
- Optional function parameters are allowed up to **three**; beyond that use an options object.
- Never use `!` non-null assertion in application code. If you know it's non-null, prove it:


  ```ts
  // bad
  const first = list[0]!;

  // good
  const first = list[0];
  if (first === undefined) return err(ERRORS.RESOURCE_NOT_FOUND);
  ```

  The one permitted `!` is in `config/env.ts` **only after** a startup validation step
  (see [11-environment-and-configuration.md](11-environment-and-configuration.md)) — and even
  there, prefer the validated Zod object.

---

## 6. Module system & imports

- **ESM only.** `"type": "module"` in `package.json`.
- Import order, enforced by ESLint `import/order`:

  ```
  1. node: builtins
  2. external packages
  3. internal aliases (@/..., @utils/..., @features/...)
  4. relative parent (../)
  5. relative sibling (./)
  6. styles / assets
  ```

  One blank line between groups.

- **Path aliases are mandatory** for cross-folder imports. Relative imports are allowed only
  within the same folder (`./tag-badge`).

  Backend aliases:
  ```jsonc
  "@config/*":       ["config/*"],
  "@controller/*":   ["controller/*"],
  "@middleware/*":   ["middleware/*"],
  "@models/*":       ["models/*"],
  "@repositories/*": ["repositories/*"],
  "@routes/*":       ["routes/*"],
  "@services/*":     ["services/*"],
  "@types/*":        ["types/*"],
  "@utils/*":        ["utils/*"]
  ```

  Web / mobile alias: `"@/*": ["*"]` — a single alias, always `@/`.

- Aliases must be mirrored in **every** resolver: `tsconfig.json`, the test runner
  (`jest.config.mjs` `moduleNameMapper` / `vitest.config.ts` `resolve.alias`), the bundler,
  and ESLint. If you add an alias, add it in all four places in the same commit.

- **Never** import from another feature's internals. Cross-feature imports go through the
  feature's public surface (`@/features/article` → its `hooks/index.ts`, `services/index.ts`, `types.ts`).

---

## 7. Functions

- Async functions that can fail return `Promise<Result<T, RequestError>>` (backend) or throw a
  typed `RequestError` (frontend service layer — see `04-error-model.md`).
- Explicit return types on every exported function. Inference is fine for local closures.
- Max 3 positional params; use an object beyond that.
- Max ~50 lines. If longer, it's doing more than one thing.
- No default exports **except**: React page/screen components (framework requirement),
  Next.js route handlers, config files, and Express routers.

---

## 8. Immutability

- `const` by default. `let` only when reassignment is the clearest expression.
- Never mutate function parameters.
- Never mutate React state or TanStack Query cache data in place.
- Prefer `readonly` on interface properties that are conceptually immutable, and
  `readonly T[]` for arrays a function must not modify.

---

## 9. Banned constructs

| Banned | Use instead |
|---|---|
| `any`, `as any` | `unknown` + Zod |
| `!` non-null assertion | narrow explicitly |
| `@ts-ignore` | `@ts-expect-error` with a reason and ticket |
| `var` | `const` / `let` |
| `==` / `!=` | `===` / `!==` |
| numeric `enum` | string `enum` |
| `namespace` | ES modules |
| default-exported utilities | named exports |
| `console.*` | project logger |
| `Function`, `Object`, `{}` as types | precise types |
| `process.env.X` outside `config/env.ts` | import from `config/env.ts` |
| `new Date()` inside business logic | inject a clock, or take the timestamp as a parameter (testability) |

---

## 10. Node & package manager

- Node version is pinned by **both** `.nvmrc` and the `volta` block in `package.json`.
  Current standard: **Node 22 LTS**.
- `npm` with a committed `package-lock.json`. **Never** commit both `package-lock.json` and
  `yarn.lock` — pick npm and delete the other.
- CI installs with `npm ci`, never `npm install`.
- Dependency ranges: caret (`^`) for our own libs and well-behaved packages; exact pins for
  anything that has broken us before.
