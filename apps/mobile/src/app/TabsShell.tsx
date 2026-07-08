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
import {
  homeOutline,
  notificationsOutline,
  settingsOutline,
} from 'ionicons/icons';
import HomePage from '@/features/home/HomePage';
import SectionScreen from '@/features/sections/SectionScreen';
import NotificationsPage from '@/features/notifications/NotificationsPage';
import SettingsPage from '@/features/settings/SettingsPage';
import ProfilePage from '@/features/profile/ProfilePage';
import ChangePasswordPage from '@/features/profile/ChangePasswordPage';
import { useUnreadStore } from '@/features/notifications/notifications.store';

/**
 * Shell del área autenticada: tab bar inferior (Inicio / Notificaciones /
 * Ajustes) sobre un `IonRouterOutlet`, cada tab con su propio stack de
 * navegación. La ruta base `/tabs/home` y un fallback cubren cualquier ruta no
 * reconocida (p. ej. venir de `/login` tras autenticarse).
 */
export default function TabsShell() {
  const unread = useUnreadStore((s) => s.unread);
  const refreshUnread = useUnreadStore((s) => s.refresh);

  // Contador del badge al entrar en el área autenticada; el inbox lo mantiene
  // en sync a partir de aquí (marcar leídas actualiza el store compartido).
  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread]);

  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/tabs/home" component={HomePage} />
        <Route exact path="/tabs/home/s/:code" component={SectionScreen} />
        <Route exact path="/tabs/notifications" component={NotificationsPage} />
        <Route exact path="/tabs/settings" component={SettingsPage} />
        <Route exact path="/tabs/settings/profile" component={ProfilePage} />
        <Route
          exact
          path="/tabs/settings/change-password"
          component={ChangePasswordPage}
        />
        <Route exact path="/tabs">
          <Redirect to="/tabs/home" />
        </Route>
        <Route render={() => <Redirect to="/tabs/home" />} />
      </IonRouterOutlet>

      <IonTabBar slot="bottom">
        <IonTabButton tab="home" href="/tabs/home">
          <IonIcon icon={homeOutline} aria-hidden="true" />
          <IonLabel>Inicio</IonLabel>
        </IonTabButton>
        <IonTabButton tab="notifications" href="/tabs/notifications">
          <IonIcon icon={notificationsOutline} aria-hidden="true" />
          <IonLabel>Notificaciones</IonLabel>
          {unread > 0 ? (
            <IonBadge color="primary">{unread > 99 ? '99+' : unread}</IonBadge>
          ) : null}
        </IonTabButton>
        <IonTabButton tab="settings" href="/tabs/settings">
          <IonIcon icon={settingsOutline} aria-hidden="true" />
          <IonLabel>Ajustes</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
}
