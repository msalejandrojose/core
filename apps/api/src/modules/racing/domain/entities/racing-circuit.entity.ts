import { TrackCell } from '../track-path';
import { TrackTheme } from './track.entity';

// Circuito base (TASK-336): geometría y ambientación compartidas por todas
// sus variantes jugables (`Track`) — antes duplicadas en cada una de las
// ~18 filas de un mismo circuito (2 sentidos × 3 cilindradas × 3 arquetipos).
export class RacingCircuit {
  constructor(
    readonly id: string,
    readonly slug: string,
    readonly name: string,
    // Checkpoints intermedios, sin contar la meta. `Track.sectorCount` de
    // cualquiera de sus variantes es siempre `checkpoints + 1`.
    readonly checkpoints: number,
    readonly path: TrackCell[],
    readonly theme: TrackTheme,
    readonly grip: number,
    readonly imageId: string | null,
    // Interruptor manual del admin — independiente de si le toca estar en
    // la rotación de hoy.
    readonly isActive: boolean,
    // Si está entre los destacados HOY. Lo escribe el rotador diario, no el
    // admin a mano (ver `AutoRotateCircuitsUseCase`).
    readonly isInRotation: boolean,
    // Última vez que ENTRÓ en rotación — null si nunca ha rotado todavía.
    readonly rotatedAt: Date | null,
  ) {}
}
