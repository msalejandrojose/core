import { useEffect, useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import type { LatLng } from './LocationPickerMap';

// Madrid como centro por defecto si no hay permiso de ubicación o falla el
// GPS — mejor un punto de partida razonable en España (mercado inicial de la
// beta) que dejar el mapa centrado en (0, 0).
const DEFAULT_CENTER: LatLng = { lat: 40.4168, lng: -3.7038 };

/**
 * Ubicación inicial para el selector de mapa (TASK-181): pide la posición
 * actual del dispositivo una vez al montar. Si el usuario deniega el permiso
 * o el GPS falla, cae al centro por defecto — el usuario siempre puede
 * mover el mapa a mano.
 */
export function useCurrentLocation(): { center: LatLng; loading: boolean } {
  const [center, setCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 8000 })
      .then((pos) => {
        if (active) {
          setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      })
      .catch(() => {
        // Sin permiso o sin GPS: se queda en DEFAULT_CENTER.
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { center, loading };
}
