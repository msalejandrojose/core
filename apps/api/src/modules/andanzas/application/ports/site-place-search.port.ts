export const SITE_PLACE_SEARCH = Symbol('SITE_PLACE_SEARCH');

// Candidato devuelto por el proveedor externo de sitios (Mapbox, ver
// TASK-165). `externalPlaceId` es el id opaco del proveedor — se guarda en
// Site.externalPlaceId para deduplicar si dos usuarios crean el mismo sitio
// buscando lo mismo.
export interface PlaceCandidate {
  externalPlaceId: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
}

export interface SitePlaceSearchPort {
  search(query: string): Promise<PlaceCandidate[]>;
}
