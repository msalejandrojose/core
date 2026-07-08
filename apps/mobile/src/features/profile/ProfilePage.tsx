import { useEffect, useState } from 'react';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { chevronForward, lockClosedOutline } from 'ionicons/icons';
import type { components } from '@core/api-client';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';

type Me = components['schemas']['UserResponseDto'];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

/** Fila de solo lectura: etiqueta a la izquierda, valor muted a la derecha. */
function InfoRow({
  label,
  value,
  lines = 'inset',
}: {
  label: string;
  value: string;
  lines?: 'inset' | 'none';
}) {
  return (
    <IonItem lines={lines}>
      <IonLabel>{label}</IonLabel>
      <IonNote slot="end" style={{ color: 'var(--core-muted)' }}>
        {value}
      </IonNote>
    </IonItem>
  );
}

/**
 * Perfil del usuario (raíz del stack de Ajustes). De solo lectura: la API no
 * expone auto-edición de datos para usuarios APP (editar requiere permiso
 * iam.users WRITE), así que aquí solo se muestran los datos y se ofrece el
 * cambio de contraseña. Refresca `/auth/me` al montar para datos frescos.
 */
export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let active = true;
    apiClient
      .GET('/auth/me')
      .then(({ data }) => {
        if (active && data) {
          setMe(data);
          setUser(data);
        }
      })
      .catch(() => {
        // Best-effort: si falla, mostramos lo que haya en el store.
      });
    return () => {
      active = false;
    };
  }, [setUser]);

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || '—';
  const accountType = user?.userType === 'APP' ? 'App' : 'Backoffice';

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/tabs/settings" text="" />
          </IonButtons>
          <IonTitle>Perfil</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <p className="core-section-label">Cuenta</p>
        <IonList inset className="core-group">
          <InfoRow label="Nombre" value={fullName} />
          <InfoRow label="Email" value={user?.email ?? '—'} />
          <InfoRow label="Tipo de cuenta" value={accountType} />
          <InfoRow label="Miembro desde" value={formatDate(me?.createdAt)} />
          <InfoRow
            label="Último acceso"
            value={formatDate(me?.lastLoginAt)}
            lines="none"
          />
        </IonList>

        <p className="core-section-label" style={{ marginTop: 24 }}>
          Seguridad
        </p>
        <IonList inset className="core-group">
          <IonItem
            button
            detail={false}
            lines="none"
            routerLink="/tabs/settings/change-password"
            routerDirection="forward"
          >
            <span slot="start" className="core-tint-icon" aria-hidden="true">
              <IonIcon icon={lockClosedOutline} />
            </span>
            <IonLabel>Cambiar contraseña</IonLabel>
            <IonIcon
              slot="end"
              icon={chevronForward}
              aria-hidden="true"
              style={{ color: 'var(--core-muted)', fontSize: 16 }}
            />
          </IonItem>
        </IonList>

        <p
          className="core-subtitle"
          style={{ marginTop: 16, padding: '0 4px', fontSize: 13 }}
        >
          Para cambiar tus datos de perfil, contacta con un administrador.
        </p>
      </IonContent>
    </IonPage>
  );
}
