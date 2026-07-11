import { SiteEntryStatus } from '../value-objects/site-entry-status.vo';

// Relación de un usuario con un Site: wishlist o visitado. rankPosition y
// score solo se rellenan para VISITED — los coloca el algoritmo de ranking
// por comparación al insertar el sitio en la lista ordenada del usuario
// (insertion sort asistido). score (0-10) se deriva de rankPosition y es lo
// que se agrega entre amigos para la nota "social" del mapa.
export interface SiteEntry {
  id: string;
  userId: string;
  siteId: string;
  status: SiteEntryStatus;
  rankPosition: number | null;
  score: number | null;
  createdAt: Date;
  updatedAt: Date;
}
