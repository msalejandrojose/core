import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import { perfApi, type Exercise } from '../performance/perf.api';
import { ExerciseGuideSheet } from './ExerciseGuide';

/**
 * Ficha de un ejercicio («Cómo se hace»: animación, descripción y tu
 * progreso) abierta encima de la pantalla en la que estás, sin salir de ella.
 * El catálogo se pide una vez; con `prefetch`, nada más entrar, para que la
 * ficha salga al instante (en el entreno en directo).
 */
export function useExerciseGuide({ prefetch = false }: { prefetch?: boolean } = {}) {
  const [id, setId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<Exercise[] | null>(null);

  useEffect(() => {
    if ((prefetch || id) && catalog === null) {
      perfApi
        .exercises()
        .then(setCatalog)
        .catch(() => setCatalog([]));
    }
  }, [prefetch, id, catalog]);

  const exercise = id ? (catalog?.find((e) => e.id === id) ?? null) : null;

  // Catálogo cargado y el ejercicio no está (o falló la carga): se avisa.
  useEffect(() => {
    if (id && catalog !== null && !exercise) {
      toast.error('No se pudo abrir la ficha', 'Comprueba tu conexión e inténtalo de nuevo.');
      setId(null);
      if (!catalog.length) setCatalog(null);
    }
  }, [id, catalog, exercise]);

  return {
    open: (exerciseId: string) => setId(exerciseId),
    sheet: <ExerciseGuideSheet exercise={exercise} onClose={() => setId(null)} />,
  };
}
