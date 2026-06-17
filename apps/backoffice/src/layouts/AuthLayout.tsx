import { Outlet } from 'react-router-dom';

/**
 * Layout de rutas públicas (login). Centra el contenido en la pantalla.
 * BO-03 puede ampliarlo (branding, ilustración lateral, etc.).
 */
export function AuthLayout() {
  return (
    <div className="bg-muted/40 flex min-h-svh items-center justify-center p-4">
      <Outlet />
    </div>
  );
}
