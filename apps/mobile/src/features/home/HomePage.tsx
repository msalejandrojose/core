import { useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';

/**
 * Home protegida (raíz de tab). Al montar valida la sesión contra `GET /auth/me`
 * y refresca el usuario. Si el token ya no vale, el cliente cierra sesión de
 * forma central (401 con token). De momento es un saludo editorial; el
 * dashboard real con KPIs y accesos llega en MOB-11.
 */
export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    let active = true;
    apiClient
      .GET('/auth/me')
      .then(({ data }) => {
        if (active && data) setUser(data);
      })
      .catch(() => {
        // Un 401 ya lo maneja el cliente (logout); el resto es best-effort.
      });
    return () => {
      active = false;
    };
  }, [setUser]);

  const greetingName = user?.firstName?.trim() || 'Hola';

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Core</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <h2 className="core-title" style={{ margin: '8px 4px 4px' }}>
          {greetingName}
        </h2>
        <p className="core-subtitle" style={{ margin: '0 4px 24px' }}>
          {user?.email ?? 'Sesión iniciada'}
        </p>
      </IonContent>
    </IonPage>
  );
}
