import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactNode, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { CreateDialog } from '@/components/dialogs/CreateDialog';
import { FieldWrapper } from '@/components/forms/FieldWrapper';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SLUG_PATTERN, slugify } from '../../lib/slug';
import type { CategoryRow } from '../../types';
import { useCategories } from '../hooks/use-categories';
import { useCreateCategory } from '../hooks/use-create-category';
import { useUpdateCategory } from '../hooks/use-update-category';

// Centinela para "sin categoría padre" (Radix Select no admite value vacío).
const NO_PARENT = '__none__';

const schema = z.object({
  name: z.string().min(1, 'Obligatorio').max(140),
  slug: z
    .string()
    .regex(SLUG_PATTERN, 'Solo minúsculas, números y guiones')
    .max(140)
    .optional()
    .or(z.literal('')),
  description: z.string().max(500),
  parentId: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface CategoryFormDialogProps {
  trigger: ReactNode;
  /** Si se pasa, el diálogo edita esa categoría; si no, crea una nueva. */
  category?: CategoryRow;
}

export function CategoryFormDialog({
  trigger,
  category,
}: CategoryFormDialogProps) {
  const isEdit = Boolean(category);
  const [open, setOpen] = useState(false);

  const defaults: FormValues = {
    name: category?.name ?? '',
    slug: category?.slug ?? '',
    description: category?.description ?? '',
    parentId: category?.parentId ?? NO_PARENT,
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) form.reset(defaults);
  };

  const create = useCreateCategory({ onSuccess: () => close(false) });
  const update = useUpdateCategory(category?.id ?? '', {
    onSuccess: () => close(false),
  });
  const isPending = create.isPending || update.isPending;

  const { data: categoriesData } = useCategories({ page: 1, limit: 100 });
  // Excluye la propia categoría para no permitir el ciclo trivial.
  const parentOptions = (categoriesData?.data ?? []).filter(
    (c) => c.id !== category?.id,
  );

  // Autogenera el slug desde el nombre mientras el usuario no lo edite a mano.
  const name = useWatch({ control: form.control, name: 'name' });
  const slugDirty = form.getFieldState('slug').isDirty;
  const slugPreview = slugDirty ? form.getValues('slug') : slugify(name);

  const submit = form.handleSubmit((v) => {
    const slug = v.slug?.trim() ? v.slug.trim() : undefined;
    const parentId = v.parentId === NO_PARENT ? null : v.parentId;
    if (isEdit) {
      update.mutate({
        name: v.name,
        slug,
        description: v.description || null,
        parentId,
      });
    } else {
      create.mutate({
        name: v.name,
        slug,
        description: v.description || undefined,
        parentId: parentId ?? undefined,
      });
    }
  });

  return (
    <CreateDialog
      trigger={trigger}
      title={isEdit ? 'Editar categoría' : 'Crear categoría'}
      open={open}
      onOpenChange={close}
      onSubmit={submit}
      isPending={isPending}
      submitLabel={isEdit ? 'Guardar' : 'Crear'}
    >
      <Form {...form}>
        <div className="space-y-3">
          <FieldWrapper control={form.control} name="name" label="Nombre">
            {(field) => <Input {...field} />}
          </FieldWrapper>
          <FieldWrapper control={form.control} name="slug" label="Slug">
            {(field) => (
              <Input
                placeholder={slugPreview || 'se-genera-del-nombre'}
                {...field}
              />
            )}
          </FieldWrapper>
          <FieldWrapper
            control={form.control}
            name="parentId"
            label="Categoría padre"
          >
            {(field) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARENT}>Sin categoría padre</SelectItem>
                  {parentOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
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
        </div>
      </Form>
    </CreateDialog>
  );
}
