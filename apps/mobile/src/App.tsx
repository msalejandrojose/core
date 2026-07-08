import { useState } from 'react';
import { IonApp } from '@ionic/react';
import { useAuthStore } from '@/store/auth.store';
import LoginPage from '@/features/auth/LoginPage';
import HomePage from '@/features/home/HomePage';
import NotificationsPage from '@/features/notifications/NotificationsPage';

/** Pantallas del área autenticada. */
type Screen = 'home' | 'notifications';

/**
 * Navegación del área autenticada. Con pocas pantallas se resuelve con un
 * estado local en vez de arrastrar `@ionic/react-router`; cuando el árbol de
 * navegación crezca (varios niveles, deep-linking), migrar a IonReactRouter.
 */
function AuthedApp() {
  const [screen, setScreen] = useState<Screen>('home');

  if (screen === 'notifications') {
    return <NotificationsPage onBack={() => setScreen('home')} />;
  }
  return <HomePage onOpenNotifications={() => setScreen('notifications')} />;
}

/**
 * Esqueleto de navegación de la app. El estado de sesión decide login vs área
 * autenticada; dentro de esta, `AuthedApp` gestiona la pantalla activa.
 */
export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <IonApp>{isAuthenticated ? <AuthedApp /> : <LoginPage />}</IonApp>;
}
