import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { CreateDialog } from '@/components/dialogs/CreateDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBrioFoods, useDeleteBrioFood, useSaveBrioFood, type AdminFood, type SaveFood } from './hooks';

const SOURCE_LABEL: Record<string, string> = {
  CURATED: 'Nuestro',
  OPEN_FOOD_FACTS: 'Open Food Facts',
  USER: 'Usuario',
};

const num = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

interface FoodForm {
  name: string;
  brand: string;
  barcode: string;
  isVerified: boolean;
  isLiquid: boolean;
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
  servings: { label: string; grams: string; isDefault: boolean }[];
}

const toForm = (f?: AdminFood): FoodForm =>
  f
    ? {
        name: f.name,
        brand: f.brand ?? '',
        barcode: f.barcode ?? '',
        isVerified: f.isVerified,
        isLiquid: f.isLiquid,
        kcal: String(f.kcalPer100),
        protein: String(f.proteinPer100G),
        carbs: String(f.carbsPer100G),
        fat: String(f.fatPer100G),
        servings: f.servings.map((s) => ({ label: s.label, grams: String(s.grams), isDefault: s.isDefault })),
      }
    : {
        name: '',
        brand: '',
        barcode: '',
        isVerified: true,
        isLiquid: false,
        kcal: '',
        protein: '',
        carbs: '',
        fat: '',
        servings: [{ label: '100 g', grams: '100', isDefault: true }],
      };

const toBody = (f: FoodForm): SaveFood => ({
  name: f.name,
  brand: f.brand.trim() || null,
  barcode: f.barcode.trim() || null,
  isVerified: f.isVerified,
  isLiquid: f.isLiquid,
  kcalPer100: Math.round(num(f.kcal)),
  proteinPer100G: num(f.protein),
  carbsPer100G: num(f.carbs),
  fatPer100G: num(f.fat),
  servings: f.servings
    .filter((s) => s.label.trim() && num(s.grams) > 0)
    .map((s) => ({ label: s.label.trim(), grams: num(s.grams), isDefault: s.isDefault })),
});

function FoodDialog({ food, trigger }: { food?: AdminFood; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FoodForm>(() => toForm(food));
  const save = useSaveBrioFood(() => {
    setOpen(false);
    if (!food) setForm(toForm());
  });
  const set = (p: Partial<FoodForm>) => setForm({ ...form, ...p });
  const macroKcal = Math.round(num(form.protein) * 4 + num(form.carbs) * 4 + num(form.fat) * 9);

  return (
    <CreateDialog
      trigger={trigger}
      title={food ? `Editar «${food.name}»` : 'Nuevo alimento'}
      description="Valores por 100 g (o 100 ml si es líquido). Las raciones son las que la app ofrece al apuntarlo."
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setForm(toForm(food));
      }}
      isPending={save.isPending}
      submitLabel="Guardar"
      onSubmit={() => save.mutate({ id: food?.id, body: toBody(form) })}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Nombre</Label>
            <Input value={form.name} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Marca</Label>
            <Input value={form.brand} onChange={(e) => set({ brand: e.target.value })} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Código de barras</Label>
          <Input value={form.barcode} inputMode="numeric" placeholder="8410000000000" onChange={(e) => set({ barcode: e.target.value.replace(/\D/g, '') })} />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {(
            [
              ['kcal', 'kcal'],
              ['protein', 'Proteína g'],
              ['carbs', 'Hidratos g'],
              ['fat', 'Grasa g'],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="space-y-1">
              <Label>{label}</Label>
              <Input inputMode="decimal" value={form[k]} onChange={(e) => set({ [k]: e.target.value } as Partial<FoodForm>)} />
            </div>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">Los macros suman {macroKcal} kcal.</p>
        <div className="space-y-2">
          <Label>Raciones</Label>
          {form.servings.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                className="flex-1"
                value={s.label}
                placeholder="1 rebanada"
                onChange={(e) => set({ servings: form.servings.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
              />
              <Input
                className="w-24"
                inputMode="decimal"
                value={s.grams}
                onChange={(e) => set({ servings: form.servings.map((x, j) => (j === i ? { ...x, grams: e.target.value } : x)) })}
              />
              <span className="text-muted-foreground w-6 text-xs">{form.isLiquid ? 'ml' : 'g'}</span>
              <label className="flex items-center gap-1 text-xs">
                <Checkbox
                  checked={s.isDefault}
                  onCheckedChange={() => set({ servings: form.servings.map((x, j) => ({ ...x, isDefault: j === i })) })}
                />
                Por defecto
              </label>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                title="Quitar ración"
                onClick={() => set({ servings: form.servings.filter((_, j) => j !== i) })}
              >
                <X size={14} />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => set({ servings: [...form.servings, { label: '', grams: '', isDefault: false }] })}>
            <Plus size={14} /> Ración
          </Button>
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.isLiquid} onCheckedChange={(v) => set({ isLiquid: v === true })} />
            Líquido (ml)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.isVerified} onCheckedChange={(v) => set({ isVerified: v === true })} />
            Revisado
          </label>
        </div>
      </div>
    </CreateDialog>
  );
}

export function BrioFoodsPage() {
  const [q, setQ] = useState('');
  const [source, setSource] = useState('all');
  const [unverified, setUnverified] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const { data, isLoading } = useBrioFoods({ q, source: source === 'all' ? '' : source, unverified, page, pageSize });
  const remove = useDeleteBrioFood();
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alimentos"
        description="Catálogo compartido de Brío: los nuestros, los importados de Open Food Facts al escanear y los que hay que revisar."
        actions={
          <FoodDialog
            trigger={
              <Button>
                <Plus size={16} /> Nuevo alimento
              </Button>
            }
          />
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="w-72"
          placeholder="Buscar por nombre, marca o código"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <Select
          value={source}
          onValueChange={(v) => {
            setSource(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los orígenes</SelectItem>
            {Object.entries(SOURCE_LABEL).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={unverified}
            onCheckedChange={(v) => {
              setUnverified(v === true);
              setPage(1);
            }}
          />
          Solo sin revisar
        </label>
        <span className="text-muted-foreground ml-auto text-sm">{data?.total ?? 0} alimentos</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Alimento</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead className="text-right">kcal</TableHead>
            <TableHead className="text-right">P / H / G</TableHead>
            <TableHead>Raciones</TableHead>
            <TableHead className="text-right">Usos</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7}>Cargando…</TableCell>
            </TableRow>
          ) : (
            (data?.data ?? []).map((f) => (
              <TableRow key={f.id}>
                <TableCell>
                  <div className="font-medium">{f.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {[f.brand, f.barcode].filter(Boolean).join(' · ')}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Badge variant="secondary">{SOURCE_LABEL[f.source] ?? f.source}</Badge>
                    {f.isVerified ? null : <Badge variant="outline">Sin revisar</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{f.kcalPer100}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {f.proteinPer100G} / {f.carbsPer100G} / {f.fatPer100G}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-56 truncate text-xs">
                  {f.servings.map((s) => s.label).join(', ')}
                </TableCell>
                <TableCell className="text-right tabular-nums">{f.uses}</TableCell>
                <TableCell className="flex gap-1">
                  <FoodDialog
                    food={f}
                    trigger={
                      <Button variant="ghost" size="icon" className="size-8" title="Editar">
                        <Pencil size={14} />
                      </Button>
                    }
                  />
                  <ConfirmDialog
                    title={`¿Borrar «${f.name}»?`}
                    description={
                      f.uses
                        ? `Se ha apuntado ${f.uses} veces: esas comidas conservan su nombre y sus kcal, pero ya no se podrá elegir.`
                        : 'Nadie lo ha apuntado todavía.'
                    }
                    destructiveLabel="Borrar"
                    isPending={remove.isPending}
                    onConfirm={() => remove.mutate(f.id)}
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
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Anterior
        </Button>
        <span className="text-muted-foreground text-sm">
          Página {page} de {pages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}
