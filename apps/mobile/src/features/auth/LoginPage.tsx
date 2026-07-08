import { useState, type FormEvent } from 'react';
import {
  IonButton,
  IonContent,
  IonInput,
  IonNote,
  IonPage,
  IonSpinner,
} from '@ionic/react';
import { useLogin } from './use-login';

/**
 * Pantalla de login. Look editorial y tranquilo (DS §1): wordmark serif, mucho
 * aire, un único acento clay en el botón. Campos inset con radio grande.
 */
export default function LoginPage() {
  const { submit, loading, error } = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    void submit(email.trim(), password);
  }

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div
          style={{
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            maxWidth: 420,
            margin: '0 auto',
            paddingBottom: '10vh',
          }}
        >
          <h1 className="core-display" style={{ marginBottom: 6 }}>
            Core
          </h1>
          <p className="core-subtitle" style={{ marginBottom: 28 }}>
            Inicia sesión para continuar
          </p>

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
            <IonInput
              className="core-field"
              label="Contraseña"
              labelPlacement="stacked"
              fill="outline"
              type="password"
              autocomplete="current-password"
              placeholder="••••••••"
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
              {loading ? <IonSpinner name="crescent" /> : 'Entrar'}
            </IonButton>

            <IonButton
              routerLink="/forgot"
              fill="clear"
              size="small"
              style={{ marginTop: 4, justifySelf: 'center' }}
            >
              ¿Olvidaste tu contraseña?
            </IonButton>
          </form>
        </div>
      </IonContent>
    </IonPage>
  );
}
