import { type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface DangerZoneProps {
  title?: string;
  description: string;
  action: ReactNode;
}

/**
 * Bloque para acciones destructivas/sensibles al final del detalle. Resuelto
 * como una card sobria (sin el típico borde rojo), con tipografía clara y la
 * acción a la derecha; el color destructivo lo aporta solo el botón.
 */
export function DangerZone({
  title = 'Zona de peligro',
  description,
  action,
}: DangerZoneProps) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
