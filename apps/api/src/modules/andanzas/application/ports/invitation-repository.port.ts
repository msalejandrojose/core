import { Invitation } from '../../domain/entities/invitation.entity';

export const INVITATION_REPOSITORY = Symbol('INVITATION_REPOSITORY');

export interface CreateInvitationData {
  code: string;
  createdByUserId: string;
  expiresAt: Date | null;
}

export interface InvitationRepositoryPort {
  create(data: CreateInvitationData): Promise<Invitation>;
  findByCode(code: string): Promise<Invitation | null>;
  markAsUsed(id: string, usedByUserId: string): Promise<void>;
  countActiveByUser(createdByUserId: string, now: Date): Promise<number>;
}
