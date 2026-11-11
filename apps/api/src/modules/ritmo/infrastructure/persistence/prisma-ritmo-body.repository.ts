import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { BodyMeasurement } from '../../domain/entities/body-measurement.entity';
import type {
  RitmoBodyRepositoryPort,
  SaveMeasurementData,
} from '../../application/ports/ritmo-body-repository.port';
import { num, toDateOnly, toMeasurement } from './ritmo.mapper';

@Injectable()
export class PrismaRitmoBodyRepository implements RitmoBodyRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(data: SaveMeasurementData): Promise<BodyMeasurement> {
    const values = {
      weightKg: data.weightKg,
      bodyFatPct: data.bodyFatPct,
      waistCm: data.waistCm,
      notes: data.notes,
    };
    const row = await this.prisma.ritmoBodyMeasurement.upsert({
      // Único por (usuario, día): pesarse dos veces el mismo día actualiza el
      // punto en vez de añadir ruido a la serie.
      where: {
        userId_measuredOn: {
          userId: data.userId,
          measuredOn: toDateOnly(data.measuredOn),
        },
      },
      update: values,
      create: {
        userId: data.userId,
        measuredOn: toDateOnly(data.measuredOn),
        ...values,
      },
    });
    return toMeasurement(row);
  }

  async latestWeightKg(userId: string): Promise<number | null> {
    const row = await this.prisma.ritmoBodyMeasurement.findFirst({
      where: { userId },
      orderBy: { measuredOn: 'desc' },
      select: { weightKg: true },
    });
    return row ? num(row.weightKg) : null;
  }

  async listBetween(
    userId: string,
    from: string,
    to: string,
  ): Promise<BodyMeasurement[]> {
    const rows = await this.prisma.ritmoBodyMeasurement.findMany({
      where: {
        userId,
        measuredOn: { gte: toDateOnly(from), lte: toDateOnly(to) },
      },
      orderBy: { measuredOn: 'asc' },
    });
    return rows.map(toMeasurement);
  }
}
