import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { dayInTimezone, shiftDay } from '../../domain/services/calendar';
import { mondayOf } from '../../domain/services/plan';
import {
  CHALLENGE_KINDS,
  HANDLE_PATTERN,
  canSeeActivity,
  challengeEnd,
  daysLeft,
  displayName,
  eventFrom,
  handleBase,
  rank,
  relationOf,
  streakDays,
  type ChallengeKind,
  type FeedEvent,
  type Relation,
  type SessionFact,
} from '../../domain/services/social';
import {
  RITMO_PROFILE_REPOSITORY,
  type RitmoProfileRepositoryPort,
} from '../ports/ritmo-profile-repository.port';
import {
  RITMO_SOCIAL_REPOSITORY,
  type ChallengeRow,
  type RitmoSocialRepositoryPort,
  type SocialUser,
} from '../ports/social.port';

const FEED_DAYS = 7;
const FEED_LIMIT = 40;
const SEARCH_LIMIT = 20;
const MAX_CHALLENGE_MEMBERS = 12;
const CHEER_KEY = /^[sc]:[0-9a-f-]{36}$/;

export interface PersonView {
  id: string;
  name: string;
  handle: string;
  relation: Relation;
  /** Resumen de la semana; solo de amigos que comparten. */
  sessionsThisWeek: number | null;
  kmThisWeek: number | null;
}

export interface MeView {
  id: string;
  name: string;
  handle: string;
  shareActivity: boolean;
}

export interface FeedItem extends FeedEvent {
  name: string;
  handle: string;
  cheers: number;
  cheered: boolean;
}

export interface PeopleView {
  friends: PersonView[];
  /** Les sigues, pero aún no te siguen: no ves su actividad. */
  pending: PersonView[];
  /** Te siguen y tú no: si les sigues, pasáis a ser amigos. */
  followers: PersonView[];
}

export interface PersonProfile extends PersonView {
  /** false si no sois amigos o esa persona no comparte su actividad. */
  visible: boolean;
  streakDays: number | null;
  goal: {
    name: string;
    raceDate: string | null;
    daysToRace: number | null;
  } | null;
  events: FeedItem[];
}

export interface ChallengeView {
  id: string;
  kind: ChallengeKind;
  startDay: string;
  endDay: string;
  daysLeft: number;
  finished: boolean;
  mine: boolean;
  ranking: {
    userId: string;
    name: string;
    me: boolean;
    value: number;
    position: number;
  }[];
  cheers: number;
  cheered: boolean;
}

/**
 * Lo que comparten todos los casos de uso de Social: el perfil del usuario
 * (se crea la primera vez que entra), sus relaciones y la fecha de hoy.
 */
@Injectable()
export class SocialContext {
  constructor(
    @Inject(RITMO_SOCIAL_REPOSITORY)
    readonly repo: RitmoSocialRepositoryPort,
    @Inject(RITMO_PROFILE_REPOSITORY)
    private readonly profiles: RitmoProfileRepositoryPort,
  ) {}

  async me(userId: string): Promise<SocialUser> {
    const existing = await this.repo.findProfile(userId);
    if (existing) return existing;
    const identity = await this.repo.identity(userId);
    if (!identity) throw new NotFoundException('RITMO_USER_NOT_FOUND');
    const base = handleBase(
      identity.firstName,
      identity.lastName,
      identity.email,
    );
    let handle = base;
    // Si el nombre de usuario está cogido, se le añade un número.
    for (let n = 2; await this.repo.handleTaken(handle); n += 1)
      handle = `${base}${n}`;
    return this.repo.createProfile(userId, handle);
  }

  async today(userId: string): Promise<string> {
    const profile = await this.profiles.findByUserId(userId);
    return dayInTimezone(new Date(), profile?.timezone ?? 'Europe/Madrid');
  }

  async relations(
    userId: string,
  ): Promise<{ following: Set<string>; followers: Set<string> }> {
    const [following, followers] = await Promise.all([
      this.repo.followingIds(userId),
      this.repo.followerIds(userId),
    ]);
    return { following: new Set(following), followers: new Set(followers) };
  }

  /** Amigos (seguimiento mutuo) que además comparten su actividad. */
  async sharingFriends(userId: string): Promise<SocialUser[]> {
    const { following, followers } = await this.relations(userId);
    const mutual = [...following].filter((id) => followers.has(id));
    return (await this.repo.usersByIds(mutual)).filter((u) => u.shareActivity);
  }

  /** Logros de unas personas desde `from`, con sus ánimos. */
  async events(
    viewerId: string,
    users: SocialUser[],
    from: string,
  ): Promise<FeedItem[]> {
    const byId = new Map(users.map((u) => [u.userId, u]));
    const ids = [...byId.keys()];
    const [sessions, best] = await Promise.all([
      this.repo.sessionsSince(ids, from),
      this.repo.bestDistances(ids, from),
    ]);
    // De la más antigua a la más reciente, para que cada récord suba el listón del siguiente.
    const chronological = [...sessions].sort(
      (a, b) => a.startedAt.getTime() - b.startedAt.getTime(),
    );
    const events = chronological.map((s: SessionFact) => {
      const key = `${s.userId}|${s.kind}`;
      const previous = best.get(key) ?? null;
      if (s.distanceM) best.set(key, Math.max(previous ?? 0, s.distanceM));
      return eventFrom(s, previous);
    });
    const recent = events.reverse().slice(0, FEED_LIMIT);
    const keys = recent.map((e) => e.key);
    const [counts, mine] = await Promise.all([
      this.repo.cheerCounts(keys),
      this.repo.cheeredBy(viewerId, keys),
    ]);
    return recent.map((e) => {
      const u = byId.get(e.userId)!;
      return {
        ...e,
        name: displayName(u.firstName, u.lastName, u.handle),
        handle: u.handle,
        cheers: counts.get(e.key) ?? 0,
        cheered: mine.has(e.key),
      };
    });
  }

  /** Personas con su relación conmigo y, si son amigos que comparten, su semana. */
  async people(userId: string, users: SocialUser[]): Promise<PersonView[]> {
    const [{ following, followers }, today] = await Promise.all([
      this.relations(userId),
      this.today(userId),
    ]);
    const visible = users.filter((u) =>
      canSeeActivity(
        relationOf(
          u.userId === userId,
          following.has(u.userId),
          followers.has(u.userId),
        ),
        u.shareActivity,
      ),
    );
    const sessions = await this.repo.sessionsSince(
      visible.map((u) => u.userId),
      mondayOf(today),
    );
    return users.map((u) => {
      const relation = relationOf(
        u.userId === userId,
        following.has(u.userId),
        followers.has(u.userId),
      );
      const own = visible.includes(u)
        ? sessions.filter((s) => s.userId === u.userId)
        : null;
      return {
        id: u.userId,
        name: displayName(u.firstName, u.lastName, u.handle),
        handle: u.handle,
        relation,
        sessionsThisWeek: own ? own.length : null,
        kmThisWeek: own
          ? Math.round(
              own.reduce((sum, s) => sum + (s.distanceM ?? 0), 0) / 100,
            ) / 10
          : null,
      };
    });
  }
}

@Injectable()
export class SocialProfileUseCase {
  constructor(private readonly ctx: SocialContext) {}

  async get(userId: string): Promise<MeView> {
    const me = await this.ctx.me(userId);
    return {
      id: me.userId,
      name: displayName(me.firstName, me.lastName, me.handle),
      handle: me.handle,
      shareActivity: me.shareActivity,
    };
  }

  async update(
    userId: string,
    data: { handle?: string; shareActivity?: boolean },
  ): Promise<MeView> {
    await this.ctx.me(userId);
    const handle = data.handle?.trim().toLowerCase().replace(/^@/, '');
    if (handle !== undefined) {
      if (!HANDLE_PATTERN.test(handle))
        throw new BadRequestException('RITMO_SOCIAL_HANDLE_INVALID');
      if (await this.ctx.repo.handleTaken(handle, userId))
        throw new ConflictException('RITMO_SOCIAL_HANDLE_TAKEN');
    }
    await this.ctx.repo.updateProfile(userId, {
      ...(handle !== undefined ? { handle } : {}),
      ...(data.shareActivity !== undefined
        ? { shareActivity: data.shareActivity }
        : {}),
    });
    return this.get(userId);
  }
}

@Injectable()
export class SocialPeopleUseCase {
  constructor(private readonly ctx: SocialContext) {}

  async search(userId: string, q: string): Promise<PersonView[]> {
    await this.ctx.me(userId);
    const query = q.trim().replace(/^@/, '');
    if (query.length < 2) return [];
    return this.ctx.people(
      userId,
      await this.ctx.repo.search(query, userId, SEARCH_LIMIT),
    );
  }

  async list(userId: string): Promise<PeopleView> {
    await this.ctx.me(userId);
    const { following, followers } = await this.ctx.relations(userId);
    const ids = [...new Set([...following, ...followers])];
    const people = await this.ctx.people(
      userId,
      await this.ctx.repo.usersByIds(ids),
    );
    const byName = (a: PersonView, b: PersonView) =>
      a.name.localeCompare(b.name, 'es');
    return {
      friends: people.filter((p) => p.relation === 'FRIENDS').sort(byName),
      pending: people.filter((p) => p.relation === 'FOLLOWING').sort(byName),
      followers: people.filter((p) => p.relation === 'FOLLOWS_ME').sort(byName),
    };
  }

  async setFollow(
    userId: string,
    targetId: string,
    on: boolean,
  ): Promise<PersonView> {
    await this.ctx.me(userId);
    if (targetId === userId)
      throw new BadRequestException('RITMO_SOCIAL_CANNOT_FOLLOW_SELF');
    const [target] = await this.ctx.repo.usersByIds([targetId]);
    if (!target) throw new NotFoundException('RITMO_SOCIAL_PERSON_NOT_FOUND');
    if (on) await this.ctx.repo.follow(userId, targetId);
    else await this.ctx.repo.unfollow(userId, targetId);
    return (await this.ctx.people(userId, [target]))[0];
  }

  async profile(userId: string, targetId: string): Promise<PersonProfile> {
    await this.ctx.me(userId);
    const [target] = await this.ctx.repo.usersByIds([targetId]);
    if (!target) throw new NotFoundException('RITMO_SOCIAL_PERSON_NOT_FOUND');
    const [person] = await this.ctx.people(userId, [target]);
    const visible = canSeeActivity(person.relation, target.shareActivity);
    if (!visible)
      return { ...person, visible, streakDays: null, goal: null, events: [] };

    const today = await this.ctx.today(userId);
    const [days, goal, events] = await Promise.all([
      this.ctx.repo.activeDays(targetId, shiftDay(today, -120)),
      this.ctx.repo.activeGoal(targetId),
      this.ctx.events(userId, [target], shiftDay(today, -14)),
    ]);
    return {
      ...person,
      visible,
      streakDays: streakDays(days, today),
      goal: goal && {
        ...goal,
        daysToRace: goal.raceDate
          ? Math.round(
              (Date.parse(`${goal.raceDate}T00:00:00Z`) -
                Date.parse(`${today}T00:00:00Z`)) /
                86_400_000,
            )
          : null,
      },
      events: events.slice(0, 6),
    };
  }
}

@Injectable()
export class SocialFeedUseCase {
  constructor(private readonly ctx: SocialContext) {}

  async feed(userId: string): Promise<FeedItem[]> {
    await this.ctx.me(userId);
    const [friends, today] = await Promise.all([
      this.ctx.sharingFriends(userId),
      this.ctx.today(userId),
    ]);
    return this.ctx.events(userId, friends, shiftDay(today, -FEED_DAYS));
  }

  async setCheer(userId: string, key: string, on: boolean): Promise<void> {
    if (!CHEER_KEY.test(key))
      throw new BadRequestException('RITMO_SOCIAL_CHEER_INVALID');
    await this.ctx.repo.setCheer(userId, key, on);
  }
}

@Injectable()
export class SocialChallengesUseCase {
  constructor(private readonly ctx: SocialContext) {}

  private async view(
    userId: string,
    today: string,
    c: ChallengeRow,
  ): Promise<ChallengeView> {
    // Un reto en curso cuenta hasta hoy; uno terminado, hasta su último día.
    const until = c.endDay < today ? c.endDay : today;
    const key = `c:${c.id}`;
    const [values, users, counts, mine] = await Promise.all([
      this.ctx.repo.challengeValues(c.kind, c.memberIds, c.startDay, until),
      this.ctx.repo.usersByIds(c.memberIds),
      this.ctx.repo.cheerCounts([key]),
      this.ctx.repo.cheeredBy(userId, [key]),
    ]);
    const nameOf = new Map(
      users.map((u) => [
        u.userId,
        displayName(u.firstName, u.lastName, u.handle),
      ]),
    );
    return {
      id: c.id,
      kind: c.kind,
      startDay: c.startDay,
      endDay: c.endDay,
      daysLeft: daysLeft(c.endDay, today),
      finished: c.endDay < today,
      mine: c.ownerId === userId,
      ranking: rank(
        c.memberIds.map((id) => ({ userId: id, value: values.get(id) ?? 0 })),
      ).map((r) => ({
        ...r,
        name: nameOf.get(r.userId) ?? '—',
        me: r.userId === userId,
      })),
      cheers: counts.get(key) ?? 0,
      cheered: mine.has(key),
    };
  }

  /** Retos en los que participo: los activos y los terminados en las dos últimas semanas. */
  async list(userId: string): Promise<ChallengeView[]> {
    await this.ctx.me(userId);
    const today = await this.ctx.today(userId);
    const rows = await this.ctx.repo.challengesOf(userId, shiftDay(today, -14));
    const views = await Promise.all(
      rows.map((c) => this.view(userId, today, c)),
    );
    return views.sort(
      (a, b) =>
        Number(a.finished) - Number(b.finished) ||
        a.endDay.localeCompare(b.endDay),
    );
  }

  /** Crea un reto que empieza hoy, conmigo y con los amigos elegidos. */
  async create(
    userId: string,
    input: { kind: ChallengeKind; weeks: number; friendIds: string[] },
  ): Promise<ChallengeView> {
    await this.ctx.me(userId);
    if (!CHALLENGE_KINDS.includes(input.kind))
      throw new BadRequestException('RITMO_CHALLENGE_KIND_INVALID');
    const { following, followers } = await this.ctx.relations(userId);
    const friendIds = [...new Set(input.friendIds)].filter(
      (id) => id !== userId,
    );
    // Solo se puede retar a amigos: nadie entra en un reto con un desconocido.
    if (
      !friendIds.length ||
      friendIds.some((id) => !following.has(id) || !followers.has(id))
    )
      throw new ForbiddenException('RITMO_CHALLENGE_FRIENDS_ONLY');
    if (friendIds.length + 1 > MAX_CHALLENGE_MEMBERS)
      throw new BadRequestException('RITMO_CHALLENGE_TOO_MANY');
    const today = await this.ctx.today(userId);
    const row = await this.ctx.repo.createChallenge({
      ownerId: userId,
      kind: input.kind,
      startDay: today,
      endDay: challengeEnd(today, input.weeks),
      memberIds: [userId, ...friendIds],
    });
    return this.view(userId, today, row);
  }

  /** Salir de un reto; si lo creé yo, se borra para todos. */
  async leave(userId: string, id: string): Promise<void> {
    const c = await this.ctx.repo.findChallenge(id);
    if (!c || !c.memberIds.includes(userId))
      throw new NotFoundException('RITMO_CHALLENGE_NOT_FOUND');
    if (c.ownerId === userId) await this.ctx.repo.deleteChallenge(id);
    else await this.ctx.repo.leaveChallenge(id, userId);
  }
}
