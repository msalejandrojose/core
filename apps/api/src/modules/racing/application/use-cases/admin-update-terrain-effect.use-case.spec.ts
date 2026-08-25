import { RacingTerrainEffect } from '../../domain/entities/racing-terrain-effect.entity';
import { TerrainType } from '../../domain/track-terrain';
import {
  RacingTerrainEffectRepositoryPort,
  UpdateRacingTerrainEffectPatch,
} from '../ports/racing-terrain-effect-repository.port';
import { AdminUpdateTerrainEffectUseCase } from './admin-update-terrain-effect.use-case';

const EXISTING = new RacingTerrainEffect(
  'effect-1',
  TerrainType.ICE,
  0.4,
  false,
);

class FakeRacingTerrainEffectRepository implements RacingTerrainEffectRepositoryPort {
  updated: { type: TerrainType; patch: UpdateRacingTerrainEffectPatch } | null =
    null;

  constructor(private readonly existing: RacingTerrainEffect | null) {}

  findAll(): Promise<never> {
    throw new Error('not used in this test');
  }

  findByType(): Promise<RacingTerrainEffect | null> {
    return Promise.resolve(this.existing);
  }

  update(
    type: TerrainType,
    patch: UpdateRacingTerrainEffectPatch,
  ): Promise<RacingTerrainEffect> {
    this.updated = { type, patch };
    return Promise.resolve(this.existing as RacingTerrainEffect);
  }
}

describe('AdminUpdateTerrainEffectUseCase', () => {
  it('lanza RacingTerrainEffectNotFoundError si el tipo no existe', async () => {
    const repo = new FakeRacingTerrainEffectRepository(null);
    const useCase = new AdminUpdateTerrainEffectUseCase(repo);

    await expect(
      useCase.execute(TerrainType.ICE, { grip: 0.5 }),
    ).rejects.toMatchObject({ code: 'RACING_TERRAIN_EFFECT_NOT_FOUND' });
  });

  it('ajusta el grip sin tocar slowsTopSpeed', async () => {
    const repo = new FakeRacingTerrainEffectRepository(EXISTING);
    const useCase = new AdminUpdateTerrainEffectUseCase(repo);

    await useCase.execute(TerrainType.ICE, { grip: 0.35 });

    expect(repo.updated).toEqual({
      type: TerrainType.ICE,
      patch: { grip: 0.35, slowsTopSpeed: undefined },
    });
  });

  it('ajusta slowsTopSpeed', async () => {
    const repo = new FakeRacingTerrainEffectRepository(EXISTING);
    const useCase = new AdminUpdateTerrainEffectUseCase(repo);

    await useCase.execute(TerrainType.ICE, { slowsTopSpeed: true });

    expect(repo.updated).toEqual({
      type: TerrainType.ICE,
      patch: { grip: undefined, slowsTopSpeed: true },
    });
  });
});
