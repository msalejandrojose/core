import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { AgentTool } from '../../../agents/application/tool-registry';
import { buildBrioMcpServer, mcpTools } from './brio-mcp.server';

const tool = (code: string, run: AgentTool['run']): AgentTool => ({
  code,
  label: code,
  description: `Hace ${code}`,
  parameters: {
    type: 'object',
    properties: { day: { type: 'string' } },
    additionalProperties: false,
  },
  run,
});

async function connect(tools: AgentTool[]) {
  const server = buildBrioMcpServer(mcpTools(tools), {
    userId: 'u1',
    timeZone: 'Europe/Madrid',
  });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '1.0.0' });
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

describe('servidor MCP de Brío', () => {
  it('publica solo las herramientas brio_* con su JSON Schema', async () => {
    const client = await connect([
      tool('brio_get_day', () => Promise.resolve({})),
      tool('otro_modulo_tool', () => Promise.resolve({})),
    ]);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(['brio_get_day']);
    expect(tools[0].inputSchema).toMatchObject({
      type: 'object',
      properties: { day: { type: 'string' } },
    });
    expect(client.getInstructions()).toContain('Brío');
  });

  it('ejecuta la herramienta con el usuario del token y su zona horaria', async () => {
    const run = jest.fn(() => Promise.resolve({ ok: true, day: '2026-11-19' }));
    const client = await connect([tool('brio_get_day', run)]);
    const res = await client.callTool({
      name: 'brio_get_day',
      arguments: { day: '2026-11-19' },
    });
    expect(run).toHaveBeenCalledWith(
      { day: '2026-11-19' },
      { userId: 'u1', timeZone: 'Europe/Madrid' },
    );
    expect(res.isError).toBe(false);
    expect(JSON.parse((res.content as { text: string }[])[0].text)).toEqual({
      ok: true,
      day: '2026-11-19',
    });
  });

  it('un { error } de la herramienta, una excepción o un nombre desconocido llegan como error', async () => {
    const client = await connect([
      tool('brio_set_plan_day', () =>
        Promise.resolve({ error: 'day debe ser YYYY-MM-DD.' }),
      ),
      tool('brio_boom', () => Promise.reject(new Error('BBDD caída'))),
    ]);
    const bad = await client.callTool({
      name: 'brio_set_plan_day',
      arguments: {},
    });
    expect(bad.isError).toBe(true);
    const boom = await client.callTool({ name: 'brio_boom', arguments: {} });
    expect(boom.isError).toBe(true);
    expect((boom.content as { text: string }[])[0].text).toContain(
      'BBDD caída',
    );
    const unknown = await client.callTool({ name: 'brio_nada', arguments: {} });
    expect(unknown.isError).toBe(true);
  });
});
