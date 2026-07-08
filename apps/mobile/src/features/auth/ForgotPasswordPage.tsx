import { useState, type FormEvent } from 'react';
import { IonButton, IonInput, IonNote, IonSpinner } from '@ionic/react';
import AuthShell from './AuthShell';
import { useRequestPasswordReset } from './use-request-password-reset';

/**
 * Recuperar contraseña: pide el email y dispara `request-password-reset`. En
 * éxito muestra un mensaje neutro (la API responde igual exista o no la cuenta).
 */
export default function ForgotPasswordPage() {
  const { submit, loading, done, error } = useRequestPasswordReset();
  const [email, setEmail] = useState('');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    void submit(email.trim());
  }

  if (done) {
    return (
      <AuthShell title="Revisa tu correo">
        <p className="core-subtitle" style={{ marginBottom: 28 }}>
          Si el email existe, recibirás instrucciones para restablecer tu
          contraseña.
        </p>
        <IonButton expand="block" routerLink="/login" routerDirection="back">
          Volver a iniciar sesión
        </IonButton>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Recuperar contraseña"
      subtitle="Te enviaremos un enlace para restablecerla."
    >
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
        <IonInput
          className="core-field"
          label="Email"
          labelPlacement="stacked"
          fill="outline"
          type="email"
          autocomplete="email"
          inputmode="email"
          placeholder="tu@email.com"
          value={email}
          onIonInput={(e) => setEmail(e.detail.value ?? '')}
        />
        {error && (
          <IonNote color="danger" style={{ fontSize: 14 }}>
            {error}
          </IonNote>
        )}
        <IonButton
          type="submit"
          expand="block"
          disabled={loading}
          style={{ marginTop: 8 }}
        >
          {loading ? <IonSpinner name="crescent" /> : 'Enviar enlace'}
        </IonButton>
      </form>
    </AuthShell>
  );
}
