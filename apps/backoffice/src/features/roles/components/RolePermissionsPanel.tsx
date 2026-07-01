import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiSections } from '../hooks/use-api-sections';
import { useGrantRolePermission } from '../hooks/use-grant-role-permission';
import { useRevokeRolePermission } from '../hooks/use-revoke-role-permission';
import { useRolePermissions } from '../hooks/use-role-permissions';
import { PERMISSION_LEVELS, type PermissionLevel } from '../types';

export function RolePermissionsPanel({ roleId }: { roleId: string }) {
  const { data: permissions, isLoading: loadingPerms } = useRolePermissions(roleId);
  const { data: sections, isLoading: loadingSections } = useApiSections();
  const { mutate: grant } = useGrantRolePermission(roleId);
  const { mutate: revoke, isPending: isRevoking } = useRevokeRolePermission(roleId);

  const [search, setSearch] = useState('');
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);

  const permMap = new Map(
    (permissions ?? []).map((p: any) => [p.apiSectionId, p.level]),
  );

  function handleChange(sectionId: string, level: PermissionLevel) {
    if (level === 'NONE') {
      const current = permMap.get(sectionId);
      if (current && current !== 'NONE') {
        setPendingRevokeId(sectionId);
      }
    } else {
      grant({ sectionId, level });
    }
  }

  function confirmRevoke() {
    if (pendingRevokeId) {
      revoke(pendingRevokeId, { onSuccess: () => setPendingRevokeId(null) });
    }
  }

  function cancelRevoke() {
    setPendingRevokeId(null);
  }

  const list = useMemo(() => {
    const all = sections?.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (s: any) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q),
    );
  }, [sections, search]);

  if (loadingPerms || loadingSections) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if ((sections?.data ?? []).length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No hay secciones disponibles.</p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={13} className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2" />
        <Input
          className="h-8 pl-7 text-sm"
          placeholder="Filtrar secciones…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {list.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-sm">Sin resultados para "{search}"</p>
      ) : (
        <div className="space-y-0">
          {list.map((section: any) => {
            const current: PermissionLevel = (permMap.get(section.id) ?? 'NONE') as PermissionLevel;
            const isPendingRevoke = pendingRevokeId === section.id;

            return (
              <div key={section.id}>
                <div className="flex items-center justify-between gap-4 border-b py-2 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{section.name}</p>
                    <p className="text-muted-foreground truncate font-mono text-xs">
                      {section.code}
                    </p>
                  </div>
                  <Select
                    value={isPendingRevoke ? 'NONE' : current}
                    onValueChange={(v) => handleChange(section.id, v as PermissionLevel)}
                  >
                    <SelectTrigger size="sm" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERMISSION_LEVELS.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isPendingRevoke && (
                  <div className="bg-destructive/5 flex items-center gap-3 rounded-md px-3 py-2 text-xs">
                    <span className="text-muted-foreground flex-1">¿Quitar permiso sobre <strong>{section.name}</strong>?</span>
                    <button
                      type="button"
                      onClick={cancelRevoke}
                      className="text-muted-foreground hover:text-foreground font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={confirmRevoke}
                      disabled={isRevoking}
                      className="text-destructive font-medium disabled:opacity-50"
                    >
                      {isRevoking ? 'Quitando…' : 'Confirmar'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
