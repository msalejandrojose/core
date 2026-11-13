import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { toast } from '@/lib/toast';
import { SectionHeader } from '../ui/kit';
import { garminApi, garminErrorText, garminSyncSummary, useGarminStatus } from './garmin.api';
import './profile.css';

const KEY_URL = 'https://connect.garmin.com/app/settings/personalApiToken';

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'nunca';

/**
 * Conectar Garmin con tu clave personal de Garmin Connect. Sirve para traer
 * tus propios entrenos y datos de salud; enviar sesiones al reloj necesita el
 * acceso de empresa de Garmin, que aún no tenemos.
 */
export default function GarminConnectPage() {
  const history = useHistory();
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const { status, setStatus } = useGarminStatus();
  const cancel = () => (history.length > 1 ? history.goBack() : history.replace('/tabs/settings/conexiones'));

  async function run(action: () => Promise<void>, failed: string) {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      toast.error(failed, garminErrorText(e));
    } finally {
      setBusy(false);
    }
  }

  const connect = () =>
    run(async () => {
      const r = await garminApi.connect(key.trim());
      setKey('');
      setStatus(r.status);
      toast.success('Garmin conectado', r.sync ? garminSyncSummary(r.sync) : undefined);
    }, 'No se pudo conectar');

  const sync = () =>
    run(async () => {
      const r = await garminApi.sync();
      setStatus(r.status);
      toast.success('Garmin sincronizado', garminSyncSummary(r.sync));
    }, 'No se pudo sincronizar');

  const disconnect = () =>
    run(async () => {
      await garminApi.disconnect();
      if (status) setStatus({ ...status, connected: false, lastSyncAt: null, lastError: null });
      toast.success('Garmin desconectado', 'Lo que ya has traído se queda en Brío.');
    }, 'No se pudo desconectar');

  async function paste() {
    try {
      setKey((await navigator.clipboard.readText()).trim());
    } catch {
      toast.info('No se pudo leer el portapapeles', 'Mantén pulsado el campo y elige Pegar.');
    }
  }

  const expired = status?.lastError === 'GARMIN_401' || status?.lastError === 'GARMIN_403';
  const keyForm = (label: string) => (
    <section className="rk-section" aria-labelledby="gclave">
      <SectionHeader id="gclave">{label}</SectionHeader>
      <div className="hevy__key">
        <ol>
          <li>
            Abre <a href={KEY_URL} target="_blank" rel="noreferrer">Garmin Connect › clave de API personal</a>
          </li>
          <li>Pulsa «Create Key», acepta las condiciones y elige cuánto dura</li>
          <li>Cópiala (solo se enseña una vez) y pégala aquí</li>
        </ol>
        <div className="hevy__key-row">
          <label className="hevy__input">
            <span className="rk-visually-hidden">Clave personal de Garmin</span>
            <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Tu clave personal" autoComplete="off" spellCheck={false} />
          </label>
          <button type="button" className="hevy__paste" onClick={() => void paste()}>
            Pegar
          </button>
        </div>
        <span className="hevy__fine">Guardamos la clave cifrada. Caduca cuando tú elijas y puedes borrarla en Garmin cuando quieras.</span>
      </div>
      <button type="button" className="rk-btn hevy__connect" disabled={key.trim().length < 12 || busy} onClick={() => void connect()}>
        {busy ? 'Conectando…' : status?.connected ? 'Guardar clave nueva' : 'Conectar'}
      </button>
    </section>
  );

  return (
    <IonPage>
      <IonContent>
        <div className="rk-sheet hevy">
          <span className="rk-grab" aria-hidden="true" />
          <div className="rk-sheetbar">
            <button type="button" className="rk-textbtn" onClick={cancel}>
              {status?.connected ? 'Cerrar' : 'Cancelar'}
            </button>
            <span className="rk-sheetbar__title">{status?.connected ? 'Garmin' : 'Conectar Garmin'}</span>
            <span />
          </div>

          {status?.connected ? (
            <>
              <div className="rk-list">
                <div className="rk-row">
                  <span className="rk-row__main rk-row__title">Entrenos traídos</span>
                  <span className="rk-row__value">{status.importedSessions}</span>
                </div>
                <div className="rk-row">
                  <span className="rk-row__main rk-row__title">Última sincronización</span>
                  <span className="rk-row__value">{when(status.lastSyncAt)}</span>
                </div>
              </div>
              {status.lastError ? (
                <p className="rk-note">
                  {expired ? 'Garmin ya no acepta tu clave: seguramente ha caducado. Genera otra y guárdala aquí abajo.' : 'La última sincronización falló. Prueba otra vez.'}
                </p>
              ) : null}
              <button type="button" className="rk-btn hevy__connect" disabled={busy} onClick={() => void sync()}>
                {busy ? 'Sincronizando…' : 'Sincronizar ahora'}
              </button>
              <p className="rk-note">
                Brío trae tus entrenos, el pulso en reposo, el sueño y la variabilidad al abrir la app. Enviar sesiones al reloj aún no es posible con esta conexión.
              </p>
              {expired ? keyForm('Renovar la clave') : null}
              <button type="button" className="hevy__disconnect" disabled={busy} onClick={() => void disconnect()}>
                Desconectar Garmin
              </button>
            </>
          ) : (
            <>
              <div className="hevy__intro">
                <span className="hevy__logo" aria-hidden="true">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="6" y="6" width="12" height="12" rx="3" />
                    <path d="M9 6l1-3h4l1 3M9 18l1 3h4l1-3M12 10v2l1.5 1" />
                  </svg>
                </span>
                Trae de tu reloj los entrenos, el pulso en reposo, el sueño y la variabilidad cardíaca.
              </div>
              {keyForm('Tu clave personal de Garmin')}
              <p className="rk-note">Se importan los últimos 6 meses. Esta conexión solo lee tus datos; no envía sesiones al reloj.</p>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
