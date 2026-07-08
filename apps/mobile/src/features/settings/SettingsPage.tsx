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
import { colorPaletteOutline, personOutline } from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useAuthStore } from '@/store/auth.store';

/**
 * Pantalla de Ajustes (raíz de tab). Agrupa el acceso a perfil y apariencia
 * —aún sin pantalla propia, se implementan en MOB-06 y MOB-17— y el cierre de
 * sesión. Filas tipo ajustes iOS sobre superficie agrupada (DS §1b).
 */
export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  async function onLogout() {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // La háptica no existe en web/PWA; no es un error.
    }
    logout();
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Ajustes</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {user ? (
          <>
            <p className="core-section-label">Cuenta</p>
            <IonList inset className="core-group">
              <IonItem detail lines="inset">
                <span slot="start" className="core-tint-icon" aria-hidden="true">
                  <IonIcon icon={personOutline} />
                </span>
                <IonLabel>
                  <div>Perfil</div>
                  <div style={{ fontSize: 13, color: 'var(--core-muted)' }}>
                    {user.email}
                  </div>
                </IonLabel>
              </IonItem>

              <IonItem detail lines="none">
                <span
                  slot="start"
                  className="core-tint-icon core-tint-icon--purple"
                  aria-hidden="true"
                >
                  <IonIcon icon={colorPaletteOutline} />
                </span>
                <IonLabel>Apariencia</IonLabel>
              </IonItem>
            </IonList>
          </>
        ) : null}

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
