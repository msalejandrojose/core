/* eslint-disable @typescript-eslint/require-await -- dobles de los puertos: async para cumplir su contrato. */
import { ImportHevyCsvUseCase } from './import-hevy-csv.use-case';
import type {
  ImportedSessionData,
  RitmoHevyRepositoryPort,
} from '../ports/hevy.port';
import type { WorkoutTemplatePort } from '../ports/workout-template.port';
import type { RefreshDailyLogUseCase } from './refresh-daily-log.use-case';

const HEADER =
  '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"';
const row = (
  title: string,
  start: string,
  ex: string,
  kg: string,
  reps: number,
  i = 0,
) =>
  `"${title}","${start}","${start.replace(/\d\d$/, '59')}","","${ex}",,"",${i},"normal",${kg},${reps},,,`;

const CSV = [
  HEADER,
  row('Espalda', '17 nov 2026, 07:12', 'Jalón al Pecho (Cable)', '52', 10),
  row('Espalda', '17 nov 2026, 07:12', 'Jalón al Pecho (Cable)', '66', 8, 1),
  row('Espalda', '17 nov 2026, 07:12', 'Mi máquina rara', '', 15),
  row('Espalda', '10 nov 2026, 07:12', 'Jalón al Pecho (Cable)', '50', 10),
  row('Piernas', '11 nov 2026, 07:13', 'Sentadilla (Barra)', '60', 8),
].join('\n');

function setup(opts: { syncedStart?: Date } = {}) {
  const imported = new Map<string, ImportedSessionData>();
  if (opts.syncedStart)
    imported.set('hevy-api-id', {
      startedAt: opts.syncedStart,
    } as ImportedSessionData);
  const own: string[] = [];
  const repo = {
    catalog: async () => [
      { id: 'EX-lat', code: 'lat_pulldown' },
      { id: 'EX-squat', code: 'back_squat' },
    ],
    ensureOwnExercise: async (_u: string, d: { name: string }) => {
      own.push(d.name);
      return `OWN-${d.name}`;
    },
    strengthType: async () => ({ id: 'TYPE', met: 5 }),
    importedStarts: async () =>
      [...imported].map(([externalId, d]) => ({
        externalId,
        startedAt: d.startedAt,
      })),
    upsertImported: async (_u: string, id: string, d: ImportedSessionData) => {
      const created = !imported.has(id);
      imported.set(id, d);
      return { created, previousDay: null };
    },
  } as unknown as RitmoHevyRepositoryPort;
  const templates: { name: string; exercises: unknown[] }[] = [];
  const templatePort = {
    list: async () =>
      templates.map((t) => ({ ...t, id: t.name, updatedAt: '' })),
    upsertByName: async (
      _u: string,
      d: { name: string; exercises: unknown[] },
    ) => {
      templates.push(d);
      return { ...d, id: d.name, updatedAt: '' };
    },
  } as unknown as WorkoutTemplatePort;
  const refreshed: string[] = [];
  const useCase = new ImportHevyCsvUseCase(
    repo,
    { latestWeightKg: async () => 80 } as never,
    { findByUserId: async () => ({ timezone: 'Europe/Madrid' }) } as never,
    templatePort,
    {
      execute: async (_u: string, day: string) => void refreshed.push(day),
    } as unknown as RefreshDailyLogUseCase,
  );
  return { useCase, imported, own, templates, refreshed };
}

describe('importar el CSV de Hevy', () => {
  it('crea los entrenos, enlaza el catálogo, crea los ejercicios que faltan y una plantilla por tipo', async () => {
    const { useCase, imported, own, templates, refreshed } = setup();
    const r = await useCase.execute('u1', CSV);

    expect(r).toMatchObject({
      imported: 3,
      updated: 0,
      alreadySynced: 0,
      firstDay: '2026-11-10',
      lastDay: '2026-11-17',
      matchedExercises: 2,
      createdExercises: ['Mi máquina rara'],
      createdTemplates: ['Espalda', 'Piernas'],
    });
    expect(own).toEqual(['Mi máquina rara']);
    const last = imported.get('csv:u1:2026-11-17T06:12:00.000Z')!;
    expect(last.loggedOn).toBe('2026-11-17');
    expect(last.notes).toBe('Espalda');
    expect(last.sets.map((s) => [s.exerciseId, s.weightKg, s.reps])).toEqual([
      ['EX-lat', 52, 10],
      ['EX-lat', 66, 8],
      ['OWN-Mi máquina rara', 0, 15],
    ]);
    // La plantilla sale del último entreno de cada tipo.
    expect(templates[0]).toEqual({
      name: 'Espalda',
      exercises: [
        { exerciseId: 'EX-lat', sets: 2, reps: 8, weightKg: 66 },
        {
          exerciseId: 'OWN-Mi máquina rara',
          sets: 1,
          reps: 15,
          weightKg: null,
        },
      ],
    });
    expect(refreshed).toEqual(['2026-11-10', '2026-11-11', '2026-11-17']);
  });

  it('volver a subir el archivo no duplica entrenos ni plantillas', async () => {
    const { useCase, imported, templates } = setup();
    await useCase.execute('u1', CSV);
    const again = await useCase.execute('u1', CSV);
    expect(again).toMatchObject({
      imported: 0,
      updated: 3,
      createdTemplates: [],
    });
    expect(imported.size).toBe(3);
    expect(templates).toHaveLength(2);
  });

  it('se salta los entrenos que ya llegaron por la conexión con Hevy', async () => {
    const { useCase } = setup({
      syncedStart: new Date('2026-11-17T06:12:30Z'),
    });
    const r = await useCase.execute('u1', CSV);
    expect(r.imported).toBe(2);
    expect(r.alreadySynced).toBe(1);
  });

  it('un archivo vacío o de otra cosa da un error claro', async () => {
    const { useCase } = setup();
    await expect(useCase.execute('u1', '')).rejects.toThrow(
      'RITMO_HEVY_CSV_INVALID',
    );
    await expect(useCase.execute('u1', 'a,b\n1,2')).rejects.toThrow(
      'RITMO_HEVY_CSV_INVALID',
    );
    await expect(useCase.execute('u1', HEADER)).rejects.toThrow(
      'RITMO_HEVY_CSV_EMPTY',
    );
  });
});
