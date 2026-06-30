import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiCursorPaginatedResponse,
  CursorPaginatedResponseDto,
} from '../../../../shared/pagination';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { GetFormResponseUseCase } from '../../application/use-cases/get-form-response.use-case';
import { ListFormResponsesUseCase } from '../../application/use-cases/list-form-responses.use-case';
import { FormResponseResponseDto } from './dto/form-response.response.dto';
import { ListFormResponsesQueryDto } from './dto/list-form-responses.query.dto';

@ApiTags('dynamic-forms')
@Controller('forms/instances/:instanceId/responses')
export class FormResponsesController {
  constructor(
    private readonly listResponses: ListFormResponsesUseCase,
    private readonly getResponse: GetFormResponseUseCase,
  ) {}

  @Get()
  @RequiresPermission('forms', 'READ')
  @ApiOperation({ summary: 'Listar respuestas de una instancia' })
  @ApiCursorPaginatedResponse(FormResponseResponseDto)
  async list(
    @Param('instanceId', ParseUUIDPipe) instanceId: string,
    @Query() query: ListFormResponsesQueryDto,
  ): Promise<CursorPaginatedResponseDto<FormResponseResponseDto>> {
    const page = await this.listResponses.execute({
      formInstanceId: instanceId,
      limit: query.limit ?? 20,
      cursor: query.cursor,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((r) => FormResponseResponseDto.fromDomain(r)),
      page.nextCursor,
      query.limit ?? 20,
    );
  }

  @Get(':responseId')
  @RequiresPermission('forms', 'READ')
  @ApiOperation({ summary: 'Obtener una respuesta' })
  @ApiOkResponse({ type: FormResponseResponseDto })
  async get(
    @Param('responseId', ParseUUIDPipe) responseId: string,
  ): Promise<FormResponseResponseDto> {
    const response = await this.getResponse.execute(responseId);
    return FormResponseResponseDto.fromDomain(response);
  }
}
