import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { Topbar } from '@/components/topbar/Topbar';

/**
 * Shell de las rutas privadas: sidebar fijo + topbar, con el área de contenido
 * scrolleable de forma independiente.
 */
export function AppLayout() {
  return (
    <div className="bg-muted/40 flex h-svh overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
