import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { IonIcon } from '@ionic/react';
import { locationSharp } from 'ionicons/icons';
import 'leaflet/dist/leaflet.css';

export interface LatLng {
  lat: number;
  lng: number;
}

function CenterTracker({ onChange }: { onChange: (center: LatLng) => void }) {
  useMapEvents({
    moveend: (e) => {
      const c = e.target.getCenter();
      onChange({ lat: c.lat, lng: c.lng });
    },
  });
  return null;
}

interface LocationPickerMapProps {
  center: LatLng;
  onChange: (center: LatLng) => void;
}

/**
 * Selector de ubicación para la creación manual de un sitio (TASK-181).
 * En vez de un marcador arrastrable (gestos que chocan con el pan del mapa
 * en móvil), el pin queda fijo en el centro del viewport y es el mapa el que
 * se mueve por debajo — patrón estándar ("drop a pin") de Uber/Airbnb/Google
 * Maps. `onChange` se dispara con el centro al soltar el arrastre
 * (`moveend`), no en cada frame.
 */
export function LocationPickerMap({ center, onChange }: LocationPickerMapProps) {
  return (
    <div
      style={{
        position: 'relative',
        height: 240,
        borderRadius: 'var(--core-radius)',
        overflow: 'hidden',
      }}
    >
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={15}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CenterTracker onChange={onChange} />
      </MapContainer>

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -100%)',
          pointerEvents: 'none',
          zIndex: 1000,
        }}
      >
        <IonIcon
          icon={locationSharp}
          style={{ fontSize: 36, color: 'var(--ion-color-primary)' }}
        />
      </div>
    </div>
  );
}
