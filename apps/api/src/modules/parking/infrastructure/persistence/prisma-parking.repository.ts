import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CursorCodec, CursorPage } from '../../../../shared/pagination';
import { Parking } from '../../domain/entities/parking.entity';
import {
  CreateParkingData,
  ListAllParkingsOptions,
  ListMyParkingsOptions,
  ParkingRepositoryPort,
  SearchPublicParkingsOptions,
  UpdateParkingPatch,
} from '../../application/ports/parking-repository.port';
import { toParkingDomain } from '../mappers/parking.mapper';

const PHOTOS_INCLUDE = { photos: { orderBy: { position: 'asc' as const } } };

@Injectable()
export class PrismaParkingRepository implements ParkingRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateParkingData): Promise<Parking> {
    const row = await this.prisma.parking.create({
      data: {
        hostUserId: data.hostUserId,
        title: data.title,
        description: data.description,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        postalCodeId: data.postalCodeId,
        accessInstructions: data.accessInstructions,
        pricePerDay: data.pricePerDay,
      },
      include: PHOTOS_INCLUDE,
    });
    return toParkingDomain(row);
  }

  async update(id: string, patch: UpdateParkingPatch): Promise<Parking> {
    const data: Prisma.ParkingUncheckedUpdateInput = {};
    if (patch.title !== undefined) data.title = patch.title;
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.address !== undefined) data.address = patch.address;
    if (patch.latitude !== undefined) data.latitude = patch.latitude;
    if (patch.longitude !== undefined) data.longitude = patch.longitude;
    if (patch.postalCodeId !== undefined)
      data.postalCodeId = patch.postalCodeId;
    if (patch.accessInstructions !== undefined)
      data.accessInstructions = patch.accessInstructions;
    if (patch.pricePerDay !== undefined) data.pricePerDay = patch.pricePerDay;
    if (patch.status !== undefined) data.status = patch.status;

    const row = await this.prisma.parking.update({
      where: { id },
      data,
      include: PHOTOS_INCLUDE,
    });
    return toParkingDomain(row);
  }

  async findById(id: string): Promise<Parking | null> {
    const row = await this.prisma.parking.findUnique({
      where: { id },
      include: PHOTOS_INCLUDE,
    });
    return row ? toParkingDomain(row) : null;
  }

  async findByIdForHost(
    id: string,
    hostUserId: string,
  ): Promise<Parking | null> {
    const row = await this.prisma.parking.findFirst({
      where: { id, hostUserId },
      include: PHOTOS_INCLUDE,
    });
    return row ? toParkingDomain(row) : null;
  }

  async list(opts: ListMyParkingsOptions): Promise<CursorPage<Parking>> {
    const filters: Prisma.ParkingWhereInput = {
      hostUserId: opts.hostUserId,
      ...(opts.status ? { status: opts.status } : {}),
    };
    return this.listWithCursor(filters, opts.limit, opts.cursor);
  }

  async findPublishedById(id: string): Promise<Parking | null> {
    const row = await this.prisma.parking.findFirst({
      where: { id, status: 'PUBLISHED' },
      include: PHOTOS_INCLUDE,
    });
    return row ? toParkingDomain(row) : null;
  }

  async searchPublished(
    opts: SearchPublicParkingsOptions,
  ): Promise<CursorPage<Parking>> {
    const filters: Prisma.ParkingWhereInput = {
      status: 'PUBLISHED',
      ...(opts.q
        ? {
            OR: [
              { title: { contains: opts.q } },
              { address: { contains: opts.q } },
            ],
          }
        : {}),
    };
    return this.listWithCursor(filters, opts.limit, opts.cursor);
  }

  async listAll(opts: ListAllParkingsOptions): Promise<CursorPage<Parking>> {
    const filters: Prisma.ParkingWhereInput = {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.hostUserId ? { hostUserId: opts.hostUserId } : {}),
    };
    return this.listWithCursor(filters, opts.limit, opts.cursor);
  }

  async addPhoto(parkingId: string, storedFileId: string): Promise<Parking> {
    const position = await this.prisma.parkingPhoto.count({
      where: { parkingId },
    });
    await this.prisma.parkingPhoto.create({
      data: { parkingId, storedFileId, position },
    });
    return (await this.findById(parkingId))!;
  }

  async removePhoto(parkingId: string, photoId: string): Promise<Parking> {
    await this.prisma.parkingPhoto.delete({ where: { id: photoId } });
    return (await this.findById(parkingId))!;
  }

  private async listWithCursor(
    filters: Prisma.ParkingWhereInput,
    limit: number,
    cursor?: string,
  ): Promise<CursorPage<Parking>> {
    const where: Prisma.ParkingWhereInput = cursor
      ? { AND: [filters, this.cursorWhere(cursor)] }
      : filters;

    const rows = await this.prisma.parking.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: limit + 1,
      include: PHOTOS_INCLUDE,
    });

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const last = hasMore ? slice[slice.length - 1] : null;
    return {
      items: slice.map(toParkingDomain),
      nextCursor: last
        ? CursorCodec.encode({
            id: last.id,
            createdAt: last.createdAt.toISOString(),
          })
        : null,
    };
  }

  private cursorWhere(cursor: string): Prisma.ParkingWhereInput {
    const decoded = CursorCodec.decode(cursor);
    const date = new Date(decoded.createdAt);
    return {
      OR: [
        { createdAt: { lt: date } },
        { createdAt: date, id: { gt: decoded.id } },
      ],
    };
  }
}
