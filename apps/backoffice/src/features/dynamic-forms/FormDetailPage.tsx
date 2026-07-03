import { AlertTriangle, ArrowLeft, Pencil, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useDetailMode } from '@/lib/use-detail-mode';
import { FieldBuilder } from './components/FieldBuilder';
import { FieldEditorPanel } from './components/FieldEditorPanel';
import { FormPreview } from './components/FormPreview';
import { FormStatusBadge } from './components/FormStatusBadge';
import { InstancesTab } from './components/InstancesTab';
import { ResponsesTab } from './components/ResponsesTab';
import { useCreateForm } from './hooks/use-create-form';
import { useForm } from './hooks/use-form';
import { useUpdateForm } from './hooks/use-update-form';
import {
  SCHEMA_VERSION,
  duplicateKeys,
  isValidKey,
  typeHasOptions,
} from './schema';
import {
  FORM_STATUSES,
  FORM_STATUS_LABELS,
  type FormFieldSchema,
  type FormStatus,
} from './types';

/** Valida el borrador antes de guardar. Devuelve un mensaje de error o null. */
function validateDraft(title: string, fields: FormFieldSchema[]): string | null {
  if (!title.trim()) return 'El título es obligatorio.';
  for (const field of fields) {
    if (!isValidKey(field.key))
      return `La key «${field.key || '(vacía)'}» no es válida (sin espacios).`;
    if (typeHasOptions(field.type) && (field.options ?? []).length === 0)
      return `El campo «${field.label || field.key}» necesita al menos una opción.`;
  }
  if (duplicateKeys(fields).size > 0)
    return 'Hay campos con la misma key; deben ser únicas.';
  return null;
}

export function FormDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const isCreate = !id;
  const { mode, isEditable, enterEdit, enterView } = useDetailMode(isCreate);

  const { data: form, isLoading } = useForm(id ?? '');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<FormStatus>('DRAFT');
  const [fields, setFields] = useState<FormFieldSchema[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Hidrata el estado del builder cuando llega (o cambia) el formulario, en
  // render en vez de en un efecto: es el patrón recomendado por React para
  // derivar estado a partir de props/datos previos sin cascadas de renders.
  const [hydratedId, setHydratedId] = useState<string | null>(null);
  if (form && mode !== 'create' && form.id !== hydratedId) {
    setHydratedId(form.id);
    setTitle(form.title);
    setDescription(form.description ?? '');
    setStatus(form.status);
    setFields(form.schema?.fields ?? []);
    setSelectedKey(null);
  }

  const create = useCreateForm({
    onSuccess: (newId) => navigate(`/forms/${newId}`, { replace: true }),
  });
  const update = useUpdateForm(id ?? '');
  const isPending = create.isPending || update.isPending;

  const selectedIndex = fields.findIndex((f) => f.key === selectedKey);
  const selectedField = selectedIndex >= 0 ? fields[selectedIndex] : null;
  const siblingKeys = fields
    .filter((_, i) => i !== selectedIndex)
    .map((f) => f.key);

  const handleFieldChange = (updated: FormFieldSchema) => {
    setFields((prev) =>
      prev.map((f, i) => (i === selectedIndex ? updated : f)),
    );
    if (updated.key !== selectedKey) setSelectedKey(updated.key);
  };

  const handleSave = () => {
    const error = validateDraft(title, fields);
    if (error) {
      toast.error(error);
      return;
    }
    const schema = { version: SCHEMA_VERSION, fields };

    if (mode === 'create') {
      create.mutate({
        title: title.trim(),
        description: description.trim() || undefined,
        schema,
      });
    } else {
      update.mutate(
        {
          title: title.trim(),
          description: description.trim() || null,
          schema,
          status,
        },
        { onSuccess: () => enterView() },
      );
    }
  };

  const handleCancel = () => {
    if (mode === 'create') {
      navigate(-1);
      return;
    }
    // Restaura desde el formulario cargado.
    if (form) {
      setTitle(form.title);
      setDescription(form.description ?? '');
      setStatus(form.status);
      setFields(form.schema?.fields ?? []);
      setSelectedKey(null);
    }
    enterView();
  };

  const heading =
    mode === 'create'
      ? 'Nuevo formulario'
      : mode === 'edit'
        ? 'Editar formulario'
        : (form?.title ?? 'Formulario');

  if (!isCreate && (isLoading || !form)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/forms')}>
            <ArrowLeft size={16} />
          </Button>
          <h1 className="text-2xl font-semibold">{heading}</h1>
          {mode === 'view' && form && <FormStatusBadge status={form.status} />}
        </div>

        <div className="flex gap-2">
          {mode === 'view' && (
            <Button variant="outline" onClick={enterEdit}>
              <Pencil size={14} />
              Editar
            </Button>
          )}
          {isEditable && (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isPending}
              >
                <X size={14} />
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isPending}>
                {isPending
                  ? 'Guardando…'
                  : mode === 'create'
                    ? 'Crear formulario'
                    : 'Guardar cambios'}
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="definicion">
        <TabsList>
          <TabsTrigger value="definicion">Definición</TabsTrigger>
          <TabsTrigger value="enlaces" disabled={isCreate}>
            Enlaces
          </TabsTrigger>
          <TabsTrigger value="respuestas" disabled={isCreate}>
            Respuestas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="definicion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditable ? (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="form-title">Título</Label>
                    <Input
                      id="form-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="form-description">Descripción</Label>
                    <Textarea
                      id="form-description"
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  {mode === 'edit' && (
                    <div className="grid gap-2">
                      <Label>Estado</Label>
                      <Select
                        value={status}
                        onValueChange={(v) => setStatus(v as FormStatus)}
                      >
                        <SelectTrigger className="w-56">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FORM_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {FORM_STATUS_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="grid gap-1">
                    <Label className="text-muted-foreground text-xs">
                      Título
                    </Label>
                    <p className="text-sm">{form?.title}</p>
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-muted-foreground text-xs">
                      Descripción
                    </Label>
                    <p className="text-muted-foreground text-sm">
                      {form?.description || '—'}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {mode === 'edit' && form?.status === 'PUBLISHED' && (
            <div className="border-border bg-muted/40 text-muted-foreground flex items-start gap-2 rounded-md border px-4 py-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                Este formulario está publicado. Puedes editar el schema, pero las
                respuestas ya recibidas conservan su propia copia (schemaSnapshot).
                Evita borrar campos o cambiar su tipo si quieres poder leerlas con
                la misma clave.
              </span>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Campos</CardTitle>
                </CardHeader>
                <CardContent>
                  <FieldBuilder
                    fields={fields}
                    onChange={setFields}
                    selectedKey={selectedKey}
                    onSelect={setSelectedKey}
                    disabled={!isEditable}
                  />
                </CardContent>
              </Card>

              {isEditable && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {selectedField ? 'Editar campo' : 'Campo'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FieldEditorPanel
                      field={selectedField}
                      siblingKeys={siblingKeys}
                      onChange={handleFieldChange}
                    />
                  </CardContent>
                </Card>
              )}
            </div>

            <Card className="lg:sticky lg:top-6 lg:self-start">
              <CardHeader>
                <CardTitle>Vista previa</CardTitle>
              </CardHeader>
              <CardContent>
                <FormPreview schema={{ version: SCHEMA_VERSION, fields }} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="enlaces">
          {id && <InstancesTab formId={id} />}
        </TabsContent>

        <TabsContent value="respuestas">
          {id && <ResponsesTab formId={id} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
