import { describe, expect, it } from 'vitest';
import type { PlanTemplate } from './plan.api';
import { addSlots, slotChoices, slotLabel } from './week-template';

const tpl = (code: string, title: string, extra: Partial<PlanTemplate> = {}): PlanTemplate => ({
  code,
  title,
  short: title,
  kind: 'OTHER',
  load: 'HIGH',
  durationMin: 60,
  distanceM: null,
  structure: null,
  ...extra,
});
const templates = [tpl('z2', 'Rodaje Z2'), tpl('rest', 'Descanso', { load: 'REST' }), tpl('gym', 'Gimnasio', { kind: 'STRENGTH' }), tpl('futsal', 'Fútbol sala')];

describe('semana tipo en la app', () => {
  it('ofrece primero los deportes y nunca «Descanso»', () => {
    expect(slotChoices(templates).map((t) => t.code)).toEqual(['futsal', 'gym', 'z2']);
  });

  it('añade una fila por día elegido, ordenada por día y hora', () => {
    const base = { templateCode: 'gym', title: null, startTime: '08:00', durationMin: 60, routineId: null };
    const out = addSlots([{ ...base, weekday: 2, templateCode: 'futsal', startTime: '21:00' }], [5, 1, 3], base);
    expect(out.map((s) => [s.weekday, s.templateCode])).toEqual([
      [1, 'gym'],
      [2, 'futsal'],
      [3, 'gym'],
      [5, 'gym'],
    ]);
  });

  it('enseña el nombre de la rutina y, debajo, hora, minutos y actividad', () => {
    expect(
      slotLabel({ weekday: 1, templateCode: 'gym', title: 'Torso', startTime: '08:00', durationMin: 45, routineId: 'r1' }, templates),
    ).toEqual({ title: 'Torso', meta: '08:00 · 45′ · Gimnasio' });
    expect(
      slotLabel({ weekday: 2, templateCode: 'futsal', title: null, startTime: '21:00', durationMin: null, routineId: null }, templates),
    ).toEqual({ title: 'Fútbol sala', meta: '21:00 · 60′' });
  });
});
