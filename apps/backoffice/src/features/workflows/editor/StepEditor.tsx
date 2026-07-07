import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
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
import type { WorkflowStepJson } from '../types';
import { ENGINE_ACTIONS } from '../types';
import { JsonField } from './JsonField';

const SEQ = '__seq__'; // next = undefined (siguiente en orden)
const END = '__end__'; // next = null (fin del workflow)

interface StepEditorProps {
  step: WorkflowStepJson;
  steps: WorkflowStepJson[];
  handlerKeys: string[];
  onUpdate: (key: string, patch: Partial<WorkflowStepJson>) => void;
  onRemove: (key: string) => void;
  onMove: (key: string, dir: -1 | 1) => void;
}

export function StepEditor({
  step,
  steps,
  handlerKeys,
  onUpdate,
  onRemove,
  onMove,
}: StepEditorProps) {
  const otherStepKeys = steps.filter((s) => s.key !== step.key).map((s) => s.key);
  const actionOptions = Array.from(
    new Set<string>([...ENGINE_ACTIONS, ...handlerKeys, step.action].filter(Boolean)),
  );
  const isWaitEvent = step.action === 'wait_for_event';
  const isWaitCondition = step.action === 'wait_for_condition';
  const usesWaitBranches = isWaitEvent || isWaitCondition;

  const nextValue = step.next === undefined ? SEQ : step.next === null ? END : step.next;
  const setNext = (v: string) =>
    onUpdate(step.key, { next: v === SEQ ? undefined : v === END ? null : v });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1">
        <h3 className="text-sm font-semibold">Step</h3>
        <div className="ml-auto flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onMove(step.key, -1)}
            aria-label="Subir step"
          >
            <ArrowUp size={14} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onMove(step.key, 1)}
            aria-label="Bajar step"
          >
            <ArrowDown size={14} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onRemove(step.key)}
            aria-label="Eliminar step"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Key</Label>
        <Input
          value={step.key}
          onChange={(e) => onUpdate(step.key, { key: e.target.value })}
          placeholder="send_email"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Acción</Label>
        <Select value={step.action} onValueChange={(v) => onUpdate(step.key, { action: v })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {actionOptions.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <JsonField
        label="Input"
        value={step.input}
        onChange={(v) => onUpdate(step.key, { input: v })}
        placeholder='{ "to": "{{ context.email }}" }'
        rows={5}
      />

      <div className="space-y-1.5">
        <Label>Siguiente step</Label>
        <Select value={nextValue} onValueChange={setNext}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SEQ}>Siguiente en orden</SelectItem>
            <SelectItem value={END}>Fin del workflow</SelectItem>
            {otherStepKeys.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {usesWaitBranches && (
        <div className="grid grid-cols-2 gap-3">
          <StepRefSelect
            label={
              isWaitCondition
                ? 'Al cumplirse (onMatch)'
                : 'Al llegar evento (onMatch)'
            }
            value={step.onMatch}
            options={otherStepKeys}
            onChange={(v) => onUpdate(step.key, { onMatch: v })}
          />
          <StepRefSelect
            label="Al expirar (onTimeout)"
            value={step.onTimeout}
            options={otherStepKeys}
            onChange={(v) => onUpdate(step.key, { onTimeout: v })}
          />
        </div>
      )}

      <RetryEditor step={step} onUpdate={onUpdate} />
    </div>
  );
}

const NONE = '__none__';

function StepRefSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  options: string[];
  onChange: (v: string | undefined) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select
        value={value ?? NONE}
        onValueChange={(v) => onChange(v === NONE ? undefined : v)}
      >
        <SelectTrigger size="sm" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>— sin definir —</SelectItem>
          {options.map((k) => (
            <SelectItem key={k} value={k}>
              {k}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function RetryEditor({
  step,
  onUpdate,
}: {
  step: WorkflowStepJson;
  onUpdate: (key: string, patch: Partial<WorkflowStepJson>) => void;
}) {
  const retry = step.retry;

  if (!retry) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => onUpdate(step.key, { retry: { maxAttempts: 3, backoff: 'exponential' } })}
      >
        Añadir reintentos
      </Button>
    );
  }

  return (
    <div className="bg-muted/30 space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <Label>Reintentos</Label>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onUpdate(step.key, { retry: undefined })}
        >
          Quitar
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Intentos</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={retry.maxAttempts}
            onChange={(e) =>
              onUpdate(step.key, {
                retry: { ...retry, maxAttempts: Number(e.target.value) || 1 },
              })
            }
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Backoff</Label>
          <Select
            value={retry.backoff ?? 'exponential'}
            onValueChange={(v) =>
              onUpdate(step.key, {
                retry: { ...retry, backoff: v as 'linear' | 'exponential' },
              })
            }
          >
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linear">Lineal</SelectItem>
              <SelectItem value="exponential">Exponencial</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Base (s)</Label>
          <Input
            type="number"
            min={1}
            value={retry.baseSeconds ?? ''}
            onChange={(e) =>
              onUpdate(step.key, {
                retry: {
                  ...retry,
                  baseSeconds: e.target.value ? Number(e.target.value) : undefined,
                },
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
