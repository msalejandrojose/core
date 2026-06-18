import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiSections } from '@/features/roles/hooks/use-api-sections';
import { PERMISSION_LEVELS, type PermissionLevel } from '@/features/roles/types';
import { useGrantUserPermission } from '../hooks/use-grant-user-permission';
import { useRevokeUserPermission } from '../hooks/use-revoke-user-permission';
import { useUserPermissions } from '../hooks/use-user-permissions';

/**
 * Permisos directos (overrides) de un usuario sobre las ApiSections. Mismo
 * patrón que `RolePermissionsPanel`: un selector de nivel por sección hace
 * upsert (grant); elegir `NONE` revoca el override y el usuario vuelve a
 * heredar el nivel de sus roles.
 */
export function UserPermissionsPanel({ userId }: { userId: string }) {
  const { data: permissions, isLoading: loadingPerms } =
    useUserPermissions(userId);
  const { data: sections, isLoading: loadingSections } = useApiSections();
  const { mutate: grant } = useGrantUserPermission(userId);
  const { mutate: revoke } = useRevokeUserPermission(userId);

  const permMap = new Map(
    (permissions ?? []).map((p) => [p.apiSectionId, p.level]),
  );

  function handleChange(sectionId: string, level: PermissionLevel) {
    if (level === 'NONE') revoke(sectionId);
    else grant({ sectionId, level });
  }

  if (loadingPerms || loadingSections) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  const list = sections?.data ?? [];
  if (list.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No hay secciones disponibles.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {list.map((section) => {
        const current: PermissionLevel = permMap.get(section.id) ?? 'NONE';
        return (
          <div
            key={section.id}
            className="flex items-center justify-between gap-4 border-b py-2 last:border-0"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{section.name}</p>
              <p className="text-muted-foreground truncate font-mono text-xs">
                {section.code}
              </p>
            </div>
            <Select
              value={current}
              onValueChange={(v) =>
                handleChange(section.id, v as PermissionLevel)
              }
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
        );
      })}
    </div>
  );
}
