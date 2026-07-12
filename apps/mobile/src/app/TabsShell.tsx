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
  businessOutline,
  notificationsOutline,
  searchOutline,
  settingsOutline,
  ticketOutline,
} from 'ionicons/icons';
import SearchScreen from '@/features/parking/SearchScreen';
import ParkingDetailScreen from '@/features/parking/ParkingDetailScreen';
import MyReservationsScreen from '@/features/parking/MyReservationsScreen';
import ReservationDetailScreen from '@/features/parking/ReservationDetailScreen';
import HostParkingsScreen from '@/features/parking/HostParkingsScreen';
import ParkingFormScreen from '@/features/parking/ParkingFormScreen';
import NotificationsPage from '@/features/notifications/NotificationsPage';
import SettingsPage from '@/features/settings/SettingsPage';
import AppearancePage from '@/features/settings/AppearancePage';
import ProfilePage from '@/features/profile/ProfilePage';
import ChangePasswordPage from '@/features/profile/ChangePasswordPage';
import { useUnreadStore } from '@/features/notifications/notifications.store';
import { usePushNotifications } from '@/features/notifications/use-push-notifications';

/**
 * Shell del área autenticada, específico de Plazza (ver core-architecture
 * §6.5: las tabs genéricas del shell base se sustituyen aquí, dentro de la
 * rama del proyecto). Tab bar: Buscar (huésped) / Reservas (huésped) / Host
 * (plazas + reservas recibidas) / Notificaciones / Ajustes.
 */
export default function TabsShell() {
  const { t } = useTranslation();
  const unread = useUnreadStore((s) => s.unread);
  const refreshUnread = useUnreadStore((s) => s.refresh);

  // Push nativas: registra el dispositivo y engancha recepción/tap (no-op en
  // web/PWA). Vive aquí para arrancar una vez al entrar al área autenticada.
  usePushNotifications();

  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread]);

  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/tabs/search" component={SearchScreen} />
        <Route exact path="/tabs/search/p/:id" component={ParkingDetailScreen} />
        <Route exact path="/tabs/reservations" component={MyReservationsScreen} />
        <Route exact path="/tabs/reservations/:id" component={ReservationDetailScreen} />
        <Route exact path="/tabs/host" component={HostParkingsScreen} />
        <Route exact path="/tabs/host/parkings/:id" component={ParkingFormScreen} />
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
          <Redirect to="/tabs/search" />
        </Route>
        <Route render={() => <Redirect to="/tabs/search" />} />
      </IonRouterOutlet>

      <IonTabBar slot="bottom">
        <IonTabButton tab="search" href="/tabs/search">
          <IonIcon icon={searchOutline} aria-hidden="true" />
          <IonLabel>{t('tabs.search')}</IonLabel>
        </IonTabButton>
        <IonTabButton tab="reservations" href="/tabs/reservations">
          <IonIcon icon={ticketOutline} aria-hidden="true" />
          <IonLabel>{t('tabs.reservations')}</IonLabel>
        </IonTabButton>
        <IonTabButton tab="host" href="/tabs/host">
          <IonIcon icon={businessOutline} aria-hidden="true" />
          <IonLabel>{t('tabs.host')}</IonLabel>
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
