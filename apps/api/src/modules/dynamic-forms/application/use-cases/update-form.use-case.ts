import { Inject, Injectable } from '@nestjs/common';
import { Form } from '../../domain/entities/form.entity';
import { FormNotFoundError } from '../../domain/errors/form-not-found.error';
import { FormSchemaInvalidError } from '../../domain/errors/form-schema-invalid.error';
import { FORM_REPOSITORY, type FormRepositoryPort } from '../ports/form-repository.port';
import { validateFormSchema } from '../validators/form-schema.validator';

export interface UpdateFormInput {
  id: string;
  title?: string;
  description?: string | null;
  schema?: unknown;
  status?: import('../../domain/entities/form.entity').FormStatus;
}

@Injectable()
export class UpdateFormUseCase {
  constructor(
    @Inject(FORM_REPOSITORY) private readonly forms: FormRepositoryPort,
  ) {}

  async execute(input: UpdateFormInput): Promise<Form> {
    const form = await this.forms.findById(input.id);
    if (!form) throw new FormNotFoundError(input.id);

    if (input.schema !== undefined) {
      const schemaError = validateFormSchema(input.schema);
      if (schemaError) throw new FormSchemaInvalidError(schemaError);
    }

    return this.forms.update(input.id, {
      title: input.title,
      description: input.description,
      schema: input.schema,
      status: input.status,
    });
  }
}
