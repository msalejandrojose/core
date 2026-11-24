import { useState } from 'react';
import { Link } from 'react-router-dom';
import { searchExercises } from '../exercise-guide/search';
import { motionFor } from '../exercise-guide/motions';
import { Chevron, SearchField } from '../ui/kit';
import { MUSCLE_NAME } from './labels';
import { perfApi, type Exercise } from './perf.api';
import { Chip, Empty, PerfPage } from './ui';
import { usePerf } from './usePerf';

const main = (e: Exercise) =>
  e.muscles
    .filter((m) => m.weight >= 1)
    .map((m) => MUSCLE_NAME[m.muscle] ?? m.muscle)
    .join(', ');

/** Todos los ejercicios: cada uno abre su ficha con cómo se hace y tu evolución. */
export default function ExercisesPage() {
  const { data, error, reload } = usePerf(() => perfApi.exercises());
  const [query, setQuery] = useState('');
  return (
    <PerfPage
      title="Ejercicios"
      sub="Cómo se hace cada uno y cómo vas"
      back={{ label: 'Músculos', to: '/tabs/entrenos/rendimiento/musculos' }}
      data={data}
      error={error}
      onRetry={reload}
      header={<SearchField label="Buscar ejercicio" placeholder="Buscar ejercicio" value={query} onChange={setQuery} />}
    >
      {(list) => {
        const shown = searchExercises(list, query);
        return shown.length ? (
          <div className="rk-list">
            {shown.map((e) => (
              <Link key={e.id} to={`/tabs/entrenos/rendimiento/ejercicios/${e.id}`} className="rk-row perf__entry">
                <span className="rk-row__main">
                  <span className="rk-row__title">{e.name}</span>
                  <span className="rk-row__sub perf__wrap">
                    {main(e) || (motionFor(e.code) ? 'Con animación' : 'Sin músculos asignados')}
                  </span>
                </span>
                {e.ownerUserId ? <Chip tone="tint">Propio</Chip> : e.customized ? <Chip tone="warn">Ajustado</Chip> : null}
                <Chevron />
              </Link>
            ))}
          </div>
        ) : (
          <Empty>No hay ejercicios con ese nombre.</Empty>
        );
      }}
    </PerfPage>
  );
}
