import { GhostSnapshot } from './entities/ghost-snapshot';
import {
  OnlineRaceRivalCandidate,
  resolveOnlineRaceRivals,
} from './resolve-online-race-rivals';

const SNAPSHOTS: GhostSnapshot[] = [
  { t: 0, pos: { x: 0, y: 0, z: 0 }, yaw: 0 },
];

function candidate(
  userId: string,
  durationMs: number,
): OnlineRaceRivalCandidate {
  return { userId, durationMs, snapshots: SNAPSHOTS };
}

describe('resolveOnlineRaceRivals', () => {
  it('usa los dos vecinos cuando ambos existen', () => {
    const result = resolveOnlineRaceRivals({
      player: { userId: 'me', durationMs: 42000, snapshots: SNAPSHOTS },
      targetCandidate: candidate('faster', 41000),
      threatCandidate: candidate('slower', 43000),
    });

    expect(result.target).toEqual(candidate('faster', 41000));
    expect(result.threat).toEqual(candidate('slower', 43000));
  });

  it('sin nadie mejor, el objetivo es el propio fantasma', () => {
    const result = resolveOnlineRaceRivals({
      player: { userId: 'me', durationMs: 42000, snapshots: SNAPSHOTS },
      targetCandidate: null,
      threatCandidate: candidate('slower', 43000),
    });

    expect(result.target).toEqual(candidate('me', 42000));
  });

  it('sin nadie mejor y sin fantasma propio, no hay objetivo', () => {
    const result = resolveOnlineRaceRivals({
      player: { userId: 'me', durationMs: 42000, snapshots: null },
      targetCandidate: null,
      threatCandidate: null,
    });

    expect(result.target).toBeNull();
  });

  it('sin nadie peor, no hay amenaza (sin repuesto)', () => {
    const result = resolveOnlineRaceRivals({
      player: { userId: 'me', durationMs: 42000, snapshots: SNAPSHOTS },
      targetCandidate: candidate('faster', 41000),
      threatCandidate: null,
    });

    expect(result.threat).toBeNull();
  });
});
