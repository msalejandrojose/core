import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  buildInstructions,
  conversationTitle,
  costUsd,
  effortFor,
  sumUsage,
  type AiAgent,
  type TokenUsage,
} from '../../domain/agents';
import {
  AGENTS_REPOSITORY,
  type AgentsRepositoryPort,
  type MessageRow,
} from '../ports/agents-repository.port';
import {
  LLM_CLIENT,
  type LlmClientPort,
  type LlmInputItem,
  type LlmResponse,
} from '../ports/llm-client.port';
import { AgentToolRegistry, type AgentToolContext } from '../tool-registry';

/** Rondas máximas de herramientas por mensaje, para no quedarse en bucle. */
const MAX_ROUNDS = 6;
/** Mensajes anteriores que se mandan como contexto. */
const HISTORY = 20;

export interface ChatInput {
  agentCode: string;
  userId: string;
  conversationId?: string;
  message: string;
  /** Fotos como data URL. Se mandan al modelo, pero no se guardan. */
  images?: string[];
  timeZone?: string;
}

export interface ChatResult {
  conversationId: string;
  message: MessageRow;
  usage: TokenUsage;
  costUsd: number;
}

/**
 * Un mensaje de la persona a un agente: monta las instrucciones (agente +
 * skills + contexto), manda el historial, ejecuta las herramientas que pida el
 * modelo (solo las permitidas al agente) y guarda la respuesta. Cada llamada
 * al proveedor queda registrada con sus tokens y su coste.
 */
@Injectable()
export class ChatWithAgentUseCase {
  private readonly logger = new Logger(ChatWithAgentUseCase.name);

  constructor(
    @Inject(AGENTS_REPOSITORY)
    private readonly repo: AgentsRepositoryPort,
    @Inject(LLM_CLIENT)
    private readonly llm: LlmClientPort,
    private readonly registry: AgentToolRegistry,
  ) {}

  async execute(input: ChatInput): Promise<ChatResult> {
    const agent = await this.repo.findAgentByCode(input.agentCode);
    if (!agent || !agent.enabled || !agent.model.enabled) {
      throw new NotFoundException('AGENT_NOT_FOUND');
    }

    const conversation = input.conversationId
      ? await this.repo.findConversation(input.conversationId, input.userId)
      : await this.repo.createConversation(
          agent.id,
          input.userId,
          conversationTitle(input.message),
        );
    if (!conversation || conversation.agentId !== agent.id) {
      throw new NotFoundException('CONVERSATION_NOT_FOUND');
    }

    const history = await this.repo.listMessages(conversation.id, HISTORY);
    const images = input.images ?? [];
    await this.repo.addMessage(
      conversation.id,
      'USER',
      input.message,
      [],
      images.length,
    );

    const ctx: AgentToolContext = {
      userId: input.userId,
      timeZone: input.timeZone || 'Europe/Madrid',
    };
    const instructions = buildInstructions(agent, {
      now: new Date(),
      timeZone: ctx.timeZone,
      userName: await this.repo.userFirstName(input.userId),
    });
    const tools = agent.tools
      .map((code) => this.registry.get(code))
      .filter((t): t is NonNullable<typeof t> => !!t);

    let next: LlmInputItem[] = [
      ...history.map((m) => ({
        role: m.role === 'USER' ? ('user' as const) : ('assistant' as const),
        content: m.imageCount
          ? `${m.content}\n(Con ${m.imageCount} foto${m.imageCount > 1 ? 's' : ''} que ya no está${m.imageCount > 1 ? 'n' : ''} disponible${m.imageCount > 1 ? 's' : ''}.)`
          : m.content,
      })),
      { role: 'user', content: input.message, images },
    ];
    let previousResponseId: string | undefined;
    let usage: TokenUsage = {
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
    };
    let cost = 0;
    let reply = '';
    const used = new Set<string>();

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const response = await this.call(agent, conversation.id, input.userId, {
        model: agent.model.modelId,
        instructions,
        input: next,
        tools: tools.map((t) => ({
          name: t.code,
          description: t.description,
          parameters: t.parameters,
        })),
        effort: effortFor(agent.model, agent.reasoningEffort),
        maxOutputTokens: agent.maxOutputTokens,
        previousResponseId,
      });
      usage = sumUsage(usage, response.usage);
      cost += costUsd(response.usage, agent.model);

      if (response.functionCalls.length === 0) {
        reply = response.text.trim();
        break;
      }

      next = [];
      for (const fc of response.functionCalls) {
        used.add(fc.name);
        next.push({
          type: 'function_call_output',
          callId: fc.callId,
          output: await this.runTool(agent, fc.name, fc.arguments, ctx),
        });
      }
      previousResponseId = response.id;
    }

    if (!reply) {
      reply =
        'No he podido terminar la respuesta. ¿Me lo preguntas de otra forma?';
    }
    const message = await this.repo.addMessage(
      conversation.id,
      'ASSISTANT',
      reply,
      [...used],
    );
    await this.repo.touchConversation(conversation.id);
    return {
      conversationId: conversation.id,
      message,
      usage,
      costUsd: Math.round(cost * 1_000_000) / 1_000_000,
    };
  }

  /** Llama al proveedor y deja constancia de la llamada, vaya bien o mal. */
  private async call(
    agent: AiAgent,
    conversationId: string,
    userId: string,
    request: Parameters<LlmClientPort['respond']>[0],
  ): Promise<LlmResponse> {
    const started = Date.now();
    const base = {
      agentId: agent.id,
      userId,
      conversationId,
      provider: agent.model.provider,
      modelId: agent.model.modelId,
      reasoningEffort: request.effort,
    };
    try {
      const response = await this.llm.respond(request);
      await this.repo.logRequest({
        ...base,
        ...response.usage,
        costUsd: costUsd(response.usage, agent.model),
        durationMs: Date.now() - started,
        status: 'OK',
        error: null,
        toolCalls: response.functionCalls.map((f) => f.name),
      });
      return response;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Fallo del proveedor (${agent.model.modelId}): ${error}`,
      );
      await this.repo.logRequest({
        ...base,
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        costUsd: 0,
        durationMs: Date.now() - started,
        status: 'ERROR',
        error: error.slice(0, 1000),
        toolCalls: [],
      });
      throw new ServiceUnavailableException('AI_PROVIDER_ERROR');
    }
  }

  /** Ejecuta una herramienta permitida y devuelve su resultado como texto. */
  private async runTool(
    agent: AiAgent,
    name: string,
    rawArgs: string,
    ctx: AgentToolContext,
  ): Promise<string> {
    const tool = agent.tools.includes(name)
      ? this.registry.get(name)
      : undefined;
    if (!tool)
      return JSON.stringify({ error: `Herramienta no disponible: ${name}` });
    try {
      const args = rawArgs
        ? (JSON.parse(rawArgs) as Record<string, unknown>)
        : {};
      return JSON.stringify(await tool.run(args, ctx));
    } catch (err) {
      return JSON.stringify({
        error:
          err instanceof Error
            ? err.message
            : 'Error al ejecutar la herramienta',
      });
    }
  }
}
