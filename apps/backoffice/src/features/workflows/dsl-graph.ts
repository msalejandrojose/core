import type { Edge, Node } from '@xyflow/react';
import type {
  WorkflowDslJson,
  WorkflowStepJson,
  WorkflowTriggerJson,
} from './types';

/**
 * Traduce el DSL de un workflow a nodos + aristas para React Flow (modo
 * lectura). Es una función pura, sin dependencias de React, para poder testearla
 * de forma aislada.
 *
 * Modelo del grafo:
 * - Un nodo `trigger` por cada trigger, todos apuntando al step de entrada.
 * - Un nodo `step` por cada step del DSL.
 * - Aristas de transición: `next` (explícito o secuencial implícito), `onMatch`
 *   y `onTimeout`. Las dos últimas se etiquetan para distinguir las ramas de un
 *   `wait_for_event`.
 *
 * El layout es determinista y sencillo (triggers en una fila superior, steps
 * apilados en el orden del array). La edición con drag-and-drop y un layout
 * automático más elaborado (dagre/elk) quedan para una entrega posterior.
 */

export type WorkflowNode = Node<{ label: string } & Record<string, unknown>>;

const TRIGGER_Y = 0;
const TRIGGER_X_GAP = 260;
const STEP_X = 120;
const STEP_Y_START = 140;
const STEP_Y_GAP = 130;

/** Resuelve el destino de `next` para un step (explícito o el siguiente del array). */
function resolveNext(
  dsl: WorkflowDslJson,
  index: number,
): string | null {
  const step = dsl.steps[index];
  if (step.next !== undefined) return step.next; // puede ser null = fin
  const nextStep = dsl.steps[index + 1];
  return nextStep ? nextStep.key : null;
}

function triggerLabel(trigger: WorkflowTriggerJson): string {
  switch (trigger.kind) {
    case 'event':
      return trigger.eventType ?? 'evento';
    case 'cron':
      return trigger.cronExpression ?? 'cron';
    case 'manual':
      return 'manual';
    default:
      return trigger.kind;
  }
}

export function buildWorkflowGraph(dsl: WorkflowDslJson): {
  nodes: WorkflowNode[];
  edges: Edge[];
} {
  const nodes: WorkflowNode[] = [];
  const edges: Edge[] = [];

  const stepIds = new Set(dsl.steps.map((s) => s.key));
  const entryStep: WorkflowStepJson | undefined = dsl.steps[0];
  const stepNodeId = (key: string) => `step:${key}`;

  // Nodos trigger (fila superior) → step de entrada.
  dsl.triggers.forEach((trigger, i) => {
    const id = `trigger:${i}`;
    nodes.push({
      id,
      type: 'trigger',
      position: { x: i * TRIGGER_X_GAP, y: TRIGGER_Y },
      data: {
        label: triggerLabel(trigger),
        kind: trigger.kind,
        match: trigger.match,
        payload: trigger.payload,
      },
    });
    if (entryStep) {
      edges.push({
        id: `e:${id}->${entryStep.key}`,
        source: id,
        target: stepNodeId(entryStep.key),
      });
    }
  });

  // Nodos step (apilados en orden).
  dsl.steps.forEach((step, i) => {
    nodes.push({
      id: stepNodeId(step.key),
      type: 'step',
      position: { x: STEP_X, y: STEP_Y_START + i * STEP_Y_GAP },
      data: {
        label: step.key,
        action: step.action,
        input: step.input,
        retry: step.retry,
      },
    });

    const pushEdge = (
      target: string | null | undefined,
      label?: string,
      variant?: 'match' | 'timeout',
    ) => {
      if (target == null || !stepIds.has(target)) return;
      edges.push({
        id: `e:${step.key}-${label ?? 'next'}->${target}`,
        source: stepNodeId(step.key),
        target: stepNodeId(target),
        label,
        animated: variant === 'match',
        style: variant === 'timeout' ? { strokeDasharray: '4 4' } : undefined,
      });
    };

    // El `next` secuencial (campo `next` explícito o el siguiente del array).
    // Es el fallback de las ramas condicionales, igual que en el motor.
    const seqNext = resolveNext(dsl, i);

    // Las transiciones dependen de la acción, replicando la semántica del
    // `engine-actions.executor` del backend.
    if (step.action === 'wait_for_event') {
      // Al llegar el evento → onMatch; al expirar → onTimeout (o el next).
      pushEdge(step.onMatch, 'evento', 'match');
      pushEdge(step.onTimeout ?? seqNext, 'timeout', 'timeout');
    } else if (step.action === 'branch') {
      // `then`/`else` viven en el input del step; `else` cae al next si falta.
      const then = step.input?.then as string | undefined;
      const els = (step.input?.else as string | undefined) ?? seqNext;
      pushEdge(then, 'sí', 'match');
      pushEdge(els, 'no', 'timeout');
    } else {
      pushEdge(seqNext);
    }
  });

  return { nodes, edges };
}
