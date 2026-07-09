import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { Device } from '../../domain/entities/device.entity';
import {
  DeviceRepositoryPort,
  UpsertDeviceData,
} from '../../application/ports/device-repository.port';
import { toDeviceDomain } from './device.mapper';

@Injectable()
export class PrismaDeviceRepository implements DeviceRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(data: UpsertDeviceData): Promise<Device> {
    const now = new Date();
    const row = await this.prisma.device.upsert({
      where: { token: data.token },
      // El token identifica físicamente al dispositivo: si reaparece con otro
      // usuario (mismo teléfono, login distinto) lo reasignamos.
      update: {
        userId: data.userId,
        platform: data.platform,
        lastSeenAt: now,
      },
      create: {
        userId: data.userId,
        token: data.token,
        platform: data.platform,
        lastSeenAt: now,
      },
    });
    return toDeviceDomain(row);
  }

  async deleteByToken(userId: string, token: string): Promise<boolean> {
    // Borrado condicionado por owner: solo elimina si el token es del usuario.
    const { count } = await this.prisma.device.deleteMany({
      where: { token, userId },
    });
    return count > 0;
  }

  async listTokensByUser(userId: string): Promise<string[]> {
    const rows = await this.prisma.device.findMany({
      where: { userId },
      select: { token: true },
      orderBy: { lastSeenAt: 'desc' },
    });
    return rows.map((r) => r.token);
  }
}
