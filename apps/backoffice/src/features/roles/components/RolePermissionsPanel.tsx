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

/**
 * Tabla de ApiSections con un selector de nivel por fila. Al elegir un nivel se
 * hace upsert (grant); elegir `NONE` revoca el permiso (vuelve a "sin permiso").
 */
export function RolePermissionsPanel({ roleId }: { roleId: string }) {
  const { data: permissions, isLoading: loadingPerms } =
    useRolePermissions(roleId);
  const { data: sections, isLoading: loadingSections } = useApiSections();
  const { mutate: grant } = useGrantRolePermission(roleId);
  const { mutate: revoke } = useRevokeRolePermission(roleId);

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
