import { useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { BackLink, ExampleTag, LargeTitle, NavRow, Ring, SectionHeader } from '../ui/kit';
import { toast } from '@/lib/toast';
import { formatNumber } from '../format';
import { useRecentHealth, type HealthBaseline } from '../profile/garmin.api';
import './pages.css';

const FACTORS = [
  { name: 'Sueño', value: '7 h 12', delta: 'Bien', good: true },
  { name: 'VFC', value: '44 ms', delta: '−18 %', good: false },
  { name: 'FC en reposo', value: '55 lpm', delta: '+3', good: false },
  { name: 'Carga 7 días', value: 'Alta', delta: '+22 %', good: false },
];

/** Fila de un dato real: su último valor y cuánto se aparta de tu media. `higherIsBetter` decide el color. */
function realFactor(name: string, b: HealthBaseline, format: (n: number) => string, higherIsBetter: boolean) {
  if (b.latest === null) return null;
  const delta = b.deltaPct === null ? 'Sin media aún' : b.deltaPct === 0 ? 'Igual' : `${b.deltaPct > 0 ? '+' : '−'}${Math.abs(b.deltaPct)} %`;
  const good = b.deltaPct === null || b.deltaPct === 0 || b.deltaPct > 0 === higherIsBetter;
  return { name, value: format(b.latest), delta, good };
}

const hoursMinutes = (sec: number) => `${Math.floor(sec / 3600)} h ${String(Math.round((sec % 3600) / 60)).padStart(2, '0')}`;

const OPTIONS = [
  { id: 'suave', title: 'Rodaje suave 35 min', desc: 'En vez de series · dieta 3.200 → 2.850 kcal', rec: true },
  { id: 'mover', title: 'Mover las series al sábado', desc: 'Viernes descanso activo · fuerza pasa al domingo', rec: false },
  { id: 'mantener', title: 'Mantener el plan', desc: 'Series 6 × 800 m como estaba', rec: false },
];

/**
 * Ajuste por recuperación (lienzo "Ajuste por recuperación"). Necesita sueño,
 * VFC y FC en reposo de Garmin o Salud, y el plan de entrenamiento: hasta
 * entonces enseña el ejemplo del diseño, marcado como tal.
 */
export default function RecoveryPage() {
  const [pick, setPick] = useState('suave');
  const health = useRecentHealth();
  const real = health
    ? [
        realFactor('Sueño', health.sleep, hoursMinutes, true),
        realFactor('VFC', health.hrv, (n) => `${formatNumber(n)} ms`, true),
        realFactor('FC en reposo', health.restingHr, (n) => `${formatNumber(n)} lpm`, false),
      ].filter((f) => f !== null)
    : [];
  const factors = real.length ? real : FACTORS;

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen">
          <NavRow back={<BackLink label="Hoy" fallback="/tabs/today" />} actions={<ExampleTag />} />
          <LargeTitle sub="Antes de la sesión de mañana">Recuperación</LargeTitle>

          <section aria-label="Puntuación" className="rk-card recovery__score">
            <Ring size={84} ratio={0.58} color="var(--ritmo-food)" radius={44} stroke={12} label="Recuperación 58 de 100">
              <text x="52" y="60" textAnchor="middle" fontSize="28" fontWeight="700" fill="var(--ritmo-ink)">
                58
              </text>
            </Ring>
            <div className="recovery__text">
              <span className="recovery__level">Moderada</span>
              <span className="ritmo-callout">Duermes bien, pero tu cuerpo aún arrastra la carga de esta semana.</span>
            </div>
          </section>

          <section className="rk-section" aria-labelledby="fact">
            <SectionHeader id="fact">En qué nos basamos</SectionHeader>
            <div className="rk-list">
              {factors.map((f) => (
                <div key={f.name} className="rk-row">
                  <span className="rk-row__main rk-row__title">{f.name}</span>
                  <span className="rk-row__value">{f.value}</span>
                  <span className={`recovery__delta${f.good ? ' is-good' : ''}`}>{f.delta}</span>
                </div>
              ))}
            </div>
            <p className="rk-note">
              {real.length
                ? 'Tus datos de Garmin, comparados con tu media de las últimas semanas. La puntuación y las propuestas siguen siendo de ejemplo.'
                : 'Comparado con tu media de 4 semanas · Garmin y Salud'}
            </p>
          </section>

          <section className="rk-section" aria-labelledby="prop">
            <SectionHeader id="prop">Para mañana, viernes</SectionHeader>
            <div role="radiogroup" aria-label="Opciones para mañana" className="recovery__options">
              {OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={pick === o.id}
                  className="recovery__option"
                  onClick={() => setPick(o.id)}
                >
                  <span className="recovery__radio-wrap" aria-hidden="true">
                    <span className={`recovery__radio${pick === o.id ? ' is-on' : ''}`} />
                  </span>
                  <span className="recovery__cell">
                    <span className="recovery__title">
                      {o.title}
                      {o.rec ? <span className="ritmo-chip ritmo-chip--done">Recomendado</span> : null}
                    </span>
                    <span className="rk-row__sub">{o.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <button
            type="button"
            className="rk-btn"
            onClick={() => toast.info('Disponible cuando conectes Garmin', 'Esta pantalla aún usa datos de ejemplo.')}
          >
            Aplicar
          </button>
        </div>
      </IonContent>
    </IonPage>
  );
}
