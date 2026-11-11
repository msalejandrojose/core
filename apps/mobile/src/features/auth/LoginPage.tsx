import { Link } from 'react-router-dom';
import { IonContent, IonPage, IonSpinner } from '@ionic/react';
import { useGoogleLogin } from './use-google-login';
import { rememberLoginMethod } from './login-method';
import { GoogleMark } from './GoogleMark';
import { RitmoMark } from './RitmoMark';
import './auth.css';

const PERKS = [
  {
    text: 'Se sincroniza con Garmin y la app Salud',
    bg: 'var(--ritmo-activity-soft)',
    fg: 'var(--ritmo-activity-ink)',
    d: 'M6 6h12v12H6zM9 6l1-3h4l1 3M9 18l1 3h4l1-3M12 10v2l1.5 1',
  },
  {
    text: 'Una dieta que sigue a tu entrenamiento',
    bg: 'var(--ritmo-food-soft)',
    fg: 'var(--ritmo-food-ink)',
    d: 'M7 3v18M4 3v5a3 3 0 0 0 6 0V3M17 21V3c-2 0-3 2-3 6s1 4 3 4',
  },
  {
    text: 'Apunta lo que comes en segundos',
    bg: 'var(--ritmo-tint-soft)',
    fg: 'var(--ritmo-tint)',
    d: 'M12 3a9 9 0 1 0 .01 0M12 7v5l3 2',
  },
];

/**
 * Acceso (lienzo "Acceso"): marca, tres razones y las formas de entrar.
 *
 * "Continuar con Apple" está en el diseño pero aún no hay endpoint en la API:
 * se añadirá con él (es obligatorio en iOS si se ofrece Google). Facebook, que
 * traía el shell base, no está en el diseño de Ritmo.
 */
export default function LoginPage() {
  const google = useGoogleLogin();

  return (
    <IonPage>
      <IonContent>
        <div className="login">
          <div className="login__brand">
            <RitmoMark />
            <h1>Ritmo</h1>
            <p>Entrena, come y descansa con un plan que se ajusta a ti.</p>
          </div>

          <ul className="login__perks">
            {PERKS.map((p) => (
              <li key={p.text}>
                <span
                  className="login__perk-icon"
                  style={{ background: p.bg, color: p.fg }}
                  aria-hidden="true"
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={p.d} />
                  </svg>
                </span>
                <span>{p.text}</span>
              </li>
            ))}
          </ul>

          <div className="login__actions">
            {google.error ? (
              <p className="login__error" role="alert">
                {google.error}
              </p>
            ) : null}
            <button
              type="button"
              className="login__google"
              disabled={google.loading}
              onClick={() => {
                rememberLoginMethod('google');
                void google.submit();
              }}
            >
              {google.loading ? <IonSpinner name="crescent" /> : <GoogleMark />}
              Continuar con Google
            </button>
            <Link to="/correo" className="login__email">
              Continuar con correo
            </Link>
            <p className="login__legal">
              Si no tienes cuenta, la creas al continuar. Al hacerlo aceptas los
              Términos y la Política de privacidad.
            </p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
