import { Invitation as PrismaInvitation } from '../../../../generated/prisma/client';
import { Invitation } from '../../domain/entities/invitation.entity';

export class InvitationMapper {
  static toDomain(row: PrismaInvitation): Invitation {
    return {
      id: row.id,
      code: row.code,
      createdByUserId: row.createdByUserId,
      usedByUserId: row.usedByUserId,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    };
  }
}
