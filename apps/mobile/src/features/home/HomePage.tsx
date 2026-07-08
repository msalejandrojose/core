import { useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { ApiError, apiFetch } from '@/lib/api';
import { useAuthStore, type AuthUser } from '@/store/auth.store';

/**
 * Home protegida (raíz de tab). Al montar valida la sesión contra `GET /auth/me`
 * y refresca el usuario; si el token ya no vale, cierra sesión. De momento es un
 * saludo editorial; el dashboard real con KPIs y accesos llega en MOB-11.
 */
export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    let active = true;
    apiFetch<AuthUser>('/auth/me')
      .then((me) => {
        if (active) setUser(me);
      })
      .catch((err) => {
        // Token expirado/invalidado → a la pantalla de login.
        if (err instanceof ApiError && err.status === 401) logout();
      });
    return () => {
      active = false;
    };
  }, [setUser, logout]);

  const greetingName = user?.firstName?.trim() || 'Hola';

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Core</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <h2
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--ion-text-color)',
            margin: '8px 4px 4px',
          }}
        >
          {greetingName}
        </h2>
        <p style={{ color: 'var(--core-muted)', margin: '0 4px 24px', fontSize: 15 }}>
          {user?.email ?? 'Sesión iniciada'}
        </p>
      </IonContent>
    </IonPage>
  );
}
