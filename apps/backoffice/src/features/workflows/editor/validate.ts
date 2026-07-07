import type { EditorState } from './use-workflow-editor';

export interface WorkflowIssue {
  level: 'error' | 'warning';
  message: string;
  /** Step al que pertenece el problema (para resaltarlo), si aplica. */
  stepKey?: string;
}

// Validación en vivo del editor: replica en cliente las reglas del DSL del
// backend (keys únicas, transiciones a steps existentes, triggers completos)
// para avisar antes de publicar. No sustituye a la validación server-side.
export function validateWorkflow(state: EditorState): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];

  if (!state.key.trim()) issues.push({ level: 'error', message: 'La key es obligatoria.' });
  if (!state.name.trim())
    issues.push({ level: 'error', message: 'El nombre es obligatorio.' });
  if (state.triggers.length === 0)
    issues.push({ level: 'error', message: 'Añade al menos un trigger.' });
  if (state.steps.length === 0)
    issues.push({ level: 'error', message: 'Añade al menos un step.' });

  state.triggers.forEach((t, i) => {
    if (t.kind === 'event' && !t.eventType?.trim()) {
      issues.push({
        level: 'error',
        message: `El trigger ${i + 1} (evento) necesita un tipo de evento.`,
      });
    }
    if (t.kind === 'cron' && !t.cronExpression?.trim()) {
      issues.push({
        level: 'error',
        message: `El trigger ${i + 1} (cron) necesita una expresión cron.`,
      });
    }
  });

  // Keys de step: presencia, unicidad.
  const keyCounts = new Map<string, number>();
  for (const s of state.steps) {
    if (!s.key.trim()) {
      issues.push({ level: 'error', message: 'Hay un step sin key.' });
      continue;
    }
    keyCounts.set(s.key, (keyCounts.get(s.key) ?? 0) + 1);
  }
  for (const [key, count] of keyCounts) {
    if (count > 1) {
      issues.push({
        level: 'error',
        message: `La key de step "${key}" está duplicada.`,
        stepKey: key,
      });
    }
  }

  // Transiciones: next/onMatch/onTimeout y branch then/else deben apuntar a un
  // step existente.
  const existing = new Set(state.steps.map((s) => s.key).filter(Boolean));
  for (const s of state.steps) {
    if (!s.action.trim()) {
      issues.push({
        level: 'error',
        message: `El step "${s.key || '?'}" no tiene acción.`,
        stepKey: s.key,
      });
    }

    const refs: Array<[unknown, string]> = [
      [s.next, 'siguiente'],
      [s.onMatch, 'onMatch'],
      [s.onTimeout, 'onTimeout'],
      [s.input?.then, 'rama «then»'],
      [s.input?.else, 'rama «else»'],
    ];
    for (const [ref, label] of refs) {
      if (typeof ref === 'string' && ref && !existing.has(ref)) {
        issues.push({
          level: 'error',
          message: `El step "${s.key}" apunta (${label}) a un step inexistente: "${ref}".`,
          stepKey: s.key,
        });
      }
    }
  }

  return issues;
}

export function hasBlockingErrors(issues: WorkflowIssue[]): boolean {
  return issues.some((i) => i.level === 'error');
}
