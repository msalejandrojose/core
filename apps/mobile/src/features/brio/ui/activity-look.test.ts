import { describe, expect, it } from 'vitest';
import { activityLook } from './activity-look';
import { PATHS } from './paths';

describe('activityLook', () => {
  it('elige por código: fútbol 7 y futsal son balón; pádel, raqueta', () => {
    expect(activityLook({ code: 'football_7', kind: 'OTHER' }).path).toBe(PATHS.ball);
    expect(activityLook({ code: 'futsal' }).path).toBe(PATHS.ball);
    expect(activityLook({ code: 'padel' }).path).toBe(PATHS.racket);
    expect(activityLook({ code: 'strength', kind: 'STRENGTH' }).path).toBe(PATHS.strength);
    expect(activityLook({ code: 'running', kind: 'RUN' }).path).toBe(PATHS.run);
  });

  it('sin código, el nombre afina más que la disciplina', () => {
    expect(activityLook({ kind: 'OTHER', name: 'Fútbol sala con el equipo' }).path).toBe(PATHS.ball);
    expect(activityLook({ kind: 'STRENGTH', name: 'Pierna' }).path).toBe(PATHS.strength);
    expect(activityLook({ kind: 'RUN', name: 'Rodaje suave' }).path).toBe(PATHS.run);
  });

  it('cae a la disciplina y, si no, a un icono genérico', () => {
    expect(activityLook({ kind: 'CYCLE', name: 'Salida del domingo' }).path).toBe(PATHS.bike);
    expect(activityLook({ kind: 'OTHER', name: 'Algo raro' }).path).toBe(PATHS.dance);
  });

  it('cada familia tiene su color', () => {
    expect(activityLook({ code: 'futsal' }).color).toBe('var(--brio-activity)');
    expect(activityLook({ code: 'strength' }).color).toBe('var(--brio-heart)');
  });
});
