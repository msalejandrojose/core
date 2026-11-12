import { useState } from 'react';
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

/**
 * Conectar Hevy (lienzo "Conectar Hevy"). La integración aún no existe en el
 * servidor: el formulario funciona, pero «Conectar» avisa en lugar de fingir
 * una importación. La clave nunca sale del dispositivo.
 */
export default function HevyConnectPage() {
  const history = useHistory();
  const [mode, setMode] = useState<Mode>('full');
  const [key, setKey] = useState('');
  const [imp, setImp] = useState(true);
  const [routines, setRoutines] = useState(true);

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

  function connect() {
    if (!can) return;
    toast.info('La conexión con Hevy llegará pronto', 'Aún no guardamos tu clave ni importamos entrenos.');
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
                        type="text"
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
                    <span className="rk-row__sub">Últimos 90 días y los nuevos al terminar</span>
                  </span>
                  <Switch on={imp} />
                </button>
                <button
                  type="button"
                  aria-pressed={routines}
                  className="rk-row conn__toggle"
                  onClick={() => setRoutines((v) => !v)}
                >
                  <span className="rk-row__main">
                    <span className="rk-row__title">Enviar rutinas del plan</span>
                    <span className="rk-row__sub">Tus sesiones de fuerza aparecen en Hevy</span>
                  </span>
                  <Switch on={routines} />
                </button>
              </div>
            </>
          ) : (
            <p className="hevy__basic">
              En la app de Hevy, activa la conexión con Salud (o Health Connect en Android). Nosotros leemos tus entrenos
              desde ahí, sin series ni pesos.
            </p>
          )}

          <button type="button" className="rk-btn hevy__connect" disabled={!can} onClick={connect}>
            Conectar
          </button>
        </div>
      </IonContent>
    </IonPage>
  );
}
