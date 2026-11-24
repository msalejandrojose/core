import { invalidWeekSlots, weekFromSlots, type WeekSlot } from './week-template';

const slot = (p: Partial<WeekSlot>): WeekSlot => ({
  weekday: 1,
  templateCode: 'gym',
  title: null,
  startTime: null,
  durationMin: null,
  routineId: null,
  ...p,
});

describe('semana tipo', () => {
  it('pone cada actividad en su día con su hora', () => {
    const week = weekFromSlots([
      slot({ weekday: 2, templateCode: 'futsal', startTime: '21:00' }),
      slot({ weekday: 6, templateCode: 'f7', startTime: '10:00' }),
      slot({ weekday: 1, templateCode: 'gym', title: 'Torso', routineId: 'r1' }),
    ]);
    expect(week[0]).toMatchObject({ title: 'Torso', kind: 'STRENGTH', structure: { routineId: 'r1' } });
    expect(week[1]).toMatchObject({ title: 'Fútbol sala', startTime: '21:00', load: 'HIGH', plannedDurationMin: 60 });
    expect(week[5]).toMatchObject({ title: 'Fútbol 7', startTime: '10:00' });
    expect(week[2]).toBeNull();
  });

  it('junta dos actividades del mismo día en una sesión', () => {
    const [mon] = weekFromSlots([
      slot({ weekday: 1, templateCode: 'futsal', startTime: '21:00' }),
      slot({ weekday: 1, templateCode: 'gym', startTime: '08:00', durationMin: 45 }),
    ]);
    expect(mon).toMatchObject({
      title: 'Gimnasio + Fútbol sala',
      load: 'HIGH',
      startTime: '08:00',
      plannedDurationMin: 105,
      templateCode: null,
    });
    expect((mon?.structure as { parts: unknown[] }).parts).toHaveLength(2);
  });

  it('valida días, horas, duración y plantillas', () => {
    expect(invalidWeekSlots([slot({})])).toBeNull();
    expect(invalidWeekSlots([slot({ weekday: 8 })])).toMatch(/Día/);
    expect(invalidWeekSlots([slot({ startTime: '25:00' })])).toMatch(/HH:MM/);
    expect(invalidWeekSlots([slot({ durationMin: 2 })])).toMatch(/duración/);
    expect(invalidWeekSlots([slot({ templateCode: 'nope' })])).toMatch(/desconocida/);
  });
});
