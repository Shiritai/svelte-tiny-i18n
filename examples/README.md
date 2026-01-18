# Examples

This directory contains executable TypeScript files demonstrating the three main type-safety strategies supported by `svelte-tiny-i18n`. These examples serve as a cookbook for integrating i18n into your application.

You can run the type verification for all examples using:

```bash
npm run test:types
```

## 1. Basic Static Safety

([`1-basic-type-safety.ts`](./1-basic-type-safety.ts))

This is the default and most common pattern. When you initialize `createI18nStore` with an `initialTranslations` array, TypeScript automatically infers the shape of your translations. Keys like `home.title` or `errors.req` are immediately available for autocompletion in the `$t` function. This approach is ideal for smaller applications or those that load all translations at startup, offering zero-config type safety out of the box.

## 2. Global Augmentation (Recommended)

([`2-global-augmentation.ts`](./2-global-augmentation.ts))

For larger applications that load translations dynamically (e.g., lazy-loading routes), we recommend this "write-once" approach. By adding a simple `declare module` block in a `.d.ts` file, you can tell `svelte-tiny-i18n` about all your translation modules—even ones that haven't loaded yet.

This is powered by TypeScript's `typeof import(...)`. You strictly reference your translation files, and the library globally updates the `$t` type. This ensures that every component in your app has IntelliSense for every possible key, keeping your code clean and type-safe without passing generics around.

## 3. Zero-Config (Local Scope)

([`3-zero-config.ts`](./3-zero-config.ts))

If you prefer not to touch global types (`.d.ts`) or want to define translations strictly alongside your components (Colocation), this is the simplest method. When you call `extendTranslations`, the library returns a special, locally-typed `t` store.

This returned store knows about both the existing global keys _and_ the new keys you just added. It requires absolutely no type setup, making it perfect for isolated features or quick prototypes where you want type safety without the architectural commitment.

---

## Comparison of Strategies

| Strategy                   | Setup Needed      | Scope  | Best For                                                             |
| :------------------------- | :---------------- | :----- | :------------------------------------------------------------------- |
| **1. Basic Static**        | None              | Global | Small/Medium apps, monolithic translation files.                     |
| **2. Global Augmentation** | Low (`d.ts` file) | Global | Large apps, lazy-loading, ensuring app-wide consistency.             |
| **3. Zero-Config**         | None              | Local  | Component-level translations, preventing global namespace pollution. |
