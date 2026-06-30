import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Pencil, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { FieldWrapper } from '@/components/forms/FieldWrapper';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { DangerZone } from '@/components/DangerZone';
import { useApiSections } from '@/features/roles/hooks/use-api-sections';
import { DeleteApiSectionDialog } from './components/DeleteApiSectionDialog';
import { useApiSection } from './hooks/use-api-section';
import { useCreateApiSection } from './hooks/use-create-api-section';
import { useUpdateApiSection } from './hooks/use-update-api-section';

const NO_PARENT = '__none__';

const schema = z.object({
  code: z
    .string()
    .min(1, 'Obligatorio')
    .max(128)
    .regex(
      /^[a-z0-9_]+(\.[a-z0-9_]+)*$/,
      'Segmentos en minúscula separados por punto (p. ej. users.create)',
    ),
  name: z.string().min(1, 'Obligatorio').max(100),
  description: z.string().max(500),
  parentSectionId: z.string(),
});

type FormValues = z.infer<typeof schema>;
type Mode = 'view' | 'edit' | 'create';

export function ApiSectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const isCreate = !id;
  const initialMode: Mode = isCreate
    ? 'create'
    : (location.state as { mode?: Mode } | null)?.mode ?? 'view';

  const [mode, setMode] = useState<Mode>(initialMode);

  const { data: section, isLoading } = useApiSection(id ?? '');
  const { data: sections } = useApiSections();

  const parentOptions = (sections?.data ?? []).filter((s) => s.id !== id);

  const create = useCreateApiSection({
    onSuccess: () => navigate('/sections', { replace: true }),
  });
  const update = useUpdateApiSection(id ?? '');

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      parentSectionId: NO_PARENT,
    },
  });

  useEffect(() => {
    if (section && mode !== 'create') {
      form.reset({
        code: section.code,
        name: section.name,
        description: section.description ?? '',
        parentSectionId: section.parentSectionId ?? NO_PARENT,
      });
    }
  }, [section, form, mode]);

  const handleSubmit = form.handleSubmit((values) => {
    const parentSectionId =
      values.parentSectionId === NO_PARENT ? null : values.parentSectionId;

    if (mode === 'create') {
      create.mutate({
        code: values.code,
        name: values.name,
        description: values.description || undefined,
        parentSectionId: parentSectionId ?? undefined,
      });
    } else {
      update.mutate(
        {
          name: values.name,
          description: values.description || null,
          parentSectionId,
        },
        { onSuccess: () => setMode('view') },
      );
    }
  });

  const handleCancel = () => {
    if (mode === 'create') {
      navigate(-1);
    } else {
      form.reset({
        code: section?.code ?? '',
        name: section?.name ?? '',
        description: section?.description ?? '',
        parentSectionId: section?.parentSectionId ?? NO_PARENT,
      });
      setMode('view');
    }
  };

  const isEditable = mode === 'edit' || mode === 'create';
  const isPending = create.isPending || update.isPending;

  const title =
    mode === 'create'
      ? 'Nueva sección'
      : mode === 'edit'
        ? 'Editar sección'
        : 'Detalle de sección';

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
          </Button>
          <h1 className="text-2xl font-semibold">{title}</h1>
        </div>

        <div className="flex gap-2">
          {mode === 'view' && (
            <Button variant="outline" onClick={() => setMode('edit')}>
              <Pencil size={14} />
              Editar
            </Button>
          )}
          {isEditable && (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={isPending}>
                <X size={14} />
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending
                  ? mode === 'create'
                    ? 'Creando…'
                    : 'Guardando…'
                  : mode === 'create'
                    ? 'Crear sección'
                    : 'Guardar cambios'}
              </Button>
            </>
          )}
        </div>
      </div>

      {!isCreate && (isLoading || !section) ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Información de la sección</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <div className="space-y-4">
                  {mode === 'view' ? (
                    <>
                      <div className="grid gap-1">
                        <Label className="text-muted-foreground text-xs">Código</Label>
                        <p className="font-mono text-sm">{section?.code}</p>
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-muted-foreground text-xs">Nombre</Label>
                        <p className="text-sm">{section?.name}</p>
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-muted-foreground text-xs">Sección padre</Label>
                        <p className="text-sm">
                          {section?.parentSectionId
                            ? (parentOptions.find((s) => s.id === section.parentSectionId)?.name ??
                              section.parentSectionId)
                            : '—'}
                        </p>
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-muted-foreground text-xs">Descripción</Label>
                        <p className="text-muted-foreground text-sm">
                          {section?.description ?? '—'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      {mode === 'create' ? (
                        <FieldWrapper control={form.control} name="code" label="Código">
                          {(field) => (
                            <Input placeholder="p. ej. users.create" className="font-mono" {...field} />
                          )}
                        </FieldWrapper>
                      ) : (
                        <div className="grid gap-2">
                          <Label>Código</Label>
                          <Input
                            value={section?.code ?? ''}
                            readOnly
                            disabled
                            className="font-mono"
                          />
                        </div>
                      )}
                      <FieldWrapper control={form.control} name="name" label="Nombre">
                        {(field) => <Input {...field} />}
                      </FieldWrapper>
                      <FieldWrapper
                        control={form.control}
                        name="parentSectionId"
                        label="Sección padre"
                      >
                        {(field) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_PARENT}>Sin sección padre</SelectItem>
                              {parentOptions.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </FieldWrapper>
                      <FieldWrapper
                        control={form.control}
                        name="description"
                        label="Descripción"
                      >
                        {(field) => <Textarea rows={3} {...field} />}
                      </FieldWrapper>
                    </>
                  )}
                </div>
              </Form>
            </CardContent>
          </Card>

          {!isCreate && section && mode !== 'edit' && (
            <DangerZone
              description="Solo se puede eliminar si ningún rol o usuario tiene permisos sobre ella. No se puede deshacer."
              action={<DeleteApiSectionDialog id={section.id} />}
            />
          )}
        </>
      )}
    </div>
  );
}
