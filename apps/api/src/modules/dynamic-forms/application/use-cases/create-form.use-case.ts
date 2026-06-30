import { Inject, Injectable } from '@nestjs/common';
import { Form } from '../../domain/entities/form.entity';
import { FormSchemaInvalidError } from '../../domain/errors/form-schema-invalid.error';
import { FORM_REPOSITORY, FormRepositoryPort } from '../ports/form-repository.port';
import { validateFormSchema } from '../validators/form-schema.validator';

export interface CreateFormInput {
  title: string;
  description?: string | null;
  schema: unknown;
  createdById?: string | null;
}

@Injectable()
export class CreateFormUseCase {
  constructor(
    @Inject(FORM_REPOSITORY) private readonly forms: FormRepositoryPort,
  ) {}

  async execute(input: CreateFormInput): Promise<Form> {
    const schemaError = validateFormSchema(input.schema);
    if (schemaError) throw new FormSchemaInvalidError(schemaError);

    return this.forms.create({
      title: input.title,
      description: input.description ?? null,
      schema: input.schema,
      createdById: input.createdById ?? null,
    });
  }
}
