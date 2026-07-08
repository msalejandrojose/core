import { useState, type FormEvent } from 'react';
import { IonButton, IonInput, IonNote, IonSpinner } from '@ionic/react';
import { useLocation } from 'react-router-dom';
import AuthShell from './AuthShell';
import { useResetPassword } from './use-reset-password';

/**
 * Restablecer contraseña con el token del enlace del email
 * (`/reset-password?token=…`). Valida longitud y coincidencia en cliente antes
 * de llamar a `reset-password`.
 */
export default function ResetPasswordPage() {
  const token = new URLSearchParams(useLocation().search).get('token') ?? '';
  const { submit, loading, done, error } = useResetPassword();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (password.length < 8) {
      setLocalError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setLocalError('Las contraseñas no coinciden.');
      return;
    }
    void submit(token, password);
  }

  if (!token) {
    return (
      <AuthShell title="Enlace no válido">
        <p className="core-subtitle" style={{ marginBottom: 28 }}>
          Falta el token de restablecimiento o el enlace ha caducado. Solicita
          uno nuevo.
        </p>
        <IonButton expand="block" routerLink="/forgot" routerDirection="back">
          Solicitar enlace
        </IonButton>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Contraseña actualizada">
        <p className="core-subtitle" style={{ marginBottom: 28 }}>
          Ya puedes iniciar sesión con tu nueva contraseña.
        </p>
        <IonButton expand="block" routerLink="/login" routerDirection="back">
          Iniciar sesión
        </IonButton>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Nueva contraseña"
      subtitle="Elige una contraseña de al menos 8 caracteres."
    >
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
        <IonInput
          className="core-field"
          label="Nueva contraseña"
          labelPlacement="stacked"
          fill="outline"
          type="password"
          autocomplete="new-password"
          placeholder="••••••••"
          value={password}
          onIonInput={(e) => setPassword(e.detail.value ?? '')}
        />
        <IonInput
          className="core-field"
          label="Repetir contraseña"
          labelPlacement="stacked"
          fill="outline"
          type="password"
          autocomplete="new-password"
          placeholder="••••••••"
          value={confirm}
          onIonInput={(e) => setConfirm(e.detail.value ?? '')}
        />
        {(localError || error) && (
          <IonNote color="danger" style={{ fontSize: 14 }}>
            {localError ?? error}
          </IonNote>
        )}
        <IonButton
          type="submit"
          expand="block"
          disabled={loading}
          style={{ marginTop: 8 }}
        >
          {loading ? <IonSpinner name="crescent" /> : 'Restablecer contraseña'}
        </IonButton>
      </form>
    </AuthShell>
  );
}
