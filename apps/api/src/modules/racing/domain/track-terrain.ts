/**
 * Terreno de sección: manchas locales dentro de UN circuito (barro, hielo,
 * agua...), distinto del tema visual del circuito ENTERO (`TrackTheme`,
 * asfalto/nieve). Conviven: un circuito nevado puede tener además un charco
 * de hielo más traicionero que el resto de la pista.
 *
 * Decisión de partida (TASK-270):
 *   - Hielo: agarre muy bajo, SIN frenar la velocidad punta — se desliza, el
 *     riesgo es perder el control en curva, no perder tiempo en recta.
 *   - Barro: agarre bajo Y frena la velocidad punta mientras se pisa — al
 *     contrario que el hielo, aquí sí hay penalización directa de tiempo.
 *   - Agua (charco): agarre medio y efecto breve/puntual — pensado para un
 *     charco corto, no para un tramo largo.
 *
 * Se empieza validando solo hielo y barro; agua se añade cuando el sistema
 * aguante bien los dos primeros.
 */

export enum TerrainType {
  ASPHALT = 'ASPHALT',
  ICE = 'ICE',
  MUD = 'MUD',
  WATER = 'WATER',
}

export interface TerrainEffect {
  /** Multiplicador de agarre. Mismo eje que `Track.grip` y `Vehicle.grip`. */
  grip: number;
  /** Si además de perder agarre, frena la velocidad punta mientras se pisa. */
  slowsTopSpeed: boolean;
}

export const TERRAIN_EFFECTS: Record<TerrainType, TerrainEffect> = {
  [TerrainType.ASPHALT]: { grip: 1.0, slowsTopSpeed: false },
  [TerrainType.ICE]: { grip: 0.4, slowsTopSpeed: false },
  [TerrainType.MUD]: { grip: 0.6, slowsTopSpeed: true },
  [TerrainType.WATER]: { grip: 0.75, slowsTopSpeed: false },
};
