import { LapTime as PrismaLapTime } from '../../../../generated/prisma/client';
import { LapTime } from '../../domain/entities/lap-time.entity';

// `splitsMs` viaja como JSON, así que al leerlo vuelve como `unknown`. Se
// normaliza aquí y no en el dominio: el dominio trabaja con `number[]` y no
// tiene por qué saber cómo se guardó.
export function toSplits(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is number => typeof item === 'number');
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
  );
}
