// Instantánea de posición/rotación grabada durante una vuelta, para
// reproducirla como fantasma (TASK-219/220/221): snapshots a ~20 Hz con
// interpolación en el cliente. Mismo formato que graba `RaceDirector` en
// Godot — esto es solo el contenedor, no redefine el criterio.
export interface GhostSnapshot {
  readonly t: number;
  readonly pos: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  readonly yaw: number;
}
