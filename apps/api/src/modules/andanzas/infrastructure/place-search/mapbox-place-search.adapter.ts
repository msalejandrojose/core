import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SitePlaceSearchFailedError } from '../../domain/errors/site-place-search-failed.error';
import {
  PlaceCandidate,
  SitePlaceSearchPort,
} from '../../application/ports/site-place-search.port';

const RESULT_LIMIT = 8;

interface MapboxFeature {
  properties: {
    mapbox_id: string;
    name: string;
    full_address?: string;
    place_formatted?: string;
  };
  geometry: {
    coordinates: [number, number]; // [lon, lat]
  };
}

interface MapboxForwardResponse {
  features: MapboxFeature[];
}

// Proveedor externo de sitios (TASK-165): Mapbox Geocoding API v6, forward
// geocoding acotado a `types=poi`. Elegido sobre Google Places (cobertura
// similar, pero cuenta con cuenta de Google Cloud + billing) y sobre
// Nominatim/OSM autoalojado (gratis, pero exige importar datos e infra
// propia) — buen equilibrio de coste/esfuerzo para el volumen de un grupo
// de amigos. Decisión completa en la tarea de Notion.
@Injectable()
export class MapboxPlaceSearchAdapter implements SitePlaceSearchPort {
  private readonly logger = new Logger(MapboxPlaceSearchAdapter.name);

  constructor(private readonly config: ConfigService) {}

  async search(query: string): Promise<PlaceCandidate[]> {
    const token = this.config.get<string>('MAPBOX_ACCESS_TOKEN');
    if (!token) {
      throw new SitePlaceSearchFailedError('MAPBOX_ACCESS_TOKEN no configurado');
    }

    const url = new URL('https://api.mapbox.com/search/geocode/v6/forward');
    url.searchParams.set('q', query);
    url.searchParams.set('types', 'poi');
    url.searchParams.set('limit', String(RESULT_LIMIT));
    url.searchParams.set('access_token', token);

    let res: Response;
    try {
      res = await fetch(url);
    } catch (err) {
      this.logger.error(`No se pudo contactar con Mapbox: ${String(err)}`);
      throw new SitePlaceSearchFailedError('fetch a Mapbox falló');
    }

    if (!res.ok) {
      this.logger.error(`Mapbox respondió ${res.status} para la query "${query}"`);
      throw new SitePlaceSearchFailedError(`Mapbox respondió ${res.status}`);
    }

    const body = (await res.json()) as MapboxForwardResponse;
    return body.features.map((feature) => ({
      externalPlaceId: feature.properties.mapbox_id,
      name: feature.properties.name,
      address: feature.properties.full_address ?? feature.properties.place_formatted ?? null,
      latitude: feature.geometry.coordinates[1],
      longitude: feature.geometry.coordinates[0],
    }));
  }
}
