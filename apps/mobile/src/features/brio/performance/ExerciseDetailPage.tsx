import { useParams } from 'react-router-dom';
import { ExerciseGuide } from '../exercise-guide/ExerciseGuide';
import { ExerciseProgress } from '../exercise-guide/ExerciseProgress';
import { MuscleWeightsEditor } from './MuscleWeightsEditor';
import { perfApi } from './perf.api';
import { Chip, Empty, PerfPage } from './ui';
import { usePerf } from './usePerf';

/** Ficha de un ejercicio: cómo se hace, tu evolución y qué músculos cuenta. */
export default function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, reload } = usePerf(() => perfApi.exercises(), id);
  const exercise = data?.find((e) => e.id === id) ?? null;
  return (
    <PerfPage
      title={exercise?.name ?? 'Ejercicio'}
      back={{ label: 'Ejercicios', to: '/tabs/entrenos/rendimiento/ejercicios' }}
      data={data}
      error={error}
      onRetry={reload}
    >
      {() =>
        exercise ? (
          <>
            {exercise.ownerUserId ? (
              <Chip tone="tint">Propio</Chip>
            ) : exercise.customized ? (
              <Chip tone="warn">Músculos ajustados</Chip>
            ) : null}
            <div className="rk-card exdetail">
              <ExerciseGuide exercise={exercise} />
            </div>
            <div className="rk-card exdetail">
              <ExerciseProgress exerciseId={exercise.id} isBodyweight={exercise.isBodyweight} />
            </div>
            <div className="rk-card exdetail">
              <MuscleWeightsEditor
                key={`${exercise.customized}-${exercise.muscles.length}`}
                exercise={exercise}
                onSaved={reload}
              />
            </div>
          </>
        ) : (
          <Empty>Este ejercicio ya no existe.</Empty>
        )
      }
    </PerfPage>
  );
}
