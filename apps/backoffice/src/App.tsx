// Rutas declaradas a nivel app. Scaffold: solo redirige a /dashboard.
// BO-02 añade /login y guards de autenticación.
// BO-03 envuelve las rutas autenticadas en AppLayout.

import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  {
    path: '/dashboard',
    element: (
      <main className="p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Core Backoffice</h1>
        <p className="text-zinc-600">Scaffold listo. BO-02 implementa /login y BO-03 los layouts.</p>
      </main>
    ),
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
