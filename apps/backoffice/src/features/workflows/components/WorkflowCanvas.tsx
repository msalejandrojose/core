import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
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
}

/**
 * Lienzo React Flow que renderiza el DSL de un workflow en modo lectura
 * (trigger → steps, con las transiciones next/onMatch/onTimeout). La edición
 * (arrastrar nodos, conectar, panel de config) llegará en una entrega posterior.
 */
export function WorkflowCanvas({ dsl }: WorkflowCanvasProps) {
  const { nodes, edges } = useMemo(() => buildWorkflowGraph(dsl), [dsl]);

  return (
    <div className="bg-muted/20 h-[70vh] w-full rounded-lg border">
      <ReactFlow
        nodes={nodes as Node[]}
        edges={edges as Edge[]}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
