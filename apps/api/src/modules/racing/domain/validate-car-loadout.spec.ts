import { CarArchetype } from './entities/car-archetype.entity';
import { CarPart, CarPartCategory } from './entities/car-part.entity';
import { CarSkin } from './entities/car-skin.entity';
import { validateCarLoadoutSelection } from './validate-car-loadout';

const ACTIVE_ARCHETYPE = new CarArchetype(
  'a1',
  'normal',
  'Normal',
  1,
  1,
  1,
  true,
  null,
  true,
);
const INACTIVE_ARCHETYPE = new CarArchetype(
  'a2',
  'f1',
  'F1',
  1.25,
  1,
  0.85,
  true,
  null,
  false,
);

const ACTIVE_TIRES = new CarPart(
  'p1',
  'tires-grip',
  CarPartCategory.TIRES,
  'Neumáticos de agarre',
  -0.05,
  0.1,
  true,
  null,
  true,
);
const INACTIVE_TIRES = new CarPart(
  'p2',
  'tires-old',
  CarPartCategory.TIRES,
  'Neumáticos descatalogados',
  0,
  0,
  true,
  null,
  false,
);
const WING = new CarPart(
  'p3',
  'wing-big',
  CarPartCategory.WING,
  'Alerón grande',
  -0.08,
  0.12,
  true,
  null,
  true,
);

const ACTIVE_SKIN = new CarSkin(
  's1',
  'purple',
  'Púrpura',
  'res://models/vehicle-truck-purple.glb',
  true,
  null,
  true,
);
const INACTIVE_SKIN = new CarSkin(
  's2',
  'retired',
  'Retirado',
  'res://models/vehicle-truck-purple.glb',
  true,
  null,
  false,
);

const EMPTY = {
  tiresPart: null,
  wingPart: null,
  chassisPart: null,
  skin: null,
};

describe('validateCarLoadoutSelection', () => {
  it('acepta un arquetipo activo sin ninguna pieza equipada', () => {
    expect(
      validateCarLoadoutSelection({ archetype: ACTIVE_ARCHETYPE, ...EMPTY }),
    ).toEqual({ ok: true });
  });

  it('acepta un arquetipo con piezas activas en su categoría correcta', () => {
    const result = validateCarLoadoutSelection({
      archetype: ACTIVE_ARCHETYPE,
      tiresPart: ACTIVE_TIRES,
      wingPart: WING,
      chassisPart: null,
      skin: ACTIVE_SKIN,
    });
    expect(result.ok).toBe(true);
  });

  it('rechaza si el arquetipo no existe', () => {
    const result = validateCarLoadoutSelection({ archetype: null, ...EMPTY });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('no existe');
  });

  it('rechaza un arquetipo inactivo', () => {
    const result = validateCarLoadoutSelection({
      archetype: INACTIVE_ARCHETYPE,
      ...EMPTY,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('no está activo');
  });

  it('rechaza una pieza inactiva', () => {
    const result = validateCarLoadoutSelection({
      archetype: ACTIVE_ARCHETYPE,
      tiresPart: INACTIVE_TIRES,
      wingPart: null,
      chassisPart: null,
      skin: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('no está activa');
  });

  it('rechaza una pieza montada en el hueco de otra categoría', () => {
    const result = validateCarLoadoutSelection({
      archetype: ACTIVE_ARCHETYPE,
      tiresPart: WING, // pieza de alerón en el hueco de neumáticos
      wingPart: null,
      chassisPart: null,
      skin: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('categoría');
  });

  it('acepta sin ningún skin equipado', () => {
    const result = validateCarLoadoutSelection({
      archetype: ACTIVE_ARCHETYPE,
      ...EMPTY,
    });
    expect(result.ok).toBe(true);
  });

  it('rechaza un skin inactivo', () => {
    const result = validateCarLoadoutSelection({
      archetype: ACTIVE_ARCHETYPE,
      tiresPart: null,
      wingPart: null,
      chassisPart: null,
      skin: INACTIVE_SKIN,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('skin');
  });
});
