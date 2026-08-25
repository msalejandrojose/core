import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Power, PowerOff } from 'lucide-react';
import { RowActions } from '@/components/data-table/RowActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CarArchetypeRow } from '../../types';
import { ArchetypeFormDialog } from './components/ArchetypeFormDialog';
import { useUpdateArchetype } from './hooks/use-archetype-mutations';

export const columns: ColumnDef<CarArchetypeRow>[] = [
  { accessorKey: 'name', header: 'Nombre' },
  {
    accessorKey: 'code',
    header: 'Código',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.code}</span>
    ),
  },
  {
    accessorKey: 'speedScale',
    header: 'Velocidad',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.speedScale.toFixed(2)}</span>
    ),
  },
  {
    accessorKey: 'grip',
    header: 'Agarre',
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.grip.toFixed(2)}</span>
    ),
  },
  {
    accessorKey: 'offroadGripModifier',
    header: 'Agarre fuera de asfalto',
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        ×{row.original.offroadGripModifier.toFixed(2)}
      </span>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Estado',
    cell: ({ row }) =>
      row.original.isActive ? (
        <Badge>Activo</Badge>
      ) : (
        <Badge variant="secondary">Inactivo</Badge>
      ),
  },
  {
    id: 'actions',
    cell: ({ row }) => <ArchetypeRowActions archetype={row.original} />,
  },
];

function ArchetypeRowActions({ archetype }: { archetype: CarArchetypeRow }) {
  const update = useUpdateArchetype(archetype.id);
  return (
    <RowActions
      extra={
        <>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            title={archetype.isActive ? 'Desactivar' : 'Activar'}
            disabled={update.isPending}
            onClick={() => update.mutate({ isActive: !archetype.isActive })}
          >
            {archetype.isActive ? <PowerOff size={14} /> : <Power size={14} />}
          </Button>
          <ArchetypeFormDialog
            archetype={archetype}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                title="Editar"
              >
                <Pencil size={14} />
              </Button>
            }
          />
        </>
      }
    />
  );
}
