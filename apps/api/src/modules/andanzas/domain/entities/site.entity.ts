import { SiteCategory } from '../value-objects/site-category.vo';
import { Tag } from './tag.entity';

// Un lugar cualquiera (restaurante, mirador, parque…), resuelto vía un
// proveedor externo de sitios (externalPlaceId) o creado a mano con un pin
// en el mapa cuando no aparece en el proveedor. Entidad de dominio pura.
export interface Site {
  id: string;
  name: string;
  category: SiteCategory;
  latitude: number;
  longitude: number;
  address: string | null;
  externalPlaceId: string | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Site con sus tags resueltos. Lo devuelve el repositorio en creación,
// detalle y listado para no hacer N+1.
export interface SiteWithTags extends Site {
  tags: Tag[];
}
