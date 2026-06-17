import { Outlet } from 'react-router-dom';

/**
 * Layout de rutas públicas (login). Fondo neutro con el contenido centrado,
 * sin sidebar ni topbar.
 */
export function AuthLayout() {
  return (
    <div className="bg-muted/40 flex min-h-svh items-center justify-center p-4">
      <Outlet />
    </div>
  );
}
