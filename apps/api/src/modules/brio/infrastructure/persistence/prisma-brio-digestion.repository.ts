import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type {
  BowelAmount,
  BowelMovement,
  BristolType,
} from '../../domain/services/digestion';
import type {
  BrioDigestionRepositoryPort,
  NewBowelMovement,
} from '../../application/ports/digestion.port';
import { toDateOnly, toDay } from './brio.mapper';

type Row = {
  id: string;
  occurredAt: Date;
  loggedOn: Date;
  bristolType: number;
  amount: string;
};

const toMovement = (r: Row): BowelMovement => ({
  id: r.id,
  occurredAt: r.occurredAt,
  loggedOn: toDay(r.loggedOn),
  bristolType: r.bristolType as BristolType,
  amount: r.amount as BowelAmount,
});

@Injectable()
export class PrismaBrioDigestionRepository implements BrioDigestionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: NewBowelMovement): Promise<BowelMovement> {
    const row = await this.prisma.brioBowelMovement.create({
      data: {
        userId: data.userId,
        occurredAt: data.occurredAt,
        loggedOn: toDateOnly(data.loggedOn),
        bristolType: data.bristolType,
        amount: data.amount,
      },
    });
    return toMovement(row);
  }

  async listSince(userId: string, fromDay: string): Promise<BowelMovement[]> {
    const rows = await this.prisma.brioBowelMovement.findMany({
      where: { userId, loggedOn: { gte: toDateOnly(fromDay) } },
      orderBy: { occurredAt: 'desc' },
    });
    return rows.map(toMovement);
  }

  async firstDay(userId: string): Promise<string | null> {
    const row = await this.prisma.brioBowelMovement.findFirst({
      where: { userId },
      orderBy: { loggedOn: 'asc' },
      select: { loggedOn: true },
    });
    return row ? toDay(row.loggedOn) : null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.brioBowelMovement.deleteMany({
      where: { id, userId },
    });
    return count > 0;
  }
}
