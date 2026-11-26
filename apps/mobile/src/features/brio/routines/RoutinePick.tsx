import { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { toast } from '@/lib/toast';
import { useBrioStore } from '../brio.store';
import { MUSCLE_NAME } from '../performance/labels';
import { SectionHeader } from '../ui/kit';
import { emptyWorkout } from '../live/live-workout';
import { useLiveStore } from '../live/live.store';
import { kindLabel, routineSummary } from './routine-draft';
import { openHevy, routineErrorText, routinesApi, useRoutines, type Routine } from './routines.api';
import { useStartRoutine } from './use-start-routine';
import './routines.css';

const kg = (n: number) => `${String(n).replace('.', ',')} kg`;

/**
 * «Tus rutinas» dentro de Registrar entreno. Elegida una:
 * - gimnasio → se entrena en Brío serie a serie, o se manda a Hevy y se abre la app
 *   (el entreno vuelve solo), o se apunta de una vez si ya se hizo;
 * - cardio → se hace con el reloj y al acabar se trae de Garmin, o se apunta a mano.
 */
export function RoutinePick({
  selectedId,
  onSelect,
  onLogHere,
  onDone,
}: {
  selectedId: string | null;
  onSelect: (r: Routine | null) => void;
  onLogHere: (r: Routine) => void;
  onDone: () => void;
}) {
  const { routines } = useRoutines();
  const history = useHistory();
  const live = useLiveStore((s) => s.workout);
  const startLive = useLiveStore((s) => s.set);
  const refreshDay = useBrioStore((s) => s.refreshDay);
  const [busy, setBusy] = useState(false);
  const selected = routines?.find((r) => r.id === selectedId) ?? null;

  /** Gimnasio: se entrena en Brío serie a serie (lo mismo que «Empezar» en Rutinas). */
  const trainInBrio = useStartRoutine(onDone);

  if (routines === null) return null;

  /** Gimnasio sin rutina: se abre el entreno en directo vacío y se añaden ejercicios. */
  function trainFree() {
    if (!live) startLive(emptyWorkout());
    onDone();
    history.push('/tabs/today/entreno');
  }

  async function trainInHevy(r: Routine) {
    setBusy(true);
    try {
      const sent = await routinesApi.sendToHevy(r.id);
      toast.success(
        sent.updated ? 'Rutina actualizada en Hevy' : 'Rutina creada en Hevy',
        sent.skipped.length
          ? `Sin equivalente en Hevy: ${sent.skipped.join(', ')}. Al acabar, el entreno vuelve solo a Brío.`
          : 'Ábrela en «Rutinas». Al acabar, el entreno vuelve solo a Brío.',
      );
      await openHevy();
      onDone();
    } catch (e) {
      toast.error('No se pudo mandar a Hevy', routineErrorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function bringFromGarmin(r: Routine) {
    setBusy(true);
    try {
      const res = await routinesApi.garminSync(r.id);
      await refreshDay();
      if (res.linkedSessionId) {
        toast.success('Entreno traído de Garmin', `Enlazado con «${r.name}».`);
        onDone();
      } else {
        toast.info(
          'Aún no está en Garmin',
          'Sincroniza el reloj con la app Garmin Connect y vuelve a probar en un par de minutos.',
        );
      }
    } catch (e) {
      toast.error('No se pudo traer de Garmin', routineErrorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rk-section" aria-labelledby="rutinas">
      <SectionHeader id="rutinas">Tus rutinas</SectionHeader>
      <button type="button" className="routine-pick__free" onClick={trainFree}>
        <span className="routine-pick__name">{live ? 'Seguir con el entreno en curso' : 'Empezar entreno libre en el gym'}</span>
        <span className="routine-pick__meta">Serie a serie con descansos; añades los ejercicios sobre la marcha</span>
      </button>
      {!routines.length ? (
        <p className="rk-note">
          Guarda los entrenos que repites para elegirlos aquí.{' '}
          <Link to="/tabs/entrenos/rutinas/nueva" onClick={onDone} className="rk-textbtn">
            Crear rutina
          </Link>
        </p>
      ) : (
        <>
          <div className="routine-pick__list" role="group" aria-label="Rutinas guardadas">
            {routines.map((r) => (
              <button
                key={r.id}
                type="button"
                className="routine-pick__item"
                aria-pressed={r.id === selectedId}
                onClick={() => onSelect(r.id === selectedId ? null : r)}
              >
                <span className="routine-pick__name">{r.name}</span>
                <span className="routine-pick__meta">
                  {r.kind === 'STRENGTH' ? 'Gimnasio' : kindLabel(r.kind)}
                  {routineSummary(r) ? ` · ${routineSummary(r)}` : ''}
                </span>
              </button>
            ))}
          </div>

          {selected ? (
            <div className="routine-pick__card">
              {selected.muscles.length ? (
                <div className="routine__muscles" aria-label="Músculos que trabaja">
                  {selected.muscles
                    .filter((m) => m.share >= 0.08)
                    .slice(0, 5)
                    .map((m) => (
                      <span key={m.muscle} className={`routine__muscle${m.primary ? ' is-main' : ''}`}>
                        {MUSCLE_NAME[m.muscle] ?? m.muscle}
                      </span>
                    ))}
                </div>
              ) : null}

              {selected.kind === 'STRENGTH' ? (
                <ul className="routine-pick__exercises">
                  {selected.exercises.map((e) => (
                    <li key={e.exerciseId}>
                      {e.name}{' '}
                      <span>
                        {e.sets}×{e.reps}
                        {e.weightKg ? ` · ${kg(e.weightKg)}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rk-note">
                  Hazla con tu reloj Garmin. Cuando acabes y el reloj se sincronice, tráela aquí y quedará enlazada con la rutina.
                  {selected.notes ? ` ${selected.notes}` : ''}
                </p>
              )}

              <div className="routine-pick__actions">
                {selected.kind === 'STRENGTH' ? (
                  <>
                    <button type="button" className="rk-btn routine-pick__primary" disabled={busy || trainInBrio.busy} onClick={() => void trainInBrio.start(selected)}>
                      Entrenar en Brío
                    </button>
                    <button type="button" className="routine-pick__btn" disabled={busy} onClick={() => void trainInHevy(selected)}>
                      {busy ? 'Un momento…' : 'Entrenar en Hevy'}
                    </button>
                  </>
                ) : (
                  <button type="button" className="rk-btn routine-pick__primary" disabled={busy} onClick={() => void bringFromGarmin(selected)}>
                    {busy ? 'Trayendo de Garmin…' : 'Ya lo he hecho: traer de Garmin'}
                  </button>
                )}
                <button type="button" className="rk-textbtn routine-pick__later" disabled={busy} onClick={() => onLogHere(selected)}>
                  {selected.kind === 'STRENGTH' ? 'Ya lo hice: apuntarlo de una vez' : 'Apuntarlo a mano'}
                </button>
              </div>
            </div>
          ) : null}
          <Link to="/tabs/entrenos/rutinas" onClick={onDone} className="rk-textbtn routine-pick__manage">
            Gestionar rutinas
          </Link>
        </>
      )}
    </section>
  );
}
