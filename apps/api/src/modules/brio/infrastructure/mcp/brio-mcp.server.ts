import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type {
  AgentTool,
  AgentToolContext,
} from '../../../agents/application/tool-registry';

/**
 * Servidor MCP de Brío. Expone a una IA externa (Claude…) las MISMAS
 * herramientas que usa el coach dentro de la app (`AgentToolRegistry`, las
 * `brio_*`): una sola implementación para los dos. Se crea uno por petición,
 * ya atado al usuario del token OAuth, así que ninguna herramienta puede
 * elegir sobre qué usuario actúa.
 */
export const MCP_INSTRUCTIONS =
  'Herramientas de Brío, la app de entreno y nutrición de la persona con la que hablas. ' +
  'Las fechas van en YYYY-MM-DD en su zona horaria; si no te dice el día, es hoy. ' +
  'Lee antes de escribir (brio_get_day, brio_get_plan_week…) y confirma con ella antes de ' +
  'sustituir una sesión ya planificada o borrar algo. ' +
  'El menú de la semana se planifica por día y comida (brio_get_meal_plan, brio_plan_meal) con sus alimentos y recetas (brio_search_foods, brio_list_recipes); ' +
  'los entrenos de cada día pueden usar sus rutinas guardadas (brio_list_routines → routineId en brio_set_plan_day).';

/** Herramientas que se publican: las de Brío (el registro podría tener de otros módulos). */
export function mcpTools(all: AgentTool[]): AgentTool[] {
  return all.filter((t) => t.code.startsWith('brio_'));
}

export function buildBrioMcpServer(
  tools: AgentTool[],
  ctx: AgentToolContext,
): Server {
  const server = new Server(
    { name: 'brio', title: 'Brío', version: '1.0.0' },
    { capabilities: { tools: {} }, instructions: MCP_INSTRUCTIONS },
  );
  const byCode = new Map(tools.map((t) => [t.code, t]));

  server.setRequestHandler(ListToolsRequestSchema, () =>
    Promise.resolve({
      tools: tools.map((t) => ({
        name: t.code,
        title: t.label,
        description: t.description,
        inputSchema: { type: 'object' as const, ...t.parameters },
      })),
    }),
  );

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = byCode.get(req.params.name);
    if (!tool) {
      return {
        isError: true,
        content: [
          { type: 'text', text: `Herramienta desconocida: ${req.params.name}` },
        ],
      };
    }
    try {
      const result = await tool.run(req.params.arguments ?? {}, ctx);
      // Las herramientas devuelven { error } para fallos esperables (fecha mal, nada que borrar…).
      const failed =
        typeof result === 'object' &&
        result !== null &&
        'error' in result &&
        !('ok' in result);
      return {
        isError: failed,
        content: [{ type: 'text', text: JSON.stringify(result ?? null) }],
      };
    } catch (e) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `No se pudo completar: ${e instanceof Error ? e.message : 'error inesperado'}`,
          },
        ],
      };
    }
  });

  return server;
}
