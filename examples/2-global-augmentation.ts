import { createI18nStore, defineI18nConfig } from '../src/svelte-tiny-i18n';
import { get } from 'svelte/store';

// Sample translation modules
// In a real app, these would be imported from separate files.
const commonModule = {
    common: { en: 'Common' }
} as const;

const featureModule = {
    feature_a: { en: 'Feature A' }
} as const;

// Global Augmentation Pattern
// Defines the mapping between keys and module types in a .d.ts file.
declare module '../src/svelte-tiny-i18n' {
    export interface TinyI18nTranslations {
        // Option 1: Direct definition
        // common: { en: string };

        // Option 2: Automatic Inference using typeof import
        // This automatically infers the structure from the module variable or file.
        common: typeof commonModule;
        feature_a: typeof featureModule;
    }
}

const config = defineI18nConfig({
    supportedLocales: ['en'],
    defaultLocale: 'en',
    localStorageKey: 'aug-test',
    // Simulate loading them so they are 'used'
    initialTranslations: [commonModule, featureModule]
});

// 3. createI18nStore automatically picks up the augmented type!
const i18n = createI18nStore(config);
const t = get(i18n.t);

// 4. Verification
t('common.common'); // ✅ OK
t('feature_a.feature_a'); // ✅ OK (Even though not in initialTranslations)

// @ts-expect-error Validation: Invalid key
t('invalid'); // ❌ Error
