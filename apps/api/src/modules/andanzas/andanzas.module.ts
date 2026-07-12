import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { CreateInvitationUseCase } from './application/use-cases/create-invitation.use-case';
import { RedeemInvitationUseCase } from './application/use-cases/redeem-invitation.use-case';
import { CreateSiteUseCase } from './application/use-cases/create-site.use-case';
import { GetSiteUseCase } from './application/use-cases/get-site.use-case';
import { ListSitesUseCase } from './application/use-cases/list-sites.use-case';
import { SuggestTagsUseCase } from './application/use-cases/suggest-tags.use-case';
import { SetSiteEntryStatusUseCase } from './application/use-cases/set-site-entry-status.use-case';
import { ListMySiteEntriesUseCase } from './application/use-cases/list-my-site-entries.use-case';
import { StartRatingUseCase } from './application/use-cases/start-rating.use-case';
import { AnswerRatingComparisonUseCase } from './application/use-cases/answer-rating-comparison.use-case';
import { INVITATION_REPOSITORY } from './application/ports/invitation-repository.port';
import { USER_REGISTRAR } from './application/ports/user-registrar.port';
import { SITE_REPOSITORY } from './application/ports/site-repository.port';
import { TAG_REPOSITORY } from './application/ports/tag-repository.port';
import { SITE_ENTRY_REPOSITORY } from './application/ports/site-entry-repository.port';
import { COMPARISON_REPOSITORY } from './application/ports/comparison-repository.port';
import { PrismaInvitationRepository } from './infrastructure/persistence/prisma-invitation.repository';
import { PrismaSiteRepository } from './infrastructure/persistence/prisma-site.repository';
import { PrismaTagRepository } from './infrastructure/persistence/prisma-tag.repository';
import { PrismaSiteEntryRepository } from './infrastructure/persistence/prisma-site-entry.repository';
import { PrismaComparisonRepository } from './infrastructure/persistence/prisma-comparison.repository';
import { IamUserRegistrarAdapter } from './infrastructure/iam/iam-user-registrar.adapter';
import { InvitationsController } from './infrastructure/http/invitations.controller';
import { SitesController } from './infrastructure/http/sites.controller';
import { TagsController } from './infrastructure/http/tags.controller';
import { SiteEntriesController } from './infrastructure/http/site-entries.controller';

@Module({
  imports: [IamModule],
  controllers: [
    InvitationsController,
    SitesController,
    TagsController,
    SiteEntriesController,
  ],
  providers: [
    CreateInvitationUseCase,
    RedeemInvitationUseCase,
    CreateSiteUseCase,
    GetSiteUseCase,
    ListSitesUseCase,
    SuggestTagsUseCase,
    SetSiteEntryStatusUseCase,
    ListMySiteEntriesUseCase,
    StartRatingUseCase,
    AnswerRatingComparisonUseCase,
    { provide: INVITATION_REPOSITORY, useClass: PrismaInvitationRepository },
    { provide: USER_REGISTRAR, useClass: IamUserRegistrarAdapter },
    { provide: SITE_REPOSITORY, useClass: PrismaSiteRepository },
    { provide: TAG_REPOSITORY, useClass: PrismaTagRepository },
    { provide: SITE_ENTRY_REPOSITORY, useClass: PrismaSiteEntryRepository },
    { provide: COMPARISON_REPOSITORY, useClass: PrismaComparisonRepository },
  ],
})
export class AndanzasModule {}
