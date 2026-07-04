import { ArrowLeft, CircleCheck, Loader2, Pencil } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ManualRunDialog } from './components/ManualRunDialog';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { useActivateWorkflowVersion } from './hooks/use-activate-workflow-version';
import { useWorkflowVersions } from './hooks/use-workflow-versions';
import { TRIGGER_KIND_LABELS } from './types';

export function WorkflowDetailPage() {
  const { key = '' } = useParams<{ key: string }>();
  const { data: versions, isLoading, isError } = useWorkflowVersions(key);

  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const activate = useActivateWorkflowVersion(key);

  const current = useMemo(() => {
    if (!versions?.length) return null;
    if (selectedVersion != null) {
      return versions.find((v) => v.version === selectedVersion) ?? null;
    }
    return versions.find((v) => v.isActive) ?? versions[0];
  }, [versions, selectedVersion]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground animate-spin" size={24} />
      </div>
    );
  }

  if (isError || !current) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-muted-foreground">
          No se pudo cargar el workflow «{key}».
        </p>
      </div>
    );
  }

  const dsl = current.dsl;

  return (
    <div className="space-y-6">
      <BackLink />
      <PageHeader
        title={current.name}
        description={dsl.meta?.description ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            {versions && versions.length > 1 && (
              <Select
                value={String(current.version)}
                onValueChange={(v) => setSelectedVersion(Number(v))}
              >
                <SelectTrigger size="sm" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.version} value={String(v.version)}>
                      v{v.version}
                      {v.isActive ? ' · activa' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!current.isActive && (
              <Button
                variant="outline"
                onClick={() => activate.mutate(current.version)}
                disabled={activate.isPending}
              >
                <CircleCheck size={16} />
                Activar
              </Button>
            )}
            {current.isActive && <ManualRunDialog workflowKey={current.key} />}
            <Button asChild>
              <Link to={`/workflows/${encodeURIComponent(current.key)}/editar`}>
                <Pencil size={16} />
                Editar
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <code className="text-muted-foreground text-xs">{current.key}</code>
        {current.isActive ? (
          <Badge>Activa</Badge>
        ) : (
          <Badge variant="secondary">Inactiva</Badge>
        )}
        {dsl.triggers.map((t, i) => (
          <Badge key={i} variant="outline">
            {TRIGGER_KIND_LABELS[t.kind] ?? t.kind}
            {t.kind === 'event' && t.eventType ? `: ${t.eventType}` : ''}
          </Badge>
        ))}
        <span className="text-muted-foreground text-xs">
          {dsl.steps.length} step{dsl.steps.length === 1 ? '' : 's'}
        </span>
      </div>

      <WorkflowCanvas dsl={dsl} />
    </div>
  );
}

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
      <Link to="/workflows">
        <ArrowLeft size={16} />
        Volver a workflows
      </Link>
    </Button>
  );
}
