import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListWhatsappAccountsUseCase } from '../../application/use-cases/list-accounts.use-case';
import { ListConversationsUseCase } from '../../application/use-cases/list-conversations.use-case';
import { ListMessagesUseCase } from '../../application/use-cases/list-messages.use-case';
import { SendWhatsappMessageUseCase } from '../../application/use-cases/send-whatsapp-message.use-case';
import { MarkConversationReadUseCase } from '../../application/use-cases/mark-conversation-read.use-case';
import { WhatsappAccountResponseDto } from './dto/whatsapp-account.response.dto';
import { WhatsappConversationResponseDto } from './dto/whatsapp-conversation.response.dto';
import { WhatsappMessageResponseDto } from './dto/whatsapp-message.response.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ListConversationsQueryDto } from './dto/list-conversations.query.dto';

// API del backoffice para la bandeja de WhatsApp. La entrega en tiempo real de
// mensajes nuevos va por WebSocket (namespace `/whatsapp`); estas rutas cubren
// la carga inicial, el envío y el marcado de leído.
@ApiTags('whatsapp')
@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly listAccounts: ListWhatsappAccountsUseCase,
    private readonly listConversations: ListConversationsUseCase,
    private readonly listMessages: ListMessagesUseCase,
    private readonly sendMessage: SendWhatsappMessageUseCase,
    private readonly markRead: MarkConversationReadUseCase,
  ) {}

  @Get('accounts')
  @ApiOperation({ summary: 'Lista las cuentas de WhatsApp configuradas.' })
  @ApiOkResponse({ type: WhatsappAccountResponseDto, isArray: true })
  async accounts(): Promise<WhatsappAccountResponseDto[]> {
    const accounts = await this.listAccounts.execute();
    return accounts.map((a) => WhatsappAccountResponseDto.fromSummary(a));
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Lista conversaciones (más recientes primero).' })
  @ApiOkResponse({ type: WhatsappConversationResponseDto, isArray: true })
  async conversations(
    @Query() query: ListConversationsQueryDto,
  ): Promise<WhatsappConversationResponseDto[]> {
    const items = await this.listConversations.execute(query);
    return items.map((c) => WhatsappConversationResponseDto.fromDomain(c));
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Lista los mensajes de una conversación.' })
  @ApiOkResponse({ type: WhatsappMessageResponseDto, isArray: true })
  async messages(
    @Param('id') id: string,
    @Query('limit') limit?: number,
  ): Promise<WhatsappMessageResponseDto[]> {
    const items = await this.listMessages.execute({
      conversationId: id,
      limit,
    });
    return items.map((m) => WhatsappMessageResponseDto.fromDomain(m));
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Envía un mensaje de texto a la conversación.' })
  @ApiOkResponse({ type: WhatsappMessageResponseDto })
  async send(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ): Promise<WhatsappMessageResponseDto> {
    const message = await this.sendMessage.execute({
      conversationId: id,
      body: dto.body,
    });
    return WhatsappMessageResponseDto.fromDomain(message);
  }

  @Post('conversations/:id/read')
  @ApiOperation({ summary: 'Marca la conversación como leída (unread = 0).' })
  @ApiOkResponse({ type: WhatsappConversationResponseDto })
  async read(
    @Param('id') id: string,
  ): Promise<WhatsappConversationResponseDto> {
    const conversation = await this.markRead.execute(id);
    return WhatsappConversationResponseDto.fromDomain(conversation);
  }
}
