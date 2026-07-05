import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { CreateSendingAccountTypeUseCase } from '../../application/use-cases/create-sending-account-type.use-case';
import { GetSendingAccountTypeUseCase } from '../../application/use-cases/get-sending-account-type.use-case';
import { ListSendingAccountTypesUseCase } from '../../application/use-cases/list-sending-account-types.use-case';
import { CreateSendingAccountTypeDto } from './dto/create-sending-account-type.dto';
import { SendingAccountTypeResponseDto } from './dto/sending-account-type.response.dto';

@ApiTags('notifications')
@Controller('sending-account-types')
export class SendingAccountTypesController {
  constructor(
    private readonly listTypes: ListSendingAccountTypesUseCase,
    private readonly getType: GetSendingAccountTypeUseCase,
    private readonly createType: CreateSendingAccountTypeUseCase,
  ) {}

  @Get()
  @RequiresPermission('notifications', 'READ')
  @ApiOperation({ summary: 'Listar tipos de cuenta de envío' })
  @ApiOkResponse({ type: [SendingAccountTypeResponseDto] })
  async list(): Promise<SendingAccountTypeResponseDto[]> {
    const types = await this.listTypes.execute();
    return types.map((t) => SendingAccountTypeResponseDto.fromDomain(t));
  }

  @Post()
  @RequiresPermission('notifications', 'WRITE')
  @ApiOperation({ summary: 'Crear un tipo de cuenta de envío' })
  @ApiCreatedResponse({ type: SendingAccountTypeResponseDto })
  async create(
    @Body() dto: CreateSendingAccountTypeDto,
  ): Promise<SendingAccountTypeResponseDto> {
    const type = await this.createType.execute(dto);
    return SendingAccountTypeResponseDto.fromDomain(type);
  }

  @Get(':id')
  @RequiresPermission('notifications', 'READ')
  @ApiOperation({ summary: 'Obtener un tipo de cuenta de envío' })
  @ApiOkResponse({ type: SendingAccountTypeResponseDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SendingAccountTypeResponseDto> {
    return SendingAccountTypeResponseDto.fromDomain(
      await this.getType.execute(id),
    );
  }
}
