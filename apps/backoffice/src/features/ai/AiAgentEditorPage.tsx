import { ArrowLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  EFFORT_LABELS,
  formatUsd,
  useAiAgent,
  useAiModels,
  useAiSkills,
  useAiTools,
  useSaveAiAgent,
  type AiModel,
  type SaveAgent,
} from './hooks';

const EMPTY: SaveAgent = {
  code: '',
  name: '',
  description: null,
  instructions: '',
  modelId: '',
  reasoningEffort: 'low',
  maxOutputTokens: 1200,
  tools: [],
  skillIds: [],
  enabled: true,
};

/** Crear o editar un agente: instrucciones, modelo, esfuerzo, skills y herramientas. */
export function AiAgentEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const agent = useAiAgent(isNew ? undefined : id);
  const models = useAiModels();

  if (!models.data || (!isNew && !agent.data)) {
    return <p className="text-muted-foreground text-sm">Cargando…</p>;
  }
  const a = agent.data;
  const initial: SaveAgent = a
    ? {
        code: a.code,
        name: a.name,
        description: a.description,
        instructions: a.instructions,
        modelId: a.model.id,
        reasoningEffort: a.reasoningEffort,
        maxOutputTokens: a.maxOutputTokens,
        tools: a.tools,
        skillIds: a.skills.map((s) => s.id),
        enabled: a.enabled,
      }
    : { ...EMPTY, modelId: models.data.find((m) => m.enabled)?.id ?? '' };
  return <AgentForm key={a?.id ?? 'new'} id={isNew ? undefined : id} initial={initial} models={models.data} />;
}

function AgentForm({ id, initial, models }: { id?: string; initial: SaveAgent; models: AiModel[] }) {
  const isNew = !id;
  const navigate = useNavigate();
  const skills = useAiSkills();
  const tools = useAiTools();
  const [form, setForm] = useState<SaveAgent>(initial);
  const save = useSaveAiAgent((saved) => {
    if (isNew) navigate(`/ai/agents/${saved.id}`, { replace: true });
  });

  const model = useMemo(() => models.find((m) => m.id === form.modelId), [models, form.modelId]);
  const efforts = model?.efforts ?? [];

  // Al cambiar de modelo, si no admite el esfuerzo elegido, se pasa al más bajo que admita.
  const pickModel = (modelId: string) => {
    const next = models.find((m) => m.id === modelId);
    setForm((f) => ({
      ...f,
      modelId,
      reasoningEffort:
        next && next.efforts.length && !next.efforts.includes(f.reasoningEffort) ? next.efforts[0] : f.reasoningEffort,
    }));
  };

  const toggle = (key: 'tools' | 'skillIds', value: string, on: boolean) =>
    setForm((f) => ({ ...f, [key]: on ? [...f[key], value] : f[key].filter((v) => v !== value) }));

  const valid = form.name.trim().length > 1 && /^[a-z0-9][a-z0-9-_]{1,63}$/.test(form.code) && form.instructions.trim() && form.modelId;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/ai/agents">
          <ArrowLeft size={14} /> Agentes
        </Link>
      </Button>
      <PageHeader
        title={isNew ? 'Nuevo agente' : form.name || 'Agente'}
        description="Lo que pongas aquí se aplica en la siguiente pregunta que le hagan, sin desplegar nada."
        actions={
          <Button
            disabled={!valid || save.isPending}
            onClick={() => save.mutate({ id, body: { ...form, description: form.description?.trim() || null } })}
          >
            Guardar
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Identidad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Nombre</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Código (lo usa la app)</Label>
                  <Input
                    value={form.code}
                    placeholder="brio-coach"
                    onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase() })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Descripción</Label>
                <Input
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v === true })} />
                Activo (si está apagado, la app no puede usarlo)
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instrucciones</CardTitle>
              <CardDescription>
                Quién es y cómo se comporta. Las skills marcadas se añaden detrás, y al final la fecha y hora de la persona.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={14}
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Herramientas</CardTitle>
              <CardDescription>Lo que el agente puede consultar o hacer en la app de la persona.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {(tools.data ?? []).map((t) => (
                <label key={t.code} className="flex items-start gap-2 rounded-md border p-2 text-sm">
                  <Checkbox
                    className="mt-0.5"
                    checked={form.tools.includes(t.code)}
                    onCheckedChange={(v) => toggle('tools', t.code, v === true)}
                  />
                  <span>
                    <span className="font-medium">{t.label}</span>
                    <span className="text-muted-foreground block font-mono text-xs">{t.code}</span>
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Modelo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Modelo</Label>
                <Select value={form.modelId} onValueChange={pickModel}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Elige un modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.filter((m) => m.enabled || m.id === form.modelId).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {model ? (
                  <p className="text-muted-foreground text-xs">
                    {formatUsd(model.inputPricePerM)} entrada · {formatUsd(model.outputPricePerM)} salida por millón
                  </p>
                ) : null}
              </div>
              <div className="space-y-1">
                <Label>Esfuerzo de razonamiento</Label>
                <Select
                  value={form.reasoningEffort}
                  onValueChange={(v) => setForm({ ...form, reasoningEffort: v as SaveAgent['reasoningEffort'] })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {efforts.map((e) => (
                      <SelectItem key={e} value={e}>
                        {EFFORT_LABELS[e] ?? e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">Más esfuerzo: respuestas más pensadas, más lentas y más caras.</p>
              </div>
              <div className="space-y-1">
                <Label>Máximo de tokens de respuesta</Label>
                <Input
                  type="number"
                  min={100}
                  max={32000}
                  value={form.maxOutputTokens}
                  onChange={(e) => setForm({ ...form, maxOutputTokens: e.target.valueAsNumber || 0 })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
              <CardDescription>
                Se gestionan en <Link className="underline" to="/ai/skills">Skills</Link>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(skills.data ?? []).map((s) => (
                <label key={s.id} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    className="mt-0.5"
                    checked={form.skillIds.includes(s.id)}
                    onCheckedChange={(v) => toggle('skillIds', s.id, v === true)}
                  />
                  <span>
                    {s.name}
                    {!s.enabled ? <span className="text-muted-foreground"> (apagada)</span> : null}
                    {s.description ? <span className="text-muted-foreground block text-xs">{s.description}</span> : null}
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
