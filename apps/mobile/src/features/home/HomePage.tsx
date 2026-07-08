import { useEffect } from 'react';
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

// Filas de ajustes de ejemplo (esqueleto). Cuando existan las pantallas reales,
// cada una navegará a su detalle.
const SETTINGS_ROWS = [
  { icon: personOutline, label: 'Perfil' },
  { icon: notificationsOutline, label: 'Notificaciones' },
  { icon: colorPaletteOutline, label: 'Apariencia' },
] as const;

/**
 * Home protegida (esqueleto). Al montar valida la sesión contra `GET /auth/me`
 * (y refresca el usuario); si el token ya no vale, cierra sesión. Muestra un
 * saludo, un bloque de ajustes de ejemplo y el cierre de sesión.
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
          {SETTINGS_ROWS.map((row) => (
            <IonItem key={row.label} button detail={false} lines="inset">
              <IonIcon slot="start" icon={row.icon} aria-hidden="true" />
              <IonLabel>{row.label}</IonLabel>
              <IonIcon
                slot="end"
                icon={chevronForward}
                aria-hidden="true"
                style={{ color: 'var(--core-muted)', fontSize: 16 }}
              />
            </IonItem>
          ))}
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
