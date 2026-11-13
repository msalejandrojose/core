import { useEffect, useState } from 'react';
import { Link, useHistory, useParams } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { toast } from '@/lib/toast';
import { isApiError } from '../api';
import { formatNumber } from '../format';
import { Chevron, Segmented } from '../ui/kit';
import { hevyApi, hevyErrorText, useHevyStatus } from '../profile/hevy.api';
import { planApi, usePlanWeekData, type PlanLoad } from './plan.api';
import { LOAD_CLASS, LOAD_LABEL, STATUS_TEXT, dayFull, dayNumber, fmtMinutes } from './plan-labels';
import { usePlanTemplates } from './usePlanTemplates';
import './plan.css';
import '../performance/performance.css';

type Kind = 'RUN' | 'STRENGTH' | 'CYCLE' | 'OTHER';
const KINDS: { value: Kind; label: string }[] = [
  { value: 'RUN', label: 'Carrera' },
  { value: 'STRENGTH', label: 'Fuerza' },
  { value: 'CYCLE', label: 'Bici' },
  { value: 'OTHER', label: 'Otro' },
];
const LOADS: { value: PlanLoad; label: string }[] = [
  { value: 'REST', label: 'Descanso' },
  { value: 'LOW', label: 'Baja' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
];
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
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

  const [kind, setKind] = useState<string>('RUN');
  const [title, setTitle] = useState('');
  const [load, setLoad] = useState<PlanLoad>('MEDIUM');
  const [time, setTime] = useState('');
  const [minutes, setMinutes] = useState('');
  const [km, setKm] = useState('');
  const [reps, setReps] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [actualNotes, setActualNotes] = useState('');
  const [templateCode, setTemplateCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // El formulario se rellena una vez por día cargado; después manda lo que escribes.
  useEffect(() => {
    if (!entry || loadedFor === entry.day) return;
    setLoadedFor(entry.day);
    const p = entry.planned;
    setKind(p?.kind ?? 'RUN');
    setTitle(p?.title ?? '');
    setLoad(p?.load ?? 'MEDIUM');
    setTime(p?.startTime ?? '');
    setMinutes(p?.plannedDurationMin ? String(p.plannedDurationMin) : '');
    setKm(p?.plannedDistanceM ? formatNumber(p.plannedDistanceM / 1000, 1) : '');
    setReps(typeof p?.structure?.reps === 'number' ? p.structure.reps : null);
    setNotes(p?.notes ?? '');
    setActualNotes(p?.actualNotes ?? '');
    setTemplateCode(p?.templateCode ?? null);
  }, [entry, loadedFor]);

  const back = () => (history.length > 1 ? history.goBack() : history.replace('/tabs/plan'));

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
  const isCardio = kind !== 'STRENGTH' && kind !== 'OTHER';
  const diet = data?.diet?.find((d) => d.day === entry.day) ?? null;
  const canCheck = !!planned && planned.load !== 'REST' && entry.day <= (data?.today ?? '');
  const done = entry.status === 'DONE';
  const structure = reps != null ? { ...(planned?.structure ?? templates.find((t) => t.code === templateCode)?.structure ?? {}), reps } : null;

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
              <Link to={`/tabs/progress/rendimiento/entrenos/${entry.actual.id}`} className="rk-row">
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
              <h2 id="plan-s">Plan del día</h2>
            </div>
            <div className="plan__chips">
              {templates.map((t) => (
                <button key={t.code} type="button" aria-pressed={templateCode === t.code} className={`plan__chip${templateCode === t.code ? ' is-on' : ''}`} onClick={() => applyTemplate(t.code)}>
                  {t.short}
                </button>
              ))}
            </div>
          </section>

          <Segmented label="Tipo de sesión" options={KINDS} value={kind as Kind} onChange={(k) => setKind(k)} />

          <div className="rk-list">
            <label className="rk-row perf__field">
              <span className="rk-row__main rk-row__title">Nombre</span>
              <input type="text" className="perf__text" value={title} maxLength={120} placeholder="Rodaje suave" onChange={(e) => setTitle(e.target.value)} />
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

          <Segmented label="Carga" options={LOADS} value={load} onChange={setLoad} />

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
