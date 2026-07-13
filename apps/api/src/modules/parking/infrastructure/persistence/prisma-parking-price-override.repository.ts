import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { ParkingPriceOverride } from '../../domain/entities/parking-price-override.entity';
import {
  CreateParkingPriceOverrideData,
  ParkingPriceOverrideRepositoryPort,
} from '../../application/ports/parking-price-override-repository.port';
import { toParkingPriceOverrideDomain } from '../mappers/parking-price-override.mapper';

@Injectable()
export class PrismaParkingPriceOverrideRepository implements ParkingPriceOverrideRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateParkingPriceOverrideData,
  ): Promise<ParkingPriceOverride> {
    const row = await this.prisma.parkingPriceOverride.create({
      data: {
        parkingId: data.parkingId,
        startDate: data.startDate,
        endDate: data.endDate,
        pricePerDay: data.pricePerDay,
        label: data.label,
      },
    });
    return toParkingPriceOverrideDomain(row);
  }

  async findByIdForParking(
    id: string,
    parkingId: string,
  ): Promise<ParkingPriceOverride | null> {
    const row = await this.prisma.parkingPriceOverride.findFirst({
      where: { id, parkingId },
    });
    return row ? toParkingPriceOverrideDomain(row) : null;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.parkingPriceOverride.delete({ where: { id } });
  }

  async listForParking(parkingId: string): Promise<ParkingPriceOverride[]> {
    const rows = await this.prisma.parkingPriceOverride.findMany({
      where: { parkingId },
      orderBy: { startDate: 'asc' },
    });
    return rows.map(toParkingPriceOverrideDomain);
  }

  async listOverlapping(
    parkingId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ParkingPriceOverride[]> {
    const rows = await this.prisma.parkingPriceOverride.findMany({
      where: {
        parkingId,
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toParkingPriceOverrideDomain);
  }
}
