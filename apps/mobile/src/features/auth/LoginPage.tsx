import { useState, type FormEvent } from 'react';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonNote,
  IonPage,
  IonSpinner,
} from '@ionic/react';
import { logoFacebook, logoGoogle } from 'ionicons/icons';
import { useLogin } from './use-login';
import { useGoogleLogin } from './use-google-login';
import { useFacebookLogin } from './use-facebook-login';

/**
 * Pantalla de login. Look editorial y tranquilo (DS §1): wordmark serif, mucho
 * aire, un único acento clay en el botón. Campos inset con radio grande.
 * Debajo del login email/password, atajos de login social (Google/Facebook)
 * contra `POST /auth/google` y `POST /auth/facebook`.
 */
export default function LoginPage() {
  const { submit, loading, error } = useLogin();
  const google = useGoogleLogin();
  const facebook = useFacebookLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const anyLoading = loading || google.loading || facebook.loading;
  const errorMessage = error ?? google.error ?? facebook.error;

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

            {errorMessage && (
              <IonNote color="danger" style={{ fontSize: 14 }}>
                {errorMessage}
              </IonNote>
            )}

            <IonButton
              type="submit"
              expand="block"
              disabled={anyLoading}
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

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: '24px 0',
              color: 'var(--core-muted)',
              fontSize: 13,
            }}
          >
            <span style={{ flex: 1, height: 1, background: 'var(--core-border)' }} />
            o continúa con
            <span style={{ flex: 1, height: 1, background: 'var(--core-border)' }} />
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            <IonButton
              expand="block"
              fill="outline"
              color="medium"
              disabled={anyLoading}
              onClick={() => void google.submit()}
            >
              {google.loading ? (
                <IonSpinner name="crescent" />
              ) : (
                <>
                  <IonIcon icon={logoGoogle} slot="start" />
                  Continuar con Google
                </>
              )}
            </IonButton>

            <IonButton
              expand="block"
              fill="outline"
              color="medium"
              disabled={anyLoading}
              onClick={() => void facebook.submit()}
            >
              {facebook.loading ? (
                <IonSpinner name="crescent" />
              ) : (
                <>
                  <IonIcon icon={logoFacebook} slot="start" />
                  Continuar con Facebook
                </>
              )}
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
