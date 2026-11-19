import { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { toast } from '@/lib/toast';
import { brioApi, isApiError, type Effort } from '../api';
import { useBrioStore } from '../brio.store';
import { tapSuccess } from '../haptics';
import { MUSCLE_NAME } from '../performance/labels';
import { ExercisePicker } from '../routines/ExercisePicker';
import { routinesApi } from '../routines/routines.api';
import { formatKcal } from '../format';
import { BackLink, NavRow, Segmented, SectionHeader } from '../ui/kit';
import {
  addExercise,
  addRest,
  addSet,
  clock,
  linkWithNext,
  setRest,
  doneSummary,
  editSet,
  isExerciseDone,
  isHybrid,
  nextPending,
  previousAsSet,
  previousSetAt,
  previousSetLabel,
  progress,
  removeExercise,
  removeLastSet,
  routineWithTodayWeights,
  skipRest,
  toLogBody,
  toggleSet,
  toggleWarmup,
  workNumber,
} from './live-workout';
import { REST_OPTIONS, closesRound, linkedWithNext, restLabel, supersetLetter } from '../routines/supersets';
import type { Measure } from '../performance/perf.api';
import { cancelRestEnd, scheduleRestEnd } from '../reminders/reminders.native';
import { previousSetsApi } from './live.api';
import { useLiveStore } from './live.store';
import { useNow } from './useNow';
import '../sheets/sheets.css';
import '../routines/routines.css';
import './live.css';

const LEVELS: { value: Effort; label: string }[] = [
  { value: 'LIGHT', label: 'Suave' },
  { value: 'MODERATE', label: 'Normal' },
  { value: 'VIGOROUS', label: 'Duro' },
];

function Num({
  label,
  value,
  onChange,
  decimal,
  time,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  decimal?: boolean;
  time?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="live__num">
      <span className="rk-visually-hidden">{label}</span>
      <input
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={value}
        placeholder={placeholder ?? '—'}
        onChange={(e) => onChange(e.target.value.replace(time ? /[^0-9:]/g : /[^0-9.,]/g, ''))}
      />
    </label>
  );
}

/** Ejercicio con la siguiente serie sin hacer, para el aviso de fin de descanso. */
function nextExerciseName(w: { exercises: { name: string; sets: { done: boolean }[] }[] }): string | null {
  return w.exercises.find((e) => e.sets.some((s) => !s.done))?.name ?? null;
}

type Column = 'weight' | 'reps' | 'distance' | 'time' | 'cal';
const COLUMN_LABEL: Record<Column, string> = { weight: 'kg', reps: 'Reps', distance: 'Metros', time: 'Tiempo', cal: 'Cal' };

/** Qué se apunta en cada serie según cómo se mide el ejercicio. */
function columnsFor(measure: Measure, bodyweight: boolean): Column[] {
  const kg: Column[] = bodyweight ? [] : ['weight'];
  switch (measure) {
    case 'DISTANCE':
      return [...kg, 'distance', 'time'];
    case 'TIME':
      return [...kg, 'time'];
    case 'CALORIES':
      return ['cal', 'time'];
    default:
      return ['weight', 'reps'];
  }
}

/**
 * Entrenar en Brío: la rutina serie a serie. Cada serie se marca al hacerla
 * (con sus kg y repeticiones reales), arranca el descanso y, al terminar, se
 * guarda como entreno enlazado con la rutina.
 */
export default function LiveWorkoutPage() {
  const history = useHistory();
  const workout = useLiveStore((s) => s.workout);
  const update = useLiveStore((s) => s.update);
  const setWorkout = useLiveStore((s) => s.set);
  const refreshDay = useBrioStore((s) => s.refreshDay);
  const now = useNow();
  const [picking, setPicking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [effort, setEffort] = useState<Effort>('MODERATE');
  const [updateRoutine, setUpdateRoutine] = useState(true);
  const [saving, setSaving] = useState(false);
  /** Ejercicio con el selector de descanso abierto. */
  const [restOpen, setRestOpen] = useState<number | null>(null);
  const restWasRunning = useRef(false);
  /** Ejercicios hechos que se han vuelto a desplegar (por `exerciseId-índice`). */
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  const cards = useRef(new Map<number, HTMLElement>());

  // Notificación al acabar el descanso, para cuando la app esté en segundo plano.
  const restUntil = workout?.restUntil ?? null;
  const nextName = workout ? nextExerciseName(workout) : null;
  useEffect(() => {
    if (restUntil) void scheduleRestEnd(new Date(restUntil), nextName);
    else void cancelRestEnd();
  }, [restUntil, nextName]);

  // Vibración al acabar el descanso (si la pantalla está delante).
  const resting = !!workout?.restUntil && workout.restUntil > now;
  useEffect(() => {
    if (restWasRunning.current && !resting && workout?.restUntil) void tapSuccess();
    restWasRunning.current = resting;
  }, [resting, workout?.restUntil]);

  if (!workout) {
    return (
      <IonPage>
        <IonContent>
          <div className="rk-screen">
            <NavRow back={<BackLink label="Hoy" fallback="/tabs/today" />} />
            <p className="rk-note">No hay ningún entreno en curso. Empieza uno desde + → Entreno, eligiendo una rutina.</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const p = progress(workout);

  async function finish() {
    if (!workout) return;
    setSaving(true);
    // La misma píldora pasa de «Guardando…» al resultado.
    const t = toast.progress('Guardando entreno…', `${workout.name} · ${p.done} ${p.done === 1 ? 'serie' : 'series'}`);
    try {
      const types = await brioApi.activityTypes();
      // Con carrera, remo, trineo… cuenta como híbrido (más gasto que pesas).
      const strength =
        (isHybrid(workout) ? types.find((t) => t.code === 'hybrid') : undefined) ??
        types.find((t) => t.code === 'strength') ??
        types.find((t) => t.kind === 'STRENGTH');
      if (!strength) throw new Error('Sin tipo de fuerza');
      const session = await brioApi.logActivity(toLogBody(workout, strength.id, effort));
      if (updateRoutine && workout.routineId) {
        try {
          const r = await routinesApi.get(workout.routineId);
          await routinesApi.update(r.id, routineWithTodayWeights(r, workout));
        } catch {
          toast.warning('Entreno guardado', 'No se pudieron actualizar los pesos de la rutina.');
        }
      }
      setWorkout(null);
      void cancelRestEnd();
      await refreshDay();
      void tapSuccess();
      t.success('Entreno guardado', `${p.done} series · ${formatKcal(session.kcalBurned)} kcal`, { tone: 'activity', icon: 'dumbbell' });
      history.replace('/tabs/today');
    } catch (e) {
      if (isApiError(e) && e.code === 'BRIO_WEIGHT_UNKNOWN') {
        toast.dismiss(t.id);
        toast.warning('Falta tu peso', 'Regístralo para poder calcular las calorías del entreno.');
      } else {
        t.error('No se pudo guardar', isApiError(e) ? e.message : 'Tus series siguen aquí.', {
          action: { label: 'Reintentar', run: () => void finish() },
        });
      }
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setWorkout(null);
    void cancelRestEnd();
    toast.info('Entreno descartado');
    history.replace('/tabs/today');
  }

  const groups = workout.exercises.map((x) => x.group);
  // Lo hecho sube arriba (plegado salvo que se despliegue) y lo pendiente queda
  // debajo. Solo cambia cómo se ve: el orden guardado es el de la rutina.
  const indices = workout.exercises.map((_, i) => i);
  const doneIdx = indices.filter((i) => isExerciseDone(workout.exercises[i]));
  const todoIdx = indices.filter((i) => !isExerciseDone(workout.exercises[i]));
  const cardKey = (i: number) => `${workout.exercises[i].exerciseId}-${i}`;
  const setExpanded = (key: string, open: boolean) =>
    setExpandedKeys((cur) => {
      const next = new Set(cur);
      if (open) next.add(key);
      else next.delete(key);
      return next;
    });

  function toggle(i: number, k: number) {
    if (!workout) return;
    const wasDone = workout.exercises[i].sets[k].done;
    if (!wasDone) void tapSuccess();
    const after = toggleSet(workout, i, k);
    update((w) => toggleSet(w, i, k));
    if (!wasDone && isExerciseDone(after.exercises[i])) {
      // Ejercicio terminado: se pliega arriba y la pantalla baja al siguiente pendiente.
      setExpanded(cardKey(i), false);
      const target = nextPending(after, i);
      if (target !== null) {
        window.setTimeout(() => cards.current.get(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      }
    }
  }

  /** Fila plegada de un ejercicio hecho: nombre y resumen; al tocarla se despliega. */
  const folded = (i: number) => {
    const e = workout.exercises[i];
    const summary = doneSummary(e);
    return (
      <button
        key={cardKey(i)}
        type="button"
        className="live__folded"
        aria-label={`${e.name}, hecho: ${summary}. Toca para desplegarlo.`}
        onClick={() => setExpanded(cardKey(i), true)}
      >
        <span className="live__folded-check" aria-hidden="true">
          ✓
        </span>
        <span className="live__folded-text">
          <span className="live__folded-name">{e.name}</span>
          <span className="live__folded-meta">{summary}</span>
        </span>
        <span className="live__folded-chev" aria-hidden="true">
          ›
        </span>
      </button>
    );
  };

  /**
   * Tarjeta de un ejercicio. `shownBefore` es el ejercicio que se ve justo
   * encima (para el rótulo de superserie) y `linkNext`, si el siguiente de la
   * rutina va justo debajo (solo entonces tiene sentido el botón de enlazar).
   */
  const card = (i: number, shownBefore: number | null, linkNext: boolean) => {
    const e = workout.exercises[i];
    const done = isExerciseDone(e);
    const hasPrev = !!e.previous?.sets.length;
    const firstOfGroup = e.group != null && (shownBefore === null || groups[shownBefore] !== e.group);
    const members = e.group != null ? workout.exercises.filter((x) => x.group === e.group).map((x) => x.name) : [];
    const cols = columnsFor(e.measure, e.bodyweight);
    // RIR solo en lo que va por repeticiones.
    const withRir = e.measure === 'REPS';
    const grid = {
      gridTemplateColumns: `32px ${hasPrev ? '58px ' : ''}repeat(${cols.length}, minmax(0, 1fr)) ${withRir ? '42px ' : ''}44px`,
    };
    const last = e.sets[e.sets.length - 1];
    return (
      <div
        key={cardKey(i)}
        ref={(el) => {
          if (el) cards.current.set(i, el);
          else cards.current.delete(i);
        }}
        className="live__card"
      >
        {firstOfGroup ? (
          <p className="live__ss-label">
            Superserie {supersetLetter(e.group!)} ·{' '}
            {members.length <= 3 ? `alterna ${members.join(' → ')}` : `${members.length} ejercicios seguidos`} y descansa al acabar la vuelta
          </p>
        ) : null}
        <section className={`rk-list live__exercise${e.group ? ' is-superset' : ''}`} aria-label={e.name}>
          <div className="rk-row live__ex-head">
            <span className="rk-row__main">
              <span className="rk-row__title">{e.name}</span>
              {e.muscles ? <span className="rk-row__sub">{e.muscles}</span> : null}
            </span>
            {done ? (
              <button type="button" className="rk-textbtn" onClick={() => setExpanded(cardKey(i), false)}>
                Plegar
              </button>
            ) : (
              <button type="button" className="rk-textbtn" onClick={() => update((w) => removeExercise(w, i))}>
                Quitar
              </button>
            )}
          </div>
          <div className="live__sets-head" style={grid} aria-hidden="true">
            <span>Serie</span>
            {hasPrev ? <span>Anterior</span> : null}
            {cols.map((c) => (
              <span key={c}>{c === 'weight' && e.bodyweight ? 'Lastre' : COLUMN_LABEL[c]}</span>
            ))}
            {withRir ? <span>RIR</span> : null}
            <span />
          </div>
          {e.sets.map((s, k) => {
            const p = previousSetAt(e, k);
            const prevText = p ? previousSetLabel(p, e.measure, e.bodyweight) : null;
            const n = workNumber(e, k);
            const name = n === null ? 'Calentamiento' : `Serie ${n}`;
            return (
              <div key={k} className={`live__set${s.done ? ' is-done' : ''}${s.warmup ? ' is-warmup' : ''}`} style={grid}>
                <button
                  type="button"
                  className="live__set-n"
                  aria-pressed={!!s.warmup}
                  aria-label={
                    s.warmup ? 'Serie de calentamiento. Toca para contarla como serie de trabajo.' : `Serie ${n}. Toca para marcarla como calentamiento.`
                  }
                  disabled={s.done}
                  onClick={() => update((w) => toggleWarmup(w, i, k))}
                >
                  {n ?? 'C'}
                </button>
                {hasPrev ? (
                  p && prevText ? (
                    <button
                      type="button"
                      className="live__prev"
                      disabled={s.done}
                      aria-label={`La última vez: ${prevText}. Toca para copiarlo en ${name.toLowerCase()}.`}
                      onClick={() => update((w) => editSet(w, i, k, previousAsSet(p, e.measure)))}
                    >
                      {prevText}
                    </button>
                  ) : (
                    <span className="live__prev is-empty" aria-hidden="true">
                      —
                    </span>
                  )
                ) : null}
                {cols.map((c) => (
                  <Num
                    key={c}
                    label={`${name}, ${COLUMN_LABEL[c]}`}
                    value={s[c]}
                    decimal={c === 'weight'}
                    time={c === 'time'}
                    placeholder={c === 'time' ? 'm:ss' : undefined}
                    onChange={(v) => update((w) => editSet(w, i, k, { [c]: v }))}
                  />
                ))}
                {withRir ? (
                  <Num label={`${name}, repeticiones en reserva`} value={s.rir ?? ''} onChange={(v) => update((w) => editSet(w, i, k, { rir: v.replace(/[.,]/g, '') }))} />
                ) : null}
                <button
                  type="button"
                  className="live__check"
                  aria-pressed={s.done}
                  aria-label={s.done ? `${name} hecha. Toca para desmarcarla.` : `Marcar ${name.toLowerCase()} como hecha`}
                  onClick={() => toggle(i, k)}
                >
                  ✓
                </button>
              </div>
            );
          })}
          <div className="live__ex-foot">
            <span className="live__sets-btns">
              <button type="button" className="rk-textbtn" onClick={() => update((w) => addSet(w, i))}>
                Añadir serie
              </button>
              {e.sets.length > 1 && !last.done ? (
                <button type="button" className="live__minus" aria-label="Quitar la última serie" onClick={() => update((w) => removeLastSet(w, i))}>
                  −
                </button>
              ) : null}
            </span>
            {closesRound(groups, i) ? (
              <button
                type="button"
                className="rk-textbtn live__rest-btn"
                aria-expanded={restOpen === i}
                onClick={() => setRestOpen((x) => (x === i ? null : i))}
              >
                Descanso: {restLabel(e.restSec)}
              </button>
            ) : (
              <span className="live__rest-note">Sin descanso: sigue con el siguiente</span>
            )}
          </div>
          {restOpen === i ? (
            <div className="routine__rest-options live__rest-options" role="group" aria-label={`Descanso de ${e.name}`}>
              {REST_OPTIONS.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  className="workout__chip routine__rest-chip"
                  aria-pressed={(e.restSec ?? 0) === sec}
                  onClick={() => {
                    update((w) => setRest(w, i, sec));
                    setRestOpen(null);
                  }}
                >
                  {sec ? restLabel(sec) : 'Nada'}
                </button>
              ))}
            </div>
          ) : null}
        </section>
        {linkNext ? (
          <button
            type="button"
            className={`routine__link${linkedWithNext(groups, i) ? ' is-on' : ''}`}
            aria-pressed={linkedWithNext(groups, i)}
            onClick={() => update((w) => linkWithNext(w, i))}
          >
            {linkedWithNext(groups, i) ? '⛓ En superserie con el siguiente · separar' : '＋ Superserie con el siguiente'}
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen live">
          <NavRow
            back={<BackLink label="Hoy" fallback="/tabs/today" />}
            actions={
              <button type="button" className="rk-textbtn rk-textbtn--strong" onClick={() => setFinishing(true)}>
                Terminar
              </button>
            }
          />
          <header className="live__head">
            <h1 className="live__title">{workout.name}</h1>
            <div className="live__stats" aria-live="off">
              <span>
                <strong>{clock(now - workout.startedAt)}</strong> tiempo
              </span>
              <span>
                <strong>
                  {p.done}/{p.total}
                </strong>{' '}
                series
              </span>
              {p.volumeKg || !p.distanceM ? (
                <span>
                  <strong>{p.volumeKg.toLocaleString('es-ES')}</strong> kg
                </span>
              ) : null}
              {p.distanceM ? (
                <span>
                  <strong>{(p.distanceM / 1000).toLocaleString('es-ES', { maximumFractionDigits: 2 })}</strong> km
                </span>
              ) : null}
            </div>
          </header>

          {doneIdx.length > 0 ? (
            <>
              <SectionHeader id="hechos" action={<span className="live__group-count">{doneIdx.length} de {workout.exercises.length}</span>}>
                Hechos
              </SectionHeader>
              <div className="live__done" role="group" aria-labelledby="hechos">
                {doneIdx.map((i) => (expandedKeys.has(cardKey(i)) ? card(i, null, false) : folded(i)))}
              </div>
              {todoIdx.length ? <SectionHeader id="por-hacer">Por hacer</SectionHeader> : null}
            </>
          ) : null}

          {todoIdx.map((i, n) => card(i, n > 0 ? todoIdx[n - 1] : null, todoIdx[n + 1] === i + 1))}
          {doneIdx.length > 0 && todoIdx.length === 0 ? <p className="live__all-done">Todo hecho. Añade otro ejercicio o pulsa Terminar.</p> : null}

          {picking ? (
            <ExercisePicker
              exclude={workout.exercises.map((e) => e.exerciseId)}
              onCancel={() => setPicking(false)}
              onPick={(ex) => {
                setPicking(false);
                const base = {
                  exerciseId: ex.id,
                  name: ex.name,
                  bodyweight: ex.isBodyweight,
                  measure: ex.measure ?? 'REPS',
                  muscles: ex.muscles
                    .filter((m) => m.weight >= 1)
                    .map((m) => MUSCLE_NAME[m.muscle] ?? m.muscle)
                    .join(', '),
                  restSec: (ex.measure ?? 'REPS') === 'REPS' ? 90 : null,
                };
                void previousSetsApi
                  .get([ex.id])
                  .then((prev) => update((w) => addExercise(w, base, prev[0] ?? null)))
                  .catch(() => update((w) => addExercise(w, base, null)));
              }}
            />
          ) : (
            <button type="button" className="routine__add-btn live__add-ex" onClick={() => setPicking(true)}>
              Añadir ejercicio
            </button>
          )}

          {finishing ? (
            <section className="rk-section live__finish" aria-labelledby="fin">
              <SectionHeader id="fin">Terminar entreno</SectionHeader>
              <p className="rk-note">
                {p.done
                  ? `${p.done} series hechas en ${clock(now - workout.startedAt)}. Solo se guardan las marcadas con ✓.`
                  : 'Aún no has marcado ninguna serie: se guardará solo el tiempo.'}
              </p>
              <Segmented label="Cómo ha ido" value={effort} onChange={setEffort} options={LEVELS} />
              {workout.routineId ? (
                <button type="button" className="rk-row conn__toggle live__toggle" aria-pressed={updateRoutine} onClick={() => setUpdateRoutine((x) => !x)}>
                  <span className="rk-row__main">
                    <span className="rk-row__title">Guardar estos pesos en la rutina</span>
                    <span className="rk-row__sub">La próxima vez empezarás con lo de hoy</span>
                  </span>
                  <span className={`live__tick${updateRoutine ? ' is-on' : ''}`} aria-hidden="true">
                    ✓
                  </span>
                </button>
              ) : null}
              <button type="button" className="rk-btn live__save" disabled={saving} onClick={() => void finish()}>
                {saving ? 'Guardando…' : 'Guardar entreno'}
              </button>
              <div className="live__finish-more">
                <button type="button" className="rk-textbtn" onClick={() => setFinishing(false)}>
                  Seguir entrenando
                </button>
                <button type="button" className="rk-textbtn live__discard" onClick={discard}>
                  Descartar
                </button>
              </div>
            </section>
          ) : null}
        </div>

        {resting ? (
          <div className="live__rest" role="timer" aria-live="polite">
            <span className="live__rest-label">Descanso</span>
            <strong className="live__rest-time">{clock(workout.restUntil! - now)}</strong>
            <span
              className="live__rest-bar"
              style={{ width: `${Math.max(0, Math.min(100, ((workout.restUntil! - now) / ((workout.restFor ?? 1) * 1000)) * 100))}%` }}
              aria-hidden="true"
            />
            <button type="button" onClick={() => update((w) => addRest(w, 15))}>
              +15 s
            </button>
            <button type="button" onClick={() => update(skipRest)}>
              Saltar
            </button>
          </div>
        ) : null}
      </IonContent>
    </IonPage>
  );
}
