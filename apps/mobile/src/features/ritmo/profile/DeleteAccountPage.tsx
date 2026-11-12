import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/lib/toast';
import { isApiError, ritmoApi } from '../api';
import { BackLink, NavRow } from '../ui/kit';
import { downloadMyData } from './profile-body';
import './profile.css';

const GONE = [
  'Tu cuenta, perfil y objetivos',
  'Comidas, alimentos propios y pesos',
  'Actividades y entrenos registrados',
  'Tus preferencias guardadas en Ritmo',
];

/** Eliminar cuenta (lienzo "Eliminar cuenta"): borrado definitivo en el servidor. */
export default function DeleteAccountPage() {
  const logout = useAuthStore((s) => s.logout);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);

  async function remove() {
    if (!ok || busy) return;
    setBusy(true);
    try {
      await ritmoApi.deleteAccount();
      setDeleted(true);
    } catch (e) {
      toast.error('No se pudo eliminar la cuenta', isApiError(e) ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  if (deleted) {
    return (
      <IonPage>
        <IonContent>
          <div className="delete__done">
            <span className="done__mark" aria-hidden="true">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7" />
              </svg>
            </span>
            <h1>Cuenta eliminada</h1>
            <p>Hemos borrado tu cuenta y todo lo que tenías guardado en Ritmo.</p>
            {/* Cerrar sesión limpia los datos en memoria y vuelve al acceso. */}
            <button type="button" className="rk-btn" onClick={logout}>
              Volver al inicio
            </button>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen">
          <NavRow back={<BackLink label="Perfil" fallback="/tabs/settings" />} />
          <header className="delete__head">
            <h1>Eliminar cuenta</h1>
            <span className="delete__lead">
              Se borrará tu cuenta y todo lo que has guardado en Ritmo. No se puede deshacer.
            </span>
          </header>

          <section className="rk-section" aria-labelledby="borra">
            <div className="rk-sechead">
              <h2 id="borra">Se elimina</h2>
            </div>
            <div className="delete__card">
              <ul>
                {GONE.map((g) => (
                  <li key={g}>
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ritmo-danger)" strokeWidth="2.4" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                    {g}
                  </li>
                ))}
              </ul>
              <p>Los datos que tengas en otras apps, como Garmin Connect o Salud, no se tocan.</p>
            </div>
          </section>

          <button type="button" className="delete__export" onClick={() => void downloadMyData()}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4v11M8 11l4 4 4-4M5 20h14" />
            </svg>
            <span>Descargar mis datos antes</span>
          </button>

          <button type="button" role="checkbox" aria-checked={ok} className="delete__check" onClick={() => setOk((v) => !v)}>
            <span className={`delete__box${ok ? ' is-on' : ''}`} aria-hidden="true">
              {ok ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7" />
                </svg>
              ) : null}
            </span>
            <span>Entiendo que no se puede deshacer</span>
          </button>

          <div className="delete__actions">
            <button type="button" className="rk-btn delete__btn" disabled={!ok || busy} onClick={() => void remove()}>
              {busy ? 'Eliminando…' : 'Eliminar mi cuenta'}
            </button>
            <Link to="/tabs/settings" className="rk-textbtn">
              Cancelar
            </Link>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
