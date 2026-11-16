/**
 * Agentes de IA: modelos con precio, skills y agentes configurables, y las
 * reglas puras (coste de una llamada, instrucciones finales, esfuerzo válido).
 * Sin Nest ni Prisma.
 */

export type AiProvider = 'OPENAI';
export type ReasoningEffort =
  | 'none'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh'
  | 'max';
export const REASONING_EFFORTS: ReasoningEffort[] = [
  'none',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
];

export interface AiModel {
  id: string;
  provider: AiProvider;
  /** Id en la API del proveedor, p. ej. `gpt-6-luna`. */
  modelId: string;
  label: string;
  /** USD por millón de tokens. */
  inputPricePerM: number;
  cachedInputPricePerM: number;
  outputPricePerM: number;
  efforts: ReasoningEffort[];
  enabled: boolean;
  sortOrder: number;
}

export interface AiSkill {
  id: string;
  code: string;
  name: string;
  description: string | null;
  instructions: string;
  enabled: boolean;
}

export interface AiAgent {
  id: string;
  code: string;
  name: string;
  description: string | null;
  instructions: string;
  model: AiModel;
  reasoningEffort: ReasoningEffort;
  maxOutputTokens: number;
  /** Códigos de herramientas del registro que puede usar. */
  tools: string[];
  skills: AiSkill[];
  enabled: boolean;
}

export interface TokenUsage {
  inputTokens: number;
  /** Parte de `inputTokens` que vino de caché (más barata). */
  cachedInputTokens: number;
  outputTokens: number;
  /** Parte de `outputTokens` dedicada a razonar. */
  reasoningTokens: number;
}

/** Coste en USD de una llamada, con 6 decimales. */
export function costUsd(
  usage: TokenUsage,
  price: Pick<
    AiModel,
    'inputPricePerM' | 'cachedInputPricePerM' | 'outputPricePerM'
  >,
): number {
  const cached = Math.min(usage.cachedInputTokens, usage.inputTokens);
  const fresh = usage.inputTokens - cached;
  const usd =
    (fresh * price.inputPricePerM +
      cached * price.cachedInputPricePerM +
      usage.outputTokens * price.outputPricePerM) /
    1_000_000;
  return Math.round(usd * 1_000_000) / 1_000_000;
}

export function sumUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    cachedInputTokens: a.cachedInputTokens + b.cachedInputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    reasoningTokens: a.reasoningTokens + b.reasoningTokens,
  };
}

/** El esfuerzo pedido si el modelo lo admite; si no, el más bajo que admita. */
export function effortFor(
  model: Pick<AiModel, 'efforts'>,
  wanted: ReasoningEffort,
): ReasoningEffort | null {
  if (model.efforts.length === 0) return null;
  if (model.efforts.includes(wanted)) return wanted;
  return REASONING_EFFORTS.find((e) => model.efforts.includes(e)) ?? null;
}

/**
 * Instrucciones finales: las del agente, cada skill activa con su título y el
 * contexto del momento (fecha y hora, para que «hoy» signifique hoy).
 */
export function buildInstructions(
  agent: Pick<AiAgent, 'instructions' | 'skills'>,
  context: { now: Date; timeZone: string; userName?: string | null },
): string {
  const parts = [agent.instructions.trim()];
  for (const s of agent.skills.filter((sk) => sk.enabled)) {
    parts.push(`## ${s.name}\n${s.instructions.trim()}`);
  }
  const when = new Intl.DateTimeFormat('es-ES', {
    timeZone: context.timeZone,
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(context.now);
  const ctx = [`Ahora es ${when} (${context.timeZone}).`];
  if (context.userName) ctx.push(`La persona se llama ${context.userName}.`);
  parts.push(`## Contexto\n${ctx.join(' ')}`);
  return parts.join('\n\n');
}

/** Título de una conversación a partir del primer mensaje. */
export function conversationTitle(firstMessage: string): string {
  const clean = firstMessage.replace(/\s+/g, ' ').trim();
  return clean.length <= 60 ? clean : `${clean.slice(0, 57).trimEnd()}…`;
}
