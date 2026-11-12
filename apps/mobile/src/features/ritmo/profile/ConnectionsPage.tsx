import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { toast } from '@/lib/toast';
import { BackLink, ExampleTag, LargeTitle, NavRow, SectionHeader, Segmented, Switch } from '../ui/kit';
import { PATHS } from '../ui/paths';
import './profile.css';

type Toggle = { id: string; label: string; desc: string };

const IMPORTS: Toggle[] = [
  { id: 'act', label: 'Actividades y entrenos', desc: 'Tipo, duración, calorías activas' },
  { id: 'steps', label: 'Pasos y movimiento', desc: 'Pasos, minutos intensos, pisos' },
  { id: 'sleep', label: 'Sueño y frecuencia cardíaca', desc: 'Horas, puntuación, FC en reposo' },
  { id: 'weight', label: 'Peso', desc: 'Si no lo tienes en Salud' },
];
const EXPORTS: Toggle[] = [
  { id: 'plan', label: 'Sesiones planificadas', desc: 'Aparecen en el calendario del reloj' },
  { id: 'food', label: 'Calorías ingeridas', desc: 'Balance visible en Garmin Connect' },
];
const SHARES = ['100', '75', '50', '0'] as const;

/**
 * Conexiones (lienzo "Conexiones"). Aún no hay integración con Garmin ni con
 * Salud: la pantalla es de ejemplo y sus interruptores solo cambian aquí.
 */
export default function ConnectionsPage() {
  const [on, setOn] = useState<Record<string, boolean>>({
    health: true,
    act: true,
    steps: true,
    sleep: true,
    weight: false,
    plan: true,
    food: false,
  });
  const [share, setShare] = useState<(typeof SHARES)[number]>('100');
  const flip = (id: string) => setOn((s) => ({ ...s, [id]: !s[id] }));

  const rows = (items: Toggle[]) =>
    items.map((t) => (
      <button key={t.id} type="button" aria-pressed={on[t.id]} className="rk-row conn__toggle" onClick={() => flip(t.id)}>
        <span className="rk-row__main">
          <span className="rk-row__title">{t.label}</span>
          <span className="rk-row__sub">{t.desc}</span>
        </span>
        <Switch on={!!on[t.id]} />
      </button>
    ));

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen">
          <NavRow back={<BackLink label="Perfil" fallback="/tabs/settings" />} />
          <LargeTitle sub={<ExampleTag />}>Conexiones</LargeTitle>

          <section aria-label="Reloj Garmin" className="conn__device">
            <span className="conn__icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="6" width="12" height="12" rx="3" />
                <path d="M9 6l1-3h4l1 3M9 18l1 3h4l1-3M12 10v2l1.5 1" />
              </svg>
            </span>
            <div className="rk-row__main">
              <span className="conn__device-name">Garmin · Venu 3</span>
              <span className="conn__status">
                <span className="conn__dot is-on" aria-hidden="true" />
                Conectado · hace 4 min
              </span>
            </div>
            <button
              type="button"
              className="rk-textbtn"
              onClick={() => toast.info('La sincronización con Garmin llegará pronto')}
            >
              Sincronizar
            </button>
          </section>

          <section className="rk-section" aria-labelledby="salud">
            <SectionHeader id="salud">Salud del teléfono</SectionHeader>
            <div className="rk-list">
              <button type="button" aria-pressed={on.health} className="rk-row conn__toggle" onClick={() => flip('health')}>
                <span className="conn__badge conn__badge--health" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" fill="var(--ritmo-heart)" />
                  </svg>
                </span>
                <span className="rk-row__main">
                  <span className="rk-row__title">Apple Salud</span>
                  <span className="rk-row__sub">{on.health ? 'Conectado · lectura y escritura' : 'Sin conectar'}</span>
                </span>
                <Switch on={on.health} />
              </button>
            </div>
            <p className="rk-note">
              Lee peso, sueño, VFC y pasos, y guarda tus comidas en Salud. En Android esta misma conexión usa Health Connect.
            </p>
          </section>

          <section className="rk-section" aria-labelledby="gym">
            <SectionHeader id="gym">Gimnasio</SectionHeader>
            <Link to="/tabs/settings/hevy" className="rk-row conn__gym">
              <span className="conn__badge conn__badge--hevy" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={PATHS.strength} />
                </svg>
              </span>
              <span className="rk-row__main">
                <span className="rk-row__title">Hevy</span>
                <span className="rk-row__sub">Entrenos de fuerza con series y pesos</span>
              </span>
              <span className="conn__link">Conectar</span>
            </Link>
          </section>

          <section className="rk-section" aria-labelledby="imp">
            <SectionHeader id="imp">Importar desde Garmin</SectionHeader>
            <div className="rk-list">{rows(IMPORTS)}</div>
          </section>

          <section className="rk-section" aria-labelledby="exp">
            <SectionHeader id="exp">Enviar a Garmin</SectionHeader>
            <div className="rk-list">{rows(EXPORTS)}</div>
          </section>

          <section className="rk-section" aria-labelledby="adj">
            <SectionHeader id="adj">Calorías de ejercicio en el objetivo</SectionHeader>
            <Segmented
              label="Porcentaje de calorías activas"
              options={SHARES.map((p) => ({ value: p, label: p === '0' ? 'No' : `${p} %` }))}
              value={share}
              onChange={setShare}
            />
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
}
