import { useState } from 'react';
import { useLocation } from 'react-router-dom';

export type DetailMode = 'view' | 'edit' | 'create';

/**
 * Encapsula el estado de modo para páginas de detalle (view / edit / create).
 *
 * - Recursos existentes: arranca en 'view'; navegar con `state: { mode: 'edit' }`
 *   entra directamente en edición (útil para el botón Editar de RowActions).
 * - Recursos nuevos (isCreate=true): arranca en 'create'.
 *
 * Patrón canónico: apps/backoffice/src/features/api-sections/ApiSectionDetailPage.tsx
 */
export function useDetailMode(isCreate: boolean) {
  const location = useLocation();
  const initialMode: DetailMode = isCreate
    ? 'create'
    : ((location.state as { mode?: DetailMode } | null)?.mode ?? 'view');

  const [mode, setMode] = useState<DetailMode>(initialMode);

  return {
    mode,
    isEditable: mode === 'edit' || mode === 'create',
    enterEdit: () => setMode('edit'),
    enterView: () => setMode('view'),
  };
}
