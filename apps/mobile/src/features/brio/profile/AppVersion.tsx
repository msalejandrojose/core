import { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * Pie de Ajustes con lo que lleva el teléfono, para saber de un vistazo qué
 * está corriendo:
 * - versión y build nativos: cambian al compilar (Apps móviles › Builds);
 * - commit de la web: cambia con cada OTA.
 */
export function AppVersion() {
  const [native, setNative] = useState<{ version: string; build: string } | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    App.getInfo()
      .then(({ version, build }) => setNative({ version, build }))
      .catch(() => setNative(null));
  }, []);

  return (
    <span className="profile__version">
      {native ? `Brío ${native.version} (${native.build})` : 'Brío'} · web {__BRIO_WEB_BUILD__}
    </span>
  );
}
