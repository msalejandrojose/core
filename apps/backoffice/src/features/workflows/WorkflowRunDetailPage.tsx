import { ArrowLeft, Ban, Loader2, RotateCcw } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RunStatusBadge, StepStatusBadge } from './components/StatusBadges';
import { useCancelWorkflowRun } from './hooks/use-cancel-workflow-run';
import { useRetryWorkflowRun } from './hooks/use-retry-workflow-run';
import { useWorkflowRun } from './hooks/use-workflow-run';
import { isRunActive, type WorkflowStepExecutionDto, type PendingActionDto } from './types';

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' }) : '—';

// Duración legible de un step (inicio → fin). Null si aún no terminó.
const duration = (startedAt: string, finishedAt: string | null): string | null => {
  if (!finishedAt) return null;
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
};

export function WorkflowRunDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useWorkflowRun(id);
  const cancel = useCancelWorkflowRun(id);
  const retry = useRetryWorkflowRun(id);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground animate-spin" size={24} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-muted-foreground">No se pudo cargar el run «{id}».</p>
      </div>
    );
  }

  const { run, steps, pendingActions } = data;
  const orderedSteps = [...steps].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  );

  return (
    <div className="space-y-6">
      <BackLink />
      <PageHeader
        title="Ejecución"
        description={`Run ${run.id}`}
        actions={
          isRunActive(run.status) ? (
            <Button
              variant="outline"
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending}
            >
              <Ban size={16} />
              Cancelar
            </Button>
          ) : run.status === 'FAILED' ? (
            <Button
              variant="outline"
              onClick={() => retry.mutate()}
              disabled={retry.isPending}
            >
              <RotateCcw size={16} />
              Reintentar
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <RunStatusBadge status={run.status} />
        {run.isDryRun && <Badge variant="outline">simulación</Badge>}
        <span className="text-muted-foreground text-xs">
          Inicio {fmt(run.startedAt)} · Fin {fmt(run.finishedAt)}
        </span>
        {run.currentStepKey && (
          <span className="text-muted-foreground text-xs">
            Step actual: <code>{run.currentStepKey}</code>
          </span>
        )}
      </div>

      {run.lastError && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive text-sm">Último error</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-destructive overflow-x-auto text-xs">{run.lastError}</pre>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Steps ejecutados</CardTitle>
            <CardDescription>{orderedSteps.length} en total</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {orderedSteps.length === 0 ? (
              <p className="text-muted-foreground text-sm">Este run aún no ejecutó steps.</p>
            ) : (
              orderedSteps.map((s) => <StepRow key={s.id} step={s} />)
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Trabajo pendiente</CardTitle>
              <CardDescription>Esperas, delays y reintentos abiertos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingActions.length === 0 ? (
                <p className="text-muted-foreground text-sm">Sin trabajo pendiente.</p>
              ) : (
                pendingActions.map((p) => <PendingRow key={p.id} action={p} />)
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contexto</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/40 max-h-72 overflow-auto rounded-md p-3 text-xs">
                {JSON.stringify(run.context, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StepRow({ step }: { step: WorkflowStepExecutionDto }) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{step.stepKey}</span>
        <code className="text-muted-foreground text-xs">{step.actionKey}</code>
        <StepStatusBadge status={step.status} />
        {step.attempt > 1 && (
          <span className="text-muted-foreground text-xs">intento {step.attempt}</span>
        )}
        <span className="text-muted-foreground ml-auto text-xs">
          {fmt(step.startedAt)}
          {duration(step.startedAt, step.finishedAt) && (
            <> · {duration(step.startedAt, step.finishedAt)}</>
          )}
        </span>
      </div>
      {step.error && (
        <pre className="text-destructive overflow-x-auto text-xs">{step.error}</pre>
      )}
      {step.output != null && (
        <details className="text-xs">
          <summary className="text-muted-foreground cursor-pointer">Output</summary>
          <pre className="bg-muted/40 mt-1 overflow-auto rounded-md p-2">
            {JSON.stringify(step.output, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

function PendingRow({ action }: { action: PendingActionDto }) {
  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs">
      <Badge variant="outline">{action.kind}</Badge>
      <span className="text-muted-foreground">{action.stepKey ?? '—'}</span>
      <span className="text-muted-foreground ml-auto">
        {action.runAt ? fmt(action.runAt) : action.eventType ?? ''}
      </span>
    </div>
  );
}

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
      <Link to="/workflows/runs">
        <ArrowLeft size={16} />
        Volver a ejecuciones
      </Link>
    </Button>
  );
}
