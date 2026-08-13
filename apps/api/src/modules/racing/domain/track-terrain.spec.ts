import { TERRAIN_EFFECTS, TerrainType } from './track-terrain';

describe('TERRAIN_EFFECTS', () => {
  it('define un efecto para cada tipo de terreno', () => {
    for (const type of Object.values(TerrainType)) {
      expect(TERRAIN_EFFECTS[type]).toBeDefined();
    }
  });

  it('el asfalto no penaliza nada (agarre 1.0, sin frenar)', () => {
    expect(TERRAIN_EFFECTS[TerrainType.ASPHALT]).toEqual({
      grip: 1.0,
      slowsTopSpeed: false,
    });
  });

  it('el hielo pierde agarre pero no frena la velocidad punta', () => {
    const ice = TERRAIN_EFFECTS[TerrainType.ICE];
    expect(ice.grip).toBeLessThan(1.0);
    expect(ice.slowsTopSpeed).toBe(false);
  });

  it('el barro pierde agarre Y frena la velocidad punta', () => {
    const mud = TERRAIN_EFFECTS[TerrainType.MUD];
    expect(mud.grip).toBeLessThan(1.0);
    expect(mud.slowsTopSpeed).toBe(true);
  });
});
