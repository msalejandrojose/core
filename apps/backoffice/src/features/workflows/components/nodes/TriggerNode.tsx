import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Clock, Hand, Zap } from 'lucide-react';
import type { WorkflowTriggerKind } from '../../types';
import { TRIGGER_KIND_LABELS } from '../../types';

const ICONS: Record<WorkflowTriggerKind, typeof Zap> = {
  event: Zap,
  cron: Clock,
  manual: Hand,
};

/** Nodo de disparador (trigger) — fila superior del lienzo. */
export function TriggerNode({ data }: NodeProps) {
  const kind = (data.kind as WorkflowTriggerKind) ?? 'event';
  const Icon = ICONS[kind] ?? Zap;
  return (
    <div className="bg-primary text-primary-foreground w-52 rounded-lg px-3 py-2 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon size={14} />
        <span className="text-[10px] font-semibold tracking-wide uppercase opacity-80">
          {TRIGGER_KIND_LABELS[kind] ?? kind}
        </span>
      </div>
      <p className="mt-1 truncate text-sm font-medium" title={String(data.label)}>
        {String(data.label)}
      </p>
      <Handle type="source" position={Position.Bottom} className="!bg-primary-foreground" />
    </div>
  );
}
