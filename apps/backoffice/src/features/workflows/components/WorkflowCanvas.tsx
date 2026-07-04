import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMemo } from 'react';
import { buildWorkflowGraph } from '../dsl-graph';
import type { WorkflowDslJson } from '../types';
import { StepNode } from './nodes/StepNode';
import { TriggerNode } from './nodes/TriggerNode';

const nodeTypes = { trigger: TriggerNode, step: StepNode };

interface WorkflowCanvasProps {
  dsl: WorkflowDslJson;
  className?: string;
  /** Key del step resaltado (para sincronizar con el editor). */
  selectedStepKey?: string | null;
  /** Se invoca al hacer clic en un step; `null` al clicar fuera. */
  onSelectStep?: (key: string | null) => void;
}

/**
 * Lienzo React Flow que renderiza el DSL de un workflow (trigger → steps, con
 * las transiciones next/onMatch/onTimeout). Es una vista derivada del DSL: no se
 * reposicionan ni conectan nodos arrastrando; la edición estructural vive en el
 * panel lateral del editor. Al clicar un step se notifica vía `onSelectStep`.
 */
export function WorkflowCanvas({
  dsl,
  className = 'h-[70vh]',
  selectedStepKey,
  onSelectStep,
}: WorkflowCanvasProps) {
  const { nodes, edges } = useMemo(() => buildWorkflowGraph(dsl), [dsl]);

  const displayNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: selectedStepKey != null && n.id === `step:${selectedStepKey}`,
      })),
    [nodes, selectedStepKey],
  );

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    if (node.id.startsWith('step:')) {
      onSelectStep?.(node.id.slice('step:'.length));
    }
  };

  return (
    <div className={`bg-muted/20 w-full rounded-lg border ${className}`}>
      <ReactFlow
        nodes={displayNodes as Node[]}
        edges={edges as Edge[]}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        onNodeClick={onSelectStep ? handleNodeClick : undefined}
        onPaneClick={onSelectStep ? () => onSelectStep(null) : undefined}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
