import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { FORM_REPOSITORY } from './application/ports/form-repository.port';
import { FORM_INSTANCE_REPOSITORY } from './application/ports/form-instance-repository.port';
import { FORM_RESPONSE_REPOSITORY } from './application/ports/form-response-repository.port';
import { FIELD_OPTIONS_REPOSITORIES } from './application/ports/field-options-repository.port';
import { FieldOptionsRegistry } from './application/services/field-options-registry.service';
import { ASYNC_VALIDATORS } from './application/ports/async-validator.port';
import { AsyncValidatorRegistry } from './application/services/async-validator-registry.service';
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
import { RoleOptionsRepository } from './infrastructure/persistence/role-options.repository';
import { CountryOptionsRepository } from './infrastructure/persistence/country-options.repository';
import { EmailAvailableValidator } from './infrastructure/validators/email-available.validator';
import { FormsController } from './infrastructure/http/forms.controller';
import { FormInstancesController } from './infrastructure/http/form-instances.controller';
import { FormResponsesController } from './infrastructure/http/form-responses.controller';
import { PublicFormsController } from './infrastructure/http/public-forms.controller';
import { FieldOptionsController } from './infrastructure/http/field-options.controller';
import { AsyncValidatorsController } from './infrastructure/http/async-validators.controller';

@Module({
  imports: [IamModule, WorkflowsModule],
  controllers: [
    FormsController,
    FormInstancesController,
    FormResponsesController,
    PublicFormsController,
    FieldOptionsController,
    AsyncValidatorsController,
  ],
  providers: [
    // Ports → Adapters
    { provide: FORM_REPOSITORY, useClass: PrismaFormRepository },
    {
      provide: FORM_INSTANCE_REPOSITORY,
      useClass: PrismaFormInstanceRepository,
    },
    {
      provide: FORM_RESPONSE_REPOSITORY,
      useClass: PrismaFormResponseRepository,
    },

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

    // Selectores con repositorio (§5 SPEC): registro + repositorios concretos.
    // NestJS no tiene providers "multi", así que agrupamos los repos en un
    // array bajo el token con una factory. Añadir una entidad nueva = registrar
    // su repo aquí y sumarlo al `inject` de la factory.
    RoleOptionsRepository,
    CountryOptionsRepository,
    {
      provide: FIELD_OPTIONS_REPOSITORIES,
      useFactory: (
        role: RoleOptionsRepository,
        country: CountryOptionsRepository,
      ) => [role, country],
      inject: [RoleOptionsRepository, CountryOptionsRepository],
    },
    FieldOptionsRegistry,

    // Validación async (§ SPEC): registro + validadores concretos. Mismo patrón
    // de factory-array que los repositorios de opciones.
    EmailAvailableValidator,
    {
      provide: ASYNC_VALIDATORS,
      useFactory: (email: EmailAvailableValidator) => [email],
      inject: [EmailAvailableValidator],
    },
    AsyncValidatorRegistry,
  ],
  // GetFormResponseUseCase se exporta para que otros módulos (leads) lean una
  // respuesta por id sin acoplarse a la persistencia de dynamic-forms.
  exports: [GetFormResponseUseCase],
})
export class DynamicFormsModule {}
