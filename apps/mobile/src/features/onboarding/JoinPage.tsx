import { useState, type FormEvent } from 'react';
import { IonButton, IonInput, IonNote, IonSpinner } from '@ionic/react';
import { useParams } from 'react-router-dom';
import AuthShell from '@/features/auth/AuthShell';
import { useJoin } from './use-join';

/**
 * Onboarding de Andanzas: la beta es cerrada, solo se entra con un código de
 * invitación. Se abre desde `/join/:code` (enlace compartido por un usuario)
 * o `/join` a secas, con el código en blanco para tecleo manual.
 */
export default function JoinPage() {
  const { code: codeFromUrl } = useParams<{ code?: string }>();
  const { submit, loading, error, accountCreated } = useJoin();

  const [code, setCode] = useState(codeFromUrl ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim() || !email.trim() || !password) return;
    void submit({
      code,
      email: email.trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
  }

  // El canje ya creó la cuenta pero el auto-login falló (código ya usado, no
  // reintentable): en vez de un formulario roto, mandamos a login manual.
  if (accountCreated && error) {
    return (
      <AuthShell title="Cuenta creada">
        <p className="core-subtitle" style={{ marginBottom: 28 }}>
          Ya puedes iniciar sesión con tu email y contraseña.
        </p>
        <IonButton expand="block" routerLink="/login" routerDirection="back">
          Iniciar sesión
        </IonButton>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Únete a Andanzas"
      subtitle="La beta es cerrada: necesitas un código de invitación."
    >
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
        <IonInput
          className="core-field"
          label="Código de invitación"
          labelPlacement="stacked"
          fill="outline"
          placeholder="ABCD1234"
          value={code}
          onIonInput={(e) => setCode((e.detail.value ?? '').toUpperCase())}
        />
        <IonInput
          className="core-field"
          label="Nombre"
          labelPlacement="stacked"
          fill="outline"
          autocomplete="given-name"
          placeholder="Opcional"
          value={firstName}
          onIonInput={(e) => setFirstName(e.detail.value ?? '')}
        />
        <IonInput
          className="core-field"
          label="Apellidos"
          labelPlacement="stacked"
          fill="outline"
          autocomplete="family-name"
          placeholder="Opcional"
          value={lastName}
          onIonInput={(e) => setLastName(e.detail.value ?? '')}
        />
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
        <IonInput
          className="core-field"
          label="Contraseña"
          labelPlacement="stacked"
          fill="outline"
          type="password"
          autocomplete="new-password"
          placeholder="Mínimo 8 caracteres"
          value={password}
          onIonInput={(e) => setPassword(e.detail.value ?? '')}
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
          {loading ? <IonSpinner name="crescent" /> : 'Crear cuenta'}
        </IonButton>

        <IonButton
          routerLink="/login"
          fill="clear"
          size="small"
          style={{ marginTop: 4, justifySelf: 'center' }}
        >
          ¿Ya tienes cuenta? Inicia sesión
        </IonButton>
      </form>
    </AuthShell>
  );
}
