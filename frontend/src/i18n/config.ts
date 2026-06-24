import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import fr from './locales/fr.json';

/**
 * Resolve the user's preferred language.
 *
 * Priority:
 *  1. localStorage 'miks.lang' (user override)
 *  2. navigator.language (browser default)
 *  3. fallback 'en'
 */
function detectLanguage(): string {
	if (typeof window === 'undefined') return 'en';
	const stored = window.localStorage?.getItem('miks.lang');
	if (stored && ['en', 'fr'].includes(stored)) return stored;
	const nav = window.navigator?.language ?? 'en';
	if (nav.toLowerCase().startsWith('fr')) return 'fr';
	return 'en';
}

void i18n.use(initReactI18next).init({
	resources: {
		en: { translation: en },
		fr: { translation: fr },
	},
	lng: detectLanguage(),
	fallbackLng: 'en',
	interpolation: {
		escapeValue: false, // React already escapes
	},
	returnNull: false,
});

export default i18n;

export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];