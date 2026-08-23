import { TrackCell } from '../track-path';

// Réplica de `TrackTheme.Kind` en apps/game/scripts/track/track_theme.gd.
export enum TrackTheme {
  MEADOW = 'MEADOW',
  SNOW = 'SNOW',
}

// Variante jugable de un `RacingCircuit` (TASK-336): un sentido de marcha ×
// una cilindrada × un arquetipo de vehículo. Cada combinación es su propio
// leaderboard y su propio suelo de plausibilidad, así que necesitan filas
// separadas aunque compartan circuito ("kenney-01" y "kenney-01-rev" son
// circuitos jugables distintos).
//
// `path`/`theme`/`grip`/`imageId` viven realmente en `RacingCircuit` — aquí
// están DENORMALIZADOS al leer (mismo patrón que `GrandPrixStage`
// denormaliza `trackSlug`/`trackName` desde `Track`), para que los DTOs que
// ya exponían estos campos no tengan que cambiar de forma.
export class Track {
  constructor(
    readonly id: string,
    readonly slug: string,
    readonly name: string,
    readonly circuitId: string,
    // Sectores de la vuelta = checkpoints intermedios + la meta. Es la longitud
    // que debe tener `splitsMs` de cualquier tiempo de este circuito.
    readonly sectorCount: number,
    // Suelo de plausibilidad en ms: por debajo, la vuelta es físicamente
    // imposible (ver `lap-validation.ts`).
    readonly minPlausibleMs: number,
    readonly isActive: boolean,
    // Celdas del trazado en orden de recorrido hacia adelante, del circuito
    // padre — el sentido inverso reutiliza esta misma lista, no es una
    // lista distinta.
    readonly path: TrackCell[],
    readonly theme: TrackTheme,
    // Agarre de la superficie: 1.0 asfalto seco. Mismo eje que `Vehicle.grip`
    // en el cliente.
    readonly grip: number,
    // FK suave a StoredFile (módulo storage), null si no tiene miniatura.
    readonly imageId: string | null,
    readonly circuitSlug: string,
    readonly circuitName: string,
  ) {}
}
