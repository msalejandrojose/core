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
import { CreateSendingAccountUseCase } from '../../application/use-cases/create-sending-account.use-case';
import { DeleteSendingAccountUseCase } from '../../application/use-cases/delete-sending-account.use-case';
import { GetSendingAccountUseCase } from '../../application/use-cases/get-sending-account.use-case';
import { ListSendingAccountsUseCase } from '../../application/use-cases/list-sending-accounts.use-case';
import { UpdateSendingAccountUseCase } from '../../application/use-cases/update-sending-account.use-case';
import { CreateSendingAccountDto } from './dto/create-sending-account.dto';
import { ListSendingAccountsQueryDto } from './dto/list-sending-accounts.query.dto';
import { SendingAccountResponseDto } from './dto/sending-account.response.dto';
import { UpdateSendingAccountDto } from './dto/update-sending-account.dto';

@ApiTags('notifications')
@Controller('sending-accounts')
export class SendingAccountsController {
  constructor(
    private readonly listAccounts: ListSendingAccountsUseCase,
    private readonly getAccount: GetSendingAccountUseCase,
    private readonly createAccount: CreateSendingAccountUseCase,
    private readonly updateAccount: UpdateSendingAccountUseCase,
    private readonly deleteAccount: DeleteSendingAccountUseCase,
  ) {}

  @Get()
  @RequiresPermission('notifications', 'READ')
  @ApiOperation({ summary: 'Listar cuentas de envío' })
  @ApiCursorPaginatedResponse(SendingAccountResponseDto)
  async list(
    @Query() query: ListSendingAccountsQueryDto,
  ): Promise<CursorPaginatedResponseDto<SendingAccountResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.listAccounts.execute({
      limit,
      cursor: query.cursor,
      typeId: query.typeId,
      isActive: query.isActive,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((a) => SendingAccountResponseDto.fromDomain(a)),
      page.nextCursor,
      limit,
    );
  }

  @Post()
  @RequiresPermission('notifications', 'WRITE')
  @ApiOperation({ summary: 'Crear una cuenta de envío' })
  @ApiCreatedResponse({ type: SendingAccountResponseDto })
  async create(
    @Body() dto: CreateSendingAccountDto,
  ): Promise<SendingAccountResponseDto> {
    return SendingAccountResponseDto.fromDomain(
      await this.createAccount.execute(dto),
    );
  }

  @Get(':id')
  @RequiresPermission('notifications', 'READ')
  @ApiOperation({ summary: 'Obtener una cuenta de envío' })
  @ApiOkResponse({ type: SendingAccountResponseDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SendingAccountResponseDto> {
    return SendingAccountResponseDto.fromDomain(
      await this.getAccount.execute(id),
    );
  }

  @Get(':id/message-schema')
  @RequiresPermission('notifications', 'READ')
  @ApiOperation({
    summary: 'Schema de contenido del canal de la cuenta (para el editor)',
  })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: { type: 'object', additionalProperties: true },
    },
  })
  async messageSchema(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<unknown[]> {
    const account = await this.getAccount.execute(id);
    return account.type?.messageSchema ?? [];
  }

  @Patch(':id')
  @RequiresPermission('notifications', 'WRITE')
  @ApiOperation({ summary: 'Editar una cuenta de envío' })
  @ApiOkResponse({ type: SendingAccountResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSendingAccountDto,
  ): Promise<SendingAccountResponseDto> {
    return SendingAccountResponseDto.fromDomain(
      await this.updateAccount.execute(id, dto),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiresPermission('notifications', 'DELETE')
  @ApiOperation({
    summary: 'Borrar una cuenta de envío (si no tiene mensajes)',
  })
  @ApiNoContentResponse()
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteAccount.execute(id);
  }
}
