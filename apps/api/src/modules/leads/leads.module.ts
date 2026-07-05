import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { LEAD_REPOSITORY } from './application/ports/lead-repository.port';
import { LEAD_ACTIVITY_REPOSITORY } from './application/ports/lead-activity-repository.port';
import { LEAD_TAG_REPOSITORY } from './application/ports/lead-tag-repository.port';
import { LEAD_EVENT_PUBLISHER } from './application/ports/lead-event-publisher.port';
import { CaptureLeadUseCase } from './application/use-cases/capture-lead.use-case';
import { CreateLeadUseCase } from './application/use-cases/create-lead.use-case';
import { GetLeadUseCase } from './application/use-cases/get-lead.use-case';
import { ListLeadsUseCase } from './application/use-cases/list-leads.use-case';
import { UpdateLeadUseCase } from './application/use-cases/update-lead.use-case';
import { ChangeLeadStatusUseCase } from './application/use-cases/change-lead-status.use-case';
import { AssignLeadUseCase } from './application/use-cases/assign-lead.use-case';
import { AddLeadNoteUseCase } from './application/use-cases/add-lead-note.use-case';
import { ConvertLeadUseCase } from './application/use-cases/convert-lead.use-case';
import { SetLeadTagsUseCase } from './application/use-cases/set-lead-tags.use-case';
import { ListLeadActivitiesUseCase } from './application/use-cases/list-lead-activities.use-case';
import { ListLeadTagsUseCase } from './application/use-cases/list-lead-tags.use-case';
import { CreateLeadTagUseCase } from './application/use-cases/create-lead-tag.use-case';
import { PrismaLeadRepository } from './infrastructure/persistence/prisma-lead.repository';
import { PrismaLeadActivityRepository } from './infrastructure/persistence/prisma-lead-activity.repository';
import { PrismaLeadTagRepository } from './infrastructure/persistence/prisma-lead-tag.repository';
import { WorkflowLeadEventPublisher } from './infrastructure/events/workflow-lead-event-publisher';
import { LeadsController } from './infrastructure/http/leads.controller';
import { PublicLeadsController } from './infrastructure/http/public-leads.controller';

@Module({
  imports: [IamModule, WorkflowsModule],
  controllers: [LeadsController, PublicLeadsController],
  providers: [
    // Ports → Adapters
    { provide: LEAD_REPOSITORY, useClass: PrismaLeadRepository },
    {
      provide: LEAD_ACTIVITY_REPOSITORY,
      useClass: PrismaLeadActivityRepository,
    },
    { provide: LEAD_TAG_REPOSITORY, useClass: PrismaLeadTagRepository },
    { provide: LEAD_EVENT_PUBLISHER, useClass: WorkflowLeadEventPublisher },

    // Use cases — lead lifecycle
    CaptureLeadUseCase,
    CreateLeadUseCase,
    GetLeadUseCase,
    ListLeadsUseCase,
    UpdateLeadUseCase,
    ChangeLeadStatusUseCase,
    AssignLeadUseCase,
    AddLeadNoteUseCase,
    ConvertLeadUseCase,
    ListLeadActivitiesUseCase,

    // Use cases — tags
    SetLeadTagsUseCase,
    ListLeadTagsUseCase,
    CreateLeadTagUseCase,
  ],
})
export class LeadsModule {}
