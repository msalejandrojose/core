import { useEffect, useState } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { toast } from '@/lib/toast';
import { isApiError } from '../api';
import { formatNumber } from '../format';
import { CheckCircle, Chevron, Segmented } from '../ui/kit';
import { ActivityIcon } from '../ui/activity-icons';
import { hevyApi, hevyErrorText, useHevyStatus } from '../profile/hevy.api';
import { routineSummary } from '../routines/routine-draft';
import { newRoutineForDayPath, routinesForKind, sessionFromRoutine, useRoutinePick } from '../routines/routine-pick';
import { useRoutines, type Routine } from '../routines/routines.api';
import { planApi, usePlanWeekData, type PlanFavorite, type PlanLoad } from './plan.api';
import { favoriteForm, favoriteMeta, hasDistance, isFavoriteSelected, selectionKey } from './session-pick';
import { LOAD_CLASS, LOAD_LABEL, STATUS_TEXT, dayFull, dayNumber, fmtMinutes } from './plan-labels';
import { usePlanTemplates } from './usePlanTemplates';
import './plan.css';
import '../performance/performance.css';

// El descanso se elige arriba, como una opción más; aquí solo la intensidad.
const LOADS: { value: PlanLoad; label: string }[] = [
  { value: 'LOW', label: 'Baja' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
];
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Quitar la rutina de la estructura de la sesión, sin tocar el resto (series, Hevy…). */
function withoutRoutine(structure: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!structure || !('routineId' in structure)) return structure;
  const rest = { ...structure };
  delete rest.routineId;
  return rest;
}
const numOrNull = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return v.trim() && Number.isFinite(n) && n > 0 ? n : null;
};

/** Sesión de un día (lienzo "Editar sesión"): lo planificado, y debajo cómo fue de verdad. */
export default function EditSessionPage() {
  const history = useHistory();
  const params = useParams<{ day: string }>();
  const day = DAY_RE.test(params.day) ? params.day : undefined;
  const { data, error, reload } = usePlanWeekData(day);
  const templates = usePlanTemplates();
  const { status: hevy } = useHevyStatus();
  const entry = data?.days.find((d) => d.day === (day ?? data.today));
  const planned = entry?.planned ?? null;

  const [kind, setKind] = useState<string>('OTHER');
  const [favorites, setFavorites] = useState<PlanFavorite[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [title, setTitle] = useState('');
  const [load, setLoad] = useState<PlanLoad>('MEDIUM');
  const [time, setTime] = useState('');
  const [minutes, setMinutes] = useState('');
  const [km, setKm] = useState('');
  const [reps, setReps] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [actualNotes, setActualNotes] = useState('');
  const [templateCode, setTemplateCode] = useState<string | null>(null);
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const { routines, reload: reloadRoutines } = useRoutines();
  const pick = useRoutinePick((st) => st.pick);
  const clearPick = useRoutinePick((st) => st.clear);

  /** Elegir una rutina guardada: la sesión toma su tipo, nombre, duración y distancia. */
  function chooseRoutine(r: Routine | null) {
    setRoutineId(r?.id ?? null);
    if (!r) return;
    const from = sessionFromRoutine(r);
    setKind(from.kind);
    setTitle(from.title);
    if (from.minutes) setMinutes(from.minutes);
    if (from.km) setKm(from.km);
  }

  // El formulario se rellena una vez por día cargado; después manda lo que escribes.
  useEffect(() => {
    if (!entry || loadedFor === entry.day) return;
    setLoadedFor(entry.day);
    const p = entry.planned;
    setKind(p?.kind ?? 'OTHER');
    setTitle(p?.title ?? '');
    setLoad(p?.load ?? 'MEDIUM');
    setTime(p?.startTime ?? '');
    setMinutes(p?.plannedDurationMin ? String(p.plannedDurationMin) : '');
    setKm(p?.plannedDistanceM ? formatNumber(p.plannedDistanceM / 1000, 1) : '');
    setReps(typeof p?.structure?.reps === 'number' ? p.structure.reps : null);
    setNotes(p?.notes ?? '');
    setActualNotes(p?.actualNotes ?? '');
    setTemplateCode(p?.templateCode ?? null);
    setRoutineId(typeof p?.structure?.routineId === 'string' ? p.structure.routineId : null);
  }, [entry, loadedFor]);

  useEffect(() => {
    let alive = true;
    planApi
      .favorites()
      .then((f) => alive && setFavorites(f))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  // Vuelta del editor con una rutina recién creada para este día: se recarga la lista y se elige.
  const pickedId = pick && entry && pick.day === entry.day ? pick.routineId : null;
  useEffect(() => {
    if (pickedId) reloadRoutines();
  }, [pickedId, reloadRoutines]);
  useEffect(() => {
    if (!pickedId || !entry || loadedFor !== entry.day) return;
    const r = routines?.find((x) => x.id === pickedId);
    if (!r) return;
    clearPick();
    chooseRoutine(r);
  }, [pickedId, routines, entry, loadedFor, clearPick]);

  const back = () => (history.length > 1 ? history.goBack() : history.replace('/tabs/entrenos/plan'));

  async function run(action: () => Promise<unknown>, ok: string, leave = false) {
    setSaving(true);
    try {
      await action();
      toast.success(ok);
      if (leave) back();
      else reload();
    } catch (e) {
      toast.error('No se pudo guardar', isApiError(e) ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function sendToHevy() {
    if (!entry) return;
    setSaving(true);
    try {
      const r = await hevyApi.sendRoutine(entry.day);
      const from = `Copiada de tu entreno del ${dayNumber(r.basedOnDay)}/${r.basedOnDay.slice(5, 7)}`;
      toast.success(
        `Rutina en Hevy · ${r.exercises} ${r.exercises === 1 ? 'ejercicio' : 'ejercicios'}`,
        r.skipped.length ? `${from}. Sin equivalente en Hevy: ${r.skipped.join(', ')}.` : `${from}.`,
      );
      reload();
    } catch (e) {
      toast.error('No se pudo enviar', hevyErrorText(e));
    } finally {
      setSaving(false);
    }
  }

  function applyTemplate(code: string) {
    const t = templates.find((x) => x.code === code);
    if (!t) return;
    setTemplateCode(code);
    setKind(t.kind);
    setTitle(t.title);
    setLoad(t.load);
    setMinutes(t.durationMin ? String(t.durationMin) : '');
    setKm(t.distanceM ? formatNumber(t.distanceM / 1000, 1) : '');
    setReps(typeof t.structure?.reps === 'number' ? t.structure.reps : null);
  }

  /** Uno de «lo que más repites»: se rellena con lo de siempre (rutina, duración, intensidad). */
  function chooseFavorite(f: PlanFavorite) {
    const form = favoriteForm(f, templates);
    setRoutineId(form.routineId);
    setTemplateCode(form.templateCode);
    setKind(form.kind);
    setTitle(form.title);
    setLoad(form.load === 'REST' ? 'MEDIUM' : form.load);
    setMinutes(form.minutes);
    setKm(form.km);
    setReps(form.reps);
  }

  /** Una sesión tipo de «Otra actividad» (o el descanso): sin rutina. */
  function chooseTemplate(code: string) {
    applyTemplate(code);
    setRoutineId(null);
  }

  /** Una rutina de «Otra actividad». */
  function pickRoutine(r: Routine) {
    chooseRoutine(r);
    setTemplateCode(null);
    setReps(null);
    if (load === 'REST') setLoad('MEDIUM');
  }

  function changeReps(delta: number) {
    setReps((r) => {
      const next = Math.min(20, Math.max(2, (r ?? 6) + delta));
      setTitle((t) => t.replace(/\d+\s*×/, `${next} ×`));
      return next;
    });
  }

  if (!entry) {
    return (
      <IonPage>
        <IonContent>
          <div className="rk-sheet plan-sheet">
            <div className="rk-sheetbar">
              <button type="button" className="rk-textbtn" onClick={back}>
                Cerrar
              </button>
            </div>
            {error ? <p className="rk-note">No se pudo cargar el día.</p> : null}
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const full = dayFull(entry.day);
  const heading = `${full[0].toUpperCase()}${full.slice(1)} ${dayNumber(entry.day)}`;
  const isCardio = hasDistance(kind);
  const diet = data?.diet?.find((d) => d.day === entry.day) ?? null;
  const canCheck = !!planned && planned.load !== 'REST' && entry.day <= (data?.today ?? '');
  const done = entry.status === 'DONE';
  const withReps = reps != null ? { ...(planned?.structure ?? templates.find((t) => t.code === templateCode)?.structure ?? {}), reps } : null;
  const structure = routineId ? { ...(withReps ?? planned?.structure ?? {}), routineId } : withoutRoutine(withReps);
  const routine = routines?.find((r) => r.id === routineId) ?? null;
  const routineList = routinesForKind(routines ?? [], kind);
  // «Otra actividad» se abre sola si lo elegido no está entre lo que más repites.
  const chosen = selectionKey(routineId, templateCode) ?? (title.trim() ? 'n' : null);
  const inFavorites = favorites.some((f) => isFavoriteSelected(f, { routineId, templateCode, title }));
  const showMore = showAll || !favorites.length || (load !== 'REST' && !!chosen && !inFavorites);

  const save = () =>
    run(
      () =>
        planApi.setDay(entry.day, {
          ...(templateCode ? { templateCode } : {}),
          kind,
          title: title.trim(),
          load,
          startTime: time || null,
          plannedDurationMin: numOrNull(minutes) ? Math.round(numOrNull(minutes)!) : null,
          plannedDistanceM: isCardio && numOrNull(km) ? Math.round(numOrNull(km)! * 1000) : null,
          structure,
          notes: notes.trim() || null,
        }),
      'Sesión guardada',
      true,
    );

  return (
    <IonPage>
      <IonContent>
        <div className="rk-sheet plan-sheet">
          <span className="rk-grab" aria-hidden="true" />
          <div className="rk-sheetbar">
            <button type="button" className="rk-textbtn" onClick={back}>
              Cancelar
            </button>
            <span className="rk-sheetbar__title">{heading}</span>
            <button type="button" className="rk-textbtn rk-textbtn--strong rk-sheetbar__end" disabled={saving || title.trim().length < 2} onClick={() => void save()}>
              Guardar
            </button>
          </div>

          {entry.actual ? (
            <div className="rk-list">
              <Link to={`/tabs/entrenos/rendimiento/entrenos/${entry.actual.id}`} className="rk-row">
                <span className="rk-row__main">
                  <span className="rk-row__title">{entry.actual.title}</span>
                  <span className="rk-row__sub">
                    Entreno registrado · {fmtMinutes(Math.round(entry.actual.durationSec / 60))}
                    {entry.actual.distanceM ? ` · ${formatNumber(entry.actual.distanceM / 1000, 1)} km` : ''}
                  </span>
                </span>
                <Chevron />
              </Link>
            </div>
          ) : null}

          {canCheck ? (
            <section className="rk-section" aria-labelledby="chk">
              <div className="rk-sechead">
                <h2 id="chk">Cómo fue · {STATUS_TEXT[entry.status].toLowerCase()}</h2>
              </div>
              <textarea
                className="perf__notes"
                rows={2}
                maxLength={500}
                placeholder="Notas de cómo salió (opcional)"
                aria-label="Notas de cómo salió"
                value={actualNotes}
                onChange={(e) => setActualNotes(e.target.value)}
              />
              <div className="plan__check">
                {done && !entry.autoCompleted ? (
                  <button type="button" className="plan__btn" disabled={saving} onClick={() => void run(() => planApi.complete(entry.day, { done: false, actualNotes }), 'Sesión desmarcada')}>
                    Desmarcar
                  </button>
                ) : null}
                {!done ? (
                  <button
                    type="button"
                    className="plan__btn"
                    disabled={saving}
                    onClick={() => void run(() => planApi.complete(entry.day, { done: false, skipped: entry.status !== 'SKIPPED', actualNotes }), entry.status === 'SKIPPED' ? 'Sesión recuperada' : 'Sesión saltada')}
                  >
                    {entry.status === 'SKIPPED' ? 'No saltar' : 'Saltar'}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="plan__btn plan__btn--primary"
                  disabled={saving}
                  onClick={() => void run(() => planApi.complete(entry.day, { done: true, sessionId: entry.actual?.id ?? null, actualNotes }), done ? 'Notas guardadas' : 'Sesión hecha')}
                >
                  {done ? 'Guardar notas' : 'Marcar como hecha'}
                </button>
              </div>
              {entry.autoCompleted ? <p className="rk-note">Se ha marcado sola porque registraste un entreno de este tipo ese día.</p> : null}
            </section>
          ) : null}

          <section className="rk-section" aria-labelledby="plan-s">
            <div className="rk-sechead">
              <h2 id="plan-s">{favorites.length ? 'Lo que más repites' : '¿Qué toca?'}</h2>
            </div>
            {favorites.length ? (
              <ul className="rk-list" aria-label="Lo que más repites">
                {favorites.map((f) => {
                  const on = load !== 'REST' && isFavoriteSelected(f, { routineId, templateCode, title });
                  return (
                    <li key={f.key}>
                      <button type="button" className={`rk-row session__opt${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => chooseFavorite(f)}>
                        <ActivityIcon code={f.templateCode} kind={f.kind} name={f.title} tone="soft" size={36} />
                        <span className="rk-row__main">
                          <span className="rk-row__title">{f.title}</span>
                          <span className="rk-row__sub">{favoriteMeta(f)}</span>
                        </span>
                        <CheckCircle on={on} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <div className="plan__chips session__quick">
              <button type="button" aria-pressed={load === 'REST'} className={`plan__chip${load === 'REST' ? ' is-on' : ''}`} onClick={() => chooseTemplate('rest')}>
                Descanso
              </button>
              {favorites.length ? (
                <button type="button" aria-expanded={showMore} className={`plan__chip${showMore ? ' is-open' : ''}`} onClick={() => setShowAll((v) => !v)}>
                  {showMore ? 'Ocultar otras' : 'Otra actividad…'}
                </button>
              ) : null}
            </div>
            {showMore ? (
              <div className="session__more">
                <span className="session__label">Tus rutinas</span>
                <div className="plan__chips" role="group" aria-label="Tus rutinas">
                  {routineList.map((r) => (
                    <button key={r.id} type="button" aria-pressed={routineId === r.id} className={`plan__chip${routineId === r.id ? ' is-on' : ''}`} onClick={() => pickRoutine(r)}>
                      {r.name}
                    </button>
                  ))}
                  <Link to={newRoutineForDayPath(entry.day, kind)} className="plan__chip plan__chip--new">
                    + Nueva rutina
                  </Link>
                </div>
                <span className="session__label">Sesiones tipo</span>
                <div className="plan__chips" role="group" aria-label="Sesiones tipo">
                  {templates
                    .filter((t) => t.code !== 'rest')
                    .map((t) => {
                      const on = !routineId && templateCode === t.code;
                      return (
                        <button key={t.code} type="button" aria-pressed={on} className={`plan__chip${on ? ' is-on' : ''}`} onClick={() => chooseTemplate(t.code)}>
                          {t.short}
                        </button>
                      );
                    })}
                </div>
              </div>
            ) : null}
            {routine && load !== 'REST' ? (
              <p className="rk-note plan__routine-sub">
                {routine.name}: {routineSummary(routine) || 'rutina guardada'}
                {routine.kind === 'STRENGTH' && routine.exercises.length
                  ? ` · ${routine.exercises
                      .slice(0, 3)
                      .map((e) => e.name)
                      .join(', ')}${routine.exercises.length > 3 ? '…' : ''}`
                  : ''}
              </p>
            ) : routineId && routines !== null && !routine ? (
              <p className="rk-note plan__routine-sub">La rutina que tenía este día ya no existe.</p>
            ) : null}
          </section>

          {load !== 'REST' ? (
            <>
              <div className="rk-list">
                <label className="rk-row perf__field">
                  <span className="rk-row__main rk-row__title">Nombre</span>
                  <input type="text" className="perf__text" value={title} maxLength={120} placeholder="Qué vas a hacer" onChange={(e) => setTitle(e.target.value)} />
                </label>
                <label className="rk-row perf__field">
                  <span className="rk-row__main rk-row__title">Hora</span>
                  <input type="time" className="perf__date" value={time} onChange={(e) => setTime(e.target.value)} />
                </label>
                <label className="rk-row perf__field">
                  <span className="rk-row__main rk-row__title">Duración (min)</span>
                  <input type="text" inputMode="numeric" value={minutes} placeholder="—" onChange={(e) => setMinutes(e.target.value)} />
                </label>
                {isCardio ? (
                  <label className="rk-row perf__field">
                    <span className="rk-row__main rk-row__title">Distancia (km)</span>
                    <input type="text" inputMode="decimal" value={km} placeholder="—" onChange={(e) => setKm(e.target.value)} />
                  </label>
                ) : null}
                {reps != null ? (
                  <div className="rk-row perf__field">
                    <span className="rk-row__main">
                      <span className="rk-row__title">Series</span>
                      <span className="rk-row__sub">{reps} repeticiones</span>
                    </span>
                    <div className="plan__pm">
                      <button type="button" aria-label="Una serie menos" onClick={() => changeReps(-1)}>
                        −
                      </button>
                      <button type="button" aria-label="Una serie más" onClick={() => changeReps(1)}>
                        +
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="session__load">
                <span className="session__label">Intensidad · mueve las kcal del día</span>
                <Segmented label="Intensidad" options={LOADS} value={load} onChange={setLoad} small />
              </div>
            </>
          ) : (
            <p className="rk-note">Día de descanso: ese día comes algo menos, porque gastas menos.</p>
          )}

          <textarea
            className="perf__notes"
            rows={2}
            maxLength={500}
            placeholder="Notas del plan (opcional)"
            aria-label="Notas del plan"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {diet ? (
            <div className="plan__diet-hint">
              <span className={`plan__load ${LOAD_CLASS[diet.load]}`}>Carga {LOAD_LABEL[diet.load].toLowerCase()}</span>
              <span>
                Dieta del {full}: {formatNumber(diet.kcalTarget)} kcal
              </span>
            </div>
          ) : null}

          {planned?.kind === 'STRENGTH' && hevy?.connected ? (
            <>
              <button type="button" className="plan__btn" disabled={saving} onClick={() => void sendToHevy()}>
                {planned.structure?.hevyRoutineId ? 'Volver a enviar a Hevy' : 'Enviar rutina a Hevy'}
              </button>
              <p className="rk-note">
                {planned.structure?.hevyRoutineId
                  ? 'Ya está en tus rutinas de Hevy. Si la vuelves a enviar se crea otra.'
                  : 'Se crea en Hevy con los ejercicios y pesos de tu último entreno parecido.'}
              </p>
            </>
          ) : null}

          {planned ? (
            <button type="button" className="perf__delete" disabled={saving} onClick={() => void run(() => planApi.clearDay(entry.day), 'Día quitado del plan', true)}>
              Quitar del plan
            </button>
          ) : null}
        </div>
      </IonContent>
    </IonPage>
  );
}
