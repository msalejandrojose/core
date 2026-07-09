import { ArrowLeft, Loader2, Plus, Rocket } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/lib/toast';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { StepEditor } from './editor/StepEditor';
import { TriggersEditor } from './editor/TriggersEditor';
import { ValidationPanel } from './editor/ValidationPanel';
import { hasBlockingErrors, validateWorkflow } from './editor/validate';
import {
  editorStateToDsl,
  stateFromDefinition,
  useWorkflowEditor,
  type EditorState,
} from './editor/use-workflow-editor';
import { useActivateWorkflowVersion } from './hooks/use-activate-workflow-version';
import { usePublishWorkflow } from './hooks/use-publish-workflow';
import { useWorkflowHandlers } from './hooks/use-workflow-handlers';
import { useWorkflowVersions } from './hooks/use-workflow-versions';

/** Ruta `/workflows/nuevo` y `/workflows/:key/editar`. */
export function WorkflowEditorPage() {
  const { key } = useParams<{ key: string }>();
  const isEdit = Boolean(key);
  const { data: versions, isLoading } = useWorkflowVersions(key ?? '');

  if (isEdit && isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground animate-spin" size={24} />
      </div>
    );
  }

  let initial: EditorState | undefined;
  if (isEdit) {
    if (!versions?.length) {
      return (
        <div className="space-y-4">
          <BackLink to="/workflows" />
          <p className="text-muted-foreground">No se pudo cargar el workflow «{key}».</p>
        </div>
      );
    }
    const base = versions.find((v) => v.isActive) ?? versions[0];
    const nextVersion = Math.max(...versions.map((v) => v.version)) + 1;
    initial = stateFromDefinition(base, nextVersion);
  }

  return <WorkflowEditor initial={initial} isEdit={isEdit} />;
}

function WorkflowEditor({ initial, isEdit }: { initial?: EditorState; isEdit: boolean }) {
  const navigate = useNavigate();
  const editor = useWorkflowEditor(initial);
  const { state } = editor;
  const { data: handlers } = useWorkflowHandlers();
  const handlerKeys = (handlers ?? []).map((h) => h.key);

  const [activateAfter, setActivateAfter] = useState(true);
  const activate = useActivateWorkflowVersion(state.key);
  const publish = usePublishWorkflow({
    onSuccess: (def) => {
      if (activateAfter && !def.isActive) activate.mutate(def.version);
      navigate(`/workflows/${encodeURIComponent(def.key)}`);
    },
  });

  const dsl = editorStateToDsl(state);
  const selectedIndex = state.steps.findIndex((s) => s.key === state.selectedStepKey);
  const selectedStep = selectedIndex >= 0 ? state.steps[selectedIndex] : null;

  const issues = validateWorkflow(state);
  const blocked = hasBlockingErrors(issues);

  const handlePublish = () => {
    if (blocked) {
      toast.error('Corrige los errores marcados antes de publicar.');
      return;
    }
    publish.mutate(dsl);
  };

  return (
    <div className="space-y-6">
      <BackLink to={isEdit ? `/workflows/${encodeURIComponent(state.key)}` : '/workflows'} />
      <PageHeader
        title={isEdit ? `Editar: ${state.name || state.key}` : 'Nuevo workflow'}
        description={
          isEdit
            ? `Se publicará como una nueva versión (v${state.version}).`
            : 'Compón el workflow y publícalo como versión 1.'
        }
        actions={
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={activateAfter}
                onCheckedChange={(v) => setActivateAfter(v === true)}
              />
              Activar al publicar
            </label>
            <Button
              onClick={handlePublish}
              disabled={publish.isPending || blocked}
            >
              {publish.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Rocket size={16} />
              )}
              Publicar v{state.version}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-3">
          <WorkflowCanvas
            dsl={dsl}
            className="h-[68vh]"
            selectedStepKey={state.selectedStepKey}
            onSelectStep={editor.selectStep}
          />
          <p className="text-muted-foreground text-xs">
            Clica un step del lienzo para editarlo en el panel.
          </p>
          <ValidationPanel issues={issues} />
        </div>

        <div className="max-h-[72vh] space-y-6 overflow-y-auto rounded-lg border p-4">
          {/* Meta */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Definición</h3>
            <div className="space-y-1.5">
              <Label>Key</Label>
              <Input
                value={state.key}
                onChange={(e) => editor.setMeta({ key: e.target.value })}
                placeholder="welcome-email"
                disabled={isEdit}
              />
              {isEdit && (
                <p className="text-muted-foreground text-xs">
                  La key identifica el workflow entre versiones y no se puede cambiar.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                value={state.name}
                onChange={(e) => editor.setMeta({ name: e.target.value })}
                placeholder="Email de bienvenida"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea
                value={state.description}
                onChange={(e) => editor.setMeta({ description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Máx. runs concurrentes (opcional)</Label>
              <Input
                type="number"
                min={1}
                value={state.maxConcurrentRuns}
                onChange={(e) => editor.setMeta({ maxConcurrentRuns: e.target.value })}
              />
            </div>
          </div>

          <TriggersEditor
            triggers={state.triggers}
            onAdd={editor.addTrigger}
            onUpdate={editor.updateTrigger}
            onRemove={editor.removeTrigger}
          />

          {/* Steps */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Steps</h3>
              <Button size="sm" variant="outline" onClick={editor.addStep}>
                <Plus size={14} />
                Añadir
              </Button>
            </div>
            {state.steps.length === 0 ? (
              <p className="text-muted-foreground text-xs">Aún no hay steps.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {state.steps.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => editor.selectStep(s.key)}
                  >
                    <Badge
                      variant={s.key === state.selectedStepKey ? 'default' : 'secondary'}
                      className="cursor-pointer"
                    >
                      {s.key || '(sin key)'}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedStep && (
            <div className="border-t pt-4">
              <StepEditor
                key={selectedIndex}
                step={selectedStep}
                steps={state.steps}
                handlerKeys={handlerKeys}
                onUpdate={editor.updateStep}
                onRemove={editor.removeStep}
                onMove={editor.moveStep}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BackLink({ to }: { to: string }) {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
      <Link to={to}>
        <ArrowLeft size={16} />
        Volver
      </Link>
    </Button>
  );
}
