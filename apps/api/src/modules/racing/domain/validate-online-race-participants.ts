import {
  OnlineRaceParticipant,
  OnlineRaceParticipantRole,
} from './entities/online-race.entity';

// Lo que manda el cliente para cada corredor: el rival YA lo eligió el
// emparejamiento (TASK-284) o lo trae de un fantasma descargado antes
// (TASK-221) — aquí solo se valida y se resuelve el resultado, no se
// decide contra quién se corre.
export interface OnlineRaceParticipantCandidate {
  role: OnlineRaceParticipantRole;
  userId: string;
  durationMs: number;
}

export type OnlineRaceParticipantsValidationResult =
  | { ok: true; participants: OnlineRaceParticipant[] }
  | { ok: false; reason: string; details: Record<string, unknown> };

function reject(
  reason: string,
  details: Record<string, unknown> = {},
): OnlineRaceParticipantsValidationResult {
  return { ok: false, reason, details };
}

// Valida la lista de corredores de una carrera online y, si es válida,
// resuelve YA la posición y el delta de cada uno — se calcula una sola vez
// al registrar la carrera (criterio de done de TASK-283: reconstruir un
// podio pasado no debe recalcular nada).
export function validateOnlineRaceParticipants(
  candidates: OnlineRaceParticipantCandidate[],
  playerId: string,
): OnlineRaceParticipantsValidationResult {
  if (candidates.length < 1 || candidates.length > 3) {
    return reject('una carrera tiene entre 1 y 3 corredores', {
      count: candidates.length,
    });
  }

  const byRole = new Map<OnlineRaceParticipantRole, number>();
  for (const candidate of candidates) {
    byRole.set(candidate.role, (byRole.get(candidate.role) ?? 0) + 1);

    if (!Number.isInteger(candidate.durationMs) || candidate.durationMs < 1) {
      return reject('el tiempo de un corredor no es válido', {
        role: candidate.role,
        durationMs: candidate.durationMs,
      });
    }
  }

  if (byRole.get('PLAYER') !== 1) {
    return reject('una carrera necesita exactamente un jugador', {
      playerCount: byRole.get('PLAYER') ?? 0,
    });
  }
  if ((byRole.get('TARGET') ?? 0) > 1) {
    return reject('como mucho un objetivo por carrera');
  }
  if ((byRole.get('THREAT') ?? 0) > 1) {
    return reject('como mucho una amenaza por carrera');
  }

  const player = candidates.find((c) => c.role === 'PLAYER');
  if (player?.userId !== playerId) {
    return reject('el jugador de la carrera no coincide con quien la sube', {
      expected: playerId,
      got: player?.userId,
    });
  }

  const sorted = [...candidates].sort((a, b) => a.durationMs - b.durationMs);
  const winnerMs = sorted[0].durationMs;
  const participants = sorted.map(
    (candidate, index) =>
      new OnlineRaceParticipant(
        candidate.role,
        candidate.userId,
        candidate.durationMs,
        index + 1,
        candidate.durationMs - winnerMs,
      ),
  );

  return { ok: true, participants };
}
