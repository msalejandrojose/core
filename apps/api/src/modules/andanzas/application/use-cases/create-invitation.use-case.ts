import { Inject, Injectable } from '@nestjs/common';
import { Invitation } from '../../domain/entities/invitation.entity';
import { TooManyActiveInvitationsError } from '../../domain/errors/too-many-active-invitations.error';
import { generateInvitationCode } from '../../domain/invitations/generate-invitation-code';
import {
  canCreateInvitation,
  computeExpiresAt,
  MAX_ACTIVE_INVITATIONS_PER_USER,
} from '../../domain/invitations/invitation-rules';
import {
  INVITATION_REPOSITORY,
  type InvitationRepositoryPort,
} from '../ports/invitation-repository.port';

export interface CreateInvitationInput {
  createdByUserId: string;
}

@Injectable()
export class CreateInvitationUseCase {
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitations: InvitationRepositoryPort,
  ) {}

  async execute(input: CreateInvitationInput): Promise<Invitation> {
    const now = new Date();
    const activeCount = await this.invitations.countActiveByUser(
      input.createdByUserId,
      now,
    );
    if (!canCreateInvitation(activeCount)) {
      throw new TooManyActiveInvitationsError(
        input.createdByUserId,
        MAX_ACTIVE_INVITATIONS_PER_USER,
      );
    }

    return this.invitations.create({
      code: generateInvitationCode(),
      createdByUserId: input.createdByUserId,
      expiresAt: computeExpiresAt(now),
    });
  }
}
