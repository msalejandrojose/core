import { Season } from '../../domain/entities/season.entity';
import {
  CreateSeasonData,
  SeasonRepositoryPort,
} from '../ports/season-repository.port';
import { AdminCreateSeasonUseCase } from './admin-create-season.use-case';

class FakeSeasonRepository implements Partial<SeasonRepositoryPort> {
  created: CreateSeasonData[] = [];
  closed: { id: string; endsAt: Date }[] = [];

  constructor(private current: Season | null) {}

  findCurrent(): Promise<Season | null> {
    return Promise.resolve(this.current);
  }

  close(id: string, endsAt: Date): Promise<void> {
    this.closed.push({ id, endsAt });
    return Promise.resolve();
  }

  create(data: CreateSeasonData): Promise<Season> {
    this.created.push(data);
    return Promise.resolve(new Season('new-season', data.name, data.startsAt, null));
  }
}

describe('AdminCreateSeasonUseCase (TASK-227)', () => {
  it('sin ninguna temporada abierta, crea la nueva sin cerrar nada', async () => {
    const seasons = new FakeSeasonRepository(null);
    const useCase = new AdminCreateSeasonUseCase(
      seasons as unknown as SeasonRepositoryPort,
    );

    await useCase.execute({ name: 'Temporada 1' });

    expect(seasons.closed).toHaveLength(0);
    expect(seasons.created[0].name).toBe('Temporada 1');
  });

  it('con una temporada ya abierta, la cierra en el instante en que empieza la nueva', async () => {
    const current = new Season('season-1', 'Temporada 1', new Date('2026-01-01'), null);
    const seasons = new FakeSeasonRepository(current);
    const useCase = new AdminCreateSeasonUseCase(
      seasons as unknown as SeasonRepositoryPort,
    );
    const startsAt = new Date('2026-04-01');

    await useCase.execute({ name: 'Temporada 2', startsAt });

    expect(seasons.closed).toEqual([{ id: 'season-1', endsAt: startsAt }]);
    expect(seasons.created[0]).toEqual({ name: 'Temporada 2', startsAt });
  });

  it('sin fecha de inicio explícita, usa ahora mismo', async () => {
    const seasons = new FakeSeasonRepository(null);
    const useCase = new AdminCreateSeasonUseCase(
      seasons as unknown as SeasonRepositoryPort,
    );

    const before = Date.now();
    await useCase.execute({ name: 'Temporada 1' });
    const after = Date.now();

    const startsAt = seasons.created[0].startsAt.getTime();
    expect(startsAt).toBeGreaterThanOrEqual(before);
    expect(startsAt).toBeLessThanOrEqual(after);
  });
});
