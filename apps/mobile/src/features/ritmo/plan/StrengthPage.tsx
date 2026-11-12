import { Link } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { toast } from '@/lib/toast';
import { BackLink, ExampleTag, NavRow, SectionHeader } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { usePlanWeek } from './usePlanWeek';
import './plan.css';

const STATS = [
  { label: 'Duración', value: '48 min' },
  { label: 'Volumen', value: '6.070 kg' },
  { label: 'Series', value: '17' },
  { label: 'Calorías', value: '312', cls: 'is-food' },
  { label: 'FC media', value: '118 lpm' },
  { label: 'Récords', value: '1', cls: 'is-good' },
];

const EXERCISES = [
  { name: 'Press de banca', muscle: 'Pecho', sets: ['8 × 70 kg', '8 × 70 kg', '8 × 72,5 kg', '7 × 72,5 kg'], best: 2, note: 'Récord: 8 × 72,5 kg (antes 8 × 70 kg)', pr: true },
  { name: 'Remo con barra', muscle: 'Espalda', sets: ['10 × 60 kg', '10 × 60 kg', '10 × 60 kg', '10 × 60 kg'], best: -1 },
  { name: 'Press militar', muscle: 'Hombro', sets: ['8 × 40 kg', '8 × 40 kg', '8 × 40 kg'], best: -1 },
  { name: 'Dominadas', muscle: 'Espalda', sets: ['8 · peso corporal', '7 · peso corporal', '6 · peso corporal'], best: -1, note: 'Bajan las repeticiones: prueba descansar 2 min' },
  { name: 'Curl de bíceps', muscle: 'Brazo', sets: ['12 × 14 kg', '12 × 14 kg', '12 × 14 kg'], best: -1 },
];

/** Sesión de fuerza (lienzo "Sesión de fuerza (Hevy)"). Ejemplo hasta conectar Hevy. */
export default function StrengthPage() {
  const { days } = usePlanWeek();
  const mon = days[0];

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen plan">
          <NavRow
            back={<BackLink label="Plan" fallback="/tabs/plan" />}
            actions={
              <>
                <Link to="/tabs/progress/compartir" aria-label="Compartir en redes" className="rk-iconbtn">
                  <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
                  </svg>
                </Link>
                <button type="button" className="rk-textbtn" onClick={() => toast.info('Conecta Hevy para abrir la sesión allí')}>
                  Abrir en Hevy
                </button>
              </>
            }
          />
          <header className="strength__head">
            <span className="strength__kicker">Lunes {mon.n} · 18:05</span>
            <h1>Fuerza · tren superior</h1>
            <div className="strength__tags">
              <span className="strength__tag">
                <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d={PATHS.strength} />
                </svg>
                Series y pesos de Hevy
              </span>
              <span className="strength__tag">FC de Garmin</span>
              <span className="strength__tag strength__tag--ok">Hecha según plan</span>
              <ExampleTag />
            </div>
          </header>

          <section aria-label="Resumen de la sesión" className="strength__stats">
            {STATS.map((s) => (
              <div key={s.label} className="strength__stat">
                <span className="strength__stat-label">{s.label}</span>
                <span className={`strength__stat-value ${s.cls ?? ''}`}>{s.value}</span>
              </div>
            ))}
          </section>

          <section className="rk-section" aria-labelledby="ej">
            <SectionHeader id="ej">Ejercicios</SectionHeader>
            {EXERCISES.map((e) => (
              <article key={e.name} className="strength__ex">
                <div className="strength__ex-head">
                  <h3>{e.name}</h3>
                  <span className="rk-row__sub">{e.muscle}</span>
                </div>
                <div className="strength__sets">
                  {e.sets.map((s, i) => (
                    <span key={i} className={`strength__set${i === e.best ? ' is-best' : ''}`}>
                      {s}
                    </span>
                  ))}
                </div>
                {e.note ? <span className={`strength__note${e.pr ? ' is-pr' : ''}`}>{e.note}</span> : null}
              </article>
            ))}
          </section>

          <section aria-label="Comparación" className="strength__compare">
            <span className="strength__compare-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 16l6-6 4 4 6-6M14 8h6v6" />
              </svg>
            </span>
            <span>+4 % de volumen frente a tu último tren superior. Mañana suma +150 kcal por esta carga.</span>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
}
