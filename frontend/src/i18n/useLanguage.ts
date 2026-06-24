import { useTranslation } from 'react-i18next';

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from './config';

/**
 * Hook for components that need to switch language.
 * Returns the current language, the supported list, and a setter that
 * also persists the choice in localStorage.
 */
export function useLanguage() {
	const { i18n } = useTranslation();

	const setLanguage = (lng: SupportedLanguage) => {
		void i18n.changeLanguage(lng);
		try {
			window.localStorage?.setItem('miks.lang', lng);
		} catch {
			/* non-fatal */
		}
	};

	return {
		language: i18n.language as SupportedLanguage,
		languages: SUPPORTED_LANGUAGES,
		setLanguage,
	};
}