import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { ChallengeKind, SessionFact } from '../../domain/services/social';
import type {
  ChallengeRow,
  RitmoSocialRepositoryPort,
  SocialUser,
} from '../../application/ports/social.port';
import { toDateOnly, toDay } from './ritmo.mapper';

const PROFILE_INCLUDE = {
  user: { select: { firstName: true, lastName: true } },
} as const;

type ProfileRow = {
  userId: string;
  handle: string;
  shareActivity: boolean;
  user: { firstName: string | null; lastName: string | null };
};

const toUser = (r: ProfileRow): SocialUser => ({
  userId: r.userId,
  handle: r.handle,
  firstName: r.user.firstName,
  lastName: r.user.lastName,
  shareActivity: r.shareActivity,
});

type ChallengeDb = {
  id: string;
  ownerId: string;
  kind: string;
  startDay: Date;
  endDay: Date;
  members: { userId: string }[];
};

const toChallenge = (r: ChallengeDb): ChallengeRow => ({
  id: r.id,
  ownerId: r.ownerId,
  kind: r.kind as ChallengeKind,
  startDay: toDay(r.startDay),
  endDay: toDay(r.endDay),
  memberIds: r.members.map((m) => m.userId),
});

@Injectable()
export class PrismaRitmoSocialRepository implements RitmoSocialRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  identity(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true },
    });
  }

  async findProfile(userId: string): Promise<SocialUser | null> {
    const row = await this.prisma.ritmoSocialProfile.findUnique({
      where: { userId },
      include: PROFILE_INCLUDE,
    });
    return row ? toUser(row) : null;
  }

  async handleTaken(handle: string, exceptUserId?: string): Promise<boolean> {
    const row = await this.prisma.ritmoSocialProfile.findUnique({
      where: { handle },
      select: { userId: true },
    });
    return !!row && row.userId !== exceptUserId;
  }

  async createProfile(userId: string, handle: string): Promise<SocialUser> {
    const row = await this.prisma.ritmoSocialProfile.upsert({
      where: { userId },
      update: {},
      create: { userId, handle },
      include: PROFILE_INCLUDE,
    });
    return toUser(row);
  }

  async updateProfile(
    userId: string,
    data: { handle?: string; shareActivity?: boolean },
  ): Promise<SocialUser> {
    const row = await this.prisma.ritmoSocialProfile.update({
      where: { userId },
      data,
      include: PROFILE_INCLUDE,
    });
    return toUser(row);
  }

  async usersByIds(ids: string[]): Promise<SocialUser[]> {
    if (!ids.length) return [];
    const rows = await this.prisma.ritmoSocialProfile.findMany({
      where: { userId: { in: ids } },
      include: PROFILE_INCLUDE,
    });
    return rows.map(toUser);
  }

  async search(
    q: string,
    exceptUserId: string,
    limit: number,
  ): Promise<SocialUser[]> {
    const rows = await this.prisma.ritmoSocialProfile.findMany({
      where: {
        userId: { not: exceptUserId },
        user: { isActive: true },
        OR: [
          { handle: { contains: q.toLowerCase() } },
          { user: { firstName: { contains: q } } },
          { user: { lastName: { contains: q } } },
        ],
      },
      include: PROFILE_INCLUDE,
      orderBy: { handle: 'asc' },
      take: limit,
    });
    return rows.map(toUser);
  }

  async followingIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.ritmoFollow.findMany({
      where: { followerId: userId },
      select: { followeeId: true },
    });
    return rows.map((r) => r.followeeId);
  }

  async followerIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.ritmoFollow.findMany({
      where: { followeeId: userId },
      select: { followerId: true },
    });
    return rows.map((r) => r.followerId);
  }

  async follow(followerId: string, followeeId: string): Promise<void> {
    await this.prisma.ritmoFollow.upsert({
      where: { followerId_followeeId: { followerId, followeeId } },
      update: {},
      create: { followerId, followeeId },
    });
  }

  async unfollow(followerId: string, followeeId: string): Promise<void> {
    await this.prisma.ritmoFollow.deleteMany({
      where: { followerId, followeeId },
    });
  }

  async sessionsSince(userIds: string[], from: string): Promise<SessionFact[]> {
    if (!userIds.length) return [];
    const rows = await this.prisma.ritmoActivitySession.findMany({
      where: { userId: { in: userIds }, loggedOn: { gte: toDateOnly(from) } },
      orderBy: { startedAt: 'desc' },
      take: 200,
      select: {
        id: true,
        userId: true,
        startedAt: true,
        loggedOn: true,
        durationSec: true,
        distanceM: true,
        activityType: { select: { name: true, kind: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      startedAt: r.startedAt,
      day: toDay(r.loggedOn),
      typeName: r.activityType.name,
      kind: r.activityType.kind,
      durationSec: r.durationSec,
      distanceM: r.distanceM,
    }));
  }

  async bestDistances(
    userIds: string[],
    before: string,
  ): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (!userIds.length) return out;
    const rows = await this.prisma.ritmoActivitySession.findMany({
      where: {
        userId: { in: userIds },
        loggedOn: { lt: toDateOnly(before) },
        distanceM: { not: null },
      },
      select: {
        userId: true,
        distanceM: true,
        activityType: { select: { kind: true } },
      },
    });
    for (const r of rows) {
      const key = `${r.userId}|${r.activityType.kind}`;
      out.set(key, Math.max(out.get(key) ?? 0, r.distanceM ?? 0));
    }
    return out;
  }

  async activeDays(userId: string, from: string): Promise<string[]> {
    const rows = await this.prisma.ritmoActivitySession.findMany({
      where: { userId, loggedOn: { gte: toDateOnly(from) } },
      select: { loggedOn: true },
      distinct: ['loggedOn'],
    });
    return rows.map((r) => toDay(r.loggedOn));
  }

  async activeGoal(
    userId: string,
  ): Promise<{ name: string; raceDate: string | null } | null> {
    const row = await this.prisma.ritmoPlan.findFirst({
      where: { userId, isActive: true },
      select: { name: true, raceDate: true },
    });
    return row
      ? { name: row.name, raceDate: row.raceDate ? toDay(row.raceDate) : null }
      : null;
  }

  async cheerCounts(keys: string[]): Promise<Map<string, number>> {
    if (!keys.length) return new Map();
    const rows = await this.prisma.ritmoCheer.groupBy({
      by: ['targetKey'],
      where: { targetKey: { in: keys } },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.targetKey, r._count._all]));
  }

  async cheeredBy(userId: string, keys: string[]): Promise<Set<string>> {
    if (!keys.length) return new Set();
    const rows = await this.prisma.ritmoCheer.findMany({
      where: { userId, targetKey: { in: keys } },
      select: { targetKey: true },
    });
    return new Set(rows.map((r) => r.targetKey));
  }

  async setCheer(userId: string, key: string, on: boolean): Promise<void> {
    const where = { userId, targetKey: key };
    if (on)
      await this.prisma.ritmoCheer.upsert({
        where: { userId_targetKey: where },
        update: {},
        create: where,
      });
    else await this.prisma.ritmoCheer.deleteMany({ where });
  }

  async challengesOf(
    userId: string,
    endingFrom: string,
  ): Promise<ChallengeRow[]> {
    const rows = await this.prisma.ritmoChallenge.findMany({
      where: {
        endDay: { gte: toDateOnly(endingFrom) },
        members: { some: { userId } },
      },
      include: { members: { select: { userId: true } } },
      orderBy: { endDay: 'asc' },
    });
    return rows.map(toChallenge);
  }

  async findChallenge(id: string): Promise<ChallengeRow | null> {
    const row = await this.prisma.ritmoChallenge.findUnique({
      where: { id },
      include: { members: { select: { userId: true } } },
    });
    return row ? toChallenge(row) : null;
  }

  async createChallenge(data: Omit<ChallengeRow, 'id'>): Promise<ChallengeRow> {
    const row = await this.prisma.ritmoChallenge.create({
      data: {
        ownerId: data.ownerId,
        kind: data.kind,
        startDay: toDateOnly(data.startDay),
        endDay: toDateOnly(data.endDay),
        members: { create: data.memberIds.map((userId) => ({ userId })) },
      },
      include: { members: { select: { userId: true } } },
    });
    return toChallenge(row);
  }

  async leaveChallenge(id: string, userId: string): Promise<void> {
    await this.prisma.ritmoChallengeMember.deleteMany({
      where: { challengeId: id, userId },
    });
  }

  async deleteChallenge(id: string): Promise<void> {
    await this.prisma.ritmoChallenge.deleteMany({ where: { id } });
  }

  async challengeValues(
    kind: ChallengeKind,
    userIds: string[],
    from: string,
    to: string,
  ): Promise<Map<string, number>> {
    const out = new Map<string, number>(userIds.map((id) => [id, 0]));
    if (!userIds.length) return out;
    const range = { gte: toDateOnly(from), lte: toDateOnly(to) };
    if (kind === 'SESSIONS' || kind === 'KM') {
      const rows = await this.prisma.ritmoActivitySession.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, loggedOn: range },
        _count: { _all: true },
        _sum: { distanceM: true },
      });
      for (const r of rows)
        out.set(
          r.userId,
          kind === 'SESSIONS'
            ? r._count._all
            : Math.round((r._sum.distanceM ?? 0) / 100) / 10,
        );
    } else if (kind === 'STEPS') {
      const rows = await this.prisma.ritmoDailyHealth.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, day: range },
        _sum: { steps: true },
      });
      for (const r of rows) out.set(r.userId, r._sum.steps ?? 0);
    } else {
      // Constancia: días en los que se ha apuntado al menos una comida.
      const rows = await this.prisma.ritmoMealEntry.findMany({
        where: { userId: { in: userIds }, loggedOn: range },
        select: { userId: true, loggedOn: true },
        distinct: ['userId', 'loggedOn'],
      });
      for (const r of rows) out.set(r.userId, (out.get(r.userId) ?? 0) + 1);
    }
    return out;
  }
}
