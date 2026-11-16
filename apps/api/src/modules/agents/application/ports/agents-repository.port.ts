import type {
  AiAgent,
  AiModel,
  AiSkill,
  ReasoningEffort,
  TokenUsage,
} from '../../domain/agents';

export const AGENTS_REPOSITORY = Symbol('AGENTS_REPOSITORY');

export interface ModelPatch {
  label?: string;
  inputPricePerM?: number;
  cachedInputPricePerM?: number;
  outputPricePerM?: number;
  enabled?: boolean;
}

export interface SkillData {
  code: string;
  name: string;
  description: string | null;
  instructions: string;
  enabled: boolean;
}

export interface AgentData {
  code: string;
  name: string;
  description: string | null;
  instructions: string;
  /** Id interno del modelo (AiModel.id). */
  modelId: string;
  reasoningEffort: ReasoningEffort;
  maxOutputTokens: number;
  tools: string[];
  skillIds: string[];
  enabled: boolean;
}

export interface ConversationRow {
  id: string;
  agentId: string;
  title: string;
  updatedAt: Date;
}

export interface MessageRow {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  toolsUsed: string[];
  imageCount: number;
  createdAt: Date;
}

export interface RequestLog extends TokenUsage {
  agentId: string | null;
  userId: string | null;
  conversationId: string | null;
  provider: string;
  modelId: string;
  reasoningEffort: string | null;
  costUsd: number;
  durationMs: number;
  status: 'OK' | 'ERROR';
  error: string | null;
  toolCalls: string[];
}

export interface RequestRow extends RequestLog {
  id: string;
  agentName: string | null;
  userEmail: string | null;
  createdAt: Date;
}

export interface UsageFilter {
  agentId?: string;
  from?: Date;
  to?: Date;
}

export interface UsageTotals extends TokenUsage {
  requests: number;
  errors: number;
  costUsd: number;
}

export interface AgentsRepositoryPort {
  listModels(): Promise<AiModel[]>;
  findModel(id: string): Promise<AiModel | null>;
  updateModel(id: string, patch: ModelPatch): Promise<AiModel | null>;

  listSkills(): Promise<AiSkill[]>;
  createSkill(data: SkillData): Promise<AiSkill>;
  updateSkill(id: string, data: SkillData): Promise<AiSkill | null>;
  deleteSkill(id: string): Promise<boolean>;

  listAgents(): Promise<AiAgent[]>;
  findAgent(id: string): Promise<AiAgent | null>;
  findAgentByCode(code: string): Promise<AiAgent | null>;
  createAgent(data: AgentData): Promise<AiAgent>;
  updateAgent(id: string, data: AgentData): Promise<AiAgent | null>;

  createConversation(
    agentId: string,
    userId: string,
    title: string,
  ): Promise<ConversationRow>;
  findConversation(id: string, userId: string): Promise<ConversationRow | null>;
  listConversations(
    agentId: string,
    userId: string,
    limit: number,
  ): Promise<ConversationRow[]>;
  touchConversation(id: string): Promise<void>;
  listMessages(conversationId: string, limit: number): Promise<MessageRow[]>;
  addMessage(
    conversationId: string,
    role: 'USER' | 'ASSISTANT',
    content: string,
    toolsUsed?: string[],
    imageCount?: number,
  ): Promise<MessageRow>;
  deleteConversation(id: string, userId: string): Promise<boolean>;

  logRequest(log: RequestLog): Promise<void>;
  listRequests(
    filter: UsageFilter,
    page: number,
    limit: number,
  ): Promise<{ items: RequestRow[]; total: number }>;
  usageTotals(filter: UsageFilter): Promise<UsageTotals>;
  usageByAgent(
    filter: UsageFilter,
  ): Promise<
    (UsageTotals & { agentId: string | null; agentName: string | null })[]
  >;
  /** Nombre de pila del usuario, para el contexto del agente. */
  userFirstName(userId: string): Promise<string | null>;
}
