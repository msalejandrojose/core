import { useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { Segmented, Switch } from '../ui/kit';
import { useRitmoStore } from '../ritmo.store';
import { LOAD_EXTRA, kcal, usePlanStore, type Load, type TemplateId } from './plan-data';
import { usePlanWeek } from './usePlanWeek';
import './plan.css';

type Kind = 'run' | 'gym' | 'mob';
const KIND_OF: Record<TemplateId, Kind> = { fsup: 'gym', fpie: 'gym', z2: 'run', series: 'run', larga: 'run', mov: 'mob', rest: 'mob' };

const GYM = [
  ['Sentadilla', '4 × 6 · 90 kg'],
  ['Peso muerto rumano', '3 × 8 · 70 kg'],
  ['Zancadas', '3 × 10 · 20 kg'],
  ['Plancha', '3 × 45 s'],
];
const MOB = [
  ['Cadera y glúteo', '5 min'],
  ['Tobillo y gemelo', '5 min'],
  ['Espalda y hombro', '5 min'],
];

/** Editar sesión (lienzo "Editar sesión"): tipo, estructura y envío. Se guarda en el plan de ejemplo. */
export default function EditSessionPage() {
  const history = useHistory();
  const { day } = useParams<{ day: string }>();
  const i = Math.min(6, Math.max(0, Number(day) || 0));
  const { days } = usePlanWeek();
  const base = useRitmoStore((s) => s.profile?.dailyKcalTarget) ?? 2400;
  const current = usePlanStore((s) => s.week[i]);
  const setDay = usePlanStore((s) => s.setDay);
  const [kind, setKind] = useState<Kind>(KIND_OF[current]);
  const [reps, setReps] = useState(6);
  const [send, setSend] = useState<Record<Kind, boolean>>({ run: true, gym: true, mob: false });

  const runMin = Math.round(15 + reps * 5.6 + 10);
  const info: Record<Kind, { name: string; dur: string; load: Load; sl: string; sd: string }> = {
    run: { name: `Series ${reps} × 800 m`, dur: `≈ ${runMin} min`, load: 'Alta', sl: 'Enviar al reloj Garmin', sd: 'Como entreno estructurado, paso a paso' },
    gym: { name: 'Fuerza · pierna y core', dur: '≈ 50 min', load: 'Media', sl: 'Crear rutina en Hevy', sd: 'La empiezas desde Hevy en el gimnasio' },
    mob: { name: 'Movilidad', dur: '15 min', load: 'Baja', sl: 'Recordármelo a la hora', sd: 'Aviso en el teléfono y el reloj' },
  };
  const cur = info[kind];
  const d = days[i];
  const title = `${d.full[0].toUpperCase()}${d.full.slice(1)} ${d.n}`;
  const back = () => (history.length > 1 ? history.goBack() : history.replace('/tabs/plan'));

  function save() {
    const next: TemplateId = kind === 'run' ? 'series' : kind === 'gym' ? (current === 'fsup' ? 'fsup' : 'fpie') : 'mov';
    setDay(i, next);
    back();
  }

  return (
    <IonPage>
      <IonContent>
        <div className="rk-sheet plan-sheet">
          <span className="rk-grab" aria-hidden="true" />
          <div className="rk-sheetbar">
            <button type="button" className="rk-textbtn" onClick={back}>
              Cancelar
            </button>
            <span className="rk-sheetbar__title">{title}</span>
            <button type="button" className="rk-textbtn rk-textbtn--strong rk-sheetbar__end" onClick={save}>
              Guardar
            </button>
          </div>

          <Segmented
            label="Tipo de sesión"
            options={[
              { value: 'run', label: 'Carrera' },
              { value: 'gym', label: 'Fuerza' },
              { value: 'mob', label: 'Movilidad' },
            ]}
            value={kind}
            onChange={setKind}
          />

          <div className="rk-list">
            <div className="rk-row">
              <span className="rk-row__main rk-row__title">Nombre</span>
              <span className="rk-row__value">{cur.name}</span>
            </div>
            <div className="rk-row">
              <span className="rk-row__main rk-row__title">Hora</span>
              <span className="rk-row__value plan__time">7:30</span>
            </div>
            <div className="rk-row">
              <span className="rk-row__main rk-row__title">Duración estimada</span>
              <span className="rk-row__value">{cur.dur}</span>
            </div>
          </div>

          {kind === 'run' ? (
            <section className="rk-section" aria-labelledby="estr">
              <div className="rk-sechead">
                <h2 id="estr">Estructura</h2>
              </div>
              <div className="plan__struct">
                <div className="plan__step">
                  <span className="plan__step-bar" style={{ background: 'var(--ritmo-activity)' }} aria-hidden="true" />
                  <span className="rk-row__main">
                    <span className="rk-row__title">Calentamiento</span>
                    <span className="rk-row__sub">15 min · zona 1–2</span>
                  </span>
                </div>
                <div className="plan__step">
                  <span className="plan__step-bar" style={{ background: 'var(--ritmo-food)' }} aria-hidden="true" />
                  <span className="rk-row__main">
                    <span className="rk-row__title">{reps} × 800 m</span>
                    <span className="rk-row__sub">a 4:30/km · recuperar 2 min trotando</span>
                  </span>
                  <div className="plan__pm">
                    <button type="button" aria-label="Una serie menos" onClick={() => setReps((r) => Math.max(2, r - 1))}>
                      −
                    </button>
                    <button type="button" aria-label="Una serie más" onClick={() => setReps((r) => Math.min(12, r + 1))}>
                      +
                    </button>
                  </div>
                </div>
                <div className="plan__step">
                  <span className="plan__step-bar" style={{ background: 'var(--ritmo-info)' }} aria-hidden="true" />
                  <span className="rk-row__main">
                    <span className="rk-row__title">Vuelta a la calma</span>
                    <span className="rk-row__sub">10 min · zona 1</span>
                  </span>
                </div>
              </div>
            </section>
          ) : null}

          {kind !== 'run' ? (
            <section className="rk-section" aria-labelledby="ejs">
              <div className="rk-sechead">
                <h2 id="ejs">{kind === 'gym' ? 'Ejercicios' : 'Rutina'}</h2>
              </div>
              <ul className="rk-list">
                {(kind === 'gym' ? GYM : MOB).map(([n, v]) => (
                  <li key={n} className="rk-row">
                    <span className="rk-row__main rk-row__title">{n}</span>
                    <span className="rk-row__value">{v}</span>
                  </li>
                ))}
              </ul>
              {kind === 'gym' ? <p className="rk-note">Los pesos saldrán de tu última sesión en Hevy cuando lo conectes.</p> : null}
            </section>
          ) : null}

          <div className="rk-list">
            <button
              type="button"
              aria-pressed={send[kind]}
              className="rk-row plan__toggle"
              onClick={() => setSend((s) => ({ ...s, [kind]: !s[kind] }))}
            >
              <span className="rk-row__main">
                <span className="rk-row__title">{cur.sl}</span>
                <span className="rk-row__sub">{cur.sd}</span>
              </span>
              <Switch on={send[kind]} />
            </button>
          </div>

          <div className="plan__diet-hint">
            <span className={`plan__load plan__load--${cur.load === 'Alta' ? 'high' : cur.load === 'Media' ? 'mid' : 'low'}`}>
              Carga {cur.load.toLowerCase()}
            </span>
            <span>
              Dieta del {d.full}: {kcal(base + LOAD_EXTRA[cur.load])} kcal
            </span>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
