import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type {
  AiAgent,
  AiModel,
  AiSkill,
  ReasoningEffort,
} from '../../domain/agents';
import type {
  AgentData,
  AgentsRepositoryPort,
  ConversationRow,
  MessageRow,
  ModelPatch,
  RequestLog,
  RequestRow,
  SkillData,
  UsageFilter,
  UsageTotals,
} from '../../application/ports/agents-repository.port';

const num = (v: unknown) => Number(v ?? 0);
const list = (v: string | null | undefined) =>
  v
    ? v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

type ModelRow = {
  id: string;
  provider: string;
  modelId: string;
  label: string;
  inputPricePerM: unknown;
  cachedInputPricePerM: unknown;
  outputPricePerM: unknown;
  efforts: string;
  enabled: boolean;
  sortOrder: number;
};
const toModel = (r: ModelRow): AiModel => ({
  id: r.id,
  provider: 'OPENAI',
  modelId: r.modelId,
  label: r.label,
  inputPricePerM: num(r.inputPricePerM),
  cachedInputPricePerM: num(r.cachedInputPricePerM),
  outputPricePerM: num(r.outputPricePerM),
  efforts: list(r.efforts) as ReasoningEffort[],
  enabled: r.enabled,
  sortOrder: r.sortOrder,
});

type SkillRow = Omit<AiSkill, never>;
const toSkill = (r: SkillRow): AiSkill => ({
  id: r.id,
  code: r.code,
  name: r.name,
  description: r.description,
  instructions: r.instructions,
  enabled: r.enabled,
});

const AGENT_INCLUDE = {
  model: true,
  skills: { include: { skill: true } },
} as const;

type AgentRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  instructions: string;
  reasoningEffort: string;
  maxOutputTokens: number;
  tools: string;
  enabled: boolean;
  model: ModelRow;
  skills: { skill: SkillRow }[];
};
const toAgent = (r: AgentRow): AiAgent => ({
  id: r.id,
  code: r.code,
  name: r.name,
  description: r.description,
  instructions: r.instructions,
  model: toModel(r.model),
  reasoningEffort: r.reasoningEffort as ReasoningEffort,
  maxOutputTokens: r.maxOutputTokens,
  tools: list(r.tools),
  skills: r.skills
    .map((s) => toSkill(s.skill))
    .sort((a, b) => a.name.localeCompare(b.name)),
  enabled: r.enabled,
});

const toMessage = (r: {
  id: string;
  role: string;
  content: string;
  toolsUsed: string | null;
  createdAt: Date;
}): MessageRow => ({
  id: r.id,
  role: r.role as MessageRow['role'],
  content: r.content,
  toolsUsed: list(r.toolsUsed),
  createdAt: r.createdAt,
});

@Injectable()
export class PrismaAgentsRepository implements AgentsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async listModels(): Promise<AiModel[]> {
    const rows = await this.prisma.aiModel.findMany({
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    return rows.map(toModel);
  }

  async findModel(id: string): Promise<AiModel | null> {
    const row = await this.prisma.aiModel.findUnique({ where: { id } });
    return row ? toModel(row) : null;
  }

  async updateModel(id: string, patch: ModelPatch): Promise<AiModel | null> {
    const { count } = await this.prisma.aiModel.updateMany({
      where: { id },
      data: patch,
    });
    return count ? this.findModel(id) : null;
  }

  async listSkills(): Promise<AiSkill[]> {
    const rows = await this.prisma.aiSkill.findMany({
      orderBy: { name: 'asc' },
    });
    return rows.map(toSkill);
  }

  async createSkill(data: SkillData): Promise<AiSkill> {
    return toSkill(await this.prisma.aiSkill.create({ data }));
  }

  async updateSkill(id: string, data: SkillData): Promise<AiSkill | null> {
    const { count } = await this.prisma.aiSkill.updateMany({
      where: { id },
      data,
    });
    if (!count) return null;
    const row = await this.prisma.aiSkill.findUnique({ where: { id } });
    return row ? toSkill(row) : null;
  }

  async deleteSkill(id: string): Promise<boolean> {
    const { count } = await this.prisma.aiSkill.deleteMany({ where: { id } });
    return count > 0;
  }

  async listAgents(): Promise<AiAgent[]> {
    const rows = await this.prisma.aiAgent.findMany({
      include: AGENT_INCLUDE,
      orderBy: { name: 'asc' },
    });
    return rows.map((r) => toAgent(r as unknown as AgentRow));
  }

  async findAgent(id: string): Promise<AiAgent | null> {
    const row = await this.prisma.aiAgent.findUnique({
      where: { id },
      include: AGENT_INCLUDE,
    });
    return row ? toAgent(row) : null;
  }

  async findAgentByCode(code: string): Promise<AiAgent | null> {
    const row = await this.prisma.aiAgent.findUnique({
      where: { code },
      include: AGENT_INCLUDE,
    });
    return row ? toAgent(row) : null;
  }

  private agentFields(data: AgentData) {
    return {
      code: data.code,
      name: data.name,
      description: data.description,
      instructions: data.instructions,
      modelId: data.modelId,
      reasoningEffort: data.reasoningEffort,
      maxOutputTokens: data.maxOutputTokens,
      tools: data.tools.join(','),
      enabled: data.enabled,
    };
  }

  async createAgent(data: AgentData): Promise<AiAgent> {
    const row = await this.prisma.aiAgent.create({
      data: {
        ...this.agentFields(data),
        skills: { create: data.skillIds.map((skillId) => ({ skillId })) },
      },
    });
    return (await this.findAgent(row.id))!;
  }

  async updateAgent(id: string, data: AgentData): Promise<AiAgent | null> {
    const exists = await this.prisma.aiAgent.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) return null;
    await this.prisma.$transaction([
      this.prisma.aiAgent.update({
        where: { id },
        data: this.agentFields(data),
      }),
      this.prisma.aiAgentSkill.deleteMany({ where: { agentId: id } }),
      this.prisma.aiAgentSkill.createMany({
        data: data.skillIds.map((skillId) => ({ agentId: id, skillId })),
      }),
    ]);
    return this.findAgent(id);
  }

  async createConversation(
    agentId: string,
    userId: string,
    title: string,
  ): Promise<ConversationRow> {
    return this.prisma.aiConversation.create({
      data: { agentId, userId, title },
      select: { id: true, agentId: true, title: true, updatedAt: true },
    });
  }

  findConversation(
    id: string,
    userId: string,
  ): Promise<ConversationRow | null> {
    return this.prisma.aiConversation.findFirst({
      where: { id, userId },
      select: { id: true, agentId: true, title: true, updatedAt: true },
    });
  }

  listConversations(
    agentId: string,
    userId: string,
    limit: number,
  ): Promise<ConversationRow[]> {
    return this.prisma.aiConversation.findMany({
      where: { agentId, userId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: { id: true, agentId: true, title: true, updatedAt: true },
    });
  }

  async touchConversation(id: string): Promise<void> {
    await this.prisma.aiConversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
  }

  async listMessages(
    conversationId: string,
    limit: number,
  ): Promise<MessageRow[]> {
    const rows = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.reverse().map(toMessage);
  }

  async addMessage(
    conversationId: string,
    role: 'USER' | 'ASSISTANT',
    content: string,
    toolsUsed: string[] = [],
  ): Promise<MessageRow> {
    const row = await this.prisma.aiMessage.create({
      data: {
        conversationId,
        role,
        content,
        toolsUsed: toolsUsed.length ? toolsUsed.join(',') : null,
      },
    });
    return toMessage(row);
  }

  async deleteConversation(id: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.aiConversation.deleteMany({
      where: { id, userId },
    });
    return count > 0;
  }

  async logRequest(log: RequestLog): Promise<void> {
    await this.prisma.aiRequest.create({
      data: {
        agentId: log.agentId,
        userId: log.userId,
        conversationId: log.conversationId,
        provider: log.provider,
        modelId: log.modelId,
        reasoningEffort: log.reasoningEffort,
        inputTokens: log.inputTokens,
        cachedInputTokens: log.cachedInputTokens,
        outputTokens: log.outputTokens,
        reasoningTokens: log.reasoningTokens,
        costUsd: log.costUsd,
        durationMs: log.durationMs,
        status: log.status,
        error: log.error,
        toolCalls: log.toolCalls.length ? log.toolCalls.join(',') : null,
      },
    });
  }

  private where(filter: UsageFilter) {
    return {
      ...(filter.agentId ? { agentId: filter.agentId } : {}),
      ...(filter.from || filter.to
        ? {
            createdAt: {
              ...(filter.from ? { gte: filter.from } : {}),
              ...(filter.to ? { lt: filter.to } : {}),
            },
          }
        : {}),
    };
  }

  async listRequests(filter: UsageFilter, page: number, limit: number) {
    const where = this.where(filter);
    const [rows, total] = await Promise.all([
      this.prisma.aiRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          agent: { select: { name: true } },
          user: { select: { email: true } },
        },
      }),
      this.prisma.aiRequest.count({ where }),
    ]);
    const items: RequestRow[] = rows.map((r) => ({
      id: r.id,
      agentId: r.agentId,
      agentName: r.agent?.name ?? null,
      userId: r.userId,
      userEmail: r.user?.email ?? null,
      conversationId: r.conversationId,
      provider: r.provider,
      modelId: r.modelId,
      reasoningEffort: r.reasoningEffort,
      inputTokens: r.inputTokens,
      cachedInputTokens: r.cachedInputTokens,
      outputTokens: r.outputTokens,
      reasoningTokens: r.reasoningTokens,
      costUsd: num(r.costUsd),
      durationMs: r.durationMs,
      status: r.status as 'OK' | 'ERROR',
      error: r.error,
      toolCalls: list(r.toolCalls),
      createdAt: r.createdAt,
    }));
    return { items, total };
  }

  private totals(
    agg: {
      _count: { _all: number };
      _sum: {
        inputTokens: number | null;
        cachedInputTokens: number | null;
        outputTokens: number | null;
        reasoningTokens: number | null;
        costUsd: unknown;
      };
    },
    errors: number,
  ): UsageTotals {
    return {
      requests: agg._count._all,
      errors,
      inputTokens: agg._sum.inputTokens ?? 0,
      cachedInputTokens: agg._sum.cachedInputTokens ?? 0,
      outputTokens: agg._sum.outputTokens ?? 0,
      reasoningTokens: agg._sum.reasoningTokens ?? 0,
      costUsd: Math.round(num(agg._sum.costUsd) * 1_000_000) / 1_000_000,
    };
  }

  private readonly sums = {
    inputTokens: true,
    cachedInputTokens: true,
    outputTokens: true,
    reasoningTokens: true,
    costUsd: true,
  } as const;

  async usageTotals(filter: UsageFilter): Promise<UsageTotals> {
    const where = this.where(filter);
    const [agg, errors] = await Promise.all([
      this.prisma.aiRequest.aggregate({
        where,
        _count: { _all: true },
        _sum: this.sums,
      }),
      this.prisma.aiRequest.count({ where: { ...where, status: 'ERROR' } }),
    ]);
    return this.totals(agg, errors);
  }

  async usageByAgent(filter: UsageFilter) {
    const where = this.where(filter);
    const [groups, errorGroups, agents] = await Promise.all([
      this.prisma.aiRequest.groupBy({
        by: ['agentId'],
        where,
        _count: { _all: true },
        _sum: this.sums,
      }),
      this.prisma.aiRequest.groupBy({
        by: ['agentId'],
        where: { ...where, status: 'ERROR' },
        _count: { _all: true },
      }),
      this.prisma.aiAgent.findMany({ select: { id: true, name: true } }),
    ]);
    const names = new Map(agents.map((a) => [a.id, a.name]));
    const errs = new Map(errorGroups.map((g) => [g.agentId, g._count._all]));
    return groups
      .map((g) => ({
        agentId: g.agentId,
        agentName: g.agentId ? (names.get(g.agentId) ?? null) : null,
        ...this.totals(g, errs.get(g.agentId) ?? 0),
      }))
      .sort((a, b) => b.costUsd - a.costUsd);
  }

  async userFirstName(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true },
    });
    return user?.firstName ?? null;
  }
}
