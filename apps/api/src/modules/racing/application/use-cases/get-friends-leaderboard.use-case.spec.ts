import { Friend } from '../../domain/entities/friendship.entity';
import { LeaderboardEntry } from '../../domain/entities/lap-time.entity';
import { Season } from '../../domain/entities/season.entity';
import { Track } from '../../domain/entities/track.entity';
import { FriendshipRepositoryPort } from '../ports/friendship-repository.port';
import { LapTimeRepositoryPort } from '../ports/lap-time-repository.port';
import { SeasonRepositoryPort } from '../ports/season-repository.port';
import { TrackRepositoryPort } from '../ports/track-repository.port';
import { GetFriendsLeaderboardUseCase } from './get-friends-leaderboard.use-case';

const TRACK = new Track('track-1', 'kenney-01', 'Kenney', 4, 8000, true);
const FRIENDS = [
  new Friend('friend-1', 'Ana', new Date()),
  new Friend('friend-2', 'Bea', new Date()),
];

class FakeTrackRepository implements Partial<TrackRepositoryPort> {
  findBySlug(): Promise<Track | null> {
    return Promise.resolve(TRACK);
  }
}

class FakeFriendshipRepository implements Partial<FriendshipRepositoryPort> {
  listFriends(): Promise<Friend[]> {
    return Promise.resolve(FRIENDS);
  }
}

class FakeSeasonRepository implements Partial<SeasonRepositoryPort> {
  findCurrent(): Promise<Season | null> {
    return Promise.resolve(null);
  }
  findById(): Promise<Season | null> {
    return Promise.resolve(null);
  }
}

class FakeLapTimeRepository implements Partial<LapTimeRepositoryPort> {
  lastCall: { trackId: string; userIds: string[]; seasonId?: string | null } | null = null;

  leaderboardAmongUsers(
    trackId: string,
    userIds: string[],
    seasonId?: string | null,
  ): Promise<LeaderboardEntry[]> {
    this.lastCall = { trackId, userIds, seasonId };
    return Promise.resolve([
      new LeaderboardEntry(1, 'user-1', 'Yo', 30000, new Date()),
    ]);
  }
}

describe('GetFriendsLeaderboardUseCase (TASK-290)', () => {
  it('incluye al propio jugador junto a sus amigos', async () => {
    const laps = new FakeLapTimeRepository();
    const useCase = new GetFriendsLeaderboardUseCase(
      new FakeTrackRepository() as unknown as TrackRepositoryPort,
      laps as unknown as LapTimeRepositoryPort,
      new FakeSeasonRepository() as unknown as SeasonRepositoryPort,
      new FakeFriendshipRepository() as unknown as FriendshipRepositoryPort,
    );

    const result = await useCase.execute('kenney-01', 'user-1');

    expect(laps.lastCall?.userIds).toEqual(['user-1', 'friend-1', 'friend-2']);
    expect(laps.lastCall?.trackId).toBe('track-1');
    expect(result.entries).toHaveLength(1);
  });

  it('sin amigos, el grupo es solo el propio jugador', async () => {
    class NoFriends implements Partial<FriendshipRepositoryPort> {
      listFriends(): Promise<Friend[]> {
        return Promise.resolve([]);
      }
    }
    const laps = new FakeLapTimeRepository();
    const useCase = new GetFriendsLeaderboardUseCase(
      new FakeTrackRepository() as unknown as TrackRepositoryPort,
      laps as unknown as LapTimeRepositoryPort,
      new FakeSeasonRepository() as unknown as SeasonRepositoryPort,
      new NoFriends() as unknown as FriendshipRepositoryPort,
    );

    await useCase.execute('kenney-01', 'user-1');

    expect(laps.lastCall?.userIds).toEqual(['user-1']);
  });
});
