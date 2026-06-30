import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { FORM_REPOSITORY } from './application/ports/form-repository.port';
import { FORM_INSTANCE_REPOSITORY } from './application/ports/form-instance-repository.port';
import { FORM_RESPONSE_REPOSITORY } from './application/ports/form-response-repository.port';
import { CreateFormUseCase } from './application/use-cases/create-form.use-case';
import { UpdateFormUseCase } from './application/use-cases/update-form.use-case';
import { DeleteFormUseCase } from './application/use-cases/delete-form.use-case';
import { GetFormUseCase } from './application/use-cases/get-form.use-case';
import { ListFormsUseCase } from './application/use-cases/list-forms.use-case';
import { CreateFormInstanceUseCase } from './application/use-cases/create-form-instance.use-case';
import { ListFormInstancesUseCase } from './application/use-cases/list-form-instances.use-case';
import { UpdateFormInstanceUseCase } from './application/use-cases/update-form-instance.use-case';
import { DeleteFormInstanceUseCase } from './application/use-cases/delete-form-instance.use-case';
import { ListFormResponsesUseCase } from './application/use-cases/list-form-responses.use-case';
import { GetFormResponseUseCase } from './application/use-cases/get-form-response.use-case';
import { GetPublicFormUseCase } from './application/use-cases/get-public-form.use-case';
import { SubmitFormResponseUseCase } from './application/use-cases/submit-form-response.use-case';
import { PrismaFormRepository } from './infrastructure/persistence/prisma-form.repository';
import { PrismaFormInstanceRepository } from './infrastructure/persistence/prisma-form-instance.repository';
import { PrismaFormResponseRepository } from './infrastructure/persistence/prisma-form-response.repository';
import { FormsController } from './infrastructure/http/forms.controller';
import { FormInstancesController } from './infrastructure/http/form-instances.controller';
import { FormResponsesController } from './infrastructure/http/form-responses.controller';
import { PublicFormsController } from './infrastructure/http/public-forms.controller';

@Module({
  imports: [IamModule],
  controllers: [
    FormsController,
    FormInstancesController,
    FormResponsesController,
    PublicFormsController,
  ],
  providers: [
    // Ports → Adapters
    { provide: FORM_REPOSITORY, useClass: PrismaFormRepository },
    { provide: FORM_INSTANCE_REPOSITORY, useClass: PrismaFormInstanceRepository },
    { provide: FORM_RESPONSE_REPOSITORY, useClass: PrismaFormResponseRepository },

    // Use cases — forms
    CreateFormUseCase,
    UpdateFormUseCase,
    DeleteFormUseCase,
    GetFormUseCase,
    ListFormsUseCase,

    // Use cases — instances
    CreateFormInstanceUseCase,
    ListFormInstancesUseCase,
    UpdateFormInstanceUseCase,
    DeleteFormInstanceUseCase,

    // Use cases — responses
    ListFormResponsesUseCase,
    GetFormResponseUseCase,

    // Use cases — public
    GetPublicFormUseCase,
    SubmitFormResponseUseCase,
  ],
})
export class DynamicFormsModule {}
