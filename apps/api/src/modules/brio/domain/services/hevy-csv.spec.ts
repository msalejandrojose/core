import { parseCsv, parseHevyCsv, parseHevyDate } from './hevy-csv';

const CSV = `"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"
"Pecho y tríceps","16 Nov 2026, 18:30","16 Nov 2026, 19:35","Buen día","Bench Press (Barbell)",,"",0,"warmup",40,12,,,
"Pecho y tríceps","16 Nov 2026, 18:30","16 Nov 2026, 19:35","Buen día","Bench Press (Barbell)",,"",1,"normal",80,8,,,8
"Pecho y tríceps","16 Nov 2026, 18:30","16 Nov 2026, 19:35","Buen día","Triceps Pushdown (Cable)",,"Agarre ""cuerda""",0,"normal",30,12,,,
"Pierna","18 Nov 2026, 07:05","18 Nov 2026, 08:00","","Squat (Barbell)",,"",0,"normal",100,5,,,
`;

describe('parseCsv', () => {
  it('respeta comillas, comas y comillas dobladas', () => {
    expect(parseCsv('a,"b, c","d ""e"""\n1,2,3')).toEqual([
      ['a', 'b, c', 'd "e"'],
      ['1', '2', '3'],
    ]);
  });
});

describe('parseHevyDate', () => {
  it('lee «16 Nov 2026, 18:30» en hora de Madrid', () => {
    expect(
      parseHevyDate('16 Nov 2026, 18:30', 'Europe/Madrid')?.toISOString(),
    ).toBe('2026-11-16T17:30:00.000Z');
    expect(
      parseHevyDate('16 Jul 2026, 18:30', 'Europe/Madrid')?.toISOString(),
    ).toBe('2026-07-16T16:30:00.000Z');
  });
  it('acepta también «2026-11-16 18:30» y descarta lo que no entiende', () => {
    expect(
      parseHevyDate('2026-11-16 18:30', 'Europe/Madrid')?.toISOString(),
    ).toBe('2026-11-16T17:30:00.000Z');
    expect(parseHevyDate('ayer', 'Europe/Madrid')).toBeNull();
  });
});

describe('parseHevyCsv', () => {
  it('agrupa las filas en entrenos, ejercicios y series', () => {
    const { workouts, skippedRows } = parseHevyCsv(CSV, 'Europe/Madrid');
    expect(skippedRows).toBe(0);
    expect(workouts).toHaveLength(2);
    const [chest, legs] = workouts;
    expect(chest.title).toBe('Pecho y tríceps');
    expect(chest.description).toBe('Buen día');
    expect(chest.exercises.map((e) => e.title)).toEqual([
      'Bench Press (Barbell)',
      'Triceps Pushdown (Cable)',
    ]);
    expect(chest.exercises[0].sets).toHaveLength(2);
    expect(chest.exercises[0].sets[0].type).toBe('warmup');
    expect(chest.exercises[0].sets[1]).toMatchObject({
      weight_kg: 80,
      reps: 8,
      rpe: 8,
    });
    expect(legs.exercises[0].sets[0]).toMatchObject({
      weight_kg: 100,
      reps: 5,
    });
  });
  it('el mismo entreno da el mismo id (reimportar no duplica)', () => {
    const a = parseHevyCsv(CSV, 'Europe/Madrid').workouts[0].id;
    const b = parseHevyCsv(CSV, 'Europe/Madrid').workouts[0].id;
    expect(a).toBe(b);
  });
  it('pasa libras y millas a kg y metros', () => {
    const csv =
      'title,start_time,exercise_title,set_index,set_type,weight_lbs,reps,distance_miles\nA,"1 Nov 2026, 10:00",Row,0,normal,100,10,1\n';
    const s = parseHevyCsv(csv, 'Europe/Madrid').workouts[0].exercises[0]
      .sets[0];
    expect(s.weight_kg).toBeCloseTo(45.36, 1);
    expect(s.distance_meters).toBeCloseTo(1609.3, 0);
  });
  it('rechaza un archivo que no es de Hevy', () => {
    expect(() => parseHevyCsv('a,b\n1,2', 'Europe/Madrid')).toThrow(
      'HEVY_CSV_FORMAT',
    );
  });
});
