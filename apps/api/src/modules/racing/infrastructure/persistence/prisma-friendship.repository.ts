import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { FriendshipRepositoryPort } from '../../application/ports/friendship-repository.port';
import {
  Friend,
  Friendship,
  FriendshipRequest,
  FriendshipStatus,
} from '../../domain/entities/friendship.entity';

interface UserRow {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface FriendshipRow {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: string;
  createdAt: Date;
  respondedAt: Date | null;
}

// Mismo criterio que `displayNameOf` en `prisma-lap-time.repository.ts` y
// `prisma-grand-prix-attempt.repository.ts`: sin nombre y apellidos se cae
// al email.
function displayNameOf(user: UserRow): string {
  const full = [user.firstName, user.lastName]
    .filter((part): part is string => part !== null && part.trim() !== '')
    .join(' ')
    .trim();
  return full === '' ? user.email : full;
}

function toDomain(row: FriendshipRow): Friendship {
  return new Friendship(
    row.id,
    row.requesterId,
    row.addresseeId,
    row.status as FriendshipStatus,
    row.createdAt,
    row.respondedAt,
  );
}

@Injectable()
export class PrismaFriendshipRepository implements FriendshipRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Friendship | null> {
    const row = await this.prisma.racingFriendship.findUnique({
      where: { id },
    });
    return row === null ? null : toDomain(row);
  }

  async findActiveBetween(
    userIdA: string,
    userIdB: string,
  ): Promise<Friendship | null> {
    const row = await this.prisma.racingFriendship.findFirst({
      where: {
        status: { in: ['PENDING', 'ACCEPTED'] },
        OR: [
          { requesterId: userIdA, addresseeId: userIdB },
          { requesterId: userIdB, addresseeId: userIdA },
        ],
      },
    });
    return row === null ? null : toDomain(row);
  }

  async create(requesterId: string, addresseeId: string): Promise<Friendship> {
    const row = await this.prisma.racingFriendship.create({
      data: { requesterId, addresseeId },
    });
    return toDomain(row);
  }

  async accept(id: string): Promise<Friendship> {
    const row = await this.prisma.racingFriendship.update({
      where: { id },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    });
    return toDomain(row);
  }

  async reject(id: string): Promise<Friendship> {
    const row = await this.prisma.racingFriendship.update({
      where: { id },
      data: { status: 'REJECTED', respondedAt: new Date() },
    });
    return toDomain(row);
  }

  async listFriends(userId: string): Promise<Friend[]> {
    const rows = await this.prisma.racingFriendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: { requester: true, addressee: true },
      orderBy: { respondedAt: 'asc' },
    });

    return rows.map((row) => {
      const other = row.requesterId === userId ? row.addressee : row.requester;
      return new Friend(
        other.id,
        displayNameOf(other),
        row.respondedAt ?? row.createdAt,
      );
    });
  }

  async listPendingRequests(userId: string): Promise<FriendshipRequest[]> {
    const rows = await this.prisma.racingFriendship.findMany({
      where: { status: 'PENDING', addresseeId: userId },
      include: { requester: true },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map(
      (row) =>
        new FriendshipRequest(
          row.id,
          row.requesterId,
          displayNameOf(row.requester),
          row.createdAt,
        ),
    );
  }
}
