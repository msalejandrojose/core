import { Section as PrismaSection } from '../../../../generated/prisma/client';
import { Section } from '../../domain/entities/section.entity';

export function toDomain(row: PrismaSection): Section {
  return new Section({
    id: row.id,
    code: row.code,
    name: row.name,
    icon: row.icon,
    route: row.route,
    parentId: row.parentId,
    scope: row.scope,
    order: row.order,
    isActive: row.isActive,
    apiRequirements: Array.isArray(row.apiRequirements)
      ? (row.apiRequirements as string[])
      : [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
