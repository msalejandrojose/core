import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Icon } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { toast } from '@/lib/toast';
import './signup.css';

type Id = 'salud' | 'garmin' | 'hevy' | 'avisos';

const SOURCES: {
  id: Id;
  title: string;
  tag?: { label: string; recommended?: boolean };
  desc: string;
  cta: string;
  done: string;
  icon: string;
  bg: string;
  fg: string;
}[] = [
  {
    id: 'salud',
    title: 'Apple Salud',
    tag: { label: 'Recomendado', recommended: true },
    desc: 'Leemos pasos, sueño, peso y frecuencia cardíaca, y guardamos tus comidas. En Android, Health Connect.',
    cta: 'Permitir acceso',
    done: 'Acceso permitido',
    icon: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
    bg: 'var(--ritmo-heart-soft)',
    fg: 'var(--ritmo-heart-ink)',
  },
  {
    id: 'garmin',
    title: 'Garmin',
    desc: 'Importa tus entrenos y envía al reloj las sesiones de tu plan.',
    cta: 'Conectar Garmin',
    done: 'Garmin conectado',
    icon: 'M6 6h12v12H6zM9 6l1-3h4l1 3M9 18l1 3h4l1-3M12 10v2l1.5 1',
    bg: 'var(--ritmo-bg)',
    fg: 'var(--ritmo-ink)',
  },
  {
    id: 'hevy',
    title: 'Hevy',
    tag: { label: 'Opcional' },
    desc: 'Series y pesos del gimnasio, y rutinas listas para empezar. Requiere Hevy Pro.',
    cta: 'Conectar Hevy',
    done: 'Hevy conectado',
    icon: 'M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12',
    bg: 'var(--ritmo-ink)',
    fg: '#FFFFFF',
  },
  {
    id: 'avisos',
    title: 'Avisos',
    desc: 'Para la cena, la sesión de mañana y tu resumen del domingo. Como mucho, dos al día.',
    cta: 'Activar avisos',
    done: 'Avisos activados',
    icon: PATHS.bell,
    bg: 'var(--ritmo-tint-soft)',
    fg: 'var(--ritmo-tint)',
  },
];

/** Pide permiso de notificaciones: push nativo en la app, el del navegador en web. */
async function askNotifications(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const { receive } = await PushNotifications.requestPermissions();
    return receive === 'granted';
  }
  if (typeof Notification === 'undefined') return false;
  return (await Notification.requestPermission()) === 'granted';
}

/**
 * Alta 2/2 · Conecta tus datos (lienzo "Alta 2/2"). Los avisos piden el
 * permiso de verdad. Apple Salud, Garmin y Hevy aún no están integrados: sus
 * botones lo dicen en vez de fingir una conexión.
 */
export default function ConnectPage() {
  const history = useHistory();
  const [on, setOn] = useState<Partial<Record<Id, boolean>>>({});
  const count = Object.values(on).filter(Boolean).length;

  async function connect(id: Id, title: string) {
    if (id !== 'avisos') {
      toast.info(
        `Pronto podrás conectar ${title}`,
        'De momento, registra tus entrenos a mano con el +.',
      );
      return;
    }
    try {
      const granted = await askNotifications();
      if (granted) setOn((s) => ({ ...s, avisos: true }));
      else
        toast.info(
          'Avisos desactivados',
          'Puedes activarlos más tarde en los ajustes del teléfono.',
        );
    } catch {
      toast.error('No se pudieron activar los avisos');
    }
  }

  const start = () => history.replace('/tabs/today');

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen signup">
          <div className="signup__bar">
            <button
              type="button"
              className="rk-iconbtn signup__back"
              aria-label="Volver"
              onClick={() => history.replace('/alta/perfil')}
            >
              <Icon d={PATHS.back} size={20} stroke={2.4} />
            </button>
            <span className="signup__step">Paso 2 de 2</span>
            <button
              type="button"
              className="rk-textbtn signup__skip"
              onClick={start}
            >
              Saltar
            </button>
          </div>

          <header className="signup__head">
            <h1>Conecta tus datos</h1>
            <span>
              Así Ritmo cuenta tus pasos, entrenos y sueño sin que apuntes nada
              a mano.
            </span>
          </header>

          <div className="connect__list">
            {SOURCES.map((s) => (
              <section key={s.id} className="connect__card">
                <div className="connect__head">
                  <span
                    className="connect__icon"
                    style={{ background: s.bg, color: s.fg }}
                    aria-hidden="true"
                  >
                    <Icon d={s.icon} size={22} />
                  </span>
                  <span className="rk-row__main">
                    <span className="connect__title">
                      {s.title}
                      {s.tag ? (
                        <span
                          className={`connect__tag${s.tag.recommended ? ' is-rec' : ''}`}
                        >
                          {s.tag.label}
                        </span>
                      ) : null}
                    </span>
                    <span className="connect__desc">{s.desc}</span>
                  </span>
                </div>
                {on[s.id] ? (
                  <span className="connect__done">
                    <Icon d="M5 12.5l4.5 4.5L19 7" size={16} stroke={2.8} />
                    {s.done}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="connect__cta"
                    onClick={() => void connect(s.id, s.title)}
                  >
                    {s.cta}
                  </button>
                )}
              </section>
            ))}
          </div>

          <div className="connect__footer">
            <button
              type="button"
              className={`rk-btn${count ? '' : ' connect__start--plain'}`}
              onClick={start}
            >
              {count ? 'Empezar' : 'Empezar sin conectar'}
            </button>
            <span>Puedes cambiarlo cuando quieras en Perfil › Conexiones.</span>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
