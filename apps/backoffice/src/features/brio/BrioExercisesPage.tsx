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
  MEASURE_LABEL,
  MUSCLES,
  useBrioExercises,
  useSaveBrioExercise,
  type AdminExercise,
  type SaveExercise,
} from './hooks';

const LEVELS = [
  { value: '0', label: '—' },
  { value: '1', label: 'Principal' },
  { value: '0.5', label: 'Secundario' },
  { value: '0.25', label: 'Indirecto' },
];
const MUSCLE_LABEL = Object.fromEntries(MUSCLES.map((m) => [m.value, m.label]));

const empty = (): SaveExercise => ({
  code: null,
  name: '',
  measure: 'REPS',
  isCompound: false,
  isBodyweight: false,
  isArchived: false,
  muscles: [],
});

function ExerciseDialog({ exercise, trigger }: { exercise?: AdminExercise; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SaveExercise>(() => (exercise ? { ...exercise } : empty()));
  const save = useSaveBrioExercise(() => setOpen(false));
  const weightOf = (m: string) => form.muscles.find((x) => x.muscle === m)?.weight ?? 0;
  const setWeight = (m: string, w: number) =>
    setForm({
      ...form,
      muscles: [...form.muscles.filter((x) => x.muscle !== m), ...(w ? [{ muscle: m, weight: w }] : [])],
    });

  return (
    <CreateDialog
      trigger={trigger}
      title={exercise ? `Editar «${exercise.name}»` : 'Nuevo ejercicio'}
      description="Cuánto trabaja cada músculo alimenta el análisis de rendimiento y el reparto de las rutinas."
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setForm(exercise ? { ...exercise } : empty());
      }}
      isPending={save.isPending}
      submitLabel="Guardar"
      onSubmit={() =>
        save.mutate({
          id: exercise?.id,
          body: {
            code: form.code?.trim() || null,
            name: form.name,
            measure: form.measure,
            isCompound: form.isCompound,
            isBodyweight: form.isBodyweight,
            isArchived: form.isArchived,
            muscles: form.muscles,
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
            <Label>Código (para Hevy)</Label>
            <Input
              value={form.code ?? ''}
              placeholder="dumbbell_incline_bench_press"
              onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase() })}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Se mide en</Label>
          <Select value={form.measure} onValueChange={(v) => setForm({ ...form, measure: v as SaveExercise['measure'] })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(MEASURE_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Músculos</Label>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {MUSCLES.map((m) => (
              <div key={m.value} className="flex items-center justify-between gap-2 text-sm">
                <span>{m.label}</span>
                <Select value={String(weightOf(m.value))} onValueChange={(v) => setWeight(m.value, Number(v))}>
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.isCompound} onCheckedChange={(v) => setForm({ ...form, isCompound: v === true })} />
            Multiarticular
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.isBodyweight} onCheckedChange={(v) => setForm({ ...form, isBodyweight: v === true })} />
            Peso corporal (sin carga)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.isArchived} onCheckedChange={(v) => setForm({ ...form, isArchived: v === true })} />
            Archivado
          </label>
        </div>
      </div>
    </CreateDialog>
  );
}

export function BrioExercisesPage() {
  const [q, setQ] = useState('');
  const { data, isLoading } = useBrioExercises(q.trim());
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ejercicios"
        description="Catálogo de ejercicios de gimnasio, HYROX y cardio, con los músculos que trabaja cada uno. Los archivados ya no se ofrecen, pero el historial se conserva."
        actions={
          <ExerciseDialog
            trigger={
              <Button>
                <Plus size={16} /> Nuevo ejercicio
              </Button>
            }
          />
        }
      />
      <div className="flex items-center gap-3">
        <Input className="w-72" placeholder="Buscar ejercicio" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="text-muted-foreground ml-auto text-sm">{data?.length ?? 0} ejercicios</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ejercicio</TableHead>
            <TableHead>Medida</TableHead>
            <TableHead>Principales</TableHead>
            <TableHead>Secundarios</TableHead>
            <TableHead className="text-right">Series</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6}>Cargando…</TableCell>
            </TableRow>
          ) : (
            (data ?? []).map((e) => (
              <TableRow key={e.id} className={e.isArchived ? 'opacity-60' : undefined}>
                <TableCell>
                  <div className="font-medium">{e.name}</div>
                  <div className="text-muted-foreground font-mono text-xs">{e.code}</div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Badge variant="secondary">{MEASURE_LABEL[e.measure]}</Badge>
                    {e.isArchived ? <Badge variant="outline">Archivado</Badge> : null}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {e.muscles.filter((m) => m.weight === 1).map((m) => MUSCLE_LABEL[m.muscle]).join(', ')}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {e.muscles.filter((m) => m.weight < 1).map((m) => MUSCLE_LABEL[m.muscle]).join(', ')}
                </TableCell>
                <TableCell className="text-right tabular-nums">{e.uses}</TableCell>
                <TableCell>
                  <ExerciseDialog
                    exercise={e}
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
