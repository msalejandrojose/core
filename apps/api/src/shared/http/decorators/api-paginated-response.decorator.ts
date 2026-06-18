import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { PaginationMetaDto } from '../dto/paginated-response.dto';

// Helper para documentar respuestas paginadas en Swagger sin perder el tipo
// del elemento. Uso:
//
//   @Get()
//   @ApiPaginatedResponse(UserResponseDto)
//   list(...) { ... }
//
// Sin esto, Swagger pintaría `data: any[]` por ser genérico.
export function ApiPaginatedResponse<T extends Type<unknown>>(itemType: T) {
  return applyDecorators(
    ApiExtraModels(PaginationMetaDto, itemType),
    ApiOkResponse({
      // Schema `object` inline (en vez de `allOf` sobre el DTO genérico) para
      // que `openapi-typescript` tipe `data` como `ItemDto[]` y no como
      // `unknown[]` heredado del `data` sin tipar del envelope.
      schema: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(itemType) },
          },
          meta: { $ref: getSchemaPath(PaginationMetaDto) },
        },
      },
    }),
  );
}
