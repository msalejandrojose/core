import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowLeft, ArrowUp, ImageOff, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { FieldWrapper } from '@/components/forms/FieldWrapper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { uploadFormFile } from '@/features/forms/upload';
import { toast } from '@/lib/toast';
import { resolveCircuitImageUrl } from '../circuits/lib/circuit-image-url';
import { useTracks } from '../tracks/hooks/use-tracks';
import {
  GRAND_PRIX_DIFFICULTY_LABELS,
  type GrandPrixDifficulty,
  type GrandPrixRow,
} from '../types';
import { useCreateGrandPrix } from './hooks/use-create-grand-prix';
import { useGrandPrix } from './hooks/use-grand-prix';
import { useGrandPrixLeaderboard } from './hooks/use-grand-prix-leaderboard';
import { useUpdateGrandPrix } from './hooks/use-update-grand-prix';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const schema = z.object({
  slug: z
    .string()
    .min(1, 'Obligatorio')
    .max(64)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'kebab-case: minúsculas, dígitos y guiones'),
  name: z.string().min(1, 'Obligatorio').max(120),
  isActive: z.enum(['true', 'false']),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  creditsReward: z.number().int().min(0),
  xpReward: z.number().int().min(0),
  imageId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface StageDraft {
  trackId: string;
  trackSlug: string;
  trackName: string;
  laps: number;
}

export function GrandPrixEditorPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { data: grandPrix, isLoading } = useGrandPrix(id ?? '');

  if (isEdit && (isLoading || !grandPrix)) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <GrandPrixEditorForm
      grandPrix={(grandPrix as GrandPrixRow | undefined) ?? undefined}
    />
  );
}

function GrandPrixEditorForm({ grandPrix }: { grandPrix?: GrandPrixRow }) {
  const navigate = useNavigate();
  const isEdit = Boolean(grandPrix);
  const [stages, setStages] = useState<StageDraft[]>(
    grandPrix?.stages
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        trackId: s.trackId,
        trackSlug: s.trackSlug,
        trackName: s.trackName,
        laps: s.laps,
      })) ?? [],
  );
  const [stagesTouched, setStagesTouched] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      slug: grandPrix?.slug ?? '',
      name: grandPrix?.name ?? '',
      isActive: grandPrix && !grandPrix.isActive ? 'false' : 'true',
      difficulty: grandPrix?.difficulty ?? 'MEDIUM',
      creditsReward: grandPrix?.creditsReward ?? 0,
      xpReward: grandPrix?.xpReward ?? 0,
      imageId: grandPrix?.imageId ?? undefined,
    },
  });

  // Uploader de imagen — mismo patrón que `CircuitEditorPage`.
  const [imagePreview, setImagePreview] = useState<string | null>(
    resolveCircuitImageUrl(grandPrix?.imageUrl ?? null),
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const ref = await uploadFormFile(file);
      form.setValue('imageId', ref.id ?? undefined, { shouldDirty: true });
      setImagePreview(URL.createObjectURL(file));
    } catch {
      toast.error('No se pudo subir la imagen');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const onRemoveImage = () => {
    form.setValue('imageId', undefined, { shouldDirty: true });
    setImagePreview(null);
  };

  const create = useCreateGrandPrix({
    onSuccess: (newId) => navigate(`/racing/grand-prix/${newId}`, { replace: true }),
  });
  const update = useUpdateGrandPrix(grandPrix?.id ?? '', {
    onSuccess: () => navigate('/racing/grand-prix'),
  });
  const isSaving = create.isPending || update.isPending;

  const canSubmit = stages.length >= 2;

  const submit = form.handleSubmit((v) => {
    setStagesTouched(true);
    if (!canSubmit) return;

    const isActive = v.isActive === 'true';
    const stagePayload = stages.map((s) => ({ trackId: s.trackId, laps: s.laps }));
    const difficulty = v.difficulty as GrandPrixDifficulty;

    if (isEdit && grandPrix) {
      update.mutate({
        name: v.name,
        stages: stagePayload,
        isActive,
        difficulty,
        creditsReward: v.creditsReward,
        xpReward: v.xpReward,
        // `undefined` (formulario sin imagen) se manda como `null`: en un PATCH
        // "ausente" significaría "no tocar" — el editor siempre resincroniza.
        imageId: v.imageId ?? null,
      });
    } else {
      create.mutate({
        slug: v.slug,
        name: v.name,
        stages: stagePayload,
        isActive,
        difficulty,
        creditsReward: v.creditsReward,
        xpReward: v.xpReward,
        imageId: v.imageId ?? null,
      });
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigate('/racing/grand-prix')}
            >
              <ArrowLeft size={16} />
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isEdit ? 'Editar Grand Prix' : 'Nuevo Grand Prix'}
            </h1>
            {grandPrix && (
              <Badge variant={grandPrix.isActive ? 'default' : 'secondary'}>
                {grandPrix.isActive ? 'Activo' : 'Inactivo'}
              </Badge>
            )}
          </div>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Datos generales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <span className="text-sm font-medium">Imagen</span>
              <div className="flex items-center gap-4">
                <div className="bg-muted flex size-24 items-center justify-center overflow-hidden rounded-md">
                  {imagePreview ? (
                    <img src={imagePreview} alt="" className="size-full object-cover" />
                  ) : (
                    <ImageOff size={24} className="text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onPickImage}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingImage}
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <Upload size={14} />
                    {isUploadingImage
                      ? 'Subiendo…'
                      : imagePreview
                        ? 'Cambiar imagen'
                        : 'Subir imagen'}
                  </Button>
                  {imagePreview && (
                    <Button type="button" variant="ghost" size="sm" onClick={onRemoveImage}>
                      <X size={14} />
                      Quitar
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldWrapper control={form.control} name="name" label="Nombre">
                {(field) => <Input placeholder="Copa de Verano" {...field} />}
              </FieldWrapper>
              <FieldWrapper control={form.control} name="slug" label="Slug">
                {(field) => (
                  <Input
                    placeholder="copa-verano"
                    disabled={isEdit}
                    {...field}
                  />
                )}
              </FieldWrapper>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FieldWrapper control={form.control} name="difficulty" label="Dificultad">
                {(field) => (
                  <Select value={field.value as string} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(GRAND_PRIX_DIFFICULTY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FieldWrapper>
              <FieldWrapper control={form.control} name="creditsReward" label="Créditos">
                {(field) => (
                  <Input
                    type="number"
                    min={0}
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                  />
                )}
              </FieldWrapper>
              <FieldWrapper control={form.control} name="xpReward" label="XP">
                {(field) => (
                  <Input
                    type="number"
                    min={0}
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                  />
                )}
              </FieldWrapper>
            </div>
            <FieldWrapper control={form.control} name="isActive" label="Estado">
              {(field) => (
                <Select value={field.value as string} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Activo</SelectItem>
                    <SelectItem value="false">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </FieldWrapper>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Circuitos, en orden</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <StagePicker stages={stages} onChange={setStages} />
            {stagesTouched && !canSubmit && (
              <p className="text-destructive text-sm">
                Hacen falta al menos dos circuitos.
              </p>
            )}
          </CardContent>
        </Card>

        {isEdit && grandPrix && <GrandPrixLeaderboardCard grandPrixId={grandPrix.id} />}
      </form>
    </Form>
  );
}

function StagePicker({
  stages,
  onChange,
}: {
  stages: StageDraft[];
  onChange: (stages: StageDraft[]) => void;
}) {
  const { data } = useTracks({ page: 1, limit: 100 });
  const chosenIds = new Set(stages.map((s) => s.trackId));
  const available = (data?.data ?? []).filter(
    (t) => t.isActive && !chosenIds.has(t.id),
  );

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= stages.length) return;
    const next = stages.slice();
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function remove(index: number) {
    onChange(stages.filter((_, i) => i !== index));
  }

  function setLaps(index: number, laps: number) {
    const next = stages.slice();
    next[index] = { ...next[index], laps: Math.max(1, Math.min(20, laps || 1)) };
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {stages.length === 0 ? (
        <p className="text-muted-foreground text-sm">Sin circuitos todavía.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {stages.map((stage, index) => (
            <li
              key={stage.trackId}
              className="flex items-center gap-3 px-3 py-2"
            >
              <span className="text-muted-foreground w-6 text-sm tabular-nums">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{stage.trackName}</div>
                <div className="text-muted-foreground truncate font-mono text-xs">
                  {stage.trackSlug}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">Vueltas</span>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  className="w-16"
                  value={stage.laps}
                  onChange={(e) => setLaps(index, Number(e.target.value))}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp size={14} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={index === stages.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown size={14} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive size-8"
                onClick={() => remove(index)}
              >
                <X size={14} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Select
        value=""
        onValueChange={(trackId) => {
          const track = available.find((t) => t.id === trackId);
          if (!track) return;
          onChange([
            ...stages,
            {
              trackId: track.id,
              trackSlug: track.slug,
              trackName: track.name,
              laps: 1,
            },
          ]);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Añadir circuito…" />
        </SelectTrigger>
        <SelectContent>
          {available.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function GrandPrixLeaderboardCard({ grandPrixId }: { grandPrixId: string }) {
  const { data, isLoading } = useGrandPrixLeaderboard(grandPrixId);
  const entries = data?.entries ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clasificación</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Todavía nadie lo ha completado.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Jugador</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.userId}>
                  <TableCell className="tabular-nums">{entry.position}</TableCell>
                  <TableCell>{entry.displayName}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatDurationMs(entry.totalDurationMs)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// Mismo formato que en el resto de racing (TASK-246): "1:07.482".
function formatDurationMs(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}
