import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { IamModule } from '../iam/iam.module';
import { SECTION_REPOSITORY } from './application/ports/section-repository.port';
import { SectionAccessResolver } from './application/services/section-access-resolver';
import { GetSectionTreeUseCase } from './application/use-cases/get-section-tree.use-case';
import { SectionsController } from './infrastructure/http/sections.controller';
import { PrismaSectionRepository } from './infrastructure/persistence/prisma-section.repository';

@Module({
  imports: [PrismaModule, IamModule],
  controllers: [SectionsController],
  providers: [
    SectionAccessResolver,
    GetSectionTreeUseCase,
    { provide: SECTION_REPOSITORY, useClass: PrismaSectionRepository },
  ],
})
export class SectionsModule {}
