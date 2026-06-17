import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

/**
 * Guarda de rutas: deja pasar solo si hay sesión; si no, redirige a /login.
 * Se usa como ruta `element` envolviendo a las rutas privadas.
 */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
