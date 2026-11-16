import type { ReasoningEffort, TokenUsage } from '../../domain/agents';

export const LLM_CLIENT = Symbol('LLM_CLIENT');

export interface LlmToolDef {
  name: string;
  description: string;
  /** JSON Schema de los argumentos. */
  parameters: Record<string, unknown>;
}

/** Elemento de entrada: un mensaje o la respuesta a una llamada a herramienta. */
export type LlmInputItem =
  | { role: 'user' | 'assistant'; content: string }
  | { type: 'function_call_output'; callId: string; output: string };

export interface LlmRequest {
  model: string;
  instructions: string;
  input: LlmInputItem[];
  tools: LlmToolDef[];
  effort: ReasoningEffort | null;
  maxOutputTokens: number;
  /** Para continuar la misma respuesta tras ejecutar herramientas. */
  previousResponseId?: string;
}

export interface LlmFunctionCall {
  callId: string;
  name: string;
  /** Argumentos en JSON tal como los manda el modelo. */
  arguments: string;
}

export interface LlmResponse {
  id: string;
  text: string;
  functionCalls: LlmFunctionCall[];
  usage: TokenUsage;
}

export interface LlmClientPort {
  respond(request: LlmRequest): Promise<LlmResponse>;
}
