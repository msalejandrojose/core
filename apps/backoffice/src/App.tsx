// Definición de rutas. Scaffold mínimo con /, /login y /dashboard
// como placeholders. BO-02 / BO-03 los reemplazan por las pantallas reales.

import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { DashboardPage } from '@/pages/DashboardPage';
import { LoginPage } from '@/pages/LoginPage';

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/dashboard', element: <DashboardPage /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
