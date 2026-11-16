import type { AiAgent } from '../../domain/agents';
import type { AgentsRepositoryPort } from '../ports/agents-repository.port';
import type {
  LlmClientPort,
  LlmRequest,
  LlmResponse,
} from '../ports/llm-client.port';
import { AgentToolRegistry } from '../tool-registry';
import { ChatWithAgentUseCase } from './chat.use-case';

const AGENT: AiAgent = {
  id: 'a1',
  code: 'coach',
  name: 'Coach',
  description: null,
  instructions: 'Eres un coach.',
  model: {
    id: 'm1',
    provider: 'OPENAI',
    modelId: 'gpt-6-luna',
    label: 'GPT-6 Luna',
    inputPricePerM: 0.1,
    cachedInputPricePerM: 0.01,
    outputPricePerM: 0.5,
    efforts: ['none', 'low', 'medium'],
    enabled: true,
    sortOrder: 0,
  },
  reasoningEffort: 'low',
  maxOutputTokens: 500,
  tools: ['get_day'],
  skills: [],
  enabled: true,
};

const usage = (i: number, o: number) => ({
  inputTokens: i,
  cachedInputTokens: 0,
  outputTokens: o,
  reasoningTokens: 0,
});

function setup(responses: LlmResponse[]) {
  const logs: unknown[] = [];
  const repo = {
    findAgentByCode: jest.fn().mockResolvedValue(AGENT),
    createConversation: jest.fn().mockResolvedValue({
      id: 'c1',
      agentId: 'a1',
      title: 't',
      updatedAt: new Date(),
    }),
    findConversation: jest.fn(),
    listMessages: jest.fn().mockResolvedValue([]),
    addMessage: jest
      .fn()
      .mockImplementation(
        (_c: string, role: string, content: string, tools?: string[]) =>
          Promise.resolve({
            id: 'm',
            role,
            content,
            toolsUsed: tools ?? [],
            createdAt: new Date(),
          }),
      ),
    touchConversation: jest.fn(),
    logRequest: jest.fn().mockImplementation((l) => logs.push(l)),
    userFirstName: jest.fn().mockResolvedValue('Ana'),
  } as unknown as AgentsRepositoryPort;
  const requests: LlmRequest[] = [];
  const llm: LlmClientPort = {
    respond: jest.fn().mockImplementation((r: LlmRequest) => {
      requests.push(r);
      return Promise.resolve(responses.shift());
    }),
  };
  const registry = new AgentToolRegistry();
  const run = jest.fn().mockResolvedValue({ kcalIn: 1200 });
  registry.register({
    code: 'get_day',
    label: 'Día',
    description: 'd',
    parameters: {},
    run,
  });
  registry.register({
    code: 'secret',
    label: 'S',
    description: 's',
    parameters: {},
    run: jest.fn(),
  });
  return {
    useCase: new ChatWithAgentUseCase(repo, llm, registry),
    requests,
    logs,
    run,
    repo,
  };
}

describe('ChatWithAgentUseCase', () => {
  it('ejecuta las herramientas que pide el modelo y registra cada llamada con su coste', async () => {
    const { useCase, requests, logs, run } = setup([
      {
        id: 'r1',
        text: '',
        functionCalls: [
          { callId: 'k1', name: 'get_day', arguments: '{"day":"2026-11-16"}' },
        ],
        usage: usage(1000, 100),
      },
      {
        id: 'r2',
        text: 'Llevas 1.200 kcal.',
        functionCalls: [],
        usage: usage(1500, 200),
      },
    ]);
    const out = await useCase.execute({
      agentCode: 'coach',
      userId: 'u1',
      message: '¿Cuánto llevo?',
    });

    expect(out.message.content).toBe('Llevas 1.200 kcal.');
    expect(out.message.toolsUsed).toEqual(['get_day']);
    expect(run).toHaveBeenCalledWith(
      { day: '2026-11-16' },
      { userId: 'u1', timeZone: 'Europe/Madrid' },
    );
    // Solo se ofrecen las herramientas del agente.
    expect(requests[0].tools.map((t) => t.name)).toEqual(['get_day']);
    expect(requests[0].effort).toBe('low');
    // La segunda llamada continúa la primera con el resultado de la herramienta.
    expect(requests[1].previousResponseId).toBe('r1');
    expect(requests[1].input).toEqual([
      { type: 'function_call_output', callId: 'k1', output: '{"kcalIn":1200}' },
    ]);
    expect(logs).toHaveLength(2);
    expect(out.usage).toEqual(usage(2500, 300));
    // 2.500×0,10 + 300×0,50 = 250 + 150 = 400 / 1e6
    expect(out.costUsd).toBe(0.0004);
  });

  it('no ejecuta una herramienta que el agente no tiene', async () => {
    const { useCase, requests } = setup([
      {
        id: 'r1',
        text: '',
        functionCalls: [{ callId: 'k1', name: 'secret', arguments: '{}' }],
        usage: usage(10, 1),
      },
      { id: 'r2', text: 'Vale.', functionCalls: [], usage: usage(10, 1) },
    ]);
    await useCase.execute({
      agentCode: 'coach',
      userId: 'u1',
      message: 'hola',
    });
    expect(
      String((requests[1].input[0] as { output: string }).output),
    ).toContain('no disponible');
  });

  it('si el proveedor falla, lo registra como error', async () => {
    const { useCase, repo } = setup([]);
    (repo as unknown as { logRequest: jest.Mock }).logRequest.mockClear();
    const failing = new ChatWithAgentUseCase(
      repo,
      { respond: jest.fn().mockRejectedValue(new Error('401 invalid key')) },
      new AgentToolRegistry(),
    );
    await expect(
      failing.execute({ agentCode: 'coach', userId: 'u1', message: 'hola' }),
    ).rejects.toThrow();
    expect(
      (repo as unknown as { logRequest: jest.Mock }).logRequest,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ERROR',
        error: '401 invalid key',
        costUsd: 0,
      }),
    );
    void useCase;
  });
});
