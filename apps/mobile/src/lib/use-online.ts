import { useEffect, useState } from 'react';

/**
 * Estado de conexión de red. Usa `navigator.onLine` + los eventos `online` /
 * `offline`, que funcionan tanto en la PWA como en el WebView de Capacitor sin
 * añadir el plugin nativo `@capacitor/network`. Suficiente para el aviso de
 * "sin conexión" del DS (MOB-16); si más adelante se necesita el tipo de red
 * (wifi/celular) se puede migrar al plugin.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}
