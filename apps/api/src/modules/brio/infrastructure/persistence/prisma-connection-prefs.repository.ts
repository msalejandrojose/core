import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  DEFAULT_CONNECTION_PREFS,
  type ConnectionPrefs,
  type ConnectionPrefsPort,
} from '../../application/ports/connection-prefs.port';

const SELECT = {
  importActivities: true,
  importHealth: true,
  exerciseKcalSharePct: true,
} as const;

@Injectable()
export class PrismaConnectionPrefsRepository implements ConnectionPrefsPort {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string): Promise<ConnectionPrefs> {
    const row = await this.prisma.brioConnectionPrefs.findUnique({
      where: { userId },
      select: SELECT,
    });
    return row ?? DEFAULT_CONNECTION_PREFS;
  }

  save(
    userId: string,
    prefs: Partial<ConnectionPrefs>,
  ): Promise<ConnectionPrefs> {
    return this.prisma.brioConnectionPrefs.upsert({
      where: { userId },
      update: prefs,
      create: { userId, ...DEFAULT_CONNECTION_PREFS, ...prefs },
      select: SELECT,
    });
  }
}
