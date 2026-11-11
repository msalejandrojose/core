import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import { apiClient } from '@/api/client';
import { useLogin } from './use-login';
import { rememberLoginMethod } from './login-method';
import { BackLink, NavRow, Segmented } from '@/features/ritmo/ui/kit';
import './auth.css';

type Mode = 'login' | 'signup';

/**
 * Continuar con correo: entrar o crear la cuenta con email y contraseña. No
 * está dibujada en el lienzo (el prototipo salta directo al alta), así que
 * sigue el resto del DS: lista agrupada de campos y un botón principal.
 *
 * Crear cuenta deja el usuario pendiente de verificar el email (la API no
 * deja entrar sin confirmar), así que tras registrarse se explica eso en vez
 * de intentar entrar.
 */
export default function EmailAuthPage() {
  const { submit: login, loading: loggingIn, error: loginError } = useLogin();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingUp, setSigningUp] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const loading = loggingIn || signingUp;
  const valid =
    /\S+@\S+\.\S+/.test(email.trim()) &&
    password.length >= (mode === 'signup' ? 8 : 1);
  const error = mode === 'login' ? loginError : signupError;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    rememberLoginMethod('email');
    if (mode === 'login') {
      await login(email.trim(), password);
      return;
    }
    setSigningUp(true);
    setSignupError(null);
    try {
      const { error: apiError, response } = await apiClient.POST(
        '/auth/register',
        {
          body: {
            email: email.trim(),
            password,
            userType: 'APP',
            firstName: name.trim() || undefined,
          },
        },
      );
      if (apiError || !response.ok) {
        setSignupError(
          response.status === 409
            ? 'Ya hay una cuenta con ese correo. Entra con él.'
            : 'No se pudo crear la cuenta.',
        );
        return;
      }
      setSentTo(email.trim());
    } catch {
      setSignupError('No se pudo crear la cuenta.');
    } finally {
      setSigningUp(false);
    }
  }

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen email-auth">
          <NavRow back={<BackLink label="Acceso" fallback="/login" />} />
          <header className="rk-title">
            <h1 className="email-auth__title">Continuar con correo</h1>
            <span className="rk-title__sub">
              {mode === 'login'
                ? 'Entra con tu correo y tu contraseña.'
                : 'Crea tu cuenta en un momento.'}
            </span>
          </header>

          {sentTo ? (
            <div className="rk-card email-auth__sent" role="status">
              <strong>Revisa tu correo</strong>
              <span>
                Te hemos enviado un enlace a {sentTo} para confirmar la cuenta.
                Ábrelo y vuelve aquí para entrar.
              </span>
              <button
                type="button"
                className="rk-btn rk-btn--soft"
                onClick={() => {
                  setSentTo(null);
                  setMode('login');
                }}
              >
                Ya la he confirmado
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => void onSubmit(e)}
              className="email-auth__form"
            >
              <Segmented
                label="Qué quieres hacer"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'login', label: 'Entrar' },
                  { value: 'signup', label: 'Crear cuenta' },
                ]}
              />
              <div className="rk-list">
                {mode === 'signup' ? (
                  <label className="rk-row email-auth__field">
                    <span>Nombre</span>
                    <input
                      autoComplete="given-name"
                      value={name}
                      placeholder="Opcional"
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                ) : null}
                <label className="rk-row email-auth__field">
                  <span>Correo</span>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    placeholder="tu@correo.com"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label className="rk-row email-auth__field">
                  <span>Contraseña</span>
                  <input
                    type="password"
                    autoComplete={
                      mode === 'login' ? 'current-password' : 'new-password'
                    }
                    value={password}
                    placeholder={mode === 'signup' ? 'Mínimo 8 caracteres' : ''}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
              </div>
              {error ? (
                <p className="login__error" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                className="rk-btn"
                disabled={!valid || loading}
              >
                {loading ? (
                  <IonSpinner name="crescent" />
                ) : mode === 'login' ? (
                  'Entrar'
                ) : (
                  'Crear cuenta'
                )}
              </button>
              {mode === 'login' ? (
                <Link to="/forgot" className="rk-textbtn email-auth__forgot">
                  ¿Has olvidado la contraseña?
                </Link>
              ) : null}
            </form>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
