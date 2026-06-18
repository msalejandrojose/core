import { X } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useRoles } from '@/features/roles/hooks/use-roles';
import { useAssignRole } from '../hooks/use-assign-role';
import { useUnassignRole } from '../hooks/use-unassign-role';
import { useUserRoles } from '../hooks/use-user-roles';

/**
 * Roles asignados a un usuario, con UI para asignar y quitar:
 * - Cada rol asignado se muestra como chip con botón de quitar (DELETE).
 * - El selector inferior lista los roles aún no asignados; al elegir uno se
 *   asigna (POST). Se piden hasta 100 roles, igual que el catálogo de
 *   ApiSections; si crece habrá que paginar/buscar.
 */
export function UserRolesCard({ userId }: { userId: string }) {
  const { data: assigned, isLoading } = useUserRoles(userId);
  const { data: allRoles } = useRoles({ page: 1, limit: 100 });
  const { mutate: assign, isPending: assigning } = useAssignRole(userId);
  const { mutate: unassign } = useUnassignRole(userId);
  // El Select de shadcn necesita un valor controlado; lo reseteamos tras
  // asignar para que vuelva a mostrar el placeholder.
  const [selected, setSelected] = useState('');

  const assignedIds = new Set((assigned ?? []).map((r) => r.id));
  const assignable = (allRoles?.data ?? []).filter(
    (r) => !assignedIds.has(r.id),
  );

  function handleAssign(roleId: string) {
    setSelected('');
    assign(roleId);
  }

  if (isLoading) {
    return <Skeleton className="h-8 w-full" />;
  }

  return (
    <div className="space-y-4">
      {assigned && assigned.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {assigned.map((r) => (
            <Badge key={r.id} variant="outline" className="gap-1 pr-1">
              {r.name}
              <button
                type="button"
                aria-label={`Quitar rol ${r.name}`}
                onClick={() => unassign(r.id)}
                className="hover:bg-muted ml-0.5 rounded-sm p-0.5"
              >
                <X size={12} />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Sin roles asignados</p>
      )}

      <Select
        value={selected}
        onValueChange={handleAssign}
        disabled={assigning || assignable.length === 0}
      >
        <SelectTrigger size="sm" className="w-64">
          <SelectValue
            placeholder={
              assignable.length === 0 ? 'No hay más roles' : 'Asignar rol…'
            }
          />
        </SelectTrigger>
        <SelectContent>
          {assignable.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name}
              <span className="text-muted-foreground ml-1 font-mono text-xs">
                {r.code}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
