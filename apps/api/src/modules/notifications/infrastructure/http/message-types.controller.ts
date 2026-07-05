import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiCursorPaginatedResponse,
  CursorPaginatedResponseDto,
} from '../../../../shared/pagination';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { CreateMessageTypeUseCase } from '../../application/use-cases/create-message-type.use-case';
import { DeleteMessageTypeUseCase } from '../../application/use-cases/delete-message-type.use-case';
import { GetMessageTypeUseCase } from '../../application/use-cases/get-message-type.use-case';
import { ListMessageTypesUseCase } from '../../application/use-cases/list-message-types.use-case';
import { UpdateMessageTypeUseCase } from '../../application/use-cases/update-message-type.use-case';
import { SendNotificationUseCase } from '../../application/use-cases/send-notification.use-case';
import { CreateMessageTypeDto } from './dto/create-message-type.dto';
import { ListMessageTypesQueryDto } from './dto/list-message-types.query.dto';
import { MessageTypeResponseDto } from './dto/message-type.response.dto';
import { PreviewMessageTypeDto } from './dto/preview-message-type.dto';
import { SendResultResponseDto } from './dto/send-result.response.dto';
import { UpdateMessageTypeDto } from './dto/update-message-type.dto';

@ApiTags('notifications')
@Controller('message-types')
export class MessageTypesController {
  constructor(
    private readonly listMessageTypes: ListMessageTypesUseCase,
    private readonly getMessageType: GetMessageTypeUseCase,
    private readonly createMessageType: CreateMessageTypeUseCase,
    private readonly updateMessageType: UpdateMessageTypeUseCase,
    private readonly deleteMessageType: DeleteMessageTypeUseCase,
    private readonly sendNotification: SendNotificationUseCase,
  ) {}

  @Get()
  @RequiresPermission('notifications', 'READ')
  @ApiOperation({ summary: 'Listar tipos de mensaje' })
  @ApiCursorPaginatedResponse(MessageTypeResponseDto)
  async list(
    @Query() query: ListMessageTypesQueryDto,
  ): Promise<CursorPaginatedResponseDto<MessageTypeResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.listMessageTypes.execute({
      limit,
      cursor: query.cursor,
      accountId: query.accountId,
      isActive: query.isActive,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((m) => MessageTypeResponseDto.fromDomain(m)),
      page.nextCursor,
      limit,
    );
  }

  @Post()
  @RequiresPermission('notifications', 'WRITE')
  @ApiOperation({ summary: 'Crear un tipo de mensaje' })
  @ApiCreatedResponse({ type: MessageTypeResponseDto })
  async create(
    @Body() dto: CreateMessageTypeDto,
  ): Promise<MessageTypeResponseDto> {
    return MessageTypeResponseDto.fromDomain(
      await this.createMessageType.execute(dto),
    );
  }

  @Get(':id')
  @RequiresPermission('notifications', 'READ')
  @ApiOperation({ summary: 'Obtener un tipo de mensaje' })
  @ApiOkResponse({ type: MessageTypeResponseDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageTypeResponseDto> {
    return MessageTypeResponseDto.fromDomain(
      await this.getMessageType.execute(id),
    );
  }

  @Patch(':id')
  @RequiresPermission('notifications', 'WRITE')
  @ApiOperation({ summary: 'Editar un tipo de mensaje' })
  @ApiOkResponse({ type: MessageTypeResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMessageTypeDto,
  ): Promise<MessageTypeResponseDto> {
    return MessageTypeResponseDto.fromDomain(
      await this.updateMessageType.execute(id, dto),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiresPermission('notifications', 'DELETE')
  @ApiOperation({ summary: 'Borrar un tipo de mensaje' })
  @ApiNoContentResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteMessageType.execute(id);
  }

  @Post(':id/preview')
  @RequiresPermission('notifications', 'READ')
  @ApiOperation({
    summary: 'Render de prueba de un tipo de mensaje (dry-run, no envía)',
  })
  @ApiOkResponse({ type: SendResultResponseDto })
  async preview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PreviewMessageTypeDto,
  ): Promise<SendResultResponseDto> {
    const result = await this.sendNotification.executeById(id, {
      to: dto.to ?? 'preview@example.com',
      variables: dto.variables,
      dryRun: true,
    });
    return SendResultResponseDto.fromResult(result);
  }
}
