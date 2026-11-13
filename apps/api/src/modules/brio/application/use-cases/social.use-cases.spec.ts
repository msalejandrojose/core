/* eslint-disable @typescript-eslint/require-await -- dobles de prueba: métodos async sin await */
import type { ChallengeKind, SessionFact } from '../../domain/services/social';
import type {
  ChallengeRow,
  BrioSocialRepositoryPort,
  SocialUser,
} from '../ports/social.port';
import {
  SocialChallengesUseCase,
  SocialContext,
  SocialFeedUseCase,
  SocialPeopleUseCase,
  SocialProfileUseCase,
} from './social.use-cases';

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const C = '00000000-0000-4000-8000-00000000000c';
const TODAY = new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const dayOf = (d: Date) => d.toISOString().slice(0, 10);

function setup() {
  const identities: Record<
    string,
    { firstName: string | null; lastName: string | null; email: string }
  > = {
    [A]: { firstName: 'Ana', lastName: 'Ruiz', email: 'ana@x.es' },
    [B]: { firstName: 'Blas', lastName: null, email: 'blas@x.es' },
    [C]: { firstName: 'Ana', lastName: 'Ruiz', email: 'otra@x.es' },
  };
  const profiles = new Map<string, SocialUser>();
  const follows = new Set<string>();
  const cheers = new Set<string>();
  const sessions: SessionFact[] = [];
  const challenges: ChallengeRow[] = [];

  const repo: BrioSocialRepositoryPort = {
    identity: async (id) => identities[id] ?? null,
    findProfile: async (id) => profiles.get(id) ?? null,
    handleTaken: async (handle, except) =>
      [...profiles.values()].some(
        (p) => p.handle === handle && p.userId !== except,
      ),
    createProfile: async (userId, handle) => {
      const p = {
        userId,
        handle,
        firstName: identities[userId].firstName,
        lastName: identities[userId].lastName,
        shareActivity: true,
      };
      profiles.set(userId, p);
      return p;
    },
    updateProfile: async (userId, data) => {
      const p = { ...profiles.get(userId)!, ...data };
      profiles.set(userId, p);
      return p;
    },
    usersByIds: async (ids) =>
      ids.map((id) => profiles.get(id)).filter((p): p is SocialUser => !!p),
    search: async (q, except) =>
      [...profiles.values()].filter(
        (p) =>
          p.userId !== except &&
          (p.handle.includes(q.toLowerCase()) ||
            (p.firstName ?? '').includes(q)),
      ),
    followingIds: async (id) =>
      [...follows]
        .filter((f) => f.startsWith(`${id}>`))
        .map((f) => f.split('>')[1]),
    followerIds: async (id) =>
      [...follows]
        .filter((f) => f.endsWith(`>${id}`))
        .map((f) => f.split('>')[0]),
    follow: async (a, b) => {
      follows.add(`${a}>${b}`);
    },
    unfollow: async (a, b) => {
      follows.delete(`${a}>${b}`);
    },
    sessionsSince: async (ids, from) =>
      sessions.filter((s) => ids.includes(s.userId) && s.day >= from),
    bestDistances: async (ids, before) => {
      const out = new Map<string, number>();
      for (const s of sessions)
        if (ids.includes(s.userId) && s.day < before && s.distanceM)
          out.set(
            `${s.userId}|${s.kind}`,
            Math.max(out.get(`${s.userId}|${s.kind}`) ?? 0, s.distanceM),
          );
      return out;
    },
    activeDays: async (id, from) => [
      ...new Set(
        sessions
          .filter((s) => s.userId === id && s.day >= from)
          .map((s) => s.day),
      ),
    ],
    activeGoal: async (id) =>
      id === B ? { name: 'Media maratón', raceDate: null } : null,
    cheerCounts: async (keys) =>
      new Map(
        keys.map((k) => [
          k,
          [...cheers].filter((c) => c.endsWith(`|${k}`)).length,
        ]),
      ),
    cheeredBy: async (id, keys) =>
      new Set(keys.filter((k) => cheers.has(`${id}|${k}`))),
    setCheer: async (id, key, on) => {
      if (on) cheers.add(`${id}|${key}`);
      else cheers.delete(`${id}|${key}`);
    },
    challengesOf: async (id) =>
      challenges.filter((c) => c.memberIds.includes(id)),
    findChallenge: async (id) => challenges.find((c) => c.id === id) ?? null,
    createChallenge: async (data) => {
      const row = {
        ...data,
        id: `00000000-0000-4000-8000-0000000000c${challenges.length}`,
      };
      challenges.push(row);
      return row;
    },
    leaveChallenge: async (id, userId) => {
      const c = challenges.find((x) => x.id === id);
      if (c) c.memberIds = c.memberIds.filter((m) => m !== userId);
    },
    deleteChallenge: async (id) => {
      challenges.splice(
        challenges.findIndex((c) => c.id === id),
        1,
      );
    },
    challengeValues: async (kind: ChallengeKind, ids, from, to) =>
      new Map(
        ids.map((id) => [
          id,
          kind === 'SESSIONS'
            ? sessions.filter(
                (s) => s.userId === id && s.day >= from && s.day <= to,
              ).length
            : 0,
        ]),
      ),
  };
  const ctx = new SocialContext(repo, {
    findByUserId: async () => ({ timezone: 'UTC' }),
  } as never);
  const addSession = (
    userId: string,
    ago: number,
    distanceM: number | null = 10_000,
  ) => {
    const startedAt = daysAgo(ago);
    sessions.push({
      id: `00000000-0000-4000-8000-${String(sessions.length).padStart(12, '0')}`,
      userId,
      startedAt,
      day: dayOf(startedAt),
      typeName: 'Correr',
      kind: 'RUN',
      durationSec: 3000,
      distanceM,
    });
  };
  return {
    profile: new SocialProfileUseCase(ctx),
    people: new SocialPeopleUseCase(ctx),
    feed: new SocialFeedUseCase(ctx),
    challenges: new SocialChallengesUseCase(ctx),
    addSession,
    challengesStore: challenges,
  };
}

async function befriend(s: ReturnType<typeof setup>, a: string, b: string) {
  await s.profile.get(a);
  await s.profile.get(b);
  await s.people.setFollow(a, b, true);
  await s.people.setFollow(b, a, true);
}

describe('perfil social', () => {
  it('se crea solo, con un usuario único', async () => {
    const s = setup();
    expect(await s.profile.get(A)).toMatchObject({
      name: 'Ana Ruiz',
      handle: 'anaruiz',
      shareActivity: true,
    });
    // Otra persona con el mismo nombre recibe un usuario distinto.
    expect((await s.profile.get(C)).handle).toBe('anaruiz2');
  });

  it('valida el usuario al cambiarlo', async () => {
    const s = setup();
    await s.profile.get(A);
    await s.profile.get(B);
    expect((await s.profile.update(A, { handle: '@Ana.R' })).handle).toBe(
      'ana.r',
    );
    await expect(s.profile.update(A, { handle: 'a' })).rejects.toThrow(
      'BRIO_SOCIAL_HANDLE_INVALID',
    );
    await expect(s.profile.update(A, { handle: 'blas' })).rejects.toThrow(
      'BRIO_SOCIAL_HANDLE_TAKEN',
    );
  });
});

describe('amigos y privacidad', () => {
  it('seguir a alguien no enseña su actividad hasta que te sigue', async () => {
    const s = setup();
    await s.profile.get(A);
    await s.profile.get(B);
    s.addSession(B, 1);
    expect((await s.people.setFollow(A, B, true)).relation).toBe('FOLLOWING');
    expect(await s.feed.feed(A)).toEqual([]);
    expect(await s.people.profile(A, B)).toMatchObject({
      visible: false,
      events: [],
      sessionsThisWeek: null,
    });
    expect((await s.people.list(B)).followers.map((p) => p.id)).toEqual([A]);

    expect((await s.people.setFollow(B, A, true)).relation).toBe('FRIENDS');
    const feed = await s.feed.feed(A);
    expect(feed).toHaveLength(1);
    expect(feed[0]).toMatchObject({
      userId: B,
      name: 'Blas',
      handle: 'blas',
      badge: 'Correr',
    });
    expect((await s.people.list(A)).friends.map((p) => p.id)).toEqual([B]);
  });

  it('quien deja de compartir desaparece de la actividad de sus amigos', async () => {
    const s = setup();
    await befriend(s, A, B);
    s.addSession(B, 1);
    await s.profile.update(B, { shareActivity: false });
    expect(await s.feed.feed(A)).toEqual([]);
    expect((await s.people.profile(A, B)).visible).toBe(false);
  });

  it('el perfil de un amigo enseña racha, objetivo y logros con récord', async () => {
    const s = setup();
    await befriend(s, A, B);
    s.addSession(B, 30, 12_000);
    s.addSession(B, 1, 18_000);
    s.addSession(B, 0, 5000);
    const p = await s.people.profile(A, B);
    expect(p).toMatchObject({
      visible: true,
      streakDays: 2,
      goal: { name: 'Media maratón', daysToRace: null },
    });
    expect(p.events.map((e) => e.kind)).toEqual(['goal', 'pr']);
  });

  it('no deja seguirse a uno mismo ni a quien no existe', async () => {
    const s = setup();
    await s.profile.get(A);
    await expect(s.people.setFollow(A, A, true)).rejects.toThrow(
      'BRIO_SOCIAL_CANNOT_FOLLOW_SELF',
    );
    await expect(s.people.setFollow(A, B, true)).rejects.toThrow(
      'BRIO_SOCIAL_PERSON_NOT_FOUND',
    );
  });

  it('busca por nombre o usuario, a partir de dos letras', async () => {
    const s = setup();
    await s.profile.get(A);
    await s.profile.get(B);
    expect(await s.people.search(A, 'b')).toEqual([]);
    expect((await s.people.search(A, '@bla')).map((p) => p.handle)).toEqual([
      'blas',
    ]);
  });

  it('cuenta los ánimos y recuerda el mío', async () => {
    const s = setup();
    await befriend(s, A, B);
    s.addSession(B, 1);
    const [event] = await s.feed.feed(A);
    await s.feed.setCheer(A, event.key, true);
    expect((await s.feed.feed(A))[0]).toMatchObject({
      cheers: 1,
      cheered: true,
    });
    await s.feed.setCheer(A, event.key, false);
    expect((await s.feed.feed(A))[0]).toMatchObject({
      cheers: 0,
      cheered: false,
    });
    await expect(s.feed.setCheer(A, 'x', true)).rejects.toThrow(
      'BRIO_SOCIAL_CHEER_INVALID',
    );
  });
});

describe('retos', () => {
  it('solo se puede retar a amigos', async () => {
    const s = setup();
    await s.profile.get(A);
    await s.profile.get(B);
    await s.people.setFollow(A, B, true);
    await expect(
      s.challenges.create(A, { kind: 'SESSIONS', weeks: 1, friendIds: [B] }),
    ).rejects.toThrow('BRIO_CHALLENGE_FRIENDS_ONLY');
    await expect(
      s.challenges.create(A, { kind: 'SESSIONS', weeks: 1, friendIds: [] }),
    ).rejects.toThrow('BRIO_CHALLENGE_FRIENDS_ONLY');
  });

  it('crea el reto desde hoy y clasifica a los participantes', async () => {
    const s = setup();
    await befriend(s, A, B);
    s.addSession(B, 0);
    const c = await s.challenges.create(A, {
      kind: 'SESSIONS',
      weeks: 1,
      friendIds: [B],
    });
    expect(c).toMatchObject({
      kind: 'SESSIONS',
      startDay: TODAY,
      daysLeft: 7,
      finished: false,
      mine: true,
    });
    expect(c.ranking).toEqual([
      { userId: B, value: 1, position: 1, name: 'Blas', me: false },
      { userId: A, value: 0, position: 2, name: 'Ana Ruiz', me: true },
    ]);
    expect(await s.challenges.list(B)).toHaveLength(1);
  });

  it('un invitado sale; el creador lo borra para todos', async () => {
    const s = setup();
    await befriend(s, A, B);
    const c = await s.challenges.create(A, {
      kind: 'KM',
      weeks: 2,
      friendIds: [B],
    });
    await s.challenges.leave(B, c.id);
    expect(await s.challenges.list(B)).toEqual([]);
    expect(await s.challenges.list(A)).toHaveLength(1);
    await s.challenges.leave(A, c.id);
    expect(s.challengesStore).toEqual([]);
    await expect(s.challenges.leave(B, c.id)).rejects.toThrow(
      'BRIO_CHALLENGE_NOT_FOUND',
    );
  });
});
