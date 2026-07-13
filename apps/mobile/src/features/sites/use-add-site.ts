import { useState } from 'react';
import { apiClient } from '@/api/client';
import type { SiteCategory } from './site-category';

export interface AddSiteInput {
  name: string;
  category: SiteCategory;
  latitude: number;
  longitude: number;
  address?: string;
  externalPlaceId?: string;
  tagNames?: string[];
  status: 'WANT_TO_GO' | 'VISITED';
}

/**
 * Crea un sitio (`POST /andanzas/sites`, a partir de un resultado de búsqueda
 * o a mano con pin) y a continuación lo añade a la lista del usuario
 * (`POST /andanzas/site-entries`) con el estado elegido — son dos endpoints
 * porque un `Site` es una entidad compartida (TASK-166/177) y el estado es
 * por-usuario, pero de cara al usuario es un único paso: "añadir sitio".
 */
export function useAddSite() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(input: AddSiteInput): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      const { data: site, error: siteError } = await apiClient.POST('/andanzas/sites', {
        body: {
          name: input.name,
          category: input.category,
          latitude: input.latitude,
          longitude: input.longitude,
          address: input.address || undefined,
          externalPlaceId: input.externalPlaceId,
          tagNames: input.tagNames?.length ? input.tagNames : undefined,
        },
      });
      if (siteError || !site) {
        setError('No se pudo guardar el sitio. Inténtalo de nuevo.');
        return false;
      }

      const { error: entryError } = await apiClient.POST('/andanzas/site-entries', {
        body: { siteId: site.id, status: input.status },
      });
      if (entryError) {
        // El sitio ya existe en el catálogo compartido aunque falle este segundo
        // paso; el usuario puede volver a intentar añadirlo desde la búsqueda.
        setError('El sitio se creó, pero no se pudo añadir a tu lista. Inténtalo de nuevo.');
        return false;
      }

      return true;
    } catch {
      setError('No se pudo guardar el sitio. Inténtalo de nuevo.');
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { submit, loading, error };
}
