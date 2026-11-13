import { useState } from 'react';
import { hevyApi, hevyErrorText, syncSummary, useHevyStatus } from './hevy.api';
import { useHistory } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { toast } from '@/lib/toast';
import { SectionHeader, Switch } from '../ui/kit';
import { PATHS } from '../ui/paths';
import './profile.css';

type Mode = 'full' | 'basic';

const MODES: { id: Mode; title: string; badge: string; desc: string }[] = [
  { id: 'full', title: 'Completo', badge: 'Hevy Pro', desc: 'Ejercicios, series, pesos y rutinas' },
  { id: 'basic', title: 'Básico, vía Salud', badge: 'Gratis', desc: 'Solo duración, kcal y frecuencia cardíaca' },
];

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'nunca';

/**
 * Conectar Hevy (lienzo "Conectar Hevy"). Con la clave de tu cuenta Pro, el
 * servidor importa tus entrenos y puede crear rutinas. La clave se guarda
 * cifrada y no vuelve a salir. El modo básico (vía Salud) aún no existe.
 */
export default function HevyConnectPage() {
  const history = useHistory();
  const [mode, setMode] = useState<Mode>('full');
  const [key, setKey] = useState('');
  const [imp, setImp] = useState(true);
  const [busy, setBusy] = useState(false);
  const { status, setStatus } = useHevyStatus();

  const full = mode === 'full';
  const can = !full || key.trim().length >= 12;
  const cancel = () => (history.length > 1 ? history.goBack() : history.replace('/tabs/settings/conexiones'));

  async function paste() {
    try {
      setKey((await navigator.clipboard.readText()).trim());
    } catch {
      toast.info('No se pudo leer el portapapeles', 'Mantén pulsado el campo y elige Pegar.');
    }
  }

  async function connect() {
    if (!can || busy) return;
    if (!full) {
      toast.info('Llegará con la conexión con Salud', 'De momento solo funciona el modo completo.');
      return;
    }
    setBusy(true);
    try {
      const r = await hevyApi.connect(key.trim(), imp);
      setKey('');
      setStatus(r.status);
      toast.success('Hevy conectado', r.sync ? syncSummary(r.sync) : undefined);
    } catch (e) {
      toast.error('No se pudo conectar', hevyErrorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function sync() {
    setBusy(true);
    try {
      const r = await hevyApi.sync();
      setStatus(r.status);
      toast.success('Hevy sincronizado', syncSummary(r.sync));
    } catch (e) {
      toast.error('No se pudo sincronizar', hevyErrorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await hevyApi.disconnect();
      setStatus(status ? { ...status, connected: false, username: null, lastSyncAt: null, lastError: null } : status);
      toast.success('Hevy desconectado', 'Tus entrenos importados se quedan en Ritmo.');
    } catch (e) {
      toast.error('No se pudo desconectar', hevyErrorText(e));
    } finally {
      setBusy(false);
    }
  }

  if (status?.connected) {
    return (
      <IonPage>
        <IonContent>
          <div className="rk-sheet hevy">
            <span className="rk-grab" aria-hidden="true" />
            <div className="rk-sheetbar">
              <button type="button" className="rk-textbtn" onClick={cancel}>
                Cerrar
              </button>
              <span className="rk-sheetbar__title">Hevy</span>
              <span />
            </div>
            <div className="rk-list">
              <div className="rk-row">
                <span className="rk-row__main rk-row__title">Cuenta</span>
                <span className="rk-row__value">{status.username ?? 'Conectada'}</span>
              </div>
              <div className="rk-row">
                <span className="rk-row__main rk-row__title">Entrenos importados</span>
                <span className="rk-row__value">{status.importedSessions}</span>
              </div>
              <div className="rk-row">
                <span className="rk-row__main rk-row__title">Última sincronización</span>
                <span className="rk-row__value">{when(status.lastSyncAt)}</span>
              </div>
            </div>
            {status.lastError ? (
              <p className="rk-note">
                La última sincronización falló{status.lastError === 'HEVY_401' ? ': Hevy ya no acepta tu clave. Desconecta y vuelve a conectar con una nueva.' : '. Prueba otra vez.'}
              </p>
            ) : null}
            <button type="button" className="rk-btn hevy__connect" disabled={busy} onClick={() => void sync()}>
              {busy ? 'Sincronizando…' : 'Sincronizar ahora'}
            </button>
            <p className="rk-note">
              Ritmo trae lo nuevo de Hevy al abrir la app. Para mandar una rutina, abre una sesión de fuerza de tu plan y pulsa «Enviar rutina a Hevy».
            </p>
            <button type="button" className="hevy__disconnect" disabled={busy} onClick={() => void disconnect()}>
              Desconectar Hevy
            </button>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent>
        <div className="rk-sheet hevy">
          <span className="rk-grab" aria-hidden="true" />
          <div className="rk-sheetbar">
            <button type="button" className="rk-textbtn" onClick={cancel}>
              Cancelar
            </button>
            <span className="rk-sheetbar__title">Conectar Hevy</span>
            <span />
          </div>

          <div className="hevy__intro">
            <span className="hevy__logo" aria-hidden="true">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d={PATHS.strength} />
              </svg>
            </span>
            Trae tus entrenos de gimnasio de Hevy y manda allí las rutinas de tu plan.
          </div>

          <section className="rk-section" aria-labelledby="modo">
            <SectionHeader id="modo">Cómo conectar</SectionHeader>
            <div role="radiogroup" aria-labelledby="modo" className="profile__radios">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.id}
                  className="profile__radio-row hevy__mode"
                  onClick={() => setMode(m.id)}
                >
                  <span className="profile__radio-wrap" aria-hidden="true">
                    <span className={`profile__radio${mode === m.id ? ' is-on' : ''}`} />
                  </span>
                  <span className="profile__radio-cell">
                    <span className="hevy__mode-head">
                      <span className="rk-row__title">{m.title}</span>
                      <span className={`hevy__badge${m.id === 'basic' ? ' hevy__badge--free' : ''}`}>{m.badge}</span>
                    </span>
                    <span className="rk-row__sub">{m.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          {full ? (
            <>
              <section className="rk-section" aria-labelledby="clave">
                <SectionHeader id="clave">Tu clave de Hevy</SectionHeader>
                <div className="hevy__key">
                  <ol>
                    <li>Entra en hevy.com › Ajustes › Developer</li>
                    <li>Pulsa «Generate API Key»</li>
                    <li>Cópiala y pégala aquí</li>
                  </ol>
                  <div className="hevy__key-row">
                    <label className="hevy__input">
                      <span className="rk-visually-hidden">Clave de API de Hevy</span>
                      <input
                        type="password"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx"
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </label>
                    <button type="button" className="hevy__paste" onClick={() => void paste()}>
                      Pegar
                    </button>
                  </div>
                  <span className="hevy__fine">Guardamos la clave cifrada. Puedes revocarla en Hevy cuando quieras.</span>
                </div>
              </section>
              <div className="rk-list">
                <button type="button" aria-pressed={imp} className="rk-row conn__toggle" onClick={() => setImp((v) => !v)}>
                  <span className="rk-row__main">
                    <span className="rk-row__title">Importar entrenos</span>
                    <span className="rk-row__sub">Tu historial (hasta 300 entrenos) y los nuevos después</span>
                  </span>
                  <Switch on={imp} />
                </button>
              </div>
            </>
          ) : (
            <p className="hevy__basic">
              En la app de Hevy, activa la conexión con Salud (o Health Connect en Android). Nosotros leemos tus entrenos
              desde ahí, sin series ni pesos.
            </p>
          )}

          <button type="button" className="rk-btn hevy__connect" disabled={!can || busy} onClick={() => void connect()}>
            {busy ? 'Conectando…' : 'Conectar'}
          </button>
        </div>
      </IonContent>
    </IonPage>
  );
}
