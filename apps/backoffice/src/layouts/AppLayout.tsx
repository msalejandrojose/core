import { Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';

/**
 * Layout de las rutas privadas. Versión mínima (BO-02): topbar con el usuario y
 * botón de logout. El sidebar y la navegación completa llegan en BO-03.
 */
export function AppLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="font-semibold">Core Backoffice</span>
        <div className="flex items-center gap-3">
          {user && (
            <span className="text-muted-foreground text-sm">{user.email}</span>
          )}
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Salir
          </Button>
        </div>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
