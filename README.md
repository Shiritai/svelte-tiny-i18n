# svelte-tiny-i18n

[![NPM Version](https://img.shields.io/npm/v/svelte-tiny-i18n)](https://www.npmjs.com/package/svelte-tiny-i18n)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/svelte-tiny-i18n)](https://bundlephobia.com/package/svelte-tiny-i18n)

( English | [繁體中文](./README.zh_tw.md) )

`svelte-tiny-i18n` is a lightweight, type-safe, and reactive i18n (internationalization) library for [Svelte](https://svelte.dev/) and [SvelteKit](https://kit.svelte.dev/), built entirely on Svelte Stores.

> **💡 Check out the [Examples Directory](./examples/README.md) for executable demos of all Type-Safety patterns!**

## TL;DR

`svelte-tiny-i18n` is for developers who value **extreme lightweightness, zero dependencies, and zero build-time configuration**, while still enjoying **Svelte store reactivity and instant TypeScript inference**.

Its key advantage: **Hybrid Type Safety**.

1. **Config Inference**: For static translations, keys are inferred automatically.
2. **Global Augmentation**: For dynamic loading, simply point to your files in a `d.ts`, and types work globally.
3. **Zero-Config Scope**: Or, just get a typed store back from `extendTranslations`.

## Quick Start

### 1. Create the i18n Instance

```ts
// /src/lib/i18n.ts
import { createI18nStore, defineI18nConfig } from 'svelte-tiny-i18n';

const i18nConfig = defineI18nConfig({
    supportedLocales: ['en', 'es', 'zh-TW'],
    defaultLocale: 'en',
    localStorageKey: 'my-app-language',

    // (Optional) Custom Error Handler
    // e.g., send to Sentry in production
    onError: (err) => {
        console.error('i18n error:', err.type, err.key);
    },

    // 1. Nested JSON is fully supported
    // 2. TypeScript infers these keys automatically!
    initialTranslations: [
        {
            hello: { en: 'Hello', 'zh-TW': '你好' },
            home: {
                title: { en: 'Home Page' },
                btn: { en: 'Click Me' }
            }
        }
    ]
});

export const i18n = createI18nStore(i18nConfig);
```

### 2. Use in Svelte Components

```svelte
<script lang="ts">
    import { i18n } from '$lib/i18n';
    const { t, locale, setLocale } = i18n;
</script>

<h1>{$t('hello')}</h1>
<p>{$t('home.title')}</p>

<button on:click={() => setLocale('zh-TW')}> 中文 </button>
```

## Advanced Usage: Dynamic Loading & Types

`svelte-tiny-i18n` offers two powerful strategies for handling types when you load translations dynamically (e.g., using `extendTranslations`).

### Strategy A: Global Augmentation (Recommended)

Keep your `$t` global, but automate the types using TypeScript's `typeof import`.

1. Create `src/i18n.d.ts`:

    ```ts
    import 'svelte-tiny-i18n';

    declare module 'svelte-tiny-i18n' {
        export interface TinyI18nTranslations {
            // Simply point to your translation files!
            profile: typeof import('./locales/profile.json');
            dashboard: typeof import('./features/dashboard/locales').default;
        }
    }
    ```

2. Now `$t('profile.name')` is typed everywhere, even before you load it!

### Strategy B: Zero-Config (Local Scope)

Don't want to touch `d.ts`? No problem. `extendTranslations` returns a store typed specifically for the new content.

```ts
// /src/routes/profile/+page.svelte
import { profileTranslations } from './locales';

// The returned 't' knows about 'profile.*' keys immediately
const { t } = i18n.extendTranslations([profileTranslations]);

$t('profile.title'); // ✅ Typed!
```

See [**Example 2: Global Augmentation**](./examples/2-global-augmentation.ts) and [**Example 3: Zero-Config**](./examples/3-zero-config.ts) for full code.

## Comparison with Other Libraries

| Dimension            | `svelte-tiny-i18n` (This)                                                    | `typesafe-i18n`                                                         | `svelte-i18n`                                              |
| :------------------- | :--------------------------------------------------------------------------- | :---------------------------------------------------------------------- | :--------------------------------------------------------- |
| **Bundle Size**      | **Tiny (<1kb)**                                                              | **Tiny (~1kb)**                                                         | **Medium (~15kb+)**                                        |
| **Core Mechanism**   | Zero-dependency Svelte Stores + Simple String Replace                        | **Build-time Generator**                                                | **Runtime ICU Parser**                                     |
| **Type Safety**      | **Hybrid (Inference + Augmentation)**                                        | **Very High (Code-Gen)**                                                | Medium (Manual setup)                                      |
| **Setup Complexity** | **Very Low** (Single config file)                                            | Medium (Requires generator setup)                                       | Low (Install and use)                                      |
| **Adv. Formatting**  | Simple `{var}` replacement only                                              | **Yes** (Plurals, Dates, Numbers)                                       | **Yes (Full ICU Support)**                                 |
| **Key Trade-Off**    | Trades ICU features for **extreme lightness** & **zero-config type safety**. | Trades setup simplicity for the **strongest type safety** (incl. args). | Trades bundle size for the **most powerful ICU features**. |

### Philosophy Comparison

- **If you need advanced formatting** (complex plurals, date/number localization) and don't mind a larger bundle size, **`svelte-i18n`** is a great choice.
- **If you need _absolute_ type safety** (including for translation arguments) and are willing to set up a code generator, **`typesafe-i18n`** is excellent.
- **`svelte-tiny-i18n`** is the ideal choice if you prioritize **simplicity**, **minimal bundle size**, and **effortless type safety** without a build step.

## FAQ / Recipes

### Q: How do I use this in a Svelte (Vite) project _without_ SvelteKit?

A: It's even simpler. You don't need the `+layout.ts` or the `i18n.setLocale()` step.
The store will automatically initialize its language in the browser by checking `localStorage` and `navigator.language`. You can change the language at any time by simply calling `i18n.setLocale('new_lang')` in your components.

### Q: How do I dynamically update the `<html>` `lang` attribute or handle RTL (Right-to-Left) languages?

A: This library is "headless," so it doesn't modify the DOM for you. You can easily manage this yourself by subscribing to the `locale` store in your root layout component.

```svelte
<script lang="ts">
    import { i18n } from '$lib/i18n';
    const { locale } = i18n;

    const rtlLocales: string[] = ['ar', 'he'];

    $: if (typeof document !== 'undefined') {
        const direction = rtlLocales.includes($locale) ? 'rtl' : 'ltr';
        document.documentElement.lang = $locale;
        document.documentElement.dir = direction;
    }
</script>

<slot />
```

## API Reference

### `defineI18nConfig(config)`

Helper for defining config with type inference.

### `createI18nStore(config)`

Creates the instance. Returns:

- `t`: Derived store for translation.
- `locale`: Writable store for current language.
- `setLocale(lang)`: Safely changes language.
- `extendTranslations(modules)`:
    - Merges new translations.
    - Returns `{ t }`: A new store instance typed with the union of existing + new keys.

### `onError: (error) => void`

Callback in `config` to handle missing keys or locales.

- `error.type`: `'missing_key' | 'missing_locale'`
- `error.key`: The key or locale that failed.

## License

[MIT](https://opensource.org/licenses/MIT)
