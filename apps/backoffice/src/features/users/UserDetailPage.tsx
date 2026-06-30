import { ArrowLeft, Calendar, Mail, ShieldCheck } from 'lucide-react';
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
import { DeactivateUserDialog } from './components/DeactivateUserDialog';
import { EditUserForm } from './components/EditUserForm';
import { ReactivateUserButton } from './components/ReactivateUserButton';
import { UserPermissionsPanel } from './components/UserPermissionsPanel';
import { UserRolesCard } from './components/UserRolesCard';
import { useUser } from './hooks/use-user';

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

export function UserDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: user, isLoading } = useUser(id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
        </Button>
        <h1 className="text-2xl font-semibold">Detalle de usuario</h1>
        {user && (
          <Badge variant={user.isActive ? 'default' : 'secondary'}>
            {user.isActive ? 'Activo' : 'Inactivo'}
          </Badge>
        )}
      </div>

      {isLoading || !user ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Columna principal */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Información general</CardTitle>
              </CardHeader>
              <CardContent>
                <EditUserForm key={user.id} user={user} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Roles</CardTitle>
              </CardHeader>
              <CardContent>
                <UserRolesCard userId={user.id} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Permisos directos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-muted-foreground text-sm">
                  Overrides por sección que se aplican sobre los permisos
                  heredados de los roles. Elige <code>NONE</code> para quitar el
                  override y volver a heredar de los roles.
                </p>
                <UserPermissionsPanel userId={user.id} />
              </CardContent>
            </Card>

            {user.isActive ? (
              <DangerZone
                description="El usuario no podrá iniciar sesión. Se puede reactivar después."
                action={<DeactivateUserDialog id={user.id} />}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Reactivar usuario</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground text-sm">
                    El usuario está desactivado y no puede iniciar sesión.
                    Reactívalo para devolverle el acceso.
                  </p>
                  <ReactivateUserButton id={user.id} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar: resumen */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Resumen</CardTitle>
              </CardHeader>
              <CardContent className="divide-y px-4 py-0">
                <SummaryRow icon={<ShieldCheck size={14} />} label="Estado">
                  <Badge variant={user.isActive ? 'default' : 'secondary'} className="text-xs">
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                </SummaryRow>
                <SummaryRow icon={<Mail size={14} />} label="Email">
                  <span className="break-all font-mono text-xs">{user.email}</span>
                </SummaryRow>
                {'userType' in user && (
                  <SummaryRow icon={<ShieldCheck size={14} />} label="Tipo">
                    <Badge variant="outline" className="text-xs">
                      {(user as { userType: string }).userType}
                    </Badge>
                  </SummaryRow>
                )}
                {'createdAt' in user && (
                  <SummaryRow icon={<Calendar size={14} />} label="Miembro desde">
                    <span className="text-muted-foreground tabular-nums">
                      {new Date((user as { createdAt: string }).createdAt).toLocaleDateString('es-ES', { dateStyle: 'medium' })}
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
