import { createI18nStore, defineI18nConfig } from '../src/svelte-tiny-i18n';
import { get } from 'svelte/store';

const config = defineI18nConfig({
    supportedLocales: ['en'],
    defaultLocale: 'en',
    localStorageKey: 'test-lang-key',
    initialTranslations: [
        {
            hello: { en: 'Hello' },
            home: {
                title: { en: 'Home' }
            }
        }
    ]
});

const i18n = createI18nStore(config);
const t = get(i18n.t);

// ✅ Valid keys
t('hello');
t('home.title');

// ❌ Invalid keys - Should cause compilation error
// @ts-expect-error Testing invalid key
t('invalid.key');
// @ts-expect-error Testing invalid key
t('home.subtitle');
