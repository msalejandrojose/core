import { useCallback, useState } from 'react';
import type {
  WorkflowDefinitionDto,
  WorkflowDslJson,
  WorkflowStepJson,
  WorkflowTriggerJson,
  WorkflowTriggerKind,
} from '../types';

export interface EditorState {
  key: string;
  name: string;
  description: string;
  maxConcurrentRuns: string;
  /** Versión con la que se publicará (1 para nuevos, maxVersion+1 al editar). */
  version: number;
  triggers: WorkflowTriggerJson[];
  steps: WorkflowStepJson[];
  selectedStepKey: string | null;
}

const EMPTY: EditorState = {
  key: '',
  name: '',
  description: '',
  maxConcurrentRuns: '',
  version: 1,
  triggers: [{ kind: 'manual' }],
  steps: [],
  selectedStepKey: null,
};

/** Estado inicial del editor a partir de una definición existente (editar). */
export function stateFromDefinition(def: WorkflowDefinitionDto, nextVersion: number): EditorState {
  const dsl = def.dsl;
  return {
    key: dsl.key,
    name: dsl.name,
    description: dsl.meta?.description ?? '',
    maxConcurrentRuns:
      dsl.meta?.maxConcurrentRuns != null ? String(dsl.meta.maxConcurrentRuns) : '',
    version: nextVersion,
    triggers: dsl.triggers.length ? structuredClone(dsl.triggers) : [{ kind: 'manual' }],
    steps: structuredClone(dsl.steps),
    selectedStepKey: dsl.steps[0]?.key ?? null,
  };
}

/** Reescribe todas las referencias a `from` (next/onMatch/onTimeout, branch then/else). */
function renameReferences(
  steps: WorkflowStepJson[],
  from: string,
  to: string,
): WorkflowStepJson[] {
  return steps.map((s) => {
    const patched: WorkflowStepJson = { ...s };
    if (patched.next === from) patched.next = to;
    if (patched.onMatch === from) patched.onMatch = to;
    if (patched.onTimeout === from) patched.onTimeout = to;
    if (patched.input && (patched.input.then === from || patched.input.else === from)) {
      patched.input = {
        ...patched.input,
        ...(patched.input.then === from ? { then: to } : {}),
        ...(patched.input.else === from ? { else: to } : {}),
      };
    }
    return patched;
  });
}

/** Elimina las referencias a `key` (transición pasa a fin secuencial). */
function clearReferences(steps: WorkflowStepJson[], key: string): WorkflowStepJson[] {
  return steps.map((s) => {
    const patched: WorkflowStepJson = { ...s };
    if (patched.next === key) delete patched.next;
    if (patched.onMatch === key) delete patched.onMatch;
    if (patched.onTimeout === key) delete patched.onTimeout;
    if (patched.input && (patched.input.then === key || patched.input.else === key)) {
      const input = { ...patched.input };
      if (input.then === key) delete input.then;
      if (input.else === key) delete input.else;
      patched.input = input;
    }
    return patched;
  });
}

function uniqueStepKey(steps: WorkflowStepJson[]): string {
  const existing = new Set(steps.map((s) => s.key));
  let i = steps.length + 1;
  let key = `step_${i}`;
  while (existing.has(key)) key = `step_${++i}`;
  return key;
}

export function useWorkflowEditor(initial?: EditorState) {
  const [state, setState] = useState<EditorState>(initial ?? EMPTY);

  const setMeta = useCallback(
    (patch: Partial<Pick<EditorState, 'key' | 'name' | 'description' | 'maxConcurrentRuns'>>) =>
      setState((s) => ({ ...s, ...patch })),
    [],
  );

  const addTrigger = useCallback(
    (kind: WorkflowTriggerKind) =>
      setState((s) => ({ ...s, triggers: [...s.triggers, { kind }] })),
    [],
  );

  const updateTrigger = useCallback(
    (index: number, patch: Partial<WorkflowTriggerJson>) =>
      setState((s) => ({
        ...s,
        triggers: s.triggers.map((t, i) => (i === index ? { ...t, ...patch } : t)),
      })),
    [],
  );

  const removeTrigger = useCallback(
    (index: number) =>
      setState((s) => ({ ...s, triggers: s.triggers.filter((_, i) => i !== index) })),
    [],
  );

  const addStep = useCallback(
    () =>
      setState((s) => {
        const key = uniqueStepKey(s.steps);
        const step: WorkflowStepJson = { key, action: 'log' };
        return { ...s, steps: [...s.steps, step], selectedStepKey: key };
      }),
    [],
  );

  const updateStep = useCallback(
    (key: string, patch: Partial<WorkflowStepJson>) =>
      setState((s) => {
        let steps = s.steps.map((st) => (st.key === key ? { ...st, ...patch } : st));
        let selected = s.selectedStepKey;
        if (patch.key && patch.key !== key) {
          steps = renameReferences(steps, key, patch.key);
          if (selected === key) selected = patch.key;
        }
        return { ...s, steps, selectedStepKey: selected };
      }),
    [],
  );

  const removeStep = useCallback(
    (key: string) =>
      setState((s) => {
        const steps = clearReferences(
          s.steps.filter((st) => st.key !== key),
          key,
        );
        const selected = s.selectedStepKey === key ? (steps[0]?.key ?? null) : s.selectedStepKey;
        return { ...s, steps, selectedStepKey: selected };
      }),
    [],
  );

  const moveStep = useCallback(
    (key: string, dir: -1 | 1) =>
      setState((s) => {
        const idx = s.steps.findIndex((st) => st.key === key);
        const target = idx + dir;
        if (idx === -1 || target < 0 || target >= s.steps.length) return s;
        const steps = [...s.steps];
        [steps[idx], steps[target]] = [steps[target], steps[idx]];
        return { ...s, steps };
      }),
    [],
  );

  const selectStep = useCallback(
    (key: string | null) => setState((s) => ({ ...s, selectedStepKey: key })),
    [],
  );

  return {
    state,
    setState,
    setMeta,
    addTrigger,
    updateTrigger,
    removeTrigger,
    addStep,
    updateStep,
    removeStep,
    moveStep,
    selectStep,
  };
}

/** Construye el DSL JSON a partir del estado del editor, limpiando vacíos. */
export function editorStateToDsl(state: EditorState): WorkflowDslJson {
  const maxRuns = state.maxConcurrentRuns.trim()
    ? Number(state.maxConcurrentRuns)
    : undefined;
  const description = state.description.trim() || undefined;

  const meta =
    maxRuns != null || description != null
      ? {
          ...(maxRuns != null && !Number.isNaN(maxRuns) ? { maxConcurrentRuns: maxRuns } : {}),
          ...(description != null ? { description } : {}),
        }
      : undefined;

  return {
    key: state.key.trim(),
    name: state.name.trim(),
    version: state.version,
    ...(meta ? { meta } : {}),
    triggers: state.triggers,
    steps: state.steps,
  };
}
