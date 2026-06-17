import { ArrowLeft } from 'lucide-react';
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
import { DeleteRoleDialog } from './components/DeleteRoleDialog';
import { EditRoleForm } from './components/EditRoleForm';
import { RolePermissionsPanel } from './components/RolePermissionsPanel';
import { useRole } from './hooks/use-role';

export function RoleDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: role, isLoading } = useRole(id);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
        </Button>
        <h1 className="text-2xl font-semibold">Detalle de rol</h1>
        {role && <Badge variant="outline">{role.scope}</Badge>}
      </div>

      {isLoading || !role ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
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

          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive">Zona de peligro</CardTitle>
            </CardHeader>
            <CardContent>
              <DeleteRoleDialog id={role.id} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
