import { type ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Acción primaria (p. ej. botón "Crear"), alineada a la derecha. */
  actions?: ReactNode;
}

/** Cabecera de página reutilizable: título + descripción + acción primaria. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
