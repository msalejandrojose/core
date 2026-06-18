import { Outlet } from 'react-router-dom';
import { AppHeader } from '@/components/navigation/AppHeader';

/**
 * Shell de las rutas privadas: header con navegación en pestañas (sin sidebar
 * lateral) y el contenido a ancho completo debajo.
 */
export function AppLayout() {
  return (
    <div className="bg-muted/30 flex min-h-svh flex-col">
      <AppHeader />
      <main className="flex-1 px-6 py-8 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
