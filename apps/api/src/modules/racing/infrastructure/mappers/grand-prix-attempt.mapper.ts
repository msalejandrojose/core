import {
  GrandPrixAttempt,
  GrandPrixAttemptStatus,
  GrandPrixStageResult,
} from '../../domain/entities/grand-prix-attempt.entity';

// Fila esperada: `RacingGrandPrixAttempt` con `results` incluidos
// (`orderBy: { completedAt: 'asc' }`).
export interface GrandPrixAttemptRowWithResults {
  id: string;
  userId: string;
  grandPrixId: string;
  status: string;
  totalDurationMs: number | null;
  startedAt: Date;
  completedAt: Date | null;
  results: { trackId: string; durationMs: number; completedAt: Date }[];
}

export function toGrandPrixAttemptDomain(
  row: GrandPrixAttemptRowWithResults,
): GrandPrixAttempt {
  return new GrandPrixAttempt(
    row.id,
    row.userId,
    row.grandPrixId,
    row.status as GrandPrixAttemptStatus,
    row.totalDurationMs,
    row.startedAt,
    row.completedAt,
    row.results.map(
      (r) => new GrandPrixStageResult(r.trackId, r.durationMs, r.completedAt),
    ),
  );
}
