import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"
import fr from "./locales/fr.json"
import mg from "./locales/mg.json"

// French ships first, Malagasy is structured in from day one (spec
// 0001-frontend-architecture). Amounts/dates format through Intl, not here.
void i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources: {
			fr: { translation: fr },
			mg: { translation: mg },
		},
		fallbackLng: "fr",
		supportedLngs: ["fr", "mg"],
		interpolation: {
			escapeValue: false,
		},
	})

export { i18n }
