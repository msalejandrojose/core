import { ArrowLeft, Code2, Layers } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DangerZone } from '@/components/DangerZone';
import { DeleteRoleDialog } from './components/DeleteRoleDialog';
import { EditRoleForm } from './components/EditRoleForm';
import { RolePermissionsPanel } from './components/RolePermissionsPanel';
import { useRole } from './hooks/use-role';

const SCOPE_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  BACKOFFICE: 'default',
  APP: 'secondary',
  SHARED: 'outline',
};

function SummaryRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-widest">{label}</p>
        <div className="mt-0.5 text-sm">{children}</div>
      </div>
    </div>
  );
}

export function RoleDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: role, isLoading } = useRole(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
        </Button>
        <h1 className="text-2xl font-semibold">Detalle de rol</h1>
        {role && (
          <Badge variant={SCOPE_VARIANT[role.scope] ?? 'outline'}>{role.scope}</Badge>
        )}
      </div>

      {isLoading || !role ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Columna principal */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Información del rol</CardTitle>
              </CardHeader>
              <CardContent>
                <EditRoleForm key={role.id} role={role} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Permisos</CardTitle>
              </CardHeader>
              <CardContent>
                <RolePermissionsPanel roleId={role.id} />
              </CardContent>
            </Card>

            <DangerZone
              description="Eliminar el rol quita sus permisos a los usuarios que lo tengan. No se puede deshacer."
              action={<DeleteRoleDialog id={role.id} />}
            />
          </div>

          {/* Sidebar: resumen */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Resumen</CardTitle>
              </CardHeader>
              <CardContent className="divide-y px-4 py-0">
                <SummaryRow icon={<Code2 size={14} />} label="Código">
                  <span className="font-mono text-xs">{role.code}</span>
                </SummaryRow>
                <SummaryRow icon={<Layers size={14} />} label="Scope">
                  <Badge variant={SCOPE_VARIANT[role.scope] ?? 'outline'} className="text-xs">
                    {role.scope}
                  </Badge>
                </SummaryRow>
                {role.description && (
                  <SummaryRow icon={<Layers size={14} />} label="Descripción">
                    <span className="text-muted-foreground line-clamp-3 text-xs">
                      {role.description}
                    </span>
                  </SummaryRow>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
