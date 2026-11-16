import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { CreateDialog } from '@/components/dialogs/CreateDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EFFORT_LABELS, formatUsd, useAiModels, useUpdateAiModel, type AiModel } from './hooks';

function EditModelDialog({ model }: { model: AiModel }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    label: model.label,
    inputPricePerM: String(model.inputPricePerM),
    cachedInputPricePerM: String(model.cachedInputPricePerM),
    outputPricePerM: String(model.outputPricePerM),
    enabled: model.enabled,
  });
  const update = useUpdateAiModel(() => setOpen(false));
  const n = (v: string) => Number(v.replace(',', '.'));

  return (
    <CreateDialog
      trigger={
        <Button variant="ghost" size="icon" className="size-8" title="Editar">
          <Pencil size={14} />
        </Button>
      }
      title={`Editar ${model.label}`}
      description={`${model.modelId} · precios en USD por millón de tokens`}
      open={open}
      onOpenChange={setOpen}
      isPending={update.isPending}
      submitLabel="Guardar"
      onSubmit={() =>
        update.mutate({
          id: model.id,
          body: {
            label: form.label,
            inputPricePerM: n(form.inputPricePerM),
            cachedInputPricePerM: n(form.cachedInputPricePerM),
            outputPricePerM: n(form.outputPricePerM),
            enabled: form.enabled,
          },
        })
      }
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <Label>Nombre</Label>
          <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ['inputPricePerM', 'Entrada'],
              ['cachedInputPricePerM', 'Entrada en caché'],
              ['outputPricePerM', 'Salida'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1">
              <Label>{label}</Label>
              <Input inputMode="decimal" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
            </div>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v === true })} />
          Disponible para los agentes
        </label>
      </div>
    </CreateDialog>
  );
}

export function AiModelsPage() {
  const { data, isLoading } = useAiModels();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Modelos"
        description="Modelos de OpenAI que pueden usar los agentes y su precio por millón de tokens. El coste de cada petición se calcula con estos precios."
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Modelo</TableHead>
            <TableHead>Id en la API</TableHead>
            <TableHead className="text-right">Entrada</TableHead>
            <TableHead className="text-right">En caché</TableHead>
            <TableHead className="text-right">Salida</TableHead>
            <TableHead>Esfuerzos</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={8}>Cargando…</TableCell>
            </TableRow>
          ) : (
            (data ?? []).map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.label}</TableCell>
                <TableCell className="font-mono text-xs">{m.modelId}</TableCell>
                <TableCell className="text-right tabular-nums">{formatUsd(m.inputPricePerM)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatUsd(m.cachedInputPricePerM)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatUsd(m.outputPricePerM)}</TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {m.efforts.map((e) => EFFORT_LABELS[e] ?? e).join(' · ')}
                </TableCell>
                <TableCell>
                  <Badge variant={m.enabled ? 'default' : 'secondary'}>{m.enabled ? 'Activo' : 'Apagado'}</Badge>
                </TableCell>
                <TableCell>
                  <EditModelDialog model={m} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
