import { parseCsv, parseHevyDate, workoutsFromHevyCsv } from './hevy-csv';

const HEADER =
  '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"';

describe('CSV de Hevy', () => {
  it('lee comillas, comas y saltos de línea dentro de un campo', () => {
    expect(parseCsv('a,"b, c","d ""e""\nf"\r\n1,,3\n')).toEqual([
      ['a', 'b, c', 'd "e"\nf'],
      ['1', '', '3'],
    ]);
  });

  it('entiende las fechas en español y en inglés, en la hora de Madrid', () => {
    // Noviembre: UTC+1. Junio: UTC+2 (horario de verano).
    expect(
      parseHevyDate('17 nov 2026, 07:12', 'Europe/Madrid')?.toISOString(),
    ).toBe('2026-11-17T06:12:00.000Z');
    expect(
      parseHevyDate('16 jun 2025, 07:17', 'Europe/Madrid')?.toISOString(),
    ).toBe('2025-06-16T05:17:00.000Z');
    expect(
      parseHevyDate('17 Nov 2026, 07:12', 'Europe/Madrid')?.toISOString(),
    ).toBe('2026-11-17T06:12:00.000Z');
    expect(parseHevyDate('Nov 17, 2026, 07:12', 'UTC')?.toISOString()).toBe(
      '2026-11-17T07:12:00.000Z',
    );
    expect(
      parseHevyDate('1 dic 2025, 07:21', 'Europe/Madrid')?.toISOString(),
    ).toBe('2025-12-01T06:21:00.000Z');
    expect(parseHevyDate('ayer por la tarde', 'Europe/Madrid')).toBeNull();
  });

  it('agrupa las filas en entrenos y ejercicios, y aparta las series de solo tiempo', () => {
    const csv = [
      HEADER,
      '"Pecho + Hombro","16 nov 2026, 07:19","16 nov 2026, 08:10","","Press de Pecho Iso-Lateral (Máquina)",,"",0,"warmup",20,12,,,',
      '"Pecho + Hombro","16 nov 2026, 07:19","16 nov 2026, 08:10","","Press de Pecho Iso-Lateral (Máquina)",,"",1,"normal",40,10,,,8',
      '"Pecho + Hombro","16 nov 2026, 07:19","16 nov 2026, 08:10","","Plancha",,"",0,"normal",,,,45,',
      '"Pecho + Hombro","16 nov 2026, 07:19","16 nov 2026, 08:10","","Mariposa (Pec Deck)",,"",0,"normal",35,12,,,',
      '"Piernas","11 nov 2026, 07:13","11 nov 2026, 08:00","","Sentadilla Búlgara",,"",0,"normal",,10,,,',
      '"Piernas","fecha rota","","","Sentadilla Búlgara",,"",0,"normal",,10,,,',
    ].join('\n');
    const r = workoutsFromHevyCsv(csv, 'Europe/Madrid');
    expect(r.workouts.map((w) => w.title)).toEqual([
      'Piernas',
      'Pecho + Hombro',
    ]);
    const chest = r.workouts[1];
    expect(chest.start_time).toBe('2026-11-16T06:19:00.000Z');
    expect(chest.exercises.map((e) => e.title)).toEqual([
      'Press de Pecho Iso-Lateral (Máquina)',
      'Mariposa (Pec Deck)',
    ]);
    expect(chest.exercises[0].sets).toEqual([
      { index: 0, type: 'warmup', weight_kg: 20, reps: 12, rpe: null },
      { index: 1, type: 'normal', weight_kg: 40, reps: 10, rpe: 8 },
    ]);
    expect(r.timeOnlySets).toBe(1);
    expect(r.badRows).toBe(1);
  });

  it('rechaza un archivo que no es el de Hevy', () => {
    expect(() => workoutsFromHevyCsv('nombre,fecha\nx,y', 'UTC')).toThrow(
      'RITMO_HEVY_CSV_INVALID',
    );
  });
});
