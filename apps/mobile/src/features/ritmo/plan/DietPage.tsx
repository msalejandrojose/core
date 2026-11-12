import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { toast } from '@/lib/toast';
import { isApiError, type GoalType } from '../api';
import { useRitmoStore } from '../ritmo.store';
import { profileBody } from '../profile/profile-body';
import { BackLink, ExampleTag, NavRow, Segmented } from '../ui/kit';
import { LOAD_EXTRA, TEMPLATES, fmtMinutes, kcal, usePlanStore, type Load } from './plan-data';
import { usePlanWeek } from './usePlanWeek';
import './plan.css';

type Opt = [string, number];
type MealLoad = Exclude<Load, 'Descanso'>;
const MENUS: Record<MealLoad, Opt[][]> = {
  Media: [
    [['Avena con plátano y café', 690], ['Tostadas con aguacate y huevos', 720], ['Yogur griego, granola y fruta', 650]],
    [['Arroz con pollo y ensalada', 980], ['Lentejas de la abuela y pan', 1010], ['Pasta con atún y tomate', 960]],
    [['Yogur griego y nueces', 330], ['Fruta y almendras', 260], ['Tostada con pavo', 280]],
    [['Salmón con arroz y ensalada', 860], ['Merluza con patata y verduras', 780], ['Tortilla de patata y ensalada', 820]],
  ],
  Alta: [
    [['Tostadas con tomate, huevos y fruta', 820], ['Avena con plátano, miel y café', 790], ['Tortitas de avena con yogur', 760]],
    [['Pasta con pollo y verduras', 1100], ['Arroz a la cubana con huevo', 1150], ['Paella de pollo y ensalada', 1080]],
    [['Plátano y yogur griego', 300], ['Bocadillo pequeño de pavo', 350], ['Batido de leche y avena', 330]],
    [['Arroz con salmón y ensalada', 950], ['Patata asada con pollo', 920], ['Pasta con gambas', 990]],
  ],
  Baja: [
    [['Yogur griego con frutos rojos y avena', 600], ['Huevos revueltos y tostada', 620], ['Café con leche y tostada', 560]],
    [['Lentejas con verduras', 880], ['Pollo al horno con verduras', 900], ['Garbanzos con espinacas', 860]],
    [['Fruta y almendras', 260], ['Queso fresco y nueces', 280], ['Yogur griego', 180]],
    [['Merluza al horno con verduras', 700], ['Tortilla de patata y ensalada', 760], ['Crema de verduras y huevo', 650]],
  ],
};
const MEALS = ['Desayuno', 'Comida', 'Merienda', 'Cena'];
const BAR: Record<Load, string> = {
  Alta: 'var(--ritmo-food)',
  Media: 'var(--ritmo-activity)',
  Baja: 'var(--ritmo-info)',
  Descanso: 'var(--ritmo-border-strong)',
};
const GOAL_OF: Record<GoalType, 'perder' | 'mantener' | 'ganar'> = {
  LOSE_WEIGHT: 'perder',
  MAINTAIN: 'mantener',
  GAIN_MUSCLE: 'ganar',
};
const GOAL_API = { perder: 'LOSE_WEIGHT', mantener: 'MAINTAIN', ganar: 'GAIN_MUSCLE' } as const;

/**
 * Dieta y menú (lienzo "Dieta y menú"). El objetivo (perder/mantener/ganar) es
 * el real de tu perfil y «Aplicar» lo guarda; el reparto por carga y el menú
 * son de ejemplo.
 */
export default function DietPage() {
  const { profile, days, todayIdx } = usePlanWeek();
  const saveProfile = useRitmoStore((s) => s.saveProfile);
  const week = usePlanStore((s) => s.week);
  const [sel, setSel] = useState(Math.max(0, todayIdx));
  const [goal, setGoal] = useState<'perder' | 'mantener' | 'ganar'>(profile ? GOAL_OF[profile.goalType] : 'mantener');
  const [pick, setPick] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const savedGoal = profile ? GOAL_OF[profile.goalType] : 'mantener';
  // El objetivo del perfil ya incluye el déficit o superávit; si eliges otro aquí, se previsualiza.
  const shift = { perder: -400, mantener: 0, ganar: 300 };
  const base = (profile?.dailyKcalTarget ?? 2400) - shift[savedGoal] + shift[goal];
  const loadOf = (i: number): MealLoad => {
    const l = TEMPLATES[week[i]].load;
    return l === 'Descanso' ? 'Baja' : l;
  };
  const targets = days.map((_, i) => base + LOAD_EXTRA[loadOf(i)]);
  const max = Math.max(...targets);
  const min = Math.min(...targets) - 400;

  const load = loadOf(sel);
  const meals = MENUS[load].map((opts, m) => {
    const idx = pick[`${sel}-${m}`] ?? 0;
    return { meal: MEALS[m], dish: opts[idx][0], k: opts[idx][1], swap: () => setPick((p) => ({ ...p, [`${sel}-${m}`]: (idx + 1) % opts.length })) };
  });
  const total = meals.reduce((s, m) => s + m.k, 0);
  const t = targets[sel];
  const diff = total - t;
  const fits = Math.abs(diff) <= t * 0.05;
  const prot = profile?.proteinTargetG ?? 150;
  const fat = Math.round((t * 0.25) / 9);
  const carbs = Math.round((t - prot * 4 - fat * 9) / 4);
  const tpl = TEMPLATES[week[sel]];
  const session = tpl.dur ? `${tpl.name} · ${fmtMinutes(tpl.dur)}` : tpl.name;
  const changed = goal !== savedGoal;

  async function apply() {
    if (!profile || !changed) return;
    setSaving(true);
    try {
      await saveProfile(profileBody(profile, { goalType: GOAL_API[goal] }));
      toast.success('Objetivo aplicado', 'Tus calorías de cada día ya siguen este objetivo.');
    } catch (e) {
      toast.error('No se pudo aplicar', isApiError(e) ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen plan">
          <NavRow
            back={<BackLink label="Plan" fallback="/tabs/plan" />}
            actions={
              <>
                <Link to="/tabs/plan/compra" aria-label="Lista de la compra" className="rk-iconbtn">
                  <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6M10 21h.01M17 21h.01" />
                  </svg>
                </Link>
                <button
                  type="button"
                  className="rk-textbtn rk-textbtn--strong"
                  disabled={!changed || saving}
                  onClick={() => void apply()}
                >
                  {changed ? 'Aplicar' : 'Aplicada'}
                </button>
              </>
            }
          />
          <header className="rk-title">
            <h1>Dieta y menú</h1>
            <span className="rk-title__sub plan__sub">
              Semana del {days[0].n} al {days[6].n} · según tu plan <ExampleTag />
            </span>
          </header>

          <Segmented
            label="Objetivo"
            options={[
              { value: 'perder', label: 'Perder' },
              { value: 'mantener', label: 'Mantener' },
              { value: 'ganar', label: 'Ganar' },
            ]}
            value={goal}
            onChange={setGoal}
          />

          <section aria-label="Calorías por día" className="diet__chart">
            <div role="tablist" aria-label="Días" className="diet__days">
              {days.map((d, i) => {
                const k = targets[i];
                const on = i === sel;
                return (
                  <button
                    key={d.date}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    aria-label={`${d.full} ${d.n}: objetivo ${kcal(k)} kcal`}
                    className={`diet__day${on ? ' is-sel' : ''}`}
                    onClick={() => setSel(i)}
                  >
                    <span className="diet__day-k">{(k / 1000).toFixed(1).replace('.', ',')}</span>
                    <span
                      className="diet__bar"
                      aria-hidden="true"
                      style={{ height: Math.round(24 + ((k - min) / Math.max(1, max - min)) * 60), background: BAR[loadOf(i)] }}
                    />
                    <span className="diet__day-letter">{d.letter}</span>
                  </button>
                );
              })}
            </div>
            <div className="diet__legend" aria-hidden="true">
              <span>
                <span style={{ background: BAR.Alta }} />
                Carga alta
              </span>
              <span>
                <span style={{ background: BAR.Media }} />
                Media
              </span>
              <span>
                <span style={{ background: BAR.Baja }} />
                Baja
              </span>
            </div>
          </section>

          <section aria-label="Día seleccionado" className="diet__card">
            <div className="diet__card-head">
              <div className="rk-row__main">
                <span className="diet__card-day">
                  {days[sel].full[0].toUpperCase() + days[sel].full.slice(1)} {days[sel].n}
                </span>
                <span className="rk-row__sub">{session}</span>
              </div>
              <span className={`plan__load plan__load--${load === 'Alta' ? 'high' : load === 'Media' ? 'mid' : 'low'}`}>
                Carga {load.toLowerCase()}
              </span>
            </div>
            <div className="diet__total">
              <span>
                <span className="diet__total-n">{kcal(total)}</span>
                <span className="rk-row__sub"> de {kcal(t)} kcal</span>
              </span>
              <span className={`diet__fit${fits ? ' is-ok' : ''}`}>
                {fits ? '✓ Ajustado' : `${diff > 0 ? '+' : '−'}${kcal(Math.abs(diff))} kcal`}
              </span>
            </div>
            <span className="rk-row__sub">
              Proteína {prot} g · hidratos {carbs} g · grasas {fat} g
            </span>
          </section>

          <ul aria-label="Menú del día" className="rk-list">
            {meals.map((m) => (
              <li key={m.meal} className="rk-row diet__meal">
                <span className="rk-row__main">
                  <span className="diet__meal-name">{m.meal}</span>
                  <span className="rk-row__title">{m.dish}</span>
                  <span className="rk-row__sub">{kcal(m.k)} kcal</span>
                </span>
                <button type="button" className="diet__swap" aria-label={`Cambiar ${m.meal.toLowerCase()}`} onClick={m.swap}>
                  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7h13l-3-3M20 17H7l3 3" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>

          <Link to="/tabs/plan/compra" className="plan__btn">
            Actualizar lista de la compra
          </Link>
        </div>
      </IonContent>
    </IonPage>
  );
}
