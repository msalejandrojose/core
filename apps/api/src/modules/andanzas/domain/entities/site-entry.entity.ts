import { SiteEntryStatus } from '../value-objects/site-entry-status.vo';
import { SiteWithTags } from './site.entity';

// Relación de un usuario con un Site: wishlist o visitado. score (0-10)
// solo se rellena para VISITED — lo coloca el algoritmo de ranking por
// comparación (ver domain/ranking/) al insertar el sitio en la lista
// ordenada del usuario. El orden se deriva siempre de score DESC, no hay
// campo de posición separado.
export interface SiteEntry {
  id: string;
  userId: string;
  siteId: string;
  status: SiteEntryStatus;
  score: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// SiteEntry con el Site resuelto. Lo devuelve el repositorio al listar la
// lista personal del usuario, para no hacer N+1.
export interface SiteEntryWithSite extends SiteEntry {
  site: SiteWithTags;
}
