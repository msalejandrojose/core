import { useEffect } from 'react';
import {
  IonBadge,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/react';
import { Redirect, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  flameOutline,
  notificationsOutline,
  settingsOutline,
  trendingUpOutline,
} from 'ionicons/icons';
import TodayPage from '@/features/nutre/TodayPage';
import ProgressPage from '@/features/nutre/ProgressPage';
import OnboardingPage from '@/features/nutre/OnboardingPage';
import NotificationsPage from '@/features/notifications/NotificationsPage';
import SettingsPage from '@/features/settings/SettingsPage';
import AppearancePage from '@/features/settings/AppearancePage';
import ProfilePage from '@/features/profile/ProfilePage';
import ChangePasswordPage from '@/features/profile/ChangePasswordPage';
import { useUnreadStore } from '@/features/notifications/notifications.store';
import { usePushNotifications } from '@/features/notifications/use-push-notifications';

/**
 * Shell del área autenticada de Nutre: tab bar inferior (Hoy / Progreso /
 * Notificaciones / Ajustes) sobre un `IonRouterOutlet`, cada tab con su propio
 * stack de navegación. La ruta base `/tabs/today` y un fallback cubren
 * cualquier ruta no reconocida (p. ej. venir de `/login` tras autenticarse).
 *
 * Sustituye las tabs genéricas del shell base (Inicio con KPIs + secciones
 * dinámicas), que son de un companion app interno y no de este producto. Se
 * modifica aquí, en la rama del proyecto, en vez de abstraer un sistema de tabs
 * "pluggable" en `main`: con un solo proyecto consumiéndolo sería una
 * abstracción prematura.
 *
 * Las tabs de registro (comida, actividad, peso) NO existen: son sheets que se
 * abren desde el FAB de Hoy, que es donde cae el pulgar.
 */
export default function TabsShell() {
  const { t } = useTranslation();
  const unread = useUnreadStore((s) => s.unread);
  const refreshUnread = useUnreadStore((s) => s.refresh);

  // Push nativas: registra el dispositivo y engancha recepción/tap (no-op en
  // web/PWA). Vive aquí para arrancar una vez al entrar al área autenticada.
  usePushNotifications();

  // Contador del badge al entrar en el área autenticada; el inbox lo mantiene
  // en sync a partir de aquí (marcar leídas actualiza el store compartido).
  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread]);

  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/tabs/today" component={TodayPage} />
        <Route
          exact
          path="/tabs/today/onboarding"
          component={OnboardingPage}
        />
        <Route exact path="/tabs/progress" component={ProgressPage} />
        {/* Editar el objetivo reutiliza la pantalla de onboarding. */}
        <Route exact path="/tabs/progress/goal" component={OnboardingPage} />
        <Route exact path="/tabs/notifications" component={NotificationsPage} />
        <Route exact path="/tabs/settings" component={SettingsPage} />
        <Route
          exact
          path="/tabs/settings/appearance"
          component={AppearancePage}
        />
        <Route exact path="/tabs/settings/profile" component={ProfilePage} />
        <Route
          exact
          path="/tabs/settings/change-password"
          component={ChangePasswordPage}
        />
        <Route exact path="/tabs">
          <Redirect to="/tabs/today" />
        </Route>
        <Route render={() => <Redirect to="/tabs/today" />} />
      </IonRouterOutlet>

      <IonTabBar slot="bottom">
        <IonTabButton tab="today" href="/tabs/today">
          <IonIcon icon={flameOutline} aria-hidden="true" />
          <IonLabel>{t('tabs.today')}</IonLabel>
        </IonTabButton>
        <IonTabButton tab="progress" href="/tabs/progress">
          <IonIcon icon={trendingUpOutline} aria-hidden="true" />
          <IonLabel>{t('tabs.progress')}</IonLabel>
        </IonTabButton>
        <IonTabButton tab="notifications" href="/tabs/notifications">
          <IonIcon icon={notificationsOutline} aria-hidden="true" />
          <IonLabel>{t('tabs.notifications')}</IonLabel>
          {unread > 0 ? (
            <IonBadge color="primary">{unread > 99 ? '99+' : unread}</IonBadge>
          ) : null}
        </IonTabButton>
        <IonTabButton tab="settings" href="/tabs/settings">
          <IonIcon icon={settingsOutline} aria-hidden="true" />
          <IonLabel>{t('tabs.settings')}</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
}
