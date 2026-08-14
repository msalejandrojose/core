import { TerrainType } from '../track-terrain';

// Fila persistida del efecto de un tipo de terreno de sección (TASK-304).
// Distinto de `TerrainEffect` en `track-terrain.ts`: aquella es solo la
// forma {grip, slowsTopSpeed} que usan los cálculos; esta es la fila
// completa con id y tipo, tal como vive en la tabla.
export class RacingTerrainEffect {
  constructor(
    readonly id: string,
    readonly type: TerrainType,
    readonly grip: number,
    readonly slowsTopSpeed: boolean,
  ) {}
}
