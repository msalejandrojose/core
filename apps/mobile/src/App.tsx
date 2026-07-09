import { IonApp, IonRouterOutlet, IonSpinner } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import LoginPage from '@/features/auth/LoginPage';
import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/features/auth/ResetPasswordPage';
import VerifyEmailPage from '@/features/auth/VerifyEmailPage';
import TabsShell from '@/app/TabsShell';
import { ErrorBoundary, OfflineBanner } from '@/components/ux';

/**
 * Raíz de rutas de la app. El estado de sesión gatea el acceso mediante
 * redirecciones (patrón canónico de Ionic):
 *   - Rutas públicas (`/verify-email`, `/reset-password`) accesibles con o sin
 *     sesión, porque se abren desde enlaces de email.
 *   - `/login` y `/forgot` solo sin sesión.
 *   - `/tabs/*` (área autenticada) solo con sesión.
 * El refresh de token queda fuera de alcance: la API aún no expone endpoint de
 * refresh (ver tarea "Refresh tokens y sesiones revocables").
 */
export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const home = '/tabs/home';

  // La sesión se rehidrata de forma asíncrona (Capacitor Preferences). Hasta que
  // termina mostramos un splash: así el auto-login no parpadea el login primero.
  if (!hasHydrated) {
    return (
      <IonApp>
        <div
          style={{
            display: 'grid',
            placeItems: 'center',
            height: '100%',
            background: 'var(--ion-background-color)',
          }}
        >
          <IonSpinner name="crescent" />
        </div>
      </IonApp>
    );
  }

  return (
    <IonApp>
      <ErrorBoundary>
        <IonReactRouter>
          <IonRouterOutlet>
            {/* Públicas (enlaces de email): válidas con o sin sesión. */}
            <Route exact path="/verify-email" component={VerifyEmailPage} />
            <Route exact path="/reset-password" component={ResetPasswordPage} />

            {/* Solo sin sesión. */}
            <Route
              exact
              path="/login"
              render={() =>
                isAuthenticated ? <Redirect to={home} /> : <LoginPage />
              }
            />
            <Route
              exact
              path="/forgot"
              render={() =>
                isAuthenticated ? (
                  <Redirect to={home} />
                ) : (
                  <ForgotPasswordPage />
                )
              }
            />

            {/* Área autenticada. */}
            <Route
              path="/tabs"
              render={() =>
                isAuthenticated ? <TabsShell /> : <Redirect to="/login" />
              }
            />

            {/* Entrada y fallback. */}
            <Route
              exact
              path="/"
              render={() => <Redirect to={isAuthenticated ? home : '/login'} />}
            />
            <Route
              render={() => <Redirect to={isAuthenticated ? home : '/login'} />}
            />
          </IonRouterOutlet>
        </IonReactRouter>
        <OfflineBanner />
      </ErrorBoundary>
    </IonApp>
  );
}
