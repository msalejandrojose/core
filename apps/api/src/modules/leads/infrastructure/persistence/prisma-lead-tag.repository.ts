import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { LeadTag } from '../../domain/entities/lead-tag.entity';
import {
  CreateLeadTagData,
  LeadTagRepositoryPort,
} from '../../application/ports/lead-tag-repository.port';

@Injectable()
export class PrismaLeadTagRepository implements LeadTagRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateLeadTagData): Promise<LeadTag> {
    return this.prisma.leadTag.create({
      data: { name: data.name, color: data.color },
    });
  }

  list(): Promise<LeadTag[]> {
    return this.prisma.leadTag.findMany({ orderBy: { name: 'asc' } });
  }

  async findByName(name: string): Promise<LeadTag | null> {
    return this.prisma.leadTag.findUnique({ where: { name } });
  }

  async findExistingIds(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.leadTag.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
}
