import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { CursorMetaDto } from '../dto/pagination-meta.dto';

// Documenta una respuesta paginada por cursor sin perder el tipo del item.
// Se emite un schema `object` inline (en vez de `allOf` sobre el DTO genérico)
// para que `openapi-typescript` genere `{ data: ItemDto[]; meta: CursorMetaDto }`
// limpio en el cliente, en vez de un `unknown[]` por el `data` sin tipar del
// envelope genérico.
export function ApiCursorPaginatedResponse<T extends Type<unknown>>(itemType: T) {
  return applyDecorators(
    ApiExtraModels(CursorMetaDto, itemType),
    ApiOkResponse({
      schema: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(itemType) },
          },
          meta: { $ref: getSchemaPath(CursorMetaDto) },
        },
      },
    }),
  );
}
