import { useEffect } from 'react';
import {
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/react';
import { Redirect, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listOutline, mapOutline, peopleOutline, personCircleOutline } from 'ionicons/icons';
import MapPage from '@/features/map/MapPage';
import MyListPage from '@/features/my-list/MyListPage';
import FeedPage from '@/features/feed/FeedPage';
import MePage from '@/features/me/MePage';
import NotificationsPage from '@/features/notifications/NotificationsPage';
import SettingsPage from '@/features/settings/SettingsPage';
import AppearancePage from '@/features/settings/AppearancePage';
import ProfilePage from '@/features/profile/ProfilePage';
import ChangePasswordPage from '@/features/profile/ChangePasswordPage';
import { useUnreadStore } from '@/features/notifications/notifications.store';
import { usePushNotifications } from '@/features/notifications/use-push-notifications';

/**
 * Shell del área autenticada de Andanzas (TASK-180): sustituye las tabs
 * genéricas de `TabsShell` (Inicio/KPIs, Notificaciones, Ajustes — pensadas
 * para un companion app interno) por las propias del producto: Mapa, Mi
 * lista, Feed, Perfil. Notificaciones y Ajustes se conservan tal cual (se
 * reutiliza el shell base, TASK-173) pero dejan de tener tab propia: se
 * llega a ellas desde el tab "Perfil".
 */
export default function AndanzasTabsShell() {
  const { t } = useTranslation();
  const refreshUnread = useUnreadStore((s) => s.refresh);

  // Push nativas: registra el dispositivo y engancha recepción/tap (no-op en
  // web/PWA). Vive aquí para arrancar una vez al entrar al área autenticada.
  usePushNotifications();

  // Contador del badge (mostrado en el tab "Perfil") al entrar al área
  // autenticada; el inbox lo mantiene en sync a partir de aquí.
  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread]);

  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/tabs/map" component={MapPage} />
        <Route exact path="/tabs/list" component={MyListPage} />
        <Route exact path="/tabs/feed" component={FeedPage} />
        <Route exact path="/tabs/me" component={MePage} />
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
          <Redirect to="/tabs/map" />
        </Route>
        <Route render={() => <Redirect to="/tabs/map" />} />
      </IonRouterOutlet>

      <IonTabBar slot="bottom">
        <IonTabButton tab="map" href="/tabs/map">
          <IonIcon icon={mapOutline} aria-hidden="true" />
          <IonLabel>{t('andanzasTabs.map')}</IonLabel>
        </IonTabButton>
        <IonTabButton tab="list" href="/tabs/list">
          <IonIcon icon={listOutline} aria-hidden="true" />
          <IonLabel>{t('andanzasTabs.myList')}</IonLabel>
        </IonTabButton>
        <IonTabButton tab="feed" href="/tabs/feed">
          <IonIcon icon={peopleOutline} aria-hidden="true" />
          <IonLabel>{t('andanzasTabs.feed')}</IonLabel>
        </IonTabButton>
        <IonTabButton tab="me" href="/tabs/me">
          <IonIcon icon={personCircleOutline} aria-hidden="true" />
          <IonLabel>{t('andanzasTabs.me')}</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
}
