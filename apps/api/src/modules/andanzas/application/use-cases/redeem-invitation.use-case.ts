import { Inject, Injectable } from '@nestjs/common';
import { InvalidInvitationCodeError } from '../../domain/errors/invalid-invitation-code.error';
import { isInvitationValid } from '../../domain/invitations/invitation-rules';
import {
  INVITATION_REPOSITORY,
  type InvitationRepositoryPort,
} from '../ports/invitation-repository.port';
import {
  USER_REGISTRAR,
  type UserRegistrarPort,
} from '../ports/user-registrar.port';

export interface RedeemInvitationInput {
  code: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface RedeemInvitationResult {
  userId: string;
}

@Injectable()
export class RedeemInvitationUseCase {
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitations: InvitationRepositoryPort,
    @Inject(USER_REGISTRAR)
    private readonly userRegistrar: UserRegistrarPort,
  ) {}

  async execute(input: RedeemInvitationInput): Promise<RedeemInvitationResult> {
    // El código siempre se genera en mayúsculas (ver generate-invitation-code);
    // normalizamos la entrada para que sea indiferente a cómo lo tecleó el usuario.
    const code = input.code.trim().toUpperCase();
    const invitation = await this.invitations.findByCode(code);
    if (!invitation || !isInvitationValid(invitation, new Date())) {
      throw new InvalidInvitationCodeError(code);
    }

    const user = await this.userRegistrar.registerAppUser({
      email: input.email,
      password: input.password,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    await this.invitations.markAsUsed(invitation.id, user.id);

    return { userId: user.id };
  }
}
