import { Track } from './entities/track.entity';

// Circuito YA resuelto (o null si el id no existe) — el use-case hace los
// `findById`, este validador solo mira reglas de negocio puras sobre la
// lista, en el mismo orden en que se van a disputar.
export interface GrandPrixStageCandidate {
  trackId: string;
  track: Track | null;
}

export type GrandPrixStagesValidationResult =
  | { ok: true }
  | { ok: false; reason: string; details: Record<string, unknown> };

const OK: GrandPrixStagesValidationResult = { ok: true };

function reject(
  reason: string,
  details: Record<string, unknown> = {},
): GrandPrixStagesValidationResult {
  return { ok: false, reason, details };
}

// Al menos dos circuitos: con uno solo no hay nada que agregar y no es un
// Grand Prix, es el leaderboard normal de ese circuito.
const MIN_STAGES = 2;

export function validateGrandPrixStages(
  candidates: GrandPrixStageCandidate[],
): GrandPrixStagesValidationResult {
  if (candidates.length < MIN_STAGES) {
    return reject('un Grand Prix necesita al menos dos circuitos', {
      count: candidates.length,
    });
  }

  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (candidate.track === null) {
      return reject('uno de los circuitos no existe', {
        trackId: candidate.trackId,
      });
    }
    if (!candidate.track.isActive) {
      return reject('uno de los circuitos no está activo', {
        trackId: candidate.trackId,
      });
    }
    if (seen.has(candidate.trackId)) {
      return reject('un circuito no puede repetirse en el mismo Grand Prix', {
        trackId: candidate.trackId,
      });
    }
    seen.add(candidate.trackId);
  }

  return OK;
}
