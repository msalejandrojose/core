import { useEffect } from 'react';
import {
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/react';
import { Redirect, Route, useLocation } from 'react-router-dom';
import {
  add,
  barChart,
  barChartOutline,
  calendar,
  calendarOutline,
  home,
  homeOutline,
  people,
  peopleOutline,
} from 'ionicons/icons';
import TodayPage from '@/features/ritmo/TodayPage';
import ProgressPage from '@/features/ritmo/progress/ProgressPage';
import GoalsPage from '@/features/ritmo/progress/GoalsPage';
import NewGoalPage from '@/features/ritmo/progress/NewGoalPage';
import ReportPage from '@/features/ritmo/progress/ReportPage';
import WeeklySummaryPage from '@/features/ritmo/progress/WeeklySummaryPage';
import MedalsPage from '@/features/ritmo/progress/MedalsPage';
import DigestionPage from '@/features/ritmo/progress/DigestionPage';
import SharePage from '@/features/ritmo/progress/SharePage';
import YearPage from '@/features/ritmo/progress/YearPage';
import SessionEditPage from '@/features/ritmo/performance/SessionEditPage';
import HistoryPage from '@/features/ritmo/performance/HistoryPage';
import ExercisesPage from '@/features/ritmo/performance/ExercisesPage';
import PerformancePage from '@/features/ritmo/performance/PerformancePage';
import StrengthPerfPage from '@/features/ritmo/performance/StrengthPerfPage';
import MusclesPage from '@/features/ritmo/performance/MusclesPage';
import CardioPerfPage from '@/features/ritmo/performance/CardioPerfPage';
import LoadPage from '@/features/ritmo/performance/LoadPage';
import HybridPage from '@/features/ritmo/performance/HybridPage';
import { RegisterSheets } from '@/features/ritmo/RegisterSheets';
import FoodDayPage from '@/features/ritmo/pages/FoodDayPage';
import RecipesPage from '@/features/ritmo/pages/RecipesPage';
import NewRecipePage from '@/features/ritmo/pages/NewRecipePage';
import RecoveryPage from '@/features/ritmo/pages/RecoveryPage';
import AlertsPage from '@/features/ritmo/pages/AlertsPage';
import { useRegisterStore } from '@/features/ritmo/register.store';
import NotificationsPage from '@/features/notifications/NotificationsPage';
import { useHevyAutoSync } from '@/features/ritmo/profile/hevy.api';
import PlanPage from '@/features/ritmo/plan/PlanPage';
import EditSessionPage from '@/features/ritmo/plan/EditSessionPage';
import DietPage from '@/features/ritmo/plan/DietPage';
import ShoppingPage from '@/features/ritmo/plan/ShoppingPage';
import FriendsPage from '@/features/ritmo/social/FriendsPage';
import FriendPage from '@/features/ritmo/social/FriendPage';
import ChallengesPage from '@/features/ritmo/social/ChallengesPage';
import RitmoProfilePage from '@/features/ritmo/profile/ProfilePage';
import ConnectionsPage from '@/features/ritmo/profile/ConnectionsPage';
import HevyConnectPage from '@/features/ritmo/profile/HevyConnectPage';
import GarminConnectPage from '@/features/ritmo/profile/GarminConnectPage';
import { useGarminAutoSync } from '@/features/ritmo/profile/garmin.api';
import DeleteAccountPage from '@/features/ritmo/profile/DeleteAccountPage';
import ProfilePage from '@/features/profile/ProfilePage';
import ChangePasswordPage from '@/features/profile/ChangePasswordPage';
import { useUnreadStore } from '@/features/notifications/notifications.store';
import { usePushNotifications } from '@/features/notifications/use-push-notifications';
import { Snackbar } from '@/components/ux';

/**
 * El + central. `IonTabBar` solo pinta hijos que sean pestañas (y descarta el
 * resto), así que se marca con `isTabButton` para ocupar su hueco en la barra.
 * A diferencia de una `IonTabButton`, NO llama al `onClick` que le inyecta la
 * barra: ese cambiaría a la pestaña "register", que no existe, y IonTabs avisa
 * con un error. Aquí solo abre la hoja Registrar.
 */
function RegisterTabButton({ onOpen }: { tab: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      className="ritmo-tab-register"
      aria-label="Registrar"
      onClick={onOpen}
    >
      <span className="ritmo-tab-register__fab" aria-hidden="true">
        <IonIcon icon={add} />
      </span>
    </button>
  );
}
RegisterTabButton.isTabButton = true;

/** Pestañas en el orden fijo del DS (TabBar): el + va en el centro. */
const TABS = [
  { tab: 'today', href: '/tabs/today', label: 'Hoy', icon: homeOutline, active: home },
  { tab: 'plan', href: '/tabs/plan', label: 'Plan', icon: calendarOutline, active: calendar },
  { tab: 'progress', href: '/tabs/progress', label: 'Progreso', icon: barChartOutline, active: barChart },
  { tab: 'social', href: '/tabs/social', label: 'Social', icon: peopleOutline, active: people },
] as const;

/**
 * Shell del área autenticada de Ritmo con la barra de pestañas del diseño:
 * Hoy · Plan · + · Progreso · Social. El + central no es una pestaña: abre la
 * hoja "Registrar" encima de la pantalla en la que estés.
 *
 * Notificaciones y Ajustes dejan de ser pestañas (el DS fija cinco): se entra
 * desde la campana y el avatar de la cabecera de Hoy, y sus rutas no cambian.
 *
 * Las hojas de registro y el snackbar se montan aquí, una sola vez, para que
 * se puedan abrir desde cualquier pestaña.
 */
export default function TabsShell() {
  useHevyAutoSync();
  useGarminAutoSync();
  const { pathname } = useLocation();
  const refreshUnread = useUnreadStore((s) => s.refresh);
  const openRegister = useRegisterStore((s) => s.open);

  // Push nativas: registra el dispositivo y engancha recepción/tap (no-op en
  // web/PWA). Vive aquí para arrancar una vez al entrar al área autenticada.
  usePushNotifications();

  // Contador de la campana de Hoy al entrar en el área autenticada.
  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread]);

  const tabButton = ({ tab, href, label, icon, active }: (typeof TABS)[number]) => {
    const selected = pathname.startsWith(href);
    return (
      <IonTabButton key={tab} tab={tab} href={href}>
        <IonIcon icon={selected ? active : icon} aria-hidden="true" />
        <IonLabel>{label}</IonLabel>
      </IonTabButton>
    );
  };

  return (
    <>
      <IonTabs>
        <IonRouterOutlet>
          <Route exact path="/tabs/today" component={TodayPage} />
          <Route exact path="/tabs/today/comida" component={FoodDayPage} />
          <Route exact path="/tabs/today/recetas" component={RecipesPage} />
          <Route exact path="/tabs/today/recetas/nueva" component={NewRecipePage} />
          <Route exact path="/tabs/today/recuperacion" component={RecoveryPage} />
          <Route exact path="/tabs/today/avisos" component={AlertsPage} />
          <Route exact path="/tabs/today/entreno/:id" component={SessionEditPage} />
          <Route exact path="/tabs/plan" component={PlanPage} />
          <Route exact path="/tabs/plan/sesion/:day" component={EditSessionPage} />
          <Route exact path="/tabs/plan/dieta" component={DietPage} />
          <Route exact path="/tabs/plan/compra" component={ShoppingPage} />
          <Route exact path="/tabs/progress" component={ProgressPage} />
          <Route exact path="/tabs/progress/objetivos" component={GoalsPage} />
          <Route exact path="/tabs/progress/objetivos/nuevo" component={NewGoalPage} />
          <Route exact path="/tabs/progress/informe" component={ReportPage} />
          <Route exact path="/tabs/progress/resumen" component={WeeklySummaryPage} />
          <Route exact path="/tabs/progress/medallas" component={MedalsPage} />
          <Route exact path="/tabs/progress/digestion" component={DigestionPage} />
          <Route exact path="/tabs/progress/compartir" component={SharePage} />
          <Route exact path="/tabs/progress/anual" component={YearPage} />
          <Route exact path="/tabs/progress/rendimiento" component={PerformancePage} />
          <Route exact path="/tabs/progress/rendimiento/fuerza" component={StrengthPerfPage} />
          <Route exact path="/tabs/progress/rendimiento/musculos" component={MusclesPage} />
          <Route exact path="/tabs/progress/rendimiento/cardio" component={CardioPerfPage} />
          <Route exact path="/tabs/progress/rendimiento/carga" component={LoadPage} />
          <Route exact path="/tabs/progress/rendimiento/hibrido" component={HybridPage} />
          <Route exact path="/tabs/progress/rendimiento/entrenos" component={HistoryPage} />
          <Route exact path="/tabs/progress/rendimiento/entrenos/:id" component={SessionEditPage} />
          <Route exact path="/tabs/progress/rendimiento/ejercicios" component={ExercisesPage} />
          <Route exact path="/tabs/social" component={FriendsPage} />
          <Route exact path="/tabs/social/retos" component={ChallengesPage} />
          <Route exact path="/tabs/social/amigo/:id" component={FriendPage} />
          <Route exact path="/tabs/notifications" component={NotificationsPage} />
          <Route exact path="/tabs/settings" component={RitmoProfilePage} />
          <Route exact path="/tabs/settings/conexiones" component={ConnectionsPage} />
          <Route exact path="/tabs/settings/hevy" component={HevyConnectPage} />
          <Route exact path="/tabs/settings/garmin" component={GarminConnectPage} />
          <Route exact path="/tabs/settings/eliminar" component={DeleteAccountPage} />
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
          {tabButton(TABS[0])}
          {tabButton(TABS[1])}
          <RegisterTabButton tab="register" onOpen={() => openRegister('menu')} />
          {tabButton(TABS[2])}
          {tabButton(TABS[3])}
        </IonTabBar>
      </IonTabs>

      <RegisterSheets />
      <Snackbar />
    </>
  );
}
