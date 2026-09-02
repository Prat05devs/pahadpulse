# Mobile — 04 UI & Design System

NativeWind 4 + `react-native-reusables` (shadcn for React Native). Same tokens, same component
names, same variant vocabulary as the web app.

---

## 1. Shared tokens

The token values are **copied verbatim from the web app's `globals.css`** so brand colours
never drift between platforms.

```css
/* global.css — imported once in app/_layout.tsx */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --primary: 212 72% 42%;
    --primary-foreground: 0 0% 98%;
    --secondary: 123 46% 34%;
    --muted: 0 0% 96%;
    --muted-foreground: 0 0% 45%;
    --destructive: 0 84% 60%;
    --border: 0 0% 90%;
    --radius: 0.625rem;
  }
  .dark {
    --background: 0 0% 4%;
    --foreground: 0 0% 98%;
    /* every token redefined */
  }
}
```

```js
// tailwind.config.js — NativeWind still needs the JS config
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        destructive: 'hsl(var(--destructive))',
        border: 'hsl(var(--border))',
      },
    },
  },
};
```

**No hardcoded colours in components.** `bg-primary`, never `#1565C0`. Same blocking rule as web.

> NativeWind uses `hsl(var(--x))` rather than the web's `oklch`. Keep a single source
> spreadsheet of brand colours and generate both — or when the monorepo exists, generate both
> files from one token file.

---

## 2. Component tiers — identical to web

```
components/ui/          react-native-reusables primitives (Button, Input, Dialog, Select…)
components/molecules/   shared compositions (Header, EmptyState, ErrorState, Badge)
features/*/components/  domain UI + screens
```

Same names as the web app wherever the concept exists. A `Button` with `variant="destructive"`
`size="sm"` means the same thing on both platforms — that is what makes cross-platform review
possible.

---

## 3. Variants with `cva`

```tsx
const buttonVariants = cva('flex-row items-center justify-center rounded-md active:opacity-80', {
  variants: {
    variant: {
      default: 'bg-primary',
      destructive: 'bg-destructive',
      outline: 'border border-border bg-background',
      ghost: 'bg-transparent',
    },
    size: { sm: 'h-9 px-3', default: 'h-11 px-4', lg: 'h-12 px-6', icon: 'h-11 w-11' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});
```

Note the sizes: minimum **44 px** touch height on mobile (`h-11`), not the web's 36 px. This is
a platform requirement, not a preference.

Text colour cannot be inherited in React Native — style the `<Text>` explicitly:

```tsx
<Pressable className={cn(buttonVariants({ variant, size }), className)}>
  <Text className={cn(buttonTextVariants({ variant }))}>{children}</Text>
</Pressable>
```

---

## 4. NativeWind gotchas

| Web behaviour | React Native reality |
|---|---|
| Text styles inherit from a parent `div` | **They don't.** Style every `<Text>`. |
| `display: block/flex` | everything is flex; `flexDirection` defaults to `column`, not `row` |
| `gap` | supported, but verify on your RN version |
| `:hover` | no hover; use `active:` |
| `position: fixed` | doesn't exist; use `absolute` inside a `SafeAreaView` |
| percentage sizing | works, but layout depends on parent flex |
| `overflow: hidden` on Android | clips shadows; test both platforms |
| `box-shadow` | `shadow-*` on iOS, `elevation` on Android — use `Platform.select` |
| arbitrary values `w-[13px]` | works, but discouraged as on web |

`flex-1` is the workhorse. A screen that "isn't showing anything" is almost always a missing
`flex-1` on a parent.

---

## 5. Typography

| Role | Classes |
|---|---|
| Screen title | `text-2xl font-bold text-foreground` |
| Section title | `text-lg font-semibold text-foreground` |
| Card title | `text-base font-semibold text-foreground` |
| Body | `text-base text-foreground leading-6` |
| Meta | `text-xs text-muted-foreground` |

Fonts load with `expo-font` in the root layout; the splash screen stays visible until they're
ready, or text flashes in the system font.

Respect OS font scaling — never fix the height of a text container. Test at 200% text size.

---

## 6. Layout primitives

```tsx
<SafeAreaView edges={['top']} className="flex-1 bg-background">
  <View className="flex-1 px-4">
    <View className="flex-row items-center justify-between py-3">
      …
    </View>
  </View>
</SafeAreaView>
```

| Need | Approach |
|---|---|
| Fill the screen | `flex-1` on every ancestor down the chain |
| Row | `flex-row items-center` |
| Spacing between children | `gap-*`, or `space-y-*` where supported |
| Screen padding | `px-4` |
| Safe area | `SafeAreaView` with explicit `edges` |
| Sticky header | Stack `headerShown` + `Stack.Screen options` |
| Bottom action bar | absolute + `pb-safe`, above the home indicator |

---

## 7. Interaction states

No hover on mobile. The states that exist:

```tsx
<Pressable className="active:opacity-80 disabled:opacity-50" android_ripple={{ borderless: false }}>
```

- Press feedback is **mandatory** — opacity, scale, or Android ripple. A control with no press
  feedback feels broken.
- Haptics (`expo-haptics`) on destructive confirmations and successful submissions. Sparingly.
- Disabled state visibly distinct and non-interactive.
- Loading: replace the button label with a spinner **and** disable it.

---

## 8. Loading, empty, error, offline

| State | Component |
|---|---|
| Loading | skeleton matching the real layout (not a centred spinner) |
| Empty | `<EmptyState icon title description action />` |
| Error | `<ErrorState error onRetry />` |
| **Offline** | `<OfflineState onRetry />` + a persistent banner when cached data is shown |
| Refreshing | `RefreshControl` |
| Loading more | footer `ActivityIndicator` |

The offline state is the one that doesn't exist on web, and it is the one users hit most.

---

## 9. Images

```tsx
<Image
  source={{ uri: article.image }}
  style={{ width: '100%', aspectRatio: 16 / 9 }}
  contentFit="cover"
  transition={200}
  placeholder={blurhash}
  cachePolicy="memory-disk"
  accessibilityIgnoresInvertColors
/>
```

- `expo-image` always — it has caching, transitions, and blurhash placeholders that RN's
  built-in `Image` lacks.
- Explicit dimensions or `aspectRatio`; never an unsized image in a flex container.
- `cachePolicy="memory-disk"` for remote images.
- Request an appropriately-sized image from the server; don't download a 4000px original for a
  96px thumbnail.

---

## 10. Dark mode

```tsx
// app/_layout.tsx
const { colorScheme } = useColorScheme();   // nativewind

<ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
  <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
  <Stack />
</ThemeProvider>
```

Follow the system theme by default; offer an override in settings. **Every token defined in
`:root` must exist in `.dark`.** Check the status bar, the navigation bar, splash, and app icon
backgrounds — these are easy to miss and look broken when wrong.

---

## 11. Checklist

- [ ] Tokens match the web app exactly; every `:root` token has a `.dark` counterpart.
- [ ] No hardcoded colours.
- [ ] Component names and variants mirror the web app.
- [ ] Touch targets ≥ 44 px.
- [ ] Every `<Text>` styled explicitly; `numberOfLines` where content can overflow.
- [ ] `flex-1` chain correct on every full-screen view.
- [ ] Press feedback on every interactive element.
- [ ] `SafeAreaView` with explicit edges; keyboard handled.
- [ ] Loading / empty / error / **offline** states all implemented.
- [ ] `expo-image` with explicit sizing and a cache policy.
- [ ] Verified on iOS and Android, light and dark, at 200% font scale.
