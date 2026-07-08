import { useEffect } from 'react';
import {
  IonButton,
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
          <div className="core-group" style={{ padding: '4px 0' }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  height: 18,
                  margin: '18px 16px',
                  borderRadius: 6,
                  background: 'var(--core-surface-inset)',
                  opacity: 0.7,
                }}
              />
            ))}
          </div>
        ) : status === 'error' ? (
          <div style={{ textAlign: 'center', padding: '32px 24px' }}>
            <p style={{ color: 'var(--core-muted)', marginBottom: 12 }}>
              No se pudieron cargar tus secciones.
            </p>
            <IonButton fill="clear" onClick={() => void loadSections(true)}>
              Reintentar
            </IonButton>
          </div>
        ) : tree.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 24px' }}>
            <p style={{ color: 'var(--core-muted)' }}>
              No tienes secciones disponibles todavía.
            </p>
          </div>
        ) : (
          <SectionMenu nodes={tree} />
        )}
      </IonContent>
    </IonPage>
  );
}
