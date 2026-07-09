import { IonIcon } from '@ionic/react';
import { cloudOfflineOutline } from 'ionicons/icons';
import { useOnline } from '@/lib/use-online';
import './offline-banner.css';

/**
 * Aviso fijo de "sin conexión" (DS §1b). Se muestra sobre la barra de pestañas
 * solo cuando el dispositivo pierde la red; respeta la safe-area inferior. No
 * bloquea la UI: la app sigue usable con lo ya cargado en caché.
 */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;

  return (
    <div className="core-offline-banner" role="status" aria-live="polite">
      <IonIcon icon={cloudOfflineOutline} aria-hidden="true" />
      <span>Sin conexión</span>
    </div>
  );
}
