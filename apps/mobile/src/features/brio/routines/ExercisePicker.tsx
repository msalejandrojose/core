import { useEffect, useMemo, useState } from 'react';
import { ExerciseGuideSheet } from '../exercise-guide/ExerciseGuide';
import { MUSCLE_NAME } from '../performance/labels';
import { perfApi, type Exercise } from '../performance/perf.api';
import { Icon, SearchField } from '../ui/kit';
import { PATHS } from '../ui/paths';

/** Grupos para filtrar: los músculos del MuscleEngine agrupados como en el gimnasio. */
const GROUPS: { id: string; label: string; muscles: string[] }[] = [
  { id: 'chest', label: 'Pecho', muscles: ['CHEST'] },
  { id: 'back', label: 'Espalda', muscles: ['LATS', 'TRAPS', 'LOWER_BACK'] },
  { id: 'shoulders', label: 'Hombro', muscles: ['FRONT_DELT', 'SIDE_DELT', 'REAR_DELT'] },
  { id: 'arms', label: 'Brazos', muscles: ['BICEPS', 'TRICEPS', 'FOREARMS'] },
  { id: 'legs', label: 'Pierna', muscles: ['QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES'] },
  { id: 'core', label: 'Core', muscles: ['ABS'] },
];

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Músculos principales de un ejercicio, en texto. */
const primaryMuscles = (e: Pick<Exercise, 'muscles'>) =>
  e.muscles
    .filter((m) => m.weight >= 1)
    .map((m) => MUSCLE_NAME[m.muscle] ?? m.muscle)
    .join(', ');

/**
 * Buscador del catálogo de ejercicios con filtro por grupo muscular. Muestra
 * qué trabaja cada uno para elegir con criterio, y con ⓘ abre su ficha
 * (animación, cómo se hace y qué trabaja) para verlo antes de añadirlo.
 */
export function ExercisePicker({
  onPick,
  onCancel,
  exclude = [],
}: {
  onPick: (e: Exercise) => void;
  onCancel: () => void;
  exclude?: string[];
}) {
  const [catalog, setCatalog] = useState<Exercise[] | null>(null);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [guide, setGuide] = useState<Exercise | null>(null);

  useEffect(() => {
    perfApi
      .exercises()
      .then(setCatalog)
      .catch(() => setCatalog([]));
  }, []);

  const matches = useMemo(() => {
    const q = fold(query.trim());
    const muscles = GROUPS.find((g) => g.id === group)?.muscles ?? null;
    return (catalog ?? [])
      .filter((e) => !exclude.includes(e.id))
      .filter((e) => !q || fold(e.name).includes(q))
      .filter((e) => !muscles || e.muscles.some((m) => m.weight >= 1 && muscles.includes(m.muscle)))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [catalog, query, group, exclude]);

  return (
    <div className="routine__picker">
      <SearchField label="Buscar ejercicio" placeholder="Press banca, sentadilla…" value={query} onChange={setQuery} autoFocus />
      <div className="routine__groups" role="group" aria-label="Filtrar por músculo">
        {GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            className="workout__chip"
            aria-pressed={group === g.id}
            onClick={() => setGroup((x) => (x === g.id ? null : g.id))}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="rk-list routine__matches">
        {catalog === null ? (
          <div className="rk-row rk-row__sub">Cargando ejercicios…</div>
        ) : matches.length ? (
          matches.slice(0, 40).map((e) => (
            <div key={e.id} className="rk-row routine__match">
              <button
                type="button"
                className="routine__info"
                aria-label={`Ver cómo se hace ${e.name}`}
                onClick={() => setGuide(e)}
              >
                <Icon d={PATHS.info} size={18} stroke={2.2} />
              </button>
              <button type="button" className="routine__pick" onClick={() => onPick(e)}>
                <span className="rk-row__main">
                  <span className="rk-row__title">{e.name}</span>
                  <span className="rk-row__sub">{primaryMuscles(e) || 'Sin músculos asignados'}</span>
                </span>
                <span className="routine__add" aria-hidden="true">
                  +
                </span>
              </button>
            </div>
          ))
        ) : (
          <div className="rk-row rk-row__sub">Ningún ejercicio coincide.</div>
        )}
      </div>
      <button type="button" className="rk-textbtn routine__cancel" onClick={onCancel}>
        Cancelar
      </button>
      <ExerciseGuideSheet
        exercise={guide}
        onClose={() => setGuide(null)}
        action={{
          label: 'Añadir',
          onClick: (e) => {
            setGuide(null);
            onPick(e);
          },
        }}
      />
    </div>
  );
}
