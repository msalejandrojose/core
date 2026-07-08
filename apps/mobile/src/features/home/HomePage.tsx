import { useEffect, useState } from 'react';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import {
  chevronForward,
  colorPaletteOutline,
  notificationsOutline,
  personOutline,
} from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { ApiError, apiFetch } from '@/lib/api';
import { useAuthStore, type AuthUser } from '@/store/auth.store';

interface Props {
  onOpenNotifications: () => void;
}

/**
 * Home protegida (esqueleto). Al montar valida la sesión contra `GET /auth/me`
 * (y refresca el usuario); si el token ya no vale, cierra sesión. Muestra un
 * saludo, un bloque de ajustes y el cierre de sesión. La fila "Notificaciones"
 * abre el inbox in-app y muestra el número de no leídas.
 */
export default function HomePage({ onOpenNotifications }: Props) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const [unread, setUnread] = useState(0);

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

  useEffect(() => {
    let active = true;
    apiFetch<{ count: number }>('/me/notifications/unread-count')
      .then((res) => {
        if (active) setUnread(res.count);
      })
      .catch(() => {
        // El badge es best-effort; si falla, no rompemos la home.
      });
    return () => {
      active = false;
    };
  }, []);

  async function onLogout() {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // La háptica no existe en web/PWA; no es un error.
    }
    logout();
  }

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

        <p className="core-section-label">Ajustes</p>
        <IonList inset className="core-group">
          <IonItem button detail={false} lines="inset" onClick={onOpenNotifications}>
            <IonIcon slot="start" icon={notificationsOutline} aria-hidden="true" />
            <IonLabel>Notificaciones</IonLabel>
            {unread > 0 ? (
              <span
                slot="end"
                aria-label={`${unread} sin leer`}
                style={{
                  minWidth: 20,
                  height: 20,
                  padding: '0 6px',
                  borderRadius: '9999px',
                  background: 'var(--ion-color-primary)',
                  color: 'var(--ion-color-primary-contrast)',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginInlineEnd: 8,
                }}
              >
                {unread > 99 ? '99+' : unread}
              </span>
            ) : null}
            <IonIcon
              slot="end"
              icon={chevronForward}
              aria-hidden="true"
              style={{ color: 'var(--core-muted)', fontSize: 16 }}
            />
          </IonItem>

          <IonItem detail={false} lines="inset">
            <IonIcon slot="start" icon={personOutline} aria-hidden="true" />
            <IonLabel>Perfil</IonLabel>
          </IonItem>

          <IonItem detail={false} lines="none">
            <IonIcon slot="start" icon={colorPaletteOutline} aria-hidden="true" />
            <IonLabel>Apariencia</IonLabel>
          </IonItem>
        </IonList>

        <IonButton
          expand="block"
          color="danger"
          fill="clear"
          onClick={onLogout}
          style={{ marginTop: 24 }}
        >
          Cerrar sesión
        </IonButton>
      </IonContent>
    </IonPage>
  );
}
