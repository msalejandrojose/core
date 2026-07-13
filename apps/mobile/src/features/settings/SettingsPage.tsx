import {
  IonBackButton,
  IonButton,
  IonButtons,
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
import { useTranslation } from 'react-i18next';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useAuthStore } from '@/store/auth.store';

/**
 * Pantalla de Ajustes. Agrupa el acceso a perfil y apariencia y el cierre de
 * sesión. Filas tipo ajustes iOS sobre superficie agrupada (DS §1b). En
 * Andanzas se llega desde el tab "Perfil" (TASK-180), no tiene tab propia,
 * así que lleva botón de volver.
 */
export default function SettingsPage() {
  const { t } = useTranslation();
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
          <IonButtons slot="start">
            <IonBackButton defaultHref="/tabs/me" text="" />
          </IonButtons>
          <IonTitle>Ajustes</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {user ? (
          <>
            <p className="core-section-label">{t('settings.account')}</p>
            <IonList inset className="core-group">
              <IonItem
                button
                detail
                lines="inset"
                routerLink="/tabs/settings/profile"
                routerDirection="forward"
              >
                <span
                  slot="start"
                  className="core-tint-icon"
                  aria-hidden="true"
                >
                  <IonIcon icon={personOutline} />
                </span>
                <IonLabel>
                  <div>{t('settings.profile')}</div>
                  <div style={{ fontSize: 13, color: 'var(--core-muted)' }}>
                    {user.email}
                  </div>
                </IonLabel>
              </IonItem>

              <IonItem
                button
                detail
                lines="none"
                routerLink="/tabs/settings/appearance"
                routerDirection="forward"
              >
                <span
                  slot="start"
                  className="core-tint-icon core-tint-icon--purple"
                  aria-hidden="true"
                >
                  <IonIcon icon={colorPaletteOutline} />
                </span>
                <IonLabel>{t('settings.appearance')}</IonLabel>
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
          {t('settings.logout')}
        </IonButton>
      </IonContent>
    </IonPage>
  );
}
