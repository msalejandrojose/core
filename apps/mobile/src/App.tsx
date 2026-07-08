import { IonApp, IonRouterOutlet } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import LoginPage from '@/features/auth/LoginPage';
import TabsShell from '@/app/TabsShell';

/**
 * Raíz de la app. El estado de sesión decide qué árbol de rutas se monta: el
 * shell de tabs (área autenticada) o el flujo de login. Ambos viven bajo un
 * único `IonReactRouter`, así que al autenticarse/cerrar sesión el outlet se
 * intercambia con la transición nativa de Ionic.
 */
export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <IonApp>
      <IonReactRouter>
        {isAuthenticated ? (
          <TabsShell />
        ) : (
          <IonRouterOutlet>
            <Route exact path="/login" component={LoginPage} />
            <Route render={() => <Redirect to="/login" />} />
          </IonRouterOutlet>
        )}
      </IonReactRouter>
    </IonApp>
  );
}
