import { Injectable } from '@nestjs/common';
import { CLOSED_LEAD_STATUSES } from '@core/shared-types';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CursorCodec, CursorPage } from '../../../../shared/pagination';
import { Lead } from '../../domain/entities/lead.entity';
import {
  CreateLeadData,
  LeadRepositoryPort,
  ListLeadsOptions,
  UpdateLeadPatch,
} from '../../application/ports/lead-repository.port';
import { toLeadDomain } from '../mappers/lead.mapper';

const TAGS_INCLUDE = { tags: { include: { tag: true } } } as const;

function jsonInput(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null || value === undefined ? Prisma.DbNull : value;
}

@Injectable()
export class PrismaLeadRepository implements LeadRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateLeadData): Promise<Lead> {
    const row = await this.prisma.lead.create({
      data: {
        email: data.email,
        emailNormalized: data.emailNormalized,
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName,
        company: data.company,
        status: data.status,
        score: data.score,
        ownerId: data.ownerId,
        source: data.source,
        formResponseId: data.formResponseId,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        customFields: jsonInput(data.customFields),
        consentGiven: data.consentGiven,
        consentAt: data.consentAt,
        createdById: data.createdById,
      },
      include: TAGS_INCLUDE,
    });
    return toLeadDomain(row);
  }

  async update(id: string, patch: UpdateLeadPatch): Promise<Lead> {
    const data: Prisma.LeadUncheckedUpdateInput = {};
    if (patch.email !== undefined) data.email = patch.email;
    if (patch.emailNormalized !== undefined)
      data.emailNormalized = patch.emailNormalized;
    if (patch.phone !== undefined) data.phone = patch.phone;
    if (patch.firstName !== undefined) data.firstName = patch.firstName;
    if (patch.lastName !== undefined) data.lastName = patch.lastName;
    if (patch.company !== undefined) data.company = patch.company;
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.score !== undefined) data.score = patch.score;
    if (patch.ownerId !== undefined) data.ownerId = patch.ownerId;
    if (patch.source !== undefined) data.source = patch.source;
    if (patch.utmSource !== undefined) data.utmSource = patch.utmSource;
    if (patch.utmMedium !== undefined) data.utmMedium = patch.utmMedium;
    if (patch.utmCampaign !== undefined) data.utmCampaign = patch.utmCampaign;
    if (patch.customFields !== undefined)
      data.customFields = jsonInput(patch.customFields);
    if (patch.consentGiven !== undefined)
      data.consentGiven = patch.consentGiven;
    if (patch.consentAt !== undefined) data.consentAt = patch.consentAt;
    if (patch.convertedToUserId !== undefined)
      data.convertedToUserId = patch.convertedToUserId;
    if (patch.convertedAt !== undefined) data.convertedAt = patch.convertedAt;

    const row = await this.prisma.lead.update({
      where: { id },
      data,
      include: TAGS_INCLUDE,
    });
    return toLeadDomain(row);
  }

  async findById(id: string): Promise<Lead | null> {
    const row = await this.prisma.lead.findUnique({
      where: { id },
      include: TAGS_INCLUDE,
    });
    return row ? toLeadDomain(row) : null;
  }

  async findOpenByEmailNormalized(
    emailNormalized: string,
  ): Promise<Lead | null> {
    const row = await this.prisma.lead.findFirst({
      where: { emailNormalized, status: { notIn: [...CLOSED_LEAD_STATUSES] } },
      orderBy: { createdAt: 'desc' },
      include: TAGS_INCLUDE,
    });
    return row ? toLeadDomain(row) : null;
  }

  async findOpenByPhone(phone: string): Promise<Lead | null> {
    const row = await this.prisma.lead.findFirst({
      where: { phone, status: { notIn: [...CLOSED_LEAD_STATUSES] } },
      orderBy: { createdAt: 'desc' },
      include: TAGS_INCLUDE,
    });
    return row ? toLeadDomain(row) : null;
  }

  async findByFormResponseId(formResponseId: string): Promise<Lead | null> {
    const row = await this.prisma.lead.findFirst({
      where: { formResponseId },
      orderBy: { createdAt: 'asc' },
      include: TAGS_INCLUDE,
    });
    return row ? toLeadDomain(row) : null;
  }

  async list(opts: ListLeadsOptions): Promise<CursorPage<Lead>> {
    const filters: Prisma.LeadWhereInput = {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.source ? { source: opts.source } : {}),
      ...(opts.ownerId ? { ownerId: opts.ownerId } : {}),
      ...(opts.tagId ? { tags: { some: { tagId: opts.tagId } } } : {}),
      ...(opts.q
        ? {
            OR: [
              { email: { contains: opts.q } },
              { firstName: { contains: opts.q } },
              { lastName: { contains: opts.q } },
              { company: { contains: opts.q } },
            ],
          }
        : {}),
    };

    const where: Prisma.LeadWhereInput = opts.cursor
      ? { AND: [filters, this.cursorWhere(opts.cursor)] }
      : filters;

    const rows = await this.prisma.lead.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: opts.limit + 1,
      include: TAGS_INCLUDE,
    });

    const hasMore = rows.length > opts.limit;
    const slice = hasMore ? rows.slice(0, opts.limit) : rows;
    const last = hasMore ? slice[slice.length - 1] : null;
    return {
      items: slice.map(toLeadDomain),
      nextCursor: last
        ? CursorCodec.encode({
            id: last.id,
            createdAt: last.createdAt.toISOString(),
          })
        : null,
    };
  }

  async setTags(leadId: string, tagIds: string[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.leadTagOnLead.deleteMany({ where: { leadId } }),
      ...(tagIds.length > 0
        ? [
            this.prisma.leadTagOnLead.createMany({
              data: tagIds.map((tagId) => ({ leadId, tagId })),
            }),
          ]
        : []),
    ]);
  }

  private cursorWhere(cursor: string): Prisma.LeadWhereInput {
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
