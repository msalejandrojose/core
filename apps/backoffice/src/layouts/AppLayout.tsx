import { Outlet } from 'react-router-dom';
import { AppHeader } from '@/components/navigation/AppHeader';

/**
 * Shell de las rutas privadas: header con navegación en pestañas (sin sidebar
 * lateral) y el contenido a ancho completo debajo.
 */
export function AppLayout() {
  return (
    <div className="bg-muted/40 flex min-h-svh flex-col">
      <AppHeader />
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
