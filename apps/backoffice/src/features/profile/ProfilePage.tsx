import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChangePasswordForm } from './components/ChangePasswordForm';
import { ProfileForm } from './components/ProfileForm';
import { useMe } from './hooks/use-me';

export function ProfilePage() {
  const { data: user, isLoading } = useMe();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Mi perfil</h1>

      {isLoading || !user ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Información general</CardTitle>
            </CardHeader>
            <CardContent>
              <ProfileForm key={user.id} user={user} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cambiar contraseña</CardTitle>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
