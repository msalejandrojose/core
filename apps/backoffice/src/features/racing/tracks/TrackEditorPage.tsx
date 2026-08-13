import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import { TrackPathCanvas } from './components/TrackPathCanvas';
import { useCreateTrack } from './hooks/use-create-track';
import { useTrack } from './hooks/use-track';
import { useUpdateTrack } from './hooks/use-update-track';
import { TRACK_THEME_LABELS, type TrackCellRow, type TrackRow } from '../types';
import { validateTrackPath } from './validate-track-path';

const schema = z.object({
  slug: z
    .string()
    .min(1, 'Obligatorio')
    .max(64)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'kebab-case: minúsculas, dígitos y guiones'),
  name: z.string().min(1, 'Obligatorio').max(120),
  sectorCount: z.number().int().min(1, 'Al menos 1'),
  minPlausibleMs: z.number().int().min(1, 'Al menos 1'),
  theme: z.enum(['MEADOW', 'SNOW']),
  grip: z.number().positive('Tiene que ser mayor que 0'),
  isActive: z.enum(['true', 'false']),
});

type FormValues = z.infer<typeof schema>;

export function TrackEditorPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { data: track, isLoading } = useTrack(id ?? '');

  if (isEdit && (isLoading || !track)) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return <TrackEditorForm track={(track as TrackRow | undefined) ?? undefined} />;
}

function TrackEditorForm({ track }: { track?: TrackRow }) {
  const navigate = useNavigate();
  const isEdit = Boolean(track);
  const [path, setPath] = useState<TrackCellRow[]>(track?.path ?? []);
  const [pathTouched, setPathTouched] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      slug: track?.slug ?? '',
      name: track?.name ?? '',
      sectorCount: track?.sectorCount ?? 3,
      minPlausibleMs: track?.minPlausibleMs ?? 8000,
      theme: track?.theme ?? 'MEADOW',
      grip: track?.grip ?? 1,
      isActive: track && !track.isActive ? 'false' : 'true',
    },
  });

  const theme = useWatch({ control: form.control, name: 'theme' });

  const create = useCreateTrack({
    onSuccess: (newId) => navigate(`/racing/tracks/${newId}`, { replace: true }),
  });
  const update = useUpdateTrack(track?.id ?? '', {
    onSuccess: () => navigate('/racing/tracks'),
  });
  const isSaving = create.isPending || update.isPending;

  const pathValidation = validateTrackPath(path);
  const canSubmit = pathValidation.ok;

  const submit = form.handleSubmit((v) => {
    setPathTouched(true);
    if (!pathValidation.ok) return;

    const isActive = v.isActive === 'true';
    if (isEdit && track) {
      update.mutate({
        name: v.name,
        sectorCount: v.sectorCount,
        minPlausibleMs: v.minPlausibleMs,
        path,
        theme: v.theme,
        grip: v.grip,
        isActive,
      });
    } else {
      create.mutate({
        slug: v.slug,
        name: v.name,
        sectorCount: v.sectorCount,
        minPlausibleMs: v.minPlausibleMs,
        path,
        theme: v.theme,
        grip: v.grip,
        isActive,
      });
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigate('/racing/tracks')}
            >
              <ArrowLeft size={16} />
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight">
              {isEdit ? 'Editar circuito' : 'Nuevo circuito'}
            </h1>
            {track && (
              <Badge variant={track.isActive ? 'default' : 'secondary'}>
                {track.isActive ? 'Activo' : 'Inactivo'}
              </Badge>
            )}
          </div>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Trazado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <TrackPathCanvas path={path} onChange={setPath} theme={theme} />
            {pathTouched && !pathValidation.ok && (
              <p className="text-destructive text-sm">{pathValidation.reason}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Datos del circuito</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FieldWrapper control={form.control} name="name" label="Nombre">
                {(field) => <Input placeholder="Circuito del Puerto" {...field} />}
              </FieldWrapper>
              <FieldWrapper control={form.control} name="slug" label="Slug">
                {(field) => (
                  <Input
                    placeholder="circuito-del-puerto"
                    disabled={isEdit}
                    {...field}
                  />
                )}
              </FieldWrapper>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FieldWrapper
                control={form.control}
                name="sectorCount"
                label="Sectores"
              >
                {(field) => (
                  <Input
                    type="number"
                    min={1}
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                )}
              </FieldWrapper>
              <FieldWrapper
                control={form.control}
                name="minPlausibleMs"
                label="Mínimo (ms)"
              >
                {(field) => (
                  <Input
                    type="number"
                    min={1}
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                )}
              </FieldWrapper>
              <FieldWrapper control={form.control} name="grip" label="Agarre">
                {(field) => (
                  <Input
                    type="number"
                    step={0.05}
                    min={0.01}
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                )}
              </FieldWrapper>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldWrapper control={form.control} name="theme" label="Tema visual">
                {(field) => (
                  <Select
                    value={field.value as string}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRACK_THEME_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FieldWrapper>
              <FieldWrapper control={form.control} name="isActive" label="Estado">
                {(field) => (
                  <Select
                    value={field.value as string}
                    onValueChange={field.onChange}
                  >
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
            </div>
          </CardContent>
        </Card>

        {!canSubmit && pathTouched && (
          <p className="text-destructive text-right text-sm">
            Cierra un trazado válido antes de guardar.
          </p>
        )}
      </form>
    </Form>
  );
}
