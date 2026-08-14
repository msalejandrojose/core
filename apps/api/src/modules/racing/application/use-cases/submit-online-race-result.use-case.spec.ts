import { OnlineRace } from '../../domain/entities/online-race.entity';
import { Track } from '../../domain/entities/track.entity';
import {
  CreateOnlineRaceData,
  OnlineRaceRepositoryPort,
} from '../ports/online-race-repository.port';
import { TrackRepositoryPort } from '../ports/track-repository.port';
import { SubmitOnlineRaceResultUseCase } from './submit-online-race-result.use-case';

const TRACK = new Track('track-1', 'kenney-01', 'Kenney', 4, 8000, true);
const PLAYER_ID = 'player-1';

class FakeTrackRepository implements Partial<TrackRepositoryPort> {
  constructor(private readonly track: Track | null) {}
  findBySlug(): Promise<Track | null> {
    return Promise.resolve(this.track);
  }
}

class FakeOnlineRaceRepository implements Partial<OnlineRaceRepositoryPort> {
  lastCreate: CreateOnlineRaceData | null = null;

  create(data: CreateOnlineRaceData): Promise<OnlineRace> {
    this.lastCreate = data;
    return Promise.resolve(
      new OnlineRace(
        'race-1',
        data.userId,
        data.trackId,
        new Date(),
        data.participants.map((p) => ({ ...p })),
      ),
    );
  }
}

function useCase(track: Track | null, races = new FakeOnlineRaceRepository()) {
  return {
    uc: new SubmitOnlineRaceResultUseCase(
      new FakeTrackRepository(track) as unknown as TrackRepositoryPort,
      races as unknown as OnlineRaceRepositoryPort,
    ),
    races,
  };
}

describe('SubmitOnlineRaceResultUseCase', () => {
  it('rechaza un circuito que no existe', async () => {
    const { uc } = useCase(null);
    await expect(
      uc.execute({
        userId: PLAYER_ID,
        trackSlug: 'no-existe',
        participants: [
          { role: 'PLAYER', userId: PLAYER_ID, durationMs: 42000 },
        ],
      }),
    ).rejects.toMatchObject({ code: 'RACING_TRACK_NOT_FOUND' });
  });

  it('rechaza una lista de corredores inválida', async () => {
    const { uc } = useCase(TRACK);
    await expect(
      uc.execute({
        userId: PLAYER_ID,
        trackSlug: 'kenney-01',
        participants: [],
      }),
    ).rejects.toMatchObject({
      code: 'RACING_INVALID_ONLINE_RACE_PARTICIPANTS',
    });
  });

  it('registra la carrera resolviendo el trackId por slug y el podio', async () => {
    const { uc, races } = useCase(TRACK);
    const result = await uc.execute({
      userId: PLAYER_ID,
      trackSlug: 'kenney-01',
      participants: [
        { role: 'PLAYER', userId: PLAYER_ID, durationMs: 42000 },
        { role: 'TARGET', userId: 'target-1', durationMs: 41000 },
      ],
    });

    expect(races.lastCreate?.trackId).toBe('track-1');
    expect(result.participants.map((p) => p.role)).toEqual([
      'TARGET',
      'PLAYER',
    ]);
    expect(result.participants.map((p) => p.position)).toEqual([1, 2]);
  });
});
