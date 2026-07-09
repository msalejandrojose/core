import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { es } from './locales/es';

/**
 * Configuración de i18n (react-i18next), espejo del backoffice. Fase 1: solo
 * español. Añadir idiomas = crear un recurso nuevo + un selector; los
 * componentes ya resuelven sus textos vía `useTranslation`.
 */
void i18n.use(initReactI18next).init({
  resources: { es },
  lng: 'es',
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
});

export default i18n;
