import { TrackCell } from '../track-path';

// Réplica de `TrackTheme.Kind` en apps/game/scripts/track/track_theme.gd.
export enum TrackTheme {
  MEADOW = 'MEADOW',
  SNOW = 'SNOW',
}

// Circuito jugable. Cada sentido de marcha es un circuito distinto: una vuelta
// al revés no es comparable con una normal, así que tienen leaderboards
// separados y slugs distintos ("kenney-01" y "kenney-01-rev").
export class Track {
  constructor(
    readonly id: string,
    readonly slug: string,
    readonly name: string,
    // Sectores de la vuelta = checkpoints intermedios + la meta. Es la longitud
    // que debe tener `splitsMs` de cualquier tiempo de este circuito.
    readonly sectorCount: number,
    // Suelo de plausibilidad en ms: por debajo, la vuelta es físicamente
    // imposible (ver `lap-validation.ts`).
    readonly minPlausibleMs: number,
    readonly isActive: boolean,
    // Celdas del trazado en orden de recorrido hacia adelante. El sentido
    // inverso reutiliza esta misma lista (ver comentario del modelo Track en
    // schema.prisma) — no es una lista distinta.
    readonly path: TrackCell[] = [],
    readonly theme: TrackTheme = TrackTheme.MEADOW,
    // Agarre de la superficie: 1.0 asfalto seco. Mismo eje que `Vehicle.grip`
    // en el cliente.
    readonly grip: number = 1.0,
  ) {}
}
