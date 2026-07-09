import { useState } from 'react';

export type DetailMode = 'view' | 'edit' | 'create';

/**
 * Estado de modo para pantallas de detalle (ver / editar / crear). Port móvil
 * de `use-detail-mode` del backoffice, sin acoplarse al router: el modo inicial
 * llega como valor (la pantalla que navega decide si abre en 'view' o entra
 * directo a 'edit'), lo que mantiene el hook puro y testeable.
 *
 * - Entidad existente → normalmente 'view', con `enterEdit`/`enterView` para
 *   alternar.
 * - Alta de una entidad nueva → 'create'.
 */
export function useDetailMode(initialMode: DetailMode = 'view') {
  const [mode, setMode] = useState<DetailMode>(initialMode);

  return {
    mode,
    /** `true` en 'edit' y 'create': los campos son editables y hay que guardar. */
    isEditable: mode === 'edit' || mode === 'create',
    enterEdit: () => setMode('edit'),
    enterView: () => setMode('view'),
  };
}
