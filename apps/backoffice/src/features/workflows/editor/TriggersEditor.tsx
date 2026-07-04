import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { WorkflowTriggerJson, WorkflowTriggerKind } from '../types';
import { TRIGGER_KIND_LABELS } from '../types';
import { JsonField } from './JsonField';

const KINDS: WorkflowTriggerKind[] = ['event', 'cron', 'manual'];

interface TriggersEditorProps {
  triggers: WorkflowTriggerJson[];
  onAdd: (kind: WorkflowTriggerKind) => void;
  onUpdate: (index: number, patch: Partial<WorkflowTriggerJson>) => void;
  onRemove: (index: number) => void;
}

export function TriggersEditor({ triggers, onAdd, onUpdate, onRemove }: TriggersEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Disparadores</h3>
        <Button size="sm" variant="outline" onClick={() => onAdd('event')}>
          <Plus size={14} />
          Añadir
        </Button>
      </div>

      {triggers.length === 0 && (
        <p className="text-muted-foreground text-xs">
          Un workflow necesita al menos un disparador.
        </p>
      )}

      <div className="space-y-3">
        {triggers.map((trigger, i) => (
          <div key={i} className="bg-muted/30 space-y-2 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Select
                value={trigger.kind}
                onValueChange={(v) => onUpdate(i, { kind: v as WorkflowTriggerKind })}
              >
                <SelectTrigger size="sm" className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {TRIGGER_KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="icon"
                variant="ghost"
                className="ml-auto"
                onClick={() => onRemove(i)}
                aria-label="Eliminar disparador"
              >
                <Trash2 size={14} />
              </Button>
            </div>

            {trigger.kind === 'event' && (
              <>
                <div className="space-y-1.5">
                  <Label>Tipo de evento</Label>
                  <Input
                    value={trigger.eventType ?? ''}
                    onChange={(e) => onUpdate(i, { eventType: e.target.value })}
                    placeholder="user.registered"
                  />
                </div>
                <JsonField
                  label="Match (opcional)"
                  value={trigger.match}
                  onChange={(v) => onUpdate(i, { match: v })}
                  placeholder='{ "plan": "pro" }'
                  rows={3}
                />
              </>
            )}

            {trigger.kind === 'cron' && (
              <>
                <div className="space-y-1.5">
                  <Label>Expresión cron</Label>
                  <Input
                    value={trigger.cronExpression ?? ''}
                    onChange={(e) => onUpdate(i, { cronExpression: e.target.value })}
                    placeholder="0 9 * * 1"
                  />
                </div>
                <JsonField
                  label="Payload (opcional)"
                  value={trigger.payload}
                  onChange={(v) => onUpdate(i, { payload: v })}
                  rows={3}
                />
              </>
            )}

            {trigger.kind === 'manual' && (
              <p className="text-muted-foreground text-xs">
                Se dispara manualmente desde el backoffice o la API.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
