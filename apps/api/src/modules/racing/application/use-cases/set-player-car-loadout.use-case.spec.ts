import { CarArchetype } from '../../domain/entities/car-archetype.entity';
import {
  CarPart,
  CarPartCategory,
} from '../../domain/entities/car-part.entity';
import { CarSkin } from '../../domain/entities/car-skin.entity';
import { PlayerCarLoadout } from '../../domain/entities/player-car-loadout.entity';
import { CarArchetypeRepositoryPort } from '../ports/car-archetype-repository.port';
import { CarPartRepositoryPort } from '../ports/car-part-repository.port';
import { CarSkinRepositoryPort } from '../ports/car-skin-repository.port';
import {
  PlayerCarLoadoutRepositoryPort,
  UpsertPlayerCarLoadoutData,
} from '../ports/player-car-loadout-repository.port';
import { PlayerCarSkinRepositoryPort } from '../ports/player-car-skin-repository.port';
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
const FREE_SKIN = new CarSkin(
  's1',
  'purple',
  'Púrpura',
  'res://models/vehicle-truck-purple.glb',
  true,
  true,
);
const EXCLUSIVE_SKIN = new CarSkin(
  's2',
  'gold',
  'Dorado',
  'res://models/vehicle-truck-gold.glb',
  false,
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

class FakeSkinRepository implements CarSkinRepositoryPort {
  constructor(
    private readonly byId = new Map([
      [FREE_SKIN.id, FREE_SKIN],
      [EXCLUSIVE_SKIN.id, EXCLUSIVE_SKIN],
    ]),
  ) {}
  findById(id: string): Promise<CarSkin | null> {
    return Promise.resolve(this.byId.get(id) ?? null);
  }
  existsCode(): Promise<boolean> {
    return Promise.resolve(false);
  }
  listActive(): Promise<CarSkin[]> {
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

class FakePlayerCarSkinRepository implements PlayerCarSkinRepositoryPort {
  constructor(private readonly owned = new Set<string>()) {}
  listOwnedSkinIds(): Promise<string[]> {
    return Promise.resolve([...this.owned]);
  }
  ownsSkin(_userId: string, skinId: string): Promise<boolean> {
    return Promise.resolve(this.owned.has(skinId));
  }
  grant(_userId: string, skinId: string): Promise<void> {
    this.owned.add(skinId);
    return Promise.resolve();
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
        data.skinId,
      ),
    );
  }
}

function buildUseCase(
  loadouts: FakeLoadoutRepository,
  ownedSkins: Set<string> = new Set(),
): SetPlayerCarLoadoutUseCase {
  return new SetPlayerCarLoadoutUseCase(
    loadouts,
    new FakeArchetypeRepository(),
    new FakePartRepository(),
    new FakeSkinRepository(),
    new FakePlayerCarSkinRepository(ownedSkins),
  );
}

describe('SetPlayerCarLoadoutUseCase', () => {
  it('primera vez (sin fila previa): huecos no mencionados quedan vacíos', async () => {
    const loadouts = new FakeLoadoutRepository(null);
    const useCase = buildUseCase(loadouts);

    await useCase.execute('user-1', { archetypeId: NORMAL.id });

    expect(loadouts.upserted).toEqual({
      archetypeId: NORMAL.id,
      tiresPartId: null,
      wingPartId: null,
      chassisPartId: null,
      skinId: null,
    });
  });

  it('undefined en un hueco conserva lo que ya hubiera equipado', async () => {
    const existing = new PlayerCarLoadout(
      'user-1',
      NORMAL.id,
      TIRES.id,
      null,
      null,
      null,
    );
    const loadouts = new FakeLoadoutRepository(existing);
    const useCase = buildUseCase(loadouts);

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
      skinId: null,
    });
  });

  it('null en un hueco lo vacía explícitamente', async () => {
    const existing = new PlayerCarLoadout(
      'user-1',
      NORMAL.id,
      TIRES.id,
      null,
      null,
      null,
    );
    const loadouts = new FakeLoadoutRepository(existing);
    const useCase = buildUseCase(loadouts);

    await useCase.execute('user-1', {
      archetypeId: NORMAL.id,
      tiresPartId: null,
    });

    expect(loadouts.upserted?.tiresPartId).toBeNull();
  });

  it('rechaza una pieza que no existe', async () => {
    const loadouts = new FakeLoadoutRepository(null);
    const useCase = buildUseCase(loadouts);

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
    const useCase = buildUseCase(loadouts);

    await expect(
      useCase.execute('user-1', { archetypeId: 'missing' }),
    ).rejects.toMatchObject({ code: 'RACING_CAR_ARCHETYPE_NOT_FOUND' });
  });

  it('rechaza una pieza montada en el hueco de otra categoría', async () => {
    const loadouts = new FakeLoadoutRepository(null);
    const useCase = buildUseCase(loadouts);

    await expect(
      useCase.execute('user-1', {
        archetypeId: NORMAL.id,
        tiresPartId: WING.id,
      }),
    ).rejects.toMatchObject({ code: 'RACING_INVALID_CAR_LOADOUT' });
  });

  it('equipa un skin gratis (isUnlockedByDefault) sin necesitar propiedad', async () => {
    const loadouts = new FakeLoadoutRepository(null);
    const useCase = buildUseCase(loadouts);

    await useCase.execute('user-1', {
      archetypeId: NORMAL.id,
      skinId: FREE_SKIN.id,
    });

    expect(loadouts.upserted?.skinId).toBe(FREE_SKIN.id);
  });

  it('rechaza un skin exclusivo que el jugador no tiene desbloqueado', async () => {
    const loadouts = new FakeLoadoutRepository(null);
    const useCase = buildUseCase(loadouts);

    await expect(
      useCase.execute('user-1', {
        archetypeId: NORMAL.id,
        skinId: EXCLUSIVE_SKIN.id,
      }),
    ).rejects.toMatchObject({ code: 'RACING_CAR_SKIN_NOT_OWNED' });
    expect(loadouts.upserted).toBeNull();
  });

  it('acepta un skin exclusivo que el jugador sí tiene desbloqueado', async () => {
    const loadouts = new FakeLoadoutRepository(null);
    const useCase = buildUseCase(loadouts, new Set([EXCLUSIVE_SKIN.id]));

    await useCase.execute('user-1', {
      archetypeId: NORMAL.id,
      skinId: EXCLUSIVE_SKIN.id,
    });

    expect(loadouts.upserted?.skinId).toBe(EXCLUSIVE_SKIN.id);
  });

  it('rechaza un skin que no existe', async () => {
    const loadouts = new FakeLoadoutRepository(null);
    const useCase = buildUseCase(loadouts);

    await expect(
      useCase.execute('user-1', {
        archetypeId: NORMAL.id,
        skinId: 'missing',
      }),
    ).rejects.toMatchObject({ code: 'RACING_CAR_SKIN_NOT_FOUND' });
  });
});
