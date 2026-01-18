import { createI18nStore, defineI18nConfig } from '../src/svelte-tiny-i18n';
import { get } from 'svelte/store';

// 1. Define standard config
const config = defineI18nConfig({
    supportedLocales: ['en'],
    defaultLocale: 'en',
    localStorageKey: 'zero-config',
    initialTranslations: [
        {
            common: { en: 'Common' }
        }
    ]
});

const i18n = createI18nStore(config);

// 2. Define a feature module
const featureModule = {
    'feature.name': { en: 'My Feature' }
} as const;

// 3. Extend AND get a typed store back
// Returns a new 't' function extended with the new module's type definition.
// No global interface augmentation required.
const { t } = i18n.extendTranslations([featureModule]);

const $t = get(t);

// 4. Verification
$t('common'); // ✅ OK (Inherited from base)
$t('feature.name'); // ✅ OK (Inferred from arg)

// @ts-expect-error Validation: Invalid key
$t('invalid'); // ❌ Error
