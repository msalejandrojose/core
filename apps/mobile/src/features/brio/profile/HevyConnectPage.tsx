import { useRef, useState } from 'react';
import { useBrioStore } from '../brio.store';
import { hevyApi, hevyErrorText, syncSummary, useHevyStatus } from './hevy.api';
import { useHistory } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { toast } from '@/lib/toast';
import { SectionHeader, Switch } from '../ui/kit';
import { PATHS } from '../ui/paths';
import './profile.css';

type Mode = 'full' | 'csv' | 'basic';

const MODES: { id: Mode; title: string; badge: string; desc: string }[] = [
  { id: 'full', title: 'Completo', badge: 'Hevy Pro', desc: 'Ejercicios, series, pesos y rutinas' },
  { id: 'csv', title: 'Importar archivo', badge: 'Gratis', desc: 'Tu historial con series y pesos, desde lo que exporta Hevy' },
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
    const t = toast.progress('Sincronizando Hevy', 'Trayendo entrenos nuevos…');
    try {
      const r = await hevyApi.sync();
      setStatus(r.status);
      t.success('Hevy sincronizado', syncSummary(r.sync), { icon: 'sync' });
    } catch (e) {
      t.error('No se pudo sincronizar', hevyErrorText(e), { action: { label: 'Reintentar', run: sync } });
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await hevyApi.disconnect();
      setStatus(status ? { ...status, connected: false, username: null, lastSyncAt: null, lastError: null } : status);
      toast.success('Hevy desconectado', 'Tus entrenos importados se quedan en Brío.');
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
              Brío trae lo nuevo de Hevy al abrir la app. Para mandar una rutina, abre una sesión de fuerza de tu plan y pulsa «Enviar rutina a Hevy».
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
                      <span className={`hevy__badge${m.id !== 'full' ? ' hevy__badge--free' : ''}`}>{m.badge}</span>
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
          ) : mode === 'csv' ? (
            <HevyCsvImport onDone={cancel} />
          ) : (
            <p className="hevy__basic">
              En la app de Hevy, activa la conexión con Salud (o Health Connect en Android). Nosotros leemos tus entrenos
              desde ahí, sin series ni pesos.
            </p>
          )}

          {mode === 'csv' ? null : (
            <button type="button" className="rk-btn hevy__connect" disabled={!can || busy} onClick={() => void connect()}>
              {busy ? 'Conectando…' : 'Conectar'}
            </button>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}

/**
 * Sin Hevy Pro: se exporta el historial desde la app de Hevy (CSV) y se sube
 * aquí. Trae ejercicios, series y pesos; reimportar el mismo archivo no duplica.
 */
function HevyCsvImport({ onDone }: { onDone: () => void }) {
  const refreshDay = useBrioStore((s) => s.refreshDay);
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(files: FileList | null) {
    const f = files?.[0];
    if (file.current) file.current.value = '';
    if (!f) return;
    setBusy(true);
    try {
      const r = await hevyApi.importCsv(await f.text());
      void refreshDay();
      const parts = [
        r.imported ? `${r.imported} ${r.imported === 1 ? 'entreno nuevo' : 'entrenos nuevos'}` : null,
        r.updated ? `${r.updated} actualizados` : null,
      ].filter(Boolean);
      toast.success('Hevy importado', parts.length ? parts.join(' · ') : 'No había nada nuevo');
      onDone();
    } catch (e) {
      toast.error('No se pudo importar', hevyErrorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rk-section" aria-labelledby="csv">
      <SectionHeader id="csv">Importar desde Hevy</SectionHeader>
      <div className="hevy__key">
        <ol>
          <li>En la app de Hevy: Perfil › Ajustes › Exportar e importar datos</li>
          <li>Pulsa «Exportar entrenos» y guarda el archivo .csv (en Archivos, por ejemplo)</li>
          <li>Vuelve aquí y elígelo</li>
        </ol>
        <span className="hevy__fine">
          Se traen tus entrenos con sus ejercicios, series y pesos. Puedes volver a importarlo cuando quieras: lo que ya
          estaba se actualiza, no se duplica.
        </span>
      </div>
      <input ref={file} type="file" accept=".csv,text/csv,text/comma-separated-values" hidden onChange={(e) => void pick(e.target.files)} />
      <button type="button" className="rk-btn hevy__connect" disabled={busy} onClick={() => file.current?.click()}>
        {busy ? 'Importando…' : 'Elegir el archivo de Hevy'}
      </button>
    </section>
  );
}
