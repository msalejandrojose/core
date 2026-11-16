import { parseResponse } from './openai-responses.client';

describe('parseResponse (OpenAI Responses API)', () => {
  it('saca el texto de los mensajes y el uso con caché y razonamiento', () => {
    const r = parseResponse({
      id: 'resp_1',
      output: [
        { type: 'reasoning' },
        { type: 'message', content: [{ type: 'output_text', text: 'Hola' }] },
      ],
      usage: {
        input_tokens: 120,
        output_tokens: 40,
        input_tokens_details: { cached_tokens: 20 },
        output_tokens_details: { reasoning_tokens: 10 },
      },
    });
    expect(r).toEqual({
      id: 'resp_1',
      text: 'Hola',
      functionCalls: [],
      usage: {
        inputTokens: 120,
        cachedInputTokens: 20,
        outputTokens: 40,
        reasoningTokens: 10,
      },
    });
  });

  it('saca las llamadas a funciones', () => {
    const r = parseResponse({
      id: 'resp_2',
      output: [
        {
          type: 'function_call',
          call_id: 'call_1',
          name: 'brio_get_day',
          arguments: '{}',
        },
      ],
    });
    expect(r.functionCalls).toEqual([
      { callId: 'call_1', name: 'brio_get_day', arguments: '{}' },
    ]);
    expect(r.usage.inputTokens).toBe(0);
  });
});
