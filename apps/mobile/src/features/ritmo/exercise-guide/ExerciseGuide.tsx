import { IonContent, IonModal } from '@ionic/react';
import { SheetBar } from '../ui/kit';
import { MUSCLE_NAME } from '../performance/labels';
import type { Exercise } from '../performance/perf.api';
import { ExerciseAnimation } from './ExerciseAnimation';
import { motionFor } from './motions';
import './exercise-guide.css';

const names = (muscles: Exercise['muscles'], pick: (w: number) => boolean) =>
  muscles
    .filter((m) => pick(m.weight))
    .map((m) => MUSCLE_NAME[m.muscle] ?? m.muscle)
    .join(', ');

/** Ficha de un ejercicio: animación, qué es, cómo se hace y qué trabaja. */
export function ExerciseGuide({ exercise }: { exercise: Exercise }) {
  const primary = exercise.muscles.filter((m) => m.weight >= 1).map((m) => m.muscle);
  const main = names(exercise.muscles, (w) => w >= 1);
  const rest = names(exercise.muscles, (w) => w < 1);
  const steps = exercise.steps ?? [];
  const animated = !!motionFor(exercise.code);

  return (
    <div className="exguide">
      <ExerciseAnimation code={exercise.code} primary={primary} name={exercise.name} />
      {animated && main ? <span className="exguide__legend">En verde, lo que más trabaja</span> : null}

      {exercise.description ? (
        <p className="exguide__desc">{exercise.description}</p>
      ) : (
        <p className="exguide__empty">
          {exercise.ownerUserId
            ? 'Es un ejercicio tuyo, así que no tiene explicación ni animación del catálogo.'
            : 'Este ejercicio todavía no tiene explicación.'}
        </p>
      )}

      {steps.length ? (
        <>
          <h3 className="exguide__h">Cómo se hace</h3>
          <ol className="exguide__steps">
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </>
      ) : null}

      {main ? (
        <>
          <h3 className="exguide__h">Qué trabaja</h3>
          <p className="exguide__muscles">
            <strong>{main}</strong>
            {rest ? `. También: ${rest}` : null}
          </p>
        </>
      ) : null}
    </div>
  );
}

/** La ficha en una hoja, para abrirla desde el registro de un entreno. */
export function ExerciseGuideSheet({ exercise, onClose }: { exercise: Exercise | null; onClose: () => void }) {
  return (
    <IonModal isOpen={!!exercise} onDidDismiss={onClose} initialBreakpoint={0.92} breakpoints={[0, 0.92]} handle>
      <IonContent>
        <div className="rk-sheet">
          <SheetBar title={exercise?.name ?? ''} onCancel={onClose} cancelLabel="Cerrar" />
          {exercise ? <ExerciseGuide exercise={exercise} /> : null}
        </div>
      </IonContent>
    </IonModal>
  );
}
