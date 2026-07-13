import {
  ellipsisHorizontalOutline,
  gameControllerOutline,
  leafOutline,
  libraryOutline,
  restaurantOutline,
} from 'ionicons/icons';
import type { components } from '@core/api-client';

export type SiteCategory = components['schemas']['CreateSiteDto']['category'];

export const SITE_CATEGORIES: SiteCategory[] = [
  'RESTAURANT',
  'NATURE',
  'CULTURE',
  'LEISURE',
  'OTHER',
];

export const SITE_CATEGORY_LABEL: Record<SiteCategory, string> = {
  RESTAURANT: 'Restaurante',
  NATURE: 'Naturaleza',
  CULTURE: 'Cultura',
  LEISURE: 'Ocio',
  OTHER: 'Otro',
};

export const SITE_CATEGORY_ICON: Record<SiteCategory, string> = {
  RESTAURANT: restaurantOutline,
  NATURE: leafOutline,
  CULTURE: libraryOutline,
  LEISURE: gameControllerOutline,
  OTHER: ellipsisHorizontalOutline,
};
