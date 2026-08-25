import { Season } from '../../domain/entities/season.entity';
import {
  CreateSeasonData,
  SeasonRepositoryPort,
} from '../ports/season-repository.port';
import { AdminCreateSeasonUseCase } from './admin-create-season.use-case';
import { AutoRotateSeasonUseCase } from './auto-rotate-season.use-case';

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

function useCase(current: Season | null) {
  const seasons = new FakeSeasonRepository(current);
  const seasonsPort = seasons as unknown as SeasonRepositoryPort;
  return {
    useCase: new AutoRotateSeasonUseCase(
      seasonsPort,
      new AdminCreateSeasonUseCase(seasonsPort),
    ),
    seasons,
  };
}

describe('AutoRotateSeasonUseCase (TASK-228)', () => {
  it('sin ninguna temporada, crea la primera — ni el arranque necesita a un admin', async () => {
    const { useCase: uc, seasons } = useCase(null);
    const now = new Date('2026-01-01');

    await uc.execute(now);

    expect(seasons.created).toEqual([{ name: 'Temporada 1', startsAt: now }]);
    expect(seasons.closed).toHaveLength(0);
  });

  it('con una temporada reciente, no toca nada', async () => {
    const current = new Season('s1', 'Temporada 1', new Date('2026-01-01'), null);
    const { useCase: uc, seasons } = useCase(current);

    await uc.execute(new Date('2026-01-15'));

    expect(seasons.created).toHaveLength(0);
    expect(seasons.closed).toHaveLength(0);
  });

  it('con una temporada vencida, la cierra y abre la siguiente con el nombre que toca', async () => {
    const current = new Season('s1', 'Temporada 3', new Date('2026-01-01'), null);
    const { useCase: uc, seasons } = useCase(current);
    const now = new Date('2026-02-15');

    await uc.execute(now);

    expect(seasons.closed).toEqual([{ id: 's1', endsAt: now }]);
    expect(seasons.created).toEqual([{ name: 'Temporada 4', startsAt: now }]);
  });
});
