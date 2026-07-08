import { IonButton, IonIcon, IonSpinner } from '@ionic/react';
import { checkmarkCircleOutline, alertCircleOutline } from 'ionicons/icons';
import { useLocation } from 'react-router-dom';
import AuthShell from './AuthShell';
import { useVerifyEmail } from './use-verify-email';

/**
 * Verificación de email desde el enlace del correo (`/verify-email?token=…`).
 * Consume el token al montar y muestra el resultado. No requiere sesión.
 */
export default function VerifyEmailPage() {
  const token = new URLSearchParams(useLocation().search).get('token') ?? '';
  const status = useVerifyEmail(token);

  if (status === 'verifying') {
    return (
      <AuthShell title="Verificando…">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <IonSpinner name="crescent" />
        </div>
      </AuthShell>
    );
  }

  if (status === 'ok') {
    return (
      <AuthShell title="Email verificado">
        <div style={{ textAlign: 'center', padding: '8px 0 24px' }}>
          <IonIcon
            icon={checkmarkCircleOutline}
            aria-hidden="true"
            style={{ fontSize: 48, color: 'var(--ion-color-primary)' }}
          />
        </div>
        <p className="core-subtitle" style={{ marginBottom: 28 }}>
          Tu cuenta ha quedado verificada. Ya puedes iniciar sesión.
        </p>
        <IonButton expand="block" routerLink="/login" routerDirection="back">
          Iniciar sesión
        </IonButton>
      </AuthShell>
    );
  }

  // 'error' | 'idle' (sin token en el enlace)
  return (
    <AuthShell title="No se pudo verificar">
      <div style={{ textAlign: 'center', padding: '8px 0 24px' }}>
        <IonIcon
          icon={alertCircleOutline}
          aria-hidden="true"
          style={{ fontSize: 48, color: 'var(--core-muted)' }}
        />
      </div>
      <p className="core-subtitle" style={{ marginBottom: 28 }}>
        {token
          ? 'El enlace de verificación no es válido o ha caducado.'
          : 'Falta el token de verificación en el enlace.'}
      </p>
      <IonButton expand="block" routerLink="/login" routerDirection="back">
        Volver a iniciar sesión
      </IonButton>
    </AuthShell>
  );
}
