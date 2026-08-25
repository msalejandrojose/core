import {
  OnlineRaceParticipantCandidate,
  validateOnlineRaceParticipants,
} from './validate-online-race-participants';

const PLAYER_ID = 'player-1';
const TARGET_ID = 'target-1';
const THREAT_ID = 'threat-1';

function full(
  overrides: Partial<{
    player: number;
    target: number;
    threat: number;
  }> = {},
): OnlineRaceParticipantCandidate[] {
  const durations = {
    player: 42000,
    target: 41500,
    threat: 42500,
    ...overrides,
  };
  return [
    { role: 'PLAYER', userId: PLAYER_ID, durationMs: durations.player },
    { role: 'TARGET', userId: TARGET_ID, durationMs: durations.target },
    { role: 'THREAT', userId: THREAT_ID, durationMs: durations.threat },
  ];
}

describe('validateOnlineRaceParticipants', () => {
  it('acepta los 3 corredores y resuelve el podio', () => {
    const result = validateOnlineRaceParticipants(full(), PLAYER_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.participants.map((p) => p.role)).toEqual([
      'TARGET',
      'PLAYER',
      'THREAT',
    ]);
    expect(result.participants.map((p) => p.position)).toEqual([1, 2, 3]);
    expect(result.participants.map((p) => p.deltaMs)).toEqual([0, 500, 1000]);
  });

  it('acepta solo al jugador (sin objetivo ni amenaza)', () => {
    const result = validateOnlineRaceParticipants(
      [{ role: 'PLAYER', userId: PLAYER_ID, durationMs: 42000 }],
      PLAYER_ID,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.participants).toHaveLength(1);
    expect(result.participants[0].position).toBe(1);
    expect(result.participants[0].deltaMs).toBe(0);
  });

  it('acepta al objetivo siendo el propio jugador (fallback del propio récord)', () => {
    const result = validateOnlineRaceParticipants(
      [
        { role: 'PLAYER', userId: PLAYER_ID, durationMs: 42000 },
        { role: 'TARGET', userId: PLAYER_ID, durationMs: 43000 },
      ],
      PLAYER_ID,
    );
    expect(result.ok).toBe(true);
  });

  it('rechaza sin corredores', () => {
    expect(validateOnlineRaceParticipants([], PLAYER_ID).ok).toBe(false);
  });

  it('rechaza más de 3 corredores', () => {
    const result = validateOnlineRaceParticipants(
      [...full(), { role: 'TARGET', userId: 'x', durationMs: 40000 }],
      PLAYER_ID,
    );
    expect(result.ok).toBe(false);
  });

  it('rechaza sin ningún PLAYER', () => {
    const result = validateOnlineRaceParticipants(
      [{ role: 'TARGET', userId: TARGET_ID, durationMs: 42000 }],
      PLAYER_ID,
    );
    expect(result.ok).toBe(false);
  });

  it('rechaza dos PLAYER', () => {
    const result = validateOnlineRaceParticipants(
      [
        { role: 'PLAYER', userId: PLAYER_ID, durationMs: 42000 },
        { role: 'PLAYER', userId: 'other', durationMs: 41000 },
      ],
      PLAYER_ID,
    );
    expect(result.ok).toBe(false);
  });

  it('rechaza dos TARGET', () => {
    const result = validateOnlineRaceParticipants(
      [
        { role: 'PLAYER', userId: PLAYER_ID, durationMs: 42000 },
        { role: 'TARGET', userId: 'a', durationMs: 41000 },
        { role: 'TARGET', userId: 'b', durationMs: 41500 },
      ],
      PLAYER_ID,
    );
    expect(result.ok).toBe(false);
  });

  it('rechaza si el PLAYER no coincide con quien sube la carrera', () => {
    const result = validateOnlineRaceParticipants(full(), 'otro-jugador');
    expect(result.ok).toBe(false);
  });

  it.each([0, -1, 1.5, Number.NaN])(
    'rechaza durationMs = %p en cualquier corredor',
    (value) => {
      const result = validateOnlineRaceParticipants(
        [{ role: 'PLAYER', userId: PLAYER_ID, durationMs: value }],
        PLAYER_ID,
      );
      expect(result.ok).toBe(false);
    },
  );
});
