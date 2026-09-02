# Frontend — 06 Forms & Validation

React Hook Form + Zod. One schema, reused for validation and types. Uncontrolled by default.

---

## 1. The pattern

```tsx
'use client';

const CreateArticleFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  content: z.string().min(50, 'Content must be at least 50 characters'),
  category: z.enum(Category, { message: 'Select a category' }),
  region: z.enum(Region, { message: 'Select a region' }),
  image: z.url('A cover image is required'),
  tags: z.array(z.string().min(1)).min(1, 'Add at least one tag').max(20, 'Too many tags'),
});

type CreateArticleFormValues = z.infer<typeof CreateArticleFormSchema>;

export function CreateArticleForm({ onCreated }: { onCreated?: (article: Article) => void }) {
  const { mutateAsync, isPending } = useCreateArticle();

  const form = useForm<CreateArticleFormValues>({
    resolver: zodResolver(CreateArticleFormSchema),
    defaultValues: { title: '', content: '', tags: [], image: '' },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const article = await mutateAsync(values);
      form.reset();
      onCreated?.(article);
    } catch (error) {
      applyServerErrors(form, error);
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter the headline" {...field} />
              </FormControl>
              <FormDescription>Shown on cards and search results.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Publishing…' : 'Publish'}
        </Button>
      </form>
    </Form>
  );
}
```

---

## 2. Rules

| # | Rule |
|---|---|
| F1 | **One Zod schema per form.** Types are inferred, never hand-written. |
| F2 | Reuse/compose the domain schema from `features/*/types.ts` with `.pick()` / `.extend()`. Do not redefine field rules. |
| F3 | `mode: 'onBlur'`, `reValidateMode: 'onChange'`. Validating on every keystroke before first blur is hostile. |
| F4 | `defaultValues` for **every** field — otherwise React logs the controlled/uncontrolled warning and reset misbehaves. |
| F5 | Uncontrolled inputs via `{...field}`. Don't mirror form values into `useState`. |
| F6 | `noValidate` on `<form>` so the browser's native bubbles don't compete with our messages. |
| F7 | Submit is disabled while `isPending`, and the label changes ("Publishing…"). |
| F8 | Never `disabled={!form.formState.isValid}` — it hides *why* the form can't submit. Let the user submit and show errors. |
| F9 | The form calls a mutation hook; it never calls a service directly. |
| F10 | Client validation is UX. The server re-validates everything. |

---

## 3. Error messages

Written for the user, in the schema:

```ts
z.string().min(1, 'Title is required')
z.string().email('Enter a valid email address')
z.string().min(12, 'Password must be at least 12 characters')
z.array(z.string()).min(1, 'Add at least one tag')
```

Rules: say what to do, not what's wrong ("Enter a valid email address", not "Invalid input").
Sentence case, no trailing period, never expose a field's internal name.

Cross-field rules use `.refine()` / `.superRefine()`, not an `if` in the submit handler:

```ts
const schema = z
  .object({ password: z.string().min(12), confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],       // attaches the error to the right field
  });
```

---

## 4. Server errors

Map the API's error code back onto a field where possible, otherwise show a form-level error.

```ts
function applyServerErrors<T extends FieldValues>(form: UseFormReturn<T>, error: unknown): void {
  if (!isRequestError(error)) {
    form.setError('root', { message: 'Something went wrong. Please try again.' });
    return;
  }

  const fieldForCode: Partial<Record<number, Path<T>>> = {
    [ERROR_CODES.AUTHOR_EMAIL_EXISTS]: 'email' as Path<T>,
    [ERROR_CODES.DUPLICATE_RESOURCE]: 'title' as Path<T>,
  };

  const field = fieldForCode[error.code];
  if (field) form.setError(field, { message: error.message });
  else form.setError('root', { message: error.message });
}
```

Render `form.formState.errors.root` above the submit button. Switch on `error.code` — never on
the message string.

---

## 5. Complex fields

### Select / enum

```tsx
<FormField
  control={form.control}
  name="category"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Category</FormLabel>
      <Select onValueChange={field.onChange} value={field.value}>
        <FormControl>
          <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
        </FormControl>
        <SelectContent>
          {Object.values(Category).map((c) => (
            <SelectItem key={c} value={c}>{formatCategory(c)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

Options come from the shared enum, never a hand-copied array.

### Image upload

Upload is a **separate** async step from form submission:

1. User picks a file.
2. Compress client-side (`browser-image-compression`) and show a local preview immediately.
3. Upload via the upload mutation; show progress.
4. On success, `form.setValue('image', url, { shouldValidate: true })`.
5. The form field holds the **URL**, not the `File`.

Validate type and size before uploading, and show the error inline. Never block the whole form
on an image upload — let the user keep typing.

### Arrays / tags

Use `useFieldArray` for repeated object rows. For a simple tag list, a controlled
`TagsInput` component with `field.value` / `field.onChange` is simpler and fine.

### Rich text / markdown

Load the editor with `next/dynamic({ ssr: false })` — these bundles are large and don't
server-render. Show a skeleton while it loads. Sanitise on render (`DOMPurify`), and disable
raw HTML in the markdown pipeline.

---

## 6. Multi-step forms

- One Zod schema per step; the full schema is the intersection.
- Step state lives in the URL (`?step=2`) so refresh and back work.
- Validate the current step before advancing (`form.trigger(['fieldA','fieldB'])`).
- Draft persistence, if required, is an explicit "save draft" call to the API — not
  `localStorage`.

---

## 7. Accessibility

shadcn's `Form` components wire most of this, but verify:

- Every input has a `<FormLabel>` associated via `htmlFor`/`id`.
- Errors are linked with `aria-describedby` and announced (`role="alert"`).
- Invalid inputs get `aria-invalid="true"`.
- On submit failure, focus moves to the first invalid field.
- Required fields are marked in the label, not by placeholder text.
- **Placeholder is never a label** — it disappears on focus.
- The whole form is completable by keyboard, in a sensible tab order.
- `autoComplete` set correctly (`email`, `current-password`, `new-password`, `name`).

---

## 8. Testing forms

```tsx
it('shows a validation error when the title is empty', async () => {
  const user = userEvent.setup();
  render(<CreateArticleForm />);

  await user.click(screen.getByRole('button', { name: /publish/i }));

  expect(await screen.findByText('Title is required')).toBeInTheDocument();
});

it('submits the entered values', async () => {
  const user = userEvent.setup();
  render(<CreateArticleForm />);

  await user.type(screen.getByLabelText(/title/i), 'A headline');
  await user.type(screen.getByLabelText(/content/i), 'x'.repeat(60));
  await user.click(screen.getByRole('button', { name: /publish/i }));

  await waitFor(() => expect(screen.getByRole('button', { name: /publishing/i })).toBeDisabled());
});
```

Query by **role and accessible name** — that tests the a11y wiring at the same time. Never
query by `data-testid` when a role query is possible.

Cover: each validation rule, successful submit, server-error mapping, pending state, and
reset-after-success.

---

## 9. Checklist

- [ ] One Zod schema, composed from the domain schema; types inferred.
- [ ] `defaultValues` for every field; `mode: 'onBlur'`.
- [ ] Uncontrolled inputs; no `useState` mirroring form values.
- [ ] Cross-field rules in `.refine()` with a `path`.
- [ ] Submit disabled only while pending; never gated on `isValid`.
- [ ] Server errors mapped by code onto fields or `root`.
- [ ] Labels present; placeholders are not labels; `autoComplete` set.
- [ ] Errors announced and linked with `aria-describedby`.
- [ ] Image upload is decoupled from submit; the field holds a URL.
- [ ] Tests query by role/label and cover every validation rule.
