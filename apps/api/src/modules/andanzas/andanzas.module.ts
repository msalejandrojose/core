import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { CreateInvitationUseCase } from './application/use-cases/create-invitation.use-case';
import { RedeemInvitationUseCase } from './application/use-cases/redeem-invitation.use-case';
import { INVITATION_REPOSITORY } from './application/ports/invitation-repository.port';
import { USER_REGISTRAR } from './application/ports/user-registrar.port';
import { PrismaInvitationRepository } from './infrastructure/persistence/prisma-invitation.repository';
import { IamUserRegistrarAdapter } from './infrastructure/iam/iam-user-registrar.adapter';
import { InvitationsController } from './infrastructure/http/invitations.controller';

@Module({
  imports: [IamModule],
  controllers: [InvitationsController],
  providers: [
    CreateInvitationUseCase,
    RedeemInvitationUseCase,
    { provide: INVITATION_REPOSITORY, useClass: PrismaInvitationRepository },
    { provide: USER_REGISTRAR, useClass: IamUserRegistrarAdapter },
  ],
})
export class AndanzasModule {}
