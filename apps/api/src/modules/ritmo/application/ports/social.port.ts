import type { ChallengeKind, SessionFact } from '../../domain/services/social';

export const RITMO_SOCIAL_REPOSITORY = Symbol('RITMO_SOCIAL_REPOSITORY');

export interface SocialUser {
  userId: string;
  handle: string;
  firstName: string | null;
  lastName: string | null;
  shareActivity: boolean;
}

export interface ChallengeRow {
  id: string;
  ownerId: string;
  kind: ChallengeKind;
  startDay: string;
  endDay: string;
  memberIds: string[];
}

export interface RitmoSocialRepositoryPort {
  /** Datos de identidad del usuario para crear su perfil social. */
  identity(userId: string): Promise<{
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null>;
  findProfile(userId: string): Promise<SocialUser | null>;
  handleTaken(handle: string, exceptUserId?: string): Promise<boolean>;
  createProfile(userId: string, handle: string): Promise<SocialUser>;
  updateProfile(
    userId: string,
    data: { handle?: string; shareActivity?: boolean },
  ): Promise<SocialUser>;
  usersByIds(ids: string[]): Promise<SocialUser[]>;
  /** Personas con perfil social cuyo nombre o usuario contiene `q`. */
  search(q: string, exceptUserId: string, limit: number): Promise<SocialUser[]>;

  followingIds(userId: string): Promise<string[]>;
  followerIds(userId: string): Promise<string[]>;
  follow(followerId: string, followeeId: string): Promise<void>;
  unfollow(followerId: string, followeeId: string): Promise<void>;

  sessionsSince(userIds: string[], from: string): Promise<SessionFact[]>;
  /** Distancia más larga de cada usuario y tipo antes de `before`: clave `userId|kind`. */
  bestDistances(
    userIds: string[],
    before: string,
  ): Promise<Map<string, number>>;
  /** Días con entreno de un usuario desde `from`. */
  activeDays(userId: string, from: string): Promise<string[]>;
  activeGoal(
    userId: string,
  ): Promise<{ name: string; raceDate: string | null } | null>;

  cheerCounts(keys: string[]): Promise<Map<string, number>>;
  cheeredBy(userId: string, keys: string[]): Promise<Set<string>>;
  setCheer(userId: string, key: string, on: boolean): Promise<void>;

  challengesOf(userId: string, endingFrom: string): Promise<ChallengeRow[]>;
  findChallenge(id: string): Promise<ChallengeRow | null>;
  createChallenge(data: Omit<ChallengeRow, 'id'>): Promise<ChallengeRow>;
  leaveChallenge(id: string, userId: string): Promise<void>;
  deleteChallenge(id: string): Promise<void>;
  /** Valor de cada participante en un reto, por tipo, entre dos días. */
  challengeValues(
    kind: ChallengeKind,
    userIds: string[],
    from: string,
    to: string,
  ): Promise<Map<string, number>>;
}
