import { Pencil, Plus } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { CreateDialog } from '@/components/dialogs/CreateDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  KIND_LABEL,
  useBrioActivityTypes,
  useSaveBrioActivityType,
  type AdminActivityType,
  type SaveActivityType,
} from './hooks';

const empty = (): SaveActivityType => ({ code: null, name: '', met: 5, kind: 'OTHER', icon: null, isArchived: false });

function TypeDialog({ type, trigger }: { type?: AdminActivityType; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SaveActivityType>(() => (type ? { ...type } : empty()));
  const [met, setMet] = useState(String(type?.met ?? 5));
  const save = useSaveBrioActivityType(() => setOpen(false));

  return (
    <CreateDialog
      trigger={trigger}
      title={type ? `Editar «${type.name}»` : 'Nuevo tipo de actividad'}
      description="El MET (Compendium of Physical Activities) decide cuántas calorías se estiman por minuto; la disciplina, cómo se analiza el rendimiento."
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setForm(type ? { ...type } : empty());
          setMet(String(type?.met ?? 5));
        }
      }}
      isPending={save.isPending}
      submitLabel="Guardar"
      onSubmit={() =>
        save.mutate({
          id: type?.id,
          body: {
            code: form.code?.trim() || null,
            name: form.name,
            met: Number(met.replace(',', '.')) || 0,
            kind: form.kind,
            icon: form.icon?.trim() || null,
            isArchived: form.isArchived,
          },
        })
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Nombre</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Código</Label>
            <Input value={form.code ?? ''} placeholder="padel" onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase() })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>MET</Label>
            <Input inputMode="decimal" value={met} onChange={(e) => setMet(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Disciplina</Label>
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as SaveActivityType['kind'] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(KIND_LABEL).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Icono</Label>
            <Input value={form.icon ?? ''} placeholder="flash" onChange={(e) => setForm({ ...form, icon: e.target.value })} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={form.isArchived} onCheckedChange={(v) => setForm({ ...form, isArchived: v === true })} />
          Archivado (deja de ofrecerse en la app)
        </label>
      </div>
    </CreateDialog>
  );
}

export function BrioActivityTypesPage() {
  const { data, isLoading } = useBrioActivityTypes();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tipos de actividad"
        description="Los tipos que ofrece la app al registrar un entreno, con su MET para estimar calorías."
        actions={
          <TypeDialog
            trigger={
              <Button>
                <Plus size={16} /> Nuevo tipo
              </Button>
            }
          />
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Disciplina</TableHead>
            <TableHead className="text-right">MET</TableHead>
            <TableHead className="text-right">Entrenos</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5}>Cargando…</TableCell>
            </TableRow>
          ) : (
            (data ?? []).map((t) => (
              <TableRow key={t.id} className={t.isArchived ? 'opacity-60' : undefined}>
                <TableCell>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-muted-foreground font-mono text-xs">{t.code}</div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Badge variant="secondary">{KIND_LABEL[t.kind]}</Badge>
                    {t.isArchived ? <Badge variant="outline">Archivado</Badge> : null}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{t.met}</TableCell>
                <TableCell className="text-right tabular-nums">{t.uses}</TableCell>
                <TableCell>
                  <TypeDialog
                    type={t}
                    trigger={
                      <Button variant="ghost" size="icon" className="size-8" title="Editar">
                        <Pencil size={14} />
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
