import { LapTime as PrismaLapTime } from '../../../../generated/prisma/client';
import { GhostSnapshot } from '../../domain/entities/ghost-snapshot';
import { LapTime } from '../../domain/entities/lap-time.entity';

// `splitsMs` viaja como JSON, así que al leerlo vuelve como `unknown`. Se
// normaliza aquí y no en el dominio: el dominio trabaja con `number[]` y no
// tiene por qué saber cómo se guardó.
export function toSplits(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is number => typeof item === 'number');
}

// Mismo motivo que `toSplits`: `ghostSnapshots` viaja como JSON. Sin
// validación fina fila a fila — si algo no encaja con la forma esperada, se
// descarta la instantánea entera antes que reproducir un fantasma a
// tirones con huecos.
function isGhostSnapshot(value: unknown): value is GhostSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.t !== 'number' || typeof candidate.yaw !== 'number') {
    return false;
  }
  const pos = candidate.pos as Record<string, unknown> | undefined;
  return (
    typeof pos === 'object' &&
    pos !== null &&
    typeof pos.x === 'number' &&
    typeof pos.y === 'number' &&
    typeof pos.z === 'number'
  );
}

export function toGhostSnapshots(value: unknown): GhostSnapshot[] | null {
  if (!Array.isArray(value)) return null;
  const snapshots = value.filter(isGhostSnapshot);
  return snapshots.length > 0 ? snapshots : null;
}

export function toLapTimeDomain(row: PrismaLapTime): LapTime {
  return new LapTime(
    row.id,
    row.userId,
    row.trackId,
    row.durationMs,
    toSplits(row.splitsMs),
    row.clientVersion,
    row.createdAt,
    row.invalidatedAt,
    toGhostSnapshots(row.ghostSnapshots),
  );
}
