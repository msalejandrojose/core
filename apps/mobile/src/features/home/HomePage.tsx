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
import { useSectionsStore } from '@/features/sections/sections.store';
import SectionMenu from '@/features/sections/SectionMenu';
import { SkeletonList, ErrorState, EmptyState } from '@/components/ux';

/**
 * Home protegida (raíz de tab). Saluda al usuario y muestra el menú de accesos
 * a sus secciones (navegación dinámica por permisos, MOB-07). Refresca
 * `/auth/me` al montar; si el token ya no vale, el cliente cierra sesión de
 * forma central. Los KPIs del dashboard llegan en MOB-11.
 */
export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const tree = useSectionsStore((s) => s.tree);
  const status = useSectionsStore((s) => s.status);
  const loadSections = useSectionsStore((s) => s.load);

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

  useEffect(() => {
    void loadSections();
  }, [loadSections]);

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

        <p className="core-section-label">Secciones</p>

        {status === 'loading' || status === 'idle' ? (
          <SkeletonList rows={3} />
        ) : status === 'error' ? (
          <ErrorState
            message="No se pudieron cargar tus secciones."
            onRetry={() => void loadSections(true)}
          />
        ) : tree.length === 0 ? (
          <EmptyState title="No tienes secciones disponibles todavía." />
        ) : (
          <SectionMenu nodes={tree} />
        )}
      </IonContent>
    </IonPage>
  );
}
