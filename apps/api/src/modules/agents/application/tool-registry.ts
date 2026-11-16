import { Injectable } from '@nestjs/common';

export interface AgentToolContext {
  userId: string;
  timeZone: string;
}

/**
 * Herramienta que un agente puede usar. La aportan otros módulos (Brío
 * registra las suyas al arrancar): el módulo de agentes no sabe nada de
 * comidas ni entrenos.
 */
export interface AgentTool {
  /** Código único, p. ej. `brio_log_meal`. Es el nombre que ve el modelo. */
  code: string;
  /** Nombre corto para el backoffice. */
  label: string;
  /** Qué hace y cuándo usarla (lo lee el modelo). */
  description: string;
  /** JSON Schema de los argumentos. */
  parameters: Record<string, unknown>;
  run(args: Record<string, unknown>, ctx: AgentToolContext): Promise<unknown>;
}

@Injectable()
export class AgentToolRegistry {
  private readonly tools = new Map<string, AgentTool>();

  register(tool: AgentTool): void {
    this.tools.set(tool.code, tool);
  }

  get(code: string): AgentTool | undefined {
    return this.tools.get(code);
  }

  list(): AgentTool[] {
    return [...this.tools.values()].sort((a, b) =>
      a.code.localeCompare(b.code),
    );
  }
}
