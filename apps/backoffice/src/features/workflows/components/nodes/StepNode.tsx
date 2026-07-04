import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { isEngineAction } from '../../types';

/** Nodo de step (acción) del workflow. */
export function StepNode({ data }: NodeProps) {
  const action = String(data.action ?? '');
  const engine = isEngineAction(action);
  return (
    <div className="bg-card w-56 rounded-lg border px-3 py-2 shadow-sm">
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground" />
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium" title={String(data.label)}>
          {String(data.label)}
        </span>
        <Badge variant={engine ? 'secondary' : 'outline'} className="shrink-0">
          {engine ? 'motor' : 'handler'}
        </Badge>
      </div>
      <code className="text-muted-foreground mt-1 block truncate text-xs" title={action}>
        {action}
      </code>
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground" />
    </div>
  );
}
