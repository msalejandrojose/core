import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ImageOff, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  useForm,
  useWatch,
  type ControllerRenderProps,
  type FieldPath,
} from 'react-hook-form';
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
import { toast } from '@/lib/toast';
import { uploadFormFile } from '@/features/forms/upload';
import { CircuitPathCanvas } from './components/CircuitPathCanvas';
import { useCircuit } from './hooks/use-circuit';
import { useUpdateCircuit } from './hooks/use-update-circuit';
import { resolveCircuitImageUrl } from './lib/circuit-image-url';
import { TRACK_THEME_LABELS, type CircuitRow, type TrackCellRow } from '../types';
import { validateCircuitPath } from './validate-circuit-path';

const schema = z.object({
  name: z.string().min(1, 'Obligatorio').max(120),
  checkpoints: z.number().int().min(1, 'Al menos 1'),
  theme: z.enum(['MEADOW', 'SNOW']),
  grip: z.number().positive('Tiene que ser mayor que 0'),
  isActive: z.enum(['true', 'false']),
  imageId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// `<input type="number">` exige internamente el punto como separador
// decimal, sea cual sea el idioma del sistema — al escribir la coma (lo
// natural en es-ES) el navegador lo da por inválido y `valueAsNumber` se
// vuelve NaN. Con texto libre se acepta cualquiera de los dos y se
// normaliza a mano antes de convertir a número.
function DecimalInput({
  field,
  initialValue,
}: {
  field: ControllerRenderProps<FormValues, FieldPath<FormValues>>;
  initialValue: number;
}) {
  const [text, setText] = useState(() => String(initialValue));

  return (
    <Input
      {...field}
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const normalized = raw.replace(',', '.');
        const parsed = Number(normalized);
        if (normalized.trim() !== '' && !Number.isNaN(parsed)) {
          field.onChange(parsed);
        }
      }}
      onBlur={() => {
        field.onBlur();
        setText(String(field.value ?? ''));
      }}
    />
  );
}

export function CircuitEditorPage() {
  const { id } = useParams();
  const { data: circuit, isLoading } = useCircuit(id ?? '');

  if (isLoading || !circuit) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return <CircuitEditorForm circuit={circuit as CircuitRow} />;
}

function CircuitEditorForm({ circuit }: { circuit: CircuitRow }) {
  const navigate = useNavigate();
  const [path, setPath] = useState<TrackCellRow[]>(circuit.path);
  const [pathTouched, setPathTouched] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: circuit.name,
      checkpoints: circuit.checkpoints,
      theme: circuit.theme,
      grip: circuit.grip,
      isActive: circuit.isActive ? 'true' : 'false',
      imageId: circuit.imageId ?? undefined,
    },
  });

  const theme = useWatch({ control: form.control, name: 'theme' });

  // Previsualización local: al elegir un fichero se enseña al momento con
  // `URL.createObjectURL` (sin esperar a guardar ni a pedir una URL de
  // visualización aparte); arranca con la que devuelve la API si ya tenía.
  const [imagePreview, setImagePreview] = useState<string | null>(
    resolveCircuitImageUrl(circuit.imageUrl),
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

  const update = useUpdateCircuit(circuit.id, {
    onSuccess: () => navigate('/racing/circuits'),
  });

  const pathValidation = validateCircuitPath(path);
  const canSubmit = pathValidation.ok;

  const submit = form.handleSubmit((v) => {
    setPathTouched(true);
    if (!pathValidation.ok) return;

    update.mutate({
      name: v.name,
      checkpoints: v.checkpoints,
      path,
      theme: v.theme,
      grip: v.grip,
      isActive: v.isActive === 'true',
      // `undefined` (formulario sin imagen) se manda como `null`: en un
      // PATCH, a diferencia del alta, "ausente" significaría "no tocar" —
      // aquí siempre se resincroniza todo el estado del formulario.
      imageId: v.imageId ?? null,
    });
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
              onClick={() => navigate('/racing/circuits')}
            >
              <ArrowLeft size={16} />
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight">Editar circuito</h1>
            <Badge variant={circuit.isActive ? 'default' : 'secondary'}>
              {circuit.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
            {circuit.isInRotation && <Badge variant="outline">En rotación hoy</Badge>}
          </div>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Trazado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <CircuitPathCanvas path={path} onChange={setPath} theme={theme} />
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
                {(field) => <Input placeholder="Circuito del Puerto" {...field} />}
              </FieldWrapper>
              <div className="space-y-2">
                <span className="text-sm font-medium">Slug</span>
                <Input value={circuit.slug} disabled />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldWrapper control={form.control} name="checkpoints" label="Checkpoints">
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
                {(field) => <DecimalInput field={field} initialValue={circuit.grip} />}
              </FieldWrapper>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldWrapper control={form.control} name="theme" label="Tema visual">
                {(field) => (
                  <Select value={field.value as string} onValueChange={field.onChange}>
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
