import { Pencil, Plus, Trash2 } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { CreateDialog } from '@/components/dialogs/CreateDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAiSkills, useDeleteAiSkill, useSaveAiSkill, type AiSkill } from './hooks';

function SkillDialog({ skill, trigger }: { skill?: AiSkill; trigger: ReactNode }) {
  const empty = { code: '', name: '', description: '', instructions: '', enabled: true };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(
    skill
      ? { code: skill.code, name: skill.name, description: skill.description ?? '', instructions: skill.instructions, enabled: skill.enabled }
      : empty,
  );
  const save = useSaveAiSkill(() => {
    setOpen(false);
    if (!skill) setForm(empty);
  });

  return (
    <CreateDialog
      trigger={trigger}
      title={skill ? `Editar «${skill.name}»` : 'Nueva skill'}
      description="Un bloque de instrucciones que se añade a los agentes que lo tengan."
      open={open}
      onOpenChange={setOpen}
      isPending={save.isPending}
      submitLabel="Guardar"
      onSubmit={() =>
        save.mutate({
          id: skill?.id,
          body: { ...form, description: form.description.trim() || null },
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
            <Input
              value={form.code}
              placeholder="nutricion"
              onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase() })}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Descripción</Label>
          <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Instrucciones</Label>
          <Textarea
            rows={10}
            value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v === true })} />
          Activa
        </label>
      </div>
    </CreateDialog>
  );
}

export function AiSkillsPage() {
  const { data, isLoading } = useAiSkills();
  const remove = useDeleteAiSkill();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Skills"
        description="Bloques de instrucciones reutilizables (tono, nutrición, entrenamiento…) que se suman a las instrucciones del agente."
        actions={
          <SkillDialog
            trigger={
              <Button>
                <Plus size={16} /> Nueva skill
              </Button>
            }
          />
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Skill</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5}>Cargando…</TableCell>
            </TableRow>
          ) : (
            (data ?? []).map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell className="font-mono text-xs">{s.code}</TableCell>
                <TableCell className="text-muted-foreground max-w-md truncate text-sm">{s.description}</TableCell>
                <TableCell>
                  <Badge variant={s.enabled ? 'default' : 'secondary'}>{s.enabled ? 'Activa' : 'Apagada'}</Badge>
                </TableCell>
                <TableCell className="flex gap-1">
                  <SkillDialog
                    skill={s}
                    trigger={
                      <Button variant="ghost" size="icon" className="size-8" title="Editar">
                        <Pencil size={14} />
                      </Button>
                    }
                  />
                  <ConfirmDialog
                    title={`¿Borrar la skill «${s.name}»?`}
                    description="Se quitará de los agentes que la usen."
                    destructiveLabel="Borrar"
                    isPending={remove.isPending}
                    onConfirm={() => remove.mutate(s.id)}
                    trigger={
                      <Button variant="ghost" size="icon" className="size-8" title="Borrar">
                        <Trash2 size={14} />
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
