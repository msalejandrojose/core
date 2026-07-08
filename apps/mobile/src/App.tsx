import { IonApp } from '@ionic/react';
import { useAuthStore } from '@/store/auth.store';
import LoginPage from '@/features/auth/LoginPage';
import HomePage from '@/features/home/HomePage';

/**
 * Esqueleto de navegación de la app. Con solo dos pantallas (login + home) se
 * resuelve por estado de sesión, sin router. Cuando entren más pantallas,
 * migrar a `@ionic/react-router` (IonReactRouter + IonRouterOutlet).
 */
export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <IonApp>{isAuthenticated ? <HomePage /> : <LoginPage />}</IonApp>;
}
