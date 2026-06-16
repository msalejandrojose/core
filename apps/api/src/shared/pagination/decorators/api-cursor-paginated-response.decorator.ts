import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { CursorPaginatedResponseDto } from '../dto/cursor-paginated-response.dto';
import { CursorMetaDto } from '../dto/pagination-meta.dto';

export function ApiCursorPaginatedResponse<T extends Type<unknown>>(itemType: T) {
  return applyDecorators(
    ApiExtraModels(CursorPaginatedResponseDto, CursorMetaDto, itemType),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(CursorPaginatedResponseDto) },
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
