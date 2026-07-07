import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { WorkflowIssue } from './validate';

/** Panel compacto con los problemas de validación en vivo del editor. */
export function ValidationPanel({ issues }: { issues: WorkflowIssue[] }) {
  if (issues.length === 0) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs">
        <CheckCircle2 size={14} className="text-emerald-600" />
        El workflow es válido y se puede publicar.
      </div>
    );
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
      {issues.map((issue, i) => (
        <div key={i} className="flex items-start gap-2 text-xs">
          {issue.level === 'error' ? (
            <XCircle size={14} className="mt-0.5 shrink-0 text-destructive" />
          ) : (
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
          )}
          <span
            className={issue.level === 'error' ? 'text-destructive' : 'text-amber-700'}
          >
            {issue.message}
          </span>
        </div>
      ))}
    </div>
  );
}
