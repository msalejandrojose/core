import { CarArchetype } from './entities/car-archetype.entity';
import { CarPart, CarPartCategory } from './entities/car-part.entity';
import { CarSkin } from './entities/car-skin.entity';

// Selección YA resuelta a entidades (o null si el id no existe o el hueco
// está vacío) — el use-case hace los `findById`, este validador solo mira
// reglas de negocio puras sobre lo que le pasan. La propiedad del skin
// (`isUnlockedByDefault` / `PlayerCarSkin`) NO se comprueba aquí — necesita
// I/O sobre el jugador, así que la resuelve el use-case antes de llegar.
export interface CarLoadoutSelection {
  archetype: CarArchetype | null;
  tiresPart: CarPart | null;
  wingPart: CarPart | null;
  chassisPart: CarPart | null;
  skin: CarSkin | null;
}

export type CarLoadoutValidationResult =
  | { ok: true }
  | { ok: false; reason: string; details: Record<string, unknown> };

const OK: CarLoadoutValidationResult = { ok: true };

function reject(
  reason: string,
  details: Record<string, unknown> = {},
): CarLoadoutValidationResult {
  return { ok: false, reason, details };
}

const SLOTS: readonly [keyof CarLoadoutSelection, CarPartCategory][] = [
  ['tiresPart', CarPartCategory.TIRES],
  ['wingPart', CarPartCategory.WING],
  ['chassisPart', CarPartCategory.CHASSIS],
];

export function validateCarLoadoutSelection(
  selection: CarLoadoutSelection,
): CarLoadoutValidationResult {
  if (!selection.archetype) {
    return reject('el arquetipo no existe');
  }
  if (!selection.archetype.isActive) {
    return reject('el arquetipo no está activo', {
      archetypeId: selection.archetype.id,
    });
  }

  for (const [slot, category] of SLOTS) {
    const part = selection[slot] as CarPart | null;
    if (part === null) continue; // hueco vacío: válido, no todas las piezas son obligatorias

    if (!part.isActive) {
      return reject(`la pieza equipada en ${slot} no está activa`, {
        partId: part.id,
      });
    }
    if (part.category !== category) {
      return reject(
        `la pieza equipada en ${slot} no es de la categoría ${category}`,
        { partId: part.id, expected: category, got: part.category },
      );
    }
  }

  if (selection.skin !== null && !selection.skin.isActive) {
    return reject('el skin equipado no está activo', {
      skinId: selection.skin.id,
    });
  }

  return OK;
}
