import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTags } from '../../tags/hooks/use-tags';

interface TagMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
}

/**
 * Multi-selección de etiquetas como chips toggleables. Evita añadir los
 * componentes `popover`/`command` de shadcn (no imprescindibles para v1).
 */
export function TagMultiSelect({ value, onChange }: TagMultiSelectProps) {
  const { data, isLoading } = useTags({ page: 1, limit: 100 });
  const tags = data?.data ?? [];

  const toggle = (id: string) =>
    onChange(
      value.includes(id) ? value.filter((t) => t !== id) : [...value, id],
    );

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Cargando etiquetas…</p>;
  }
  if (tags.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No hay etiquetas. Créalas en Blog → Etiquetas.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag: any) => {
        const selected = value.includes(tag.id);
        return (
          <button key={tag.id} type="button" onClick={() => toggle(tag.id)}>
            <Badge
              variant={selected ? 'default' : 'outline'}
              className={cn('cursor-pointer', !selected && 'hover:bg-accent')}
            >
              {tag.name}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
