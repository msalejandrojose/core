import type { PlannedSession } from '../entities/plan.entity';
import { PLAN_TEMPLATES } from './plan';
import { planFavorites } from './plan-favorites';

const s = (day: string, changes: Partial<PlannedSession>): PlannedSession => ({
  id: day,
  planId: null,
  day,
  kind: 'STRENGTH',
  templateCode: 'gym',
  title: 'Gimnasio',
  load: 'MEDIUM',
  startTime: null,
  plannedDurationMin: 60,
  plannedDistanceM: null,
  targetPaceSecPerKm: null,
  structure: null,
  notes: null,
  completedAt: null,
  completedSessionId: null,
  actualNotes: null,
  skipped: false,
  ...changes,
});

const viernes = {
  id: 'r1',
  name: 'Viernes',
  kind: 'STRENGTH' as const,
  plannedDurationMin: 60,
  plannedDistanceM: null,
  timesDone: 0,
};

describe('lo que más repites', () => {
  it('agrupa por rutina, plantilla o nombre y ordena por veces', () => {
    const favs = planFavorites(
      [
        s('2026-11-02', { structure: { routineId: 'r1' } }),
        s('2026-11-09', { structure: { routineId: 'r1' } }),
        s('2026-11-16', {
          structure: { routineId: 'r1' },
          plannedDurationMin: 75,
        }),
        s('2026-11-04', {
          kind: 'OTHER',
          templateCode: 'f7',
          title: 'Fútbol 7',
          load: 'HIGH',
        }),
        s('2026-11-11', {
          kind: 'OTHER',
          templateCode: 'f7',
          title: 'Fútbol 7',
          load: 'HIGH',
        }),
        s('2026-11-06', {
          kind: 'RUN',
          templateCode: null,
          title: 'Rodaje con Pepe',
        }),
        s('2026-11-07', {
          templateCode: 'rest',
          title: 'Descanso',
          load: 'REST',
        }),
      ],
      [viernes],
      PLAN_TEMPLATES,
    );
    expect(favs.map((f) => [f.title, f.times])).toEqual([
      ['Viernes', 3],
      ['Fútbol 7', 2],
      ['Rodaje con Pepe', 1],
    ]);
    // La más reciente fija duración y carga.
    expect(favs[0]).toMatchObject({ routineId: 'r1', durationMin: 75 });
    expect(favs[1]).toMatchObject({
      routineId: null,
      templateCode: 'f7',
      load: 'HIGH',
    });
  });

  it('suma las rutinas que se hacen sin planificar y no repite las borradas', () => {
    const favs = planFavorites(
      [s('2026-11-02', { structure: { routineId: 'borrada' } })],
      [{ ...viernes, timesDone: 4 }],
      PLAN_TEMPLATES,
    );
    expect(favs.map((f) => [f.key, f.times])).toEqual([
      ['r:r1', 4],
      ['t:gym', 1],
    ]);
  });

  it('se queda con las primeras', () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      s(`2026-11-0${i + 1}`, { templateCode: null, title: `Sesión ${i}` }),
    );
    expect(planFavorites(many, [], PLAN_TEMPLATES, 3)).toHaveLength(3);
  });
});
