import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { OtaBundle } from '../../domain/entities/ota-bundle.entity';
import type { CleanPublish } from '../../domain/services/ota';
import type { OtaBundleRepositoryPort } from '../../application/ports/ota-bundle-repository.port';

@Injectable()
export class PrismaOtaBundleRepository implements OtaBundleRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  list(appId: string, channel: string): Promise<OtaBundle[]> {
    return this.prisma.otaBundle.findMany({
      where: { appId, channel },
      orderBy: { createdAt: 'desc' },
    });
  }

  async apps(): Promise<{ appId: string; channel: string }[]> {
    return this.prisma.otaBundle.findMany({
      distinct: ['appId', 'channel'],
      select: { appId: true, channel: true },
      orderBy: [{ appId: 'asc' }, { channel: 'asc' }],
    });
  }

  find(id: string): Promise<OtaBundle | null> {
    return this.prisma.otaBundle.findUnique({ where: { id } });
  }

  async exists(appId: string, channel: string, version: string) {
    const n = await this.prisma.otaBundle.count({
      where: { appId, channel, version },
    });
    return n > 0;
  }

  create(
    data: CleanPublish & { storageKey: string; createdById: string | null },
  ): Promise<OtaBundle> {
    return this.prisma.otaBundle.create({ data });
  }

  async setEnabled(id: string, isEnabled: boolean): Promise<OtaBundle | null> {
    const { count } = await this.prisma.otaBundle.updateMany({
      where: { id },
      data: { isEnabled },
    });
    return count ? this.find(id) : null;
  }

  async markPurged(id: string, at: Date): Promise<void> {
    await this.prisma.otaBundle.update({
      where: { id },
      data: { purgedAt: at, isEnabled: false },
    });
  }
}
