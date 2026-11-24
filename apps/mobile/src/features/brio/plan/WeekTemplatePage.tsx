import { useEffect, useMemo, useState } from 'react';
import { IonContent, IonModal, IonPage } from '@ionic/react';
import { toast } from '@/lib/toast';
import { isApiError } from '../api';
import { useBrioStore } from '../brio.store';
import { todayIn } from '../format';
import { BackLink, NavRow, SectionHeader, SheetBar, Stepper } from '../ui/kit';
import { routinesApi, type Routine } from '../routines/routines.api';
import { planApi, type PlanTemplate, type WeekSlot } from './plan.api';
import { shiftDay } from './plan-labels';
import { usePlanTemplates } from './usePlanTemplates';
import { WEEKDAYS, addSlots, slotChoices, slotLabel } from './week-template';
import './plan.css';

/**
 * Semana tipo (TASK-429): lo que haces cada semana —futsal el martes a las
 * 21:00, fútbol 7 el sábado, gimnasio lunes, miércoles y viernes— en tres
 * toques: qué, qué días y a qué hora. Luego se pone en el plan de esta semana
 * o de la siguiente con un botón.
 */
export default function WeekTemplatePage() {
  const templates = usePlanTemplates();
  const [slots, setSlots] = useState<WeekSlot[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const timezone = useBrioStore((s) => s.profile?.timezone ?? 'Europe/Madrid');

  useEffect(() => {
    planApi
      .weekTemplate()
      .then(setSlots)
      .catch(() => setSlots([]));
  }, []);

  async function save(next: WeekSlot[]) {
    const prev = slots;
    setSlots(next);
    try {
      setSlots(await planApi.saveWeekTemplate(next));
    } catch (e) {
      setSlots(prev);
      toast.error('No se pudo guardar', isApiError(e) ? e.message : undefined);
    }
  }

  async function apply(weeks: 0 | 1) {
    setBusy(true);
    try {
      const today = todayIn(timezone);
      const { written } = await planApi.fill(shiftDay(today, weeks * 7), 'TEMPLATE');
      if (written) toast.success(`${written} ${written === 1 ? 'día planificado' : 'días planificados'}`);
      else toast.info('Nada que poner', 'Esos días ya tenían plan. Cámbialos desde el plan de la semana.');
    } catch (e) {
      toast.error('No se pudo planificar', isApiError(e) ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <IonPage>
      <IonContent>
        <div className="rk-screen plan">
          <NavRow back={<BackLink label="Entrenos" fallback="/tabs/entrenos" />} />
          <header className="rk-title">
            <h1>Tu semana tipo</h1>
            <span className="rk-title__sub plan__sub">
              Lo que haces cada semana. Se pone en el plan con un toque y luego puedes cambiar cualquier día.
            </span>
          </header>

          <ul aria-label="Semana tipo" className="rk-list week-tpl">
            {WEEKDAYS.map((d) => {
              const mine = (slots ?? []).filter((s) => s.weekday === d.n);
              return (
                <li key={d.n} className="week-tpl__day">
                  <span className="week-tpl__name">{d.name}</span>
                  <span className="week-tpl__slots">
                    {slots === null ? (
                      <span className="rk-row__sub">…</span>
                    ) : mine.length ? (
                      mine.map((s, i) => {
                        const { title, meta } = slotLabel(s, templates);
                        return (
                          <span key={i} className="week-tpl__slot">
                            <span className="rk-row__main">
                              <span className="rk-row__title">{title}</span>
                              {meta ? <span className="rk-row__sub">{meta}</span> : null}
                            </span>
                            <button
                              type="button"
                              className="week-tpl__remove"
                              aria-label={`Quitar ${title} del ${d.name.toLowerCase()}`}
                              onClick={() => void save(slots.filter((x) => x !== s))}
                            >
                              ×
                            </button>
                          </span>
                        );
                      })
                    ) : (
                      <span className="rk-row__sub">Libre</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>

          <button type="button" className="rk-btn week-tpl__add" disabled={slots === null} onClick={() => setAdding(true)}>
            Añadir actividad
          </button>

          {slots?.length ? (
            <section aria-labelledby="aplicar" className="rk-section">
              <SectionHeader id="aplicar">Ponerla en el plan</SectionHeader>
              <div className="plan__edit-actions">
                <button type="button" className="plan__btn plan__btn--primary" disabled={busy} onClick={() => void apply(0)}>
                  Esta semana
                </button>
                <button type="button" className="plan__btn" disabled={busy} onClick={() => void apply(1)}>
                  La semana que viene
                </button>
              </div>
              <p className="rk-note">Solo rellena los días que aún no tienen nada. Si un día tiene dos actividades, se juntan en una sesión.</p>
            </section>
          ) : null}
        </div>

        <AddSlotSheet
          isOpen={adding}
          templates={templates}
          onClose={() => setAdding(false)}
          onAdd={(days, base) => {
            setAdding(false);
            void save(addSlots(slots ?? [], days, base));
          }}
        />
      </IonContent>
    </IonPage>
  );
}

const STEP_MIN = 15;

/** Hoja «Añadir actividad»: qué, qué días, a qué hora y cuánto (y la rutina si es gimnasio). */
function AddSlotSheet({
  isOpen,
  templates,
  onClose,
  onAdd,
}: {
  isOpen: boolean;
  templates: PlanTemplate[];
  onClose: () => void;
  onAdd: (days: number[], base: Omit<WeekSlot, 'weekday'>) => void;
}) {
  const choices = useMemo(() => slotChoices(templates), [templates]);
  const [code, setCode] = useState<string | null>(null);
  const [days, setDays] = useState<number[]>([]);
  const [time, setTime] = useState('');
  const [minutes, setMinutes] = useState<number | null>(null);
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const tpl = choices.find((t) => t.code === code) ?? null;
  const isGym = tpl?.kind === 'STRENGTH';

  useEffect(() => {
    if (!isOpen) return;
    setCode(null);
    setDays([]);
    setTime('');
    setMinutes(null);
    setRoutineId(null);
    routinesApi
      .list()
      .then((list) => setRoutines(list.filter((r) => r.kind === 'STRENGTH')))
      .catch(() => setRoutines([]));
  }, [isOpen]);

  const choose = (t: PlanTemplate) => {
    setCode(t.code);
    setMinutes(t.durationMin);
    if (t.kind !== 'STRENGTH') setRoutineId(null);
  };
  const toggleDay = (n: number) => setDays((d) => (d.includes(n) ? d.filter((x) => x !== n) : [...d, n].sort()));
  const routine = routines.find((r) => r.id === routineId) ?? null;

  return (
    <IonModal className="brio-sheet-auto" isOpen={isOpen} onDidDismiss={onClose} initialBreakpoint={1} breakpoints={[0, 1]} handle>
      <div className="rk-sheet week-tpl__sheet">
        <SheetBar title="Añadir actividad" cancelLabel="Cancelar" onCancel={onClose} />

        <section aria-labelledby="que" className="rk-section">
          <SectionHeader id="que">¿Qué?</SectionHeader>
          <div className="plan__chips">
            {choices.map((t) => (
              <button key={t.code} type="button" aria-pressed={code === t.code} className={`plan__chip${code === t.code ? ' is-on' : ''}`} onClick={() => choose(t)}>
                {t.short}
              </button>
            ))}
          </div>
        </section>

        {isGym && routines.length ? (
          <section aria-labelledby="rutina" className="rk-section">
            <SectionHeader id="rutina">¿Qué rutina?</SectionHeader>
            <div className="plan__chips">
              <button type="button" aria-pressed={routineId === null} className={`plan__chip${routineId === null ? ' is-on' : ''}`} onClick={() => setRoutineId(null)}>
                La que toque
              </button>
              {routines.map((r) => (
                <button key={r.id} type="button" aria-pressed={routineId === r.id} className={`plan__chip${routineId === r.id ? ' is-on' : ''}`} onClick={() => setRoutineId(r.id)}>
                  {r.name}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section aria-labelledby="dias" className="rk-section">
          <SectionHeader id="dias">¿Qué días?</SectionHeader>
          <div className="week-tpl__days" role="group" aria-label="Días de la semana">
            {WEEKDAYS.map((d) => (
              <button
                key={d.n}
                type="button"
                aria-label={d.name}
                aria-pressed={days.includes(d.n)}
                className={`week-tpl__daybtn${days.includes(d.n) ? ' is-on' : ''}`}
                onClick={() => toggleDay(d.n)}
              >
                {d.letter}
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="hora" className="rk-section week-tpl__when">
          <div>
            <SectionHeader id="hora">¿A qué hora?</SectionHeader>
            <input
              type="time"
              className="week-tpl__time"
              aria-labelledby="hora"
              value={time}
              step={300}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <div>
            <SectionHeader id="cuanto">¿Cuánto?</SectionHeader>
            <Stepper
              value={minutes ? `${minutes}′` : '—'}
              minusLabel="Menos tiempo"
              plusLabel="Más tiempo"
              onMinus={() => setMinutes((m) => Math.max(STEP_MIN, (m ?? 60) - STEP_MIN))}
              onPlus={() => setMinutes((m) => Math.min(300, (m ?? 45) + STEP_MIN))}
            />
          </div>
        </section>

        <button
          type="button"
          className="rk-btn week-tpl__save"
          disabled={!tpl || days.length === 0}
          onClick={() =>
            tpl &&
            onAdd(days, {
              templateCode: tpl.code,
              title: routine?.name ?? null,
              startTime: time || null,
              durationMin: minutes,
              routineId,
            })
          }
        >
          {!tpl ? 'Elige una actividad' : days.length === 0 ? 'Elige los días' : `Añadir ${days.length === 1 ? 'al día' : `a ${days.length} días`}`}
        </button>
      </div>
    </IonModal>
  );
}
