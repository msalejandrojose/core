import { CarArchetype } from '../../domain/entities/car-archetype.entity';
import {
  CarPart,
  CarPartCategory,
} from '../../domain/entities/car-part.entity';
import { PlayerCarLoadout } from '../../domain/entities/player-car-loadout.entity';
import { CarArchetypeRepositoryPort } from '../ports/car-archetype-repository.port';
import { CarPartRepositoryPort } from '../ports/car-part-repository.port';
import {
  PlayerCarLoadoutRepositoryPort,
  UpsertPlayerCarLoadoutData,
} from '../ports/player-car-loadout-repository.port';
import { SetPlayerCarLoadoutUseCase } from './set-player-car-loadout.use-case';

const NORMAL = new CarArchetype('a1', 'normal', 'Normal', 1, 1, 1, true);
const TIRES = new CarPart(
  'p1',
  'tires-grip',
  CarPartCategory.TIRES,
  'Neumáticos de agarre',
  -0.05,
  0.1,
  true,
);
const WING = new CarPart(
  'p2',
  'wing-big',
  CarPartCategory.WING,
  'Alerón grande',
  -0.08,
  0.12,
  true,
);

class FakeArchetypeRepository implements CarArchetypeRepositoryPort {
  constructor(private readonly byId = new Map([[NORMAL.id, NORMAL]])) {}
  findById(id: string): Promise<CarArchetype | null> {
    return Promise.resolve(this.byId.get(id) ?? null);
  }
  existsCode(): Promise<boolean> {
    return Promise.resolve(false);
  }
  listActive(): Promise<CarArchetype[]> {
    return Promise.resolve([...this.byId.values()]);
  }
  listAll(): Promise<never> {
    throw new Error('not used in this test');
  }
  create(): Promise<never> {
    throw new Error('not used in this test');
  }
  update(): Promise<never> {
    throw new Error('not used in this test');
  }
}

class FakePartRepository implements CarPartRepositoryPort {
  constructor(
    private readonly byId = new Map([
      [TIRES.id, TIRES],
      [WING.id, WING],
    ]),
  ) {}
  findById(id: string): Promise<CarPart | null> {
    return Promise.resolve(this.byId.get(id) ?? null);
  }
  existsCode(): Promise<boolean> {
    return Promise.resolve(false);
  }
  listActive(): Promise<CarPart[]> {
    return Promise.resolve([...this.byId.values()]);
  }
  listAll(): Promise<never> {
    throw new Error('not used in this test');
  }
  create(): Promise<never> {
    throw new Error('not used in this test');
  }
  update(): Promise<never> {
    throw new Error('not used in this test');
  }
}

class FakeLoadoutRepository implements PlayerCarLoadoutRepositoryPort {
  upserted: UpsertPlayerCarLoadoutData | null = null;
  constructor(private existing: PlayerCarLoadout | null) {}
  findByUserId(): Promise<PlayerCarLoadout | null> {
    return Promise.resolve(this.existing);
  }
  upsert(
    userId: string,
    data: UpsertPlayerCarLoadoutData,
  ): Promise<PlayerCarLoadout> {
    this.upserted = data;
    return Promise.resolve(
      new PlayerCarLoadout(
        userId,
        data.archetypeId,
        data.tiresPartId,
        data.wingPartId,
        data.chassisPartId,
      ),
    );
  }
}

describe('SetPlayerCarLoadoutUseCase', () => {
  it('primera vez (sin fila previa): huecos no mencionados quedan vacíos', async () => {
    const loadouts = new FakeLoadoutRepository(null);
    const useCase = new SetPlayerCarLoadoutUseCase(
      loadouts,
      new FakeArchetypeRepository(),
      new FakePartRepository(),
    );

    await useCase.execute('user-1', { archetypeId: NORMAL.id });

    expect(loadouts.upserted).toEqual({
      archetypeId: NORMAL.id,
      tiresPartId: null,
      wingPartId: null,
      chassisPartId: null,
    });
  });

  it('undefined en un hueco conserva lo que ya hubiera equipado', async () => {
    const existing = new PlayerCarLoadout(
      'user-1',
      NORMAL.id,
      TIRES.id,
      null,
      null,
    );
    const loadouts = new FakeLoadoutRepository(existing);
    const useCase = new SetPlayerCarLoadoutUseCase(
      loadouts,
      new FakeArchetypeRepository(),
      new FakePartRepository(),
    );

    // Solo cambia el alerón; no menciona neumáticos (undefined).
    await useCase.execute('user-1', {
      archetypeId: NORMAL.id,
      wingPartId: WING.id,
    });

    expect(loadouts.upserted).toEqual({
      archetypeId: NORMAL.id,
      tiresPartId: TIRES.id, // se conserva
      wingPartId: WING.id,
      chassisPartId: null,
    });
  });

  it('null en un hueco lo vacía explícitamente', async () => {
    const existing = new PlayerCarLoadout(
      'user-1',
      NORMAL.id,
      TIRES.id,
      null,
      null,
    );
    const loadouts = new FakeLoadoutRepository(existing);
    const useCase = new SetPlayerCarLoadoutUseCase(
      loadouts,
      new FakeArchetypeRepository(),
      new FakePartRepository(),
    );

    await useCase.execute('user-1', {
      archetypeId: NORMAL.id,
      tiresPartId: null,
    });

    expect(loadouts.upserted?.tiresPartId).toBeNull();
  });

  it('rechaza una pieza que no existe', async () => {
    const loadouts = new FakeLoadoutRepository(null);
    const useCase = new SetPlayerCarLoadoutUseCase(
      loadouts,
      new FakeArchetypeRepository(),
      new FakePartRepository(),
    );

    await expect(
      useCase.execute('user-1', {
        archetypeId: NORMAL.id,
        tiresPartId: 'missing',
      }),
    ).rejects.toMatchObject({ code: 'RACING_CAR_PART_NOT_FOUND' });
    expect(loadouts.upserted).toBeNull();
  });

  it('rechaza un arquetipo que no existe', async () => {
    const loadouts = new FakeLoadoutRepository(null);
    const useCase = new SetPlayerCarLoadoutUseCase(
      loadouts,
      new FakeArchetypeRepository(),
      new FakePartRepository(),
    );

    await expect(
      useCase.execute('user-1', { archetypeId: 'missing' }),
    ).rejects.toMatchObject({ code: 'RACING_CAR_ARCHETYPE_NOT_FOUND' });
  });

  it('rechaza una pieza montada en el hueco de otra categoría', async () => {
    const loadouts = new FakeLoadoutRepository(null);
    const useCase = new SetPlayerCarLoadoutUseCase(
      loadouts,
      new FakeArchetypeRepository(),
      new FakePartRepository(),
    );

    await expect(
      useCase.execute('user-1', {
        archetypeId: NORMAL.id,
        tiresPartId: WING.id,
      }),
    ).rejects.toMatchObject({ code: 'RACING_INVALID_CAR_LOADOUT' });
  });
});
