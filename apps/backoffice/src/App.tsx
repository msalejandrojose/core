import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/**
 * Placeholder de arranque (BO-01). Las rutas reales (login, layouts, módulos)
 * llegan en BO-02 y siguientes; aquí solo se verifica que el scaffold corre.
 */
function Placeholder() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Core · Backoffice</h1>
      <p className="text-muted-foreground text-sm">
        Scaffold listo. Las rutas se implementan en BO-02.
      </p>
      <Button>Todo en orden</Button>
    </main>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Placeholder />,
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
