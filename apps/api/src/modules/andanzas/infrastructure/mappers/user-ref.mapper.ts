import { User as PrismaUser } from '../../../../generated/prisma/client';
import { UserRef } from '../../domain/entities/user-ref.entity';

export class UserRefMapper {
  static toDomain(row: Pick<PrismaUser, 'id' | 'firstName' | 'lastName'>): UserRef {
    return {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
    };
  }
}
