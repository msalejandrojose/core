import { CarArchetype } from './entities/car-archetype.entity';
import { CarPart } from './entities/car-part.entity';

/**
 * Combina un arquetipo con sus piezas equipadas y la superficie del circuito
 * en los números reales que gobiernan la física del coche (TASK-262/263/264).
 *
 * Es la especificación canónica de la fórmula — el cliente Godot (TASK-268)
 * tiene que replicarla igual que replica `validateTrackPath` en el editor
 * del backoffice, no reinventarla.
 */

export interface CarLoadoutParts {
  tires?: CarPart;
  wing?: CarPart;
  chassis?: CarPart;
}

export interface CarStats {
  speedScale: number;
  grip: number;
}

/** Perfil base del coche: arquetipo + deltas de las piezas equipadas. */
export function computeCarStats(
  archetype: CarArchetype,
  parts: CarLoadoutParts,
): CarStats {
  const equipped = [parts.tires, parts.wing, parts.chassis].filter(
    (p): p is CarPart => p !== undefined,
  );

  return equipped.reduce(
    (stats, part) => ({
      speedScale: stats.speedScale + part.speedScale,
      grip: stats.grip + part.grip,
    }),
    { speedScale: archetype.speedScale, grip: archetype.grip },
  );
}

/**
 * Agarre efectivo en un punto concreto del circuito: el perfil del coche
 * (arquetipo + piezas) contra el agarre de la superficie (circuito o celda de
 * terreno de sección), aplicando el modificador fuera de asfalto del
 * arquetipo cuando corresponde (TASK-264).
 *
 * `surfaceGrip` es el `grip` de `Track` o el de `TERRAIN_EFFECTS` de una
 * celda pintada — quien llama decide cuál toca, esta función no lo sabe.
 */
export function effectiveGrip(
  archetype: CarArchetype,
  parts: CarLoadoutParts,
  surfaceGrip: number,
  isOffroad: boolean,
): number {
  const carGrip = computeCarStats(archetype, parts).grip;
  const offroadFactor = isOffroad ? archetype.offroadGripModifier : 1;
  return carGrip * surfaceGrip * offroadFactor;
}
