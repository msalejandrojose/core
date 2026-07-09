import { useTranslation } from 'react-i18next';

/**
 * Resuelve el label de una sección del árbol de navegación: usa la clave
 * `sections.<code>` y, si no existe, cae al `name` literal que envía la API.
 * Espejo del helper del backoffice.
 */
export function useSectionLabel() {
  const { t } = useTranslation();
  return (code: string, fallback: string) =>
    t(`sections.${code}`, { defaultValue: fallback });
}
