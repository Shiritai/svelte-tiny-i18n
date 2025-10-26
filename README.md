# svelte-tiny-i18n

[![NPM Version](https://img.shields.io/npm/v/svelte-tiny-i18n)](https://www.npmjs.com/package/svelte-tiny-i18n)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/svelte-tiny-i18n)](https://bundlephobia.com/package/svelte-tiny-i18n)

( English | [繁體中文](./README.zh_tw.md) )

`svelte-tiny-i18n` is a lightweight, type-safe, and reactive i18n (internationalization) library for [Svelte](https://svelte.dev/) and [SvelteKit](https://kit.svelte.dev/), built entirely on Svelte Stores.

This library is "headless," meaning it only provides the core logic and Svelte stores, leaving the UI and component integration entirely up to the developer.

## TL;DR

`svelte-tiny-i18n` is for developers who value **extreme lightweightness, zero dependencies, and zero build-time configuration**, while still enjoying a **native Svelte store experience and instant TypeScript inference**.

Its key advantage: **Zero-config type safety**. You define your supported locales (e.g., `['en', 'es']`) in a single config file, and TypeScript immediately provides type-checking and autocompletion for your `setLocale` function (e.g., `setLocale('es')` is valid, `setLocale('fr')` is an error) — all without running a code generator.

This makes it the ideal choice for small-to-medium projects and Svelte purists.

### Example: Minimal SvelteKit Integration

Assuming a project structure like this:

```tree
/src
├── /lib
│   └── i18n.ts         <- 1. Config File
└── /routes
    └── /[lang]
        ├── +layout.ts  <- 2. SvelteKit Integration
        ├── +page.svelte  <- 3. Usage
        └── /about
            └── +page.svelte
```

1. **`src/lib/i18n.ts`** (Config File)

    ```ts
    import { createI18nStore, defineI18nConfig, type inferSupportedLocale } from 'svelte-tiny-i18n';

    const config = defineI18nConfig({
        supportedLocales: ['en', 'es'],
        defaultLocale: 'en',
        localStorageKey: 'lang',
        initialTranslations: [
            {
                hello: { en: 'Hello', es: 'Hola' }
            }
        ]
    });

    export const i18n = createI18nStore(config);
    export type SupportedLocale = inferSupportedLocale<typeof i18n>;
    ```

2. **`src/routes/[lang]/+layout.ts`** (SvelteKit Integration)

    ```ts
    import { i18n } from '$lib/i18n';
    import type { LayoutLoad } from './$types';

    export const load: LayoutLoad = ({ params }) => {
        // 'lang' comes from your route, e.g., /[lang]/
        i18n.setLocale(params.lang);
        return {};
    };
    ```

3. **`src/routes/[lang]/+page.svelte`** (Usage)

    ```svelte
    <script lang="ts">
        import { i18n } from '$lib/i18n';
        const { t, setLocale } = i18n;
    </script>

    <h1>{$t('hello')}</h1>
    <button on:click={() => setLocale('es')}>Español</button>
    ```

## Installation

```bash
npm install svelte-tiny-i18n
```

```bash
pnpm add svelte-tiny-i18n
```

```bash
yarn add svelte-tiny-i18n
```

## Quick Start

The best way to use `svelte-tiny-i18n` is to create a dedicated singleton instance.

### 1. Create the i18n Instance

Create a file at `/src/lib/i18n.ts` (or your preferred location).

```ts
// /src/lib/i18n.ts
import {
    createI18nStore,
    defineI18nConfig,
    type inferSupportedLocale,
    type inferPartialTranslationEntry,
    type inferTranslationEntry
} from 'svelte-tiny-i18n';

// 1. Define the config
const i18nConfig = defineI18nConfig({
    // Define all supported languages
    supportedLocales: ['en', 'es', 'zh-TW'],

    // Default language
    defaultLocale: 'en',

    // Key for storing the language in localStorage
    localStorageKey: 'my-app-language',

    // (Optional) Log warnings to the console if a key is not found
    devLogs: true,

    // Define initial, global translations
    initialTranslations: [
        {
            hello: {
                en: 'Hello, {name}!',
                es: '¡Hola, {name}!',
                'zh-TW': '你好, {name}!'
            },
            goodbye: {
                en: 'Goodbye',
                es: 'Adiós',
                'zh-TW': '再見'
            }
        }
    ]
});

// 2. Create and export the i18n instance
export const i18n = createI18nStore(i18nConfig);

// 3. (Optional) Export inferred types for app-wide type safety
export type SupportedLocale = inferSupportedLocale<typeof i18n>;
export type TranslationEntry = inferTranslationEntry<typeof i18n>;
export type PartialTranslationEntry = inferPartialTranslationEntry<typeof i18n>;
```

### 2. Use in Svelte Components

Use the derived store `$t` to get translations, and the `locale` store to read or `setLocale` to set the language.

```svelte
<script lang="ts">
    import { i18n } from '$lib/i18n';

    // Destructure the stores and functions
    const { t, locale, setLocale } = i18n;
</script>

<h1>{$t('hello', { name: 'World' })}</h1>

<nav>
    <p>Current language: {$locale}</p>

    <button on:click={() => setLocale('en')}>English</button>
    <button on:click={() => setLocale('es')}>Español</button>
    <button on:click={() => setLocale('zh-TW')}>繁體中文</button>
</nav>

<p>{$t('a.missing.key')}</p>
```

### 3. SvelteKit Integration (Recommended)

To make the i18n state available on both the server and client, and to initialize from a URL parameter (e.g., `/es/about`), use it in your root `+layout.ts`.

```ts
// /src/routes/+layout.ts
import { i18n } from '$lib/i18n';
import type { LayoutLoad } from './$types';

// This load function runs on both SSR and CSR
export const load: LayoutLoad = ({ params }) => {
    // 'lang' must match your route parameter, e.g., /[lang]/
    const { lang } = params;

    // The setLocale function validates the lang
    // and sets the 'locale' store.
    i18n.setLocale(lang);

    // You can optionally return lang, but the store itself is already set
    return { lang };
};
```

**Note:** Your SvelteKit route structure must be similar to `/src/routes/[lang]/...` for `params.lang` to be available.

## Advanced Usage

### Dynamic (Async) Translation Loading

You don't need to load all translations at startup. You can load them on demand in a page's `+page.ts` or `+layout.ts` using `extendTranslations`.

1. Define page-specific translations:

    ```ts
    // /src/locales/profile.ts
    import type { PartialTranslationEntry } from '$lib/i18n';

    export const profileTranslations: PartialTranslationEntry = {
        'profile.title': {
            en: 'My Profile',
            es: 'Mi Perfil',
            'zh-TW': '個人資料'
        },
        'profile.edit_button': {
            en: 'Edit'
            // Missing 'es' and 'zh-TW' is allowed!
        }
    };
    ```

2. Load them in the page's loader:

    ```ts
    // /src/routes/profile/+page.ts
    import { i18n } from '$lib/i18n';
    import { profileTranslations } from '$locales/profile';
    import type { PageLoad } from './$types';

    export const load: PageLoad = () => {
        // Dynamically add the translations for this page
        i18n.extendTranslations([profileTranslations]);

        // You can also await an async import
        // const { jsonTranslations } = await import('$locales/profile.json');
        // i18n.extendTranslations([jsonTranslations]);
    };
    ```

The new translations are now merged into the store and available via the `$t` function.

## Advantages

`svelte-tiny-i18n` is designed to be the "sweet spot" for Svelte developers who need a simple, fast, and type-safe solution without the overhead of larger libraries.

- **Zero-Config Type Safety**: Get full type-safety for your language codes _without_ a build step, code generator, or complex setup. Type-safety is achieved instantly via TypeScript inference from your single configuration object.
- **Extremely Lightweight**: This library is "tiny" (likely <1kb gzipped). It has **zero dependencies** and does not bundle a heavy ICU message parser, making your app faster.
- **Svelte Native**: Built purely with Svelte stores (`writable` and `derived`), it integrates seamlessly into the Svelte reactivity model.
- **Simple but Powerful**: Provides all the essential features: SSR/CSR support for SvelteKit, dynamic/async translation loading (`extendTranslations`), and simple variable substitution.
- **"Headless" by Design**: It provides only the core logic, giving you full control over your UI and integration. (This also means you are responsible for updating the `<html>` `lang` attribute; see the [FAQ for a recipe](#q-how-do-i-dynamically-update-the-html-lang-attribute-or-handle-rtl-right-to-left-languages).)

## Comparison with Other Libraries

| Dimension            | `svelte-tiny-i18n` (This)                                                    | `typesafe-i18n`                                                         | `svelte-i18n`                                              |
| :------------------- | :--------------------------------------------------------------------------- | :---------------------------------------------------------------------- | :--------------------------------------------------------- |
| **Bundle Size**      | **Tiny (<1kb)**                                                              | **Tiny (~1kb)**                                                         | **Medium (~15kb+)**                                        |
| **Core Mechanism**   | Zero-dependency Svelte Stores + Simple String Replace                        | **Build-time Generator**                                                | **Runtime ICU Parser**                                     |
| **Type Safety**      | **High (Instant Inference)**                                                 | **Very High (Code-Gen)**                                                | Medium (Manual setup)                                      |
| **Setup Complexity** | **Very Low** (Single config file)                                            | Medium (Requires generator setup)                                       | Low (Install and use)                                      |
| **Adv. Formatting**  | Simple `{var}` replacement only                                              | **Yes** (Plurals, Dates, Numbers)                                       | **Yes (Full ICU Support)**                                 |
| **Key Trade-Off**    | Trades ICU features for **extreme lightness** & **zero-config type safety**. | Trades setup simplicity for the **strongest type safety** (incl. args). | Trades bundle size for the **most powerful ICU features**. |

### Philosophy Comparison

- **If you need advanced formatting** (complex plurals, date/number localization) and don't mind a larger bundle size, **`svelte-i18n`** is a great choice. It uses the industry-standard `formatjs` and ICU syntax.
- **If you need _absolute_ type safety** (including for translation arguments, e.g., `$t('key', { arg: 'val' })`) and are willing to set up a code generator, **`typesafe-i18n`** is excellent.
- **`svelte-tiny-i18n`** is the ideal choice if you value:
    1. **Simplicity**: Get started in 2 minutes.
    2. **Bundle Size**: A minimal footprint is critical.
    3. **Effortless Type Safety**: You want strong type guarantees _without_ a build step.

This library intentionally trades complex ICU formatting (which `svelte-i18n` provides) and argument-level type safety (which `typesafe-i18n` provides) for **extreme simplicity, minimal size, and zero-config type safety.**

## API Reference

### Factory Functions

#### `createI18nStore(config)`

Creates the core i18n instance. Returns an object containing stores and functions.

#### `defineI18nConfig(config)`

A helper function for defining your `I18nConfig` that provides full type safety and inference.

### The Returned Instance (`i18n`)

When you call `createI18nStore`, you get an object with:

- `t`: (Read-only derived store) The translation function.
    - `$t('key')`
    - `$t('key', { placeholder: 'value' })`
- `locale`: (Readable store) The currently active language code (e.g., `en`). This store is readable; to update it, use the `setLocale()` function.
- `setLocale(lang: string | null | undefined)`: A function to safely set the initial language, typically called from the root `+layout.ts`.
    - If `lang` is a supported language, it sets the `locale` store.
    - If `lang` is invalid (or `null`/`undefined`), it's ignored, and the `locale` store **keeps its current value**.
- `extendTranslations(newTranslations: PartialTranslationEntry[])`: Merges new translations (an _array_) into the main store and triggers an update.
- `supportedLocales`: (Read-only `readonly string[]`) The array of supported languages from your config.
- `defaultLocale`: (Read-only `string`) The default language from your config.
- `localStorageKey`: (Read-only `string`) The `localStorage` key from your config.

### Type Helpers

For robust type safety in your app, you can import type helpers directly from `svelte-tiny-i18n`.

- `inferSupportedLocale<typeof i18n>`: Infers the union of supported language codes (e.g., `'en' | 'es' | 'zh-TW'`).
- `inferTranslationEntry<typeof i18n>`: Infers the _full_ translation entry type (e.g., `{ en: string; es: string; 'zh-TW': string; }`).
- `inferPartialTranslationEntry<typeof i18n>`: Infers the type for translation files (e.g., `{ [key: string]: { en?: string; es?: string; 'zh-TW'?: string; } }`).

**Example:**

```ts
// /src/lib/i18n.ts
// ... (as shown in "Quick Start")
export type SupportedLocale = inferSupportedLocale<typeof i18n>;
```

```ts
// /src/components/SomeComponent.svelte
import { i18n } from '$lib/i18n';
import type { SupportedLocale } from '$lib/i18n';

// The 'lang' variable is now type-checked
function setLanguage(lang: SupportedLocale) {
    i18n.setLocale(lang);
}

setLanguage('en'); // OK
setLanguage('fr'); // TypeScript Error
```

## FAQ / Recipes

### Q: How do I use this in a Svelte (Vite) project _without_ SvelteKit?

A: It's even simpler. You don't need the `+layout.ts` file or the `i18n.setLocale()` step.

The store will automatically initialize its language in the browser by checking `localStorage` and `navigator.language`. You can change the language at any time by simply calling `i18n.setLocale('new_lang')` in your components.

### Q: How do I dynamically update the `<html>` `lang` attribute or handle RTL (Right-to-Left) languages?

A: This library is "headless," so it doesn't modify the DOM for you. You can easily manage this yourself by subscribing to the `locale` store in your root layout component (e.g., `+layout.svelte` for SvelteKit or `App.svelte` for Svelte/Vite).

Here is an example for a SvelteKit project that sets both the `lang` and `dir` attributes:

```svelte
<script lang="ts">
    import { i18n } from '$lib/i18n';
    const { locale } = i18n;

    // Define which of your supported locales are RTL
    // (e.g., Arabic 'ar', Hebrew 'he')
    const rtlLocales: string[] = ['ar', 'he'];

    $: if (typeof document !== 'undefined') {
        const direction = rtlLocales.includes($locale) ? 'rtl' : 'ltr';

        // Dynamically set attributes on <html>
        document.documentElement.lang = $locale;
        document.documentElement.dir = direction;
    }
</script>

<slot />
```

## License

[MIT](https://opensource.org/licenses/MIT)
