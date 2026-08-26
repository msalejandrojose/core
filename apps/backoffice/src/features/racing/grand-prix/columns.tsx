import type { ColumnDef } from '@tanstack/react-table';
import { ImageOff, Power, PowerOff } from 'lucide-react';
import { RowActions } from '@/components/data-table/RowActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { resolveCircuitImageUrl } from '../circuits/lib/circuit-image-url';
import {
  GRAND_PRIX_DIFFICULTY_LABELS,
  type GrandPrixRow,
} from '../types';
import { useUpdateGrandPrix } from './hooks/use-update-grand-prix';

export const columns: ColumnDef<GrandPrixRow>[] = [
  {
    id: 'image',
    header: '',
    cell: ({ row }) => {
      const url = resolveCircuitImageUrl(row.original.imageUrl);
      return (
        <div className="bg-muted flex size-10 items-center justify-center overflow-hidden rounded">
          {url ? (
            <img src={url} alt="" className="size-full object-cover" />
          ) : (
            <ImageOff size={14} className="text-muted-foreground" />
          )}
        </div>
      );
    },
  },
  { accessorKey: 'name', header: 'Nombre' },
  {
    accessorKey: 'slug',
    header: 'Slug',
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.slug}</span>
    ),
  },
  {
    id: 'difficulty',
    header: 'Dificultad',
    cell: ({ row }) => (
      <Badge variant="outline">
        {GRAND_PRIX_DIFFICULTY_LABELS[row.original.difficulty]}
      </Badge>
    ),
  },
  {
    id: 'stages',
    header: 'Circuitos',
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {row.original.stages.length}
      </span>
    ),
  },
  {
    id: 'rewards',
    header: 'Recompensa',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm tabular-nums">
        {row.original.creditsReward.toLocaleString('es-ES')} · {row.original.xpReward} XP
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
    cell: ({ row }) => <GrandPrixRowActions grandPrix={row.original} />,
  },
];

function GrandPrixRowActions({ grandPrix }: { grandPrix: GrandPrixRow }) {
  const update = useUpdateGrandPrix(grandPrix.id);
  return (
    <RowActions
      editHref={`/racing/grand-prix/${grandPrix.id}`}
      extra={
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          title={grandPrix.isActive ? 'Desactivar' : 'Activar'}
          disabled={update.isPending}
          onClick={() => update.mutate({ isActive: !grandPrix.isActive })}
        >
          {grandPrix.isActive ? <PowerOff size={14} /> : <Power size={14} />}
        </Button>
      }
    />
  );
}
