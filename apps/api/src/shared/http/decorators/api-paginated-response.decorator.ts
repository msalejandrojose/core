import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import {
  PaginatedResponseDto,
  PaginationMetaDto,
} from '../dto/paginated-response.dto';

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
    ApiExtraModels(PaginatedResponseDto, PaginationMetaDto, itemType),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedResponseDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(itemType) },
              },
            },
          },
        ],
      },
    }),
  );
}
