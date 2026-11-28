import { describe, expect, it } from 'vitest';
import { newRoutineForDayPath, routineForDayParams, routinesForKind, sessionFromRoutine, useRoutinePick } from './routine-pick';

describe('rutina para un día del plan', () => {
  it('lee el día y el tipo del enlace al editor', () => {
    expect(routineForDayParams('?para=2026-12-01&tipo=RUN')).toEqual({ day: '2026-12-01', kind: 'RUN' });
    expect(routineForDayParams('?para=mañana&tipo=YOGA')).toEqual({ day: null, kind: null });
    expect(routineForDayParams('')).toEqual({ day: null, kind: null });
    expect(newRoutineForDayPath('2026-12-01', 'STRENGTH')).toBe('/tabs/entrenos/rutinas/nueva?para=2026-12-01&tipo=STRENGTH');
    expect(newRoutineForDayPath('2026-12-01', 'RARO')).toBe('/tabs/entrenos/rutinas/nueva?para=2026-12-01');
  });

  it('rellena la sesión con lo que trae la rutina', () => {
    expect(sessionFromRoutine({ name: 'Series 6×800', kind: 'RUN', plannedDurationMin: 50, plannedDistanceM: 8500 })).toEqual({
      kind: 'RUN',
      title: 'Series 6×800',
      minutes: '50',
      km: '8,5',
    });
    expect(sessionFromRoutine({ name: 'Torso A', kind: 'STRENGTH', plannedDurationMin: null, plannedDistanceM: null })).toMatchObject({ minutes: '', km: '' });
  });

  it('ordena primero las rutinas del mismo tipo', () => {
    const rs = [{ kind: 'RUN' as const, id: 'a' }, { kind: 'STRENGTH' as const, id: 'b' }, { kind: 'STRENGTH' as const, id: 'c' }];
    expect(routinesForKind(rs, 'STRENGTH').map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('guarda la rutina recién creada hasta que la sesión la recoge', () => {
    useRoutinePick.getState().set('2026-12-01', 'r9');
    expect(useRoutinePick.getState().pick).toEqual({ day: '2026-12-01', routineId: 'r9' });
    useRoutinePick.getState().clear();
    expect(useRoutinePick.getState().pick).toBeNull();
  });
});
