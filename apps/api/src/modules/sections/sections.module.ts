import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { IamModule } from '../iam/iam.module';
import { SECTION_REPOSITORY } from './application/ports/section-repository.port';
import { SectionAccessResolver } from './application/services/section-access-resolver';
import { CreateSectionUseCase } from './application/use-cases/create-section.use-case';
import { DeleteSectionUseCase } from './application/use-cases/delete-section.use-case';
import { GetSectionAccessUseCase } from './application/use-cases/get-section-access.use-case';
import { GetSectionTreeUseCase } from './application/use-cases/get-section-tree.use-case';
import { GetSectionUseCase } from './application/use-cases/get-section.use-case';
import { ListSectionsUseCase } from './application/use-cases/list-sections.use-case';
import { RevokeRoleSectionAccessUseCase } from './application/use-cases/revoke-role-section-access.use-case';
import { RevokeUserSectionAccessUseCase } from './application/use-cases/revoke-user-section-access.use-case';
import { SetRoleSectionAccessUseCase } from './application/use-cases/set-role-section-access.use-case';
import { SetUserSectionAccessUseCase } from './application/use-cases/set-user-section-access.use-case';
import { UpdateSectionUseCase } from './application/use-cases/update-section.use-case';
import { SectionsController } from './infrastructure/http/sections.controller';
import { PrismaSectionRepository } from './infrastructure/persistence/prisma-section.repository';

@Module({
  imports: [PrismaModule, IamModule],
  controllers: [SectionsController],
  providers: [
    SectionAccessResolver,
    GetSectionTreeUseCase,
    GetSectionUseCase,
    ListSectionsUseCase,
    CreateSectionUseCase,
    UpdateSectionUseCase,
    DeleteSectionUseCase,
    GetSectionAccessUseCase,
    SetRoleSectionAccessUseCase,
    RevokeRoleSectionAccessUseCase,
    SetUserSectionAccessUseCase,
    RevokeUserSectionAccessUseCase,
    { provide: SECTION_REPOSITORY, useClass: PrismaSectionRepository },
  ],
})
export class SectionsModule {}
