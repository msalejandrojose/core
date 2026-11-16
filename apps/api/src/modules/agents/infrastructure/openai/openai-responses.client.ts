import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  LlmClientPort,
  LlmFunctionCall,
  LlmRequest,
  LlmResponse,
} from '../../application/ports/llm-client.port';

/**
 * Cliente de la Responses API de OpenAI (`POST /v1/responses`).
 *
 * - La clave va en `OPENAI_API_KEY` (nunca en el código ni en la base de datos).
 * - `OPENAI_BASE_URL` permite apuntar a otro endpoint compatible (pruebas).
 * - Las herramientas se continúan con `previous_response_id` + las salidas de
 *   las funciones (`function_call_output`).
 */
@Injectable()
export class OpenAiResponsesClient implements LlmClientPort {
  constructor(private readonly config: ConfigService) {}

  async respond(request: LlmRequest): Promise<LlmResponse> {
    const key = this.config.get<string>('OPENAI_API_KEY');
    if (!key)
      throw new Error('Falta OPENAI_API_KEY en el entorno del servidor.');
    const base = (
      this.config.get<string>('OPENAI_BASE_URL') || 'https://api.openai.com/v1'
    ).replace(/\/$/, '');

    const body: Record<string, unknown> = {
      model: request.model,
      instructions: request.instructions,
      input: request.input.map((item) =>
        'role' in item
          ? { role: item.role, content: item.content }
          : {
              type: 'function_call_output',
              call_id: item.callId,
              output: item.output,
            },
      ),
      max_output_tokens: request.maxOutputTokens,
      store: true,
    };
    if (request.tools.length) {
      body.tools = request.tools.map((t) => ({
        type: 'function',
        name: t.name,
        description: t.description,
        parameters: t.parameters,
        strict: false,
      }));
    }
    if (request.effort) body.reasoning = { effort: request.effort };
    if (request.previousResponseId)
      body.previous_response_id = request.previousResponseId;

    const res = await fetch(`${base}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    });
    const json = (await res.json().catch(() => ({}))) as OpenAiResponse;
    if (!res.ok) {
      throw new Error(
        `OpenAI ${res.status}: ${json.error?.message ?? res.statusText}`,
      );
    }
    return parseResponse(json);
  }
}

interface OpenAiResponse {
  id?: string;
  output_text?: string;
  output?: {
    type?: string;
    call_id?: string;
    name?: string;
    arguments?: string;
    content?: { type?: string; text?: string }[];
  }[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    input_tokens_details?: { cached_tokens?: number };
    output_tokens_details?: { reasoning_tokens?: number };
  };
  error?: { message?: string };
}

/** Saca texto, llamadas a funciones y uso de una respuesta de la API. */
export function parseResponse(json: OpenAiResponse): LlmResponse {
  const output = json.output ?? [];
  const functionCalls: LlmFunctionCall[] = output
    .filter((o) => o.type === 'function_call' && o.call_id && o.name)
    .map((o) => ({
      callId: o.call_id!,
      name: o.name!,
      arguments: o.arguments ?? '{}',
    }));
  const text =
    json.output_text ??
    output
      .filter((o) => o.type === 'message')
      .flatMap((o) => o.content ?? [])
      .filter((c) => c.type === 'output_text' && c.text)
      .map((c) => c.text)
      .join('\n');
  return {
    id: json.id ?? '',
    text: text ?? '',
    functionCalls,
    usage: {
      inputTokens: json.usage?.input_tokens ?? 0,
      cachedInputTokens: json.usage?.input_tokens_details?.cached_tokens ?? 0,
      outputTokens: json.usage?.output_tokens ?? 0,
      reasoningTokens: json.usage?.output_tokens_details?.reasoning_tokens ?? 0,
    },
  };
}
