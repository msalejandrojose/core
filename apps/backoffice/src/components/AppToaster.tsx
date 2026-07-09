import { Toaster } from 'sileo';
import { useThemeStore } from '@/store/theme.store';

// Contenedor de toasts de la app. Envuelve el <Toaster> de sileo para que siga
// el tema (claro/oscuro/sistema) elegido en el backoffice: la prop `theme` de
// sileo acepta exactamente los mismos valores que nuestro theme store.
export function AppToaster() {
  const theme = useThemeStore((s) => s.theme);
  return <Toaster position="top-right" theme={theme} />;
}
