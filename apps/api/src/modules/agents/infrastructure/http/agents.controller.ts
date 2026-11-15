import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import {
  AGENTS_REPOSITORY,
  type AgentsRepositoryPort,
} from '../../application/ports/agents-repository.port';
import { ChatWithAgentUseCase } from '../../application/use-cases/chat.use-case';
import {
  AiConversationDto,
  AiMessageDto,
  ChatRequestDto,
  ChatResponseDto,
} from './dto/agents.dto';

// Lo que usa la app: hablar con un agente por su código y ver las
// conversaciones propias.
@ApiTags('ai')
@Auth()
@Controller('ai/agents/:code')
export class AgentsController {
  constructor(
    private readonly chat: ChatWithAgentUseCase,
    @Inject(AGENTS_REPOSITORY) private readonly repo: AgentsRepositoryPort,
  ) {}

  @Post('chat')
  @ApiOperation({
    summary: 'Mandar un mensaje al agente y recibir su respuesta',
  })
  @ApiOkResponse({ type: ChatResponseDto })
  async send(
    @CurrentUser() current: AccessTokenPayload,
    @Param('code') code: string,
    @Body() body: ChatRequestDto,
  ): Promise<ChatResponseDto> {
    const out = await this.chat.execute({
      agentCode: code,
      userId: current.sub,
      conversationId: body.conversationId,
      message: body.message,
      timeZone: body.timeZone,
    });
    return {
      conversationId: out.conversationId,
      message: AiMessageDto.from(out.message),
    };
  }

  @Get('conversations')
  @ApiOperation({
    summary: 'Mis conversaciones con este agente (las más recientes primero)',
  })
  @ApiOkResponse({ type: [AiConversationDto] })
  async conversations(
    @CurrentUser() current: AccessTokenPayload,
    @Param('code') code: string,
  ): Promise<AiConversationDto[]> {
    const agent = await this.repo.findAgentByCode(code);
    if (!agent || !agent.enabled)
      throw new NotFoundException('AGENT_NOT_FOUND');
    const rows = await this.repo.listConversations(agent.id, current.sub, 30);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  @Get('conversations/:id/messages')
  @ApiOkResponse({ type: [AiMessageDto] })
  async messages(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AiMessageDto[]> {
    const conv = await this.repo.findConversation(id, current.sub);
    if (!conv) throw new NotFoundException('CONVERSATION_NOT_FOUND');
    return (await this.repo.listMessages(id, 200)).map((x) =>
      AiMessageDto.from(x),
    );
  }

  @Delete('conversations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    if (!(await this.repo.deleteConversation(id, current.sub))) {
      throw new NotFoundException('CONVERSATION_NOT_FOUND');
    }
  }
}
