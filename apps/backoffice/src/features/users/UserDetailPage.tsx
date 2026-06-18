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
import { DeactivateUserDialog } from './components/DeactivateUserDialog';
import { EditUserForm } from './components/EditUserForm';
import { UserRolesCard } from './components/UserRolesCard';
import { useUser } from './hooks/use-user';

export function UserDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: user, isLoading } = useUser(id);

  return (
    <div className="max-w-2xl space-y-6">
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
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
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

          {user.isActive && (
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-destructive">
                  Zona de peligro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DeactivateUserDialog id={user.id} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
