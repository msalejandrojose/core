import { useEffect, useRef, useState } from 'react';
import { IonContent, IonModal, useIonAlert } from '@ionic/react';
import { tapRestOver, tapSuccess } from '../haptics';
import { Icon } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { StrengthEditor } from './WorkoutDetails';
import { clearLive, liveTotals, saveLive, type LiveWorkout } from './live-workout';
import { clock, finishLiveDrafts, type DraftExercise } from './workout-draft';

/** Descanso si el ejercicio no tiene uno apuntado. */
const DEFAULT_REST = 90;
/** Cuánto se queda la barra en verde avisando de que el descanso acabó. */
const OVER_MS = 4000;

export interface LiveResult {
  startedAt: number;
  minutes: number;
  exercises: DraftExercise[];
}

interface LiveWorkoutProps {
  isOpen: boolean;
  workout: LiveWorkout;
  /** Siempre funcional: dos cambios seguidos (serie hecha + descanso) no se pisan. */
  onChange: (update: (w: LiveWorkout) => LiveWorkout) => void;
  /** Cerrar la pantalla sin parar el cronómetro (se retoma desde la hoja). */
  onHide: () => void;
  onDiscard: () => void;
  onFinish: (result: LiveResult) => void;
}

/**
 * Entreno de fuerza en vivo: cronómetro de la sesión, totales en directo y
 * las tarjetas de ejercicio con un ✓ por serie. Al marcar una serie arranca el
 * descanso del ejercicio en una barra flotante al alcance del pulgar, con
 * háptica al acabar. Todo se guarda en el dispositivo a cada cambio.
 */
export function LiveWorkoutScreen({ isOpen, workout, onChange, onHide, onDiscard, onFinish }: LiveWorkoutProps) {
  const [now, setNow] = useState(() => Date.now());
  const [confirm] = useIonAlert();
  const notified = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [isOpen]);

  useEffect(() => saveLive(workout), [workout]);

  const rest = workout.rest;
  const restLeft = rest ? Math.ceil((rest.endsAt - now) / 1000) : null;
  const restOver = rest !== null && restLeft !== null && restLeft <= 0;

  // Háptica una sola vez por descanso; y la barra se va sola al rato.
  useEffect(() => {
    if (!rest || !restOver) return;
    if (notified.current !== rest.endsAt) {
      notified.current = rest.endsAt;
      void tapRestOver();
    }
    if (now - rest.endsAt > OVER_MS) onChange((w) => (w.rest?.endsAt === rest.endsAt ? { ...w, rest: null } : w));
  }, [rest, restOver, now, onChange]);

  const totals = liveTotals(workout.exercises);
  const elapsed = (now - workout.startedAt) / 1000;
  const setRest = (r: LiveWorkout['rest']) => onChange((w) => ({ ...w, rest: r }));
  const shiftRest = (sec: number) => {
    if (!rest) return;
    const endsAt = Math.max(Date.now() + 1000, rest.endsAt + sec * 1000);
    setRest({ endsAt, totalSec: Math.max(1, rest.totalSec + sec) });
  };

  function finish() {
    const exercises = finishLiveDrafts(workout.exercises);
    const go = () => {
      void tapSuccess();
      clearLive();
      onFinish({ startedAt: workout.startedAt, minutes: Math.max(1, Math.round(elapsed / 60)), exercises });
    };
    if (exercises.length === 0) {
      void confirm({
        header: '¿Terminar sin series?',
        message: 'No has marcado ninguna serie. Se guardará solo el tiempo.',
        buttons: [{ text: 'Seguir', role: 'cancel' }, { text: 'Terminar', handler: go }],
      });
    } else go();
  }

  function discard() {
    void confirm({
      header: '¿Descartar el entreno?',
      message: 'Se pierden el tiempo y las series de esta sesión.',
      buttons: [
        { text: 'Seguir entrenando', role: 'cancel' },
        {
          text: 'Descartar',
          role: 'destructive',
          handler: () => {
            clearLive();
            onDiscard();
          },
        },
      ],
    });
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onHide} className="rk-modal-live">
      <IonContent>
        <div className="live">
          <div className="live__bar">
            <button type="button" className="rk-textbtn" onClick={onHide}>
              Ocultar
            </button>
            <span className="live__badge">
              <span className="live__dot" aria-hidden="true" />
              En vivo
            </span>
            <button type="button" className="rk-textbtn rk-textbtn--strong live__finish" onClick={finish}>
              Terminar
            </button>
          </div>

          <section className="live__hero" aria-label="Resumen del entreno">
            <span className="live__clock" role="timer" aria-label={`Tiempo de entreno ${clock(elapsed)}`}>
              {clock(elapsed)}
            </span>
            <div className="live__stats">
              <span>
                <strong>{totals.volume.toLocaleString('es-ES')}</strong>
                <small>kg de volumen</small>
              </span>
              <span>
                <strong>{totals.sets}</strong>
                <small>{totals.sets === 1 ? 'serie hecha' : 'series hechas'}</small>
              </span>
              <span>
                <strong>{totals.exercises}</strong>
                <small>{totals.exercises === 1 ? 'ejercicio' : 'ejercicios'}</small>
              </span>
            </div>
          </section>

          <StrengthEditor
            value={workout.exercises}
            onChange={(exercises) => onChange((w) => ({ ...w, exercises }))}
            live={{
              onSetDone: (_ex, restSec) => {
                void tapSuccess();
                const total = restSec ?? DEFAULT_REST;
                if (total > 0) setRest({ endsAt: Date.now() + total * 1000, totalSec: total });
              },
            }}
          />

          <button type="button" className="live__discard" onClick={discard}>
            Descartar entreno
          </button>
        </div>

        {rest ? (
          <div className={`live__rest${restOver ? ' is-over' : ''}`} role="status" aria-live="polite">
            <span
              className="live__rest-fill"
              aria-hidden="true"
              style={{ transform: `scaleX(${restOver ? 1 : Math.min(1, 1 - (restLeft ?? 0) / rest.totalSec)})` }}
            />
            <span className="live__rest-main">
              <Icon d={restOver ? PATHS.check : PATHS.timer} size={20} />
              <span className="live__rest-text">
                <small>{restOver ? 'Descanso hecho' : 'Descanso'}</small>
                <strong>{restOver ? '¡A por la siguiente!' : clock(restLeft ?? 0)}</strong>
              </span>
            </span>
            {restOver ? null : (
              <span className="live__rest-actions">
                <button type="button" aria-label="Quince segundos menos" onClick={() => shiftRest(-15)}>
                  −15
                </button>
                <button type="button" aria-label="Quince segundos más" onClick={() => shiftRest(15)}>
                  +15
                </button>
                <button type="button" className="live__rest-skip" onClick={() => setRest(null)}>
                  Saltar
                </button>
              </span>
            )}
          </div>
        ) : null}
      </IonContent>
    </IonModal>
  );
}
