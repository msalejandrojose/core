import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactNode, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { CreateDialog } from '@/components/dialogs/CreateDialog';
import { FieldWrapper } from '@/components/forms/FieldWrapper';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { SLUG_PATTERN, slugify } from '../../lib/slug';
import type { TagRow } from '../../types';
import { useCreateTag } from '../hooks/use-create-tag';
import { useUpdateTag } from '../hooks/use-update-tag';

const schema = z.object({
  name: z.string().min(1, 'Obligatorio').max(140),
  slug: z
    .string()
    .regex(SLUG_PATTERN, 'Solo minúsculas, números y guiones')
    .max(140)
    .optional()
    .or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

interface TagFormDialogProps {
  trigger: ReactNode;
  /** Si se pasa, el diálogo edita esa etiqueta; si no, crea una nueva. */
  tag?: TagRow;
}

export function TagFormDialog({ trigger, tag }: TagFormDialogProps) {
  const isEdit = Boolean(tag);
  const [open, setOpen] = useState(false);

  const defaults: FormValues = { name: tag?.name ?? '', slug: tag?.slug ?? '' };
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) form.reset(defaults);
  };

  const create = useCreateTag({ onSuccess: () => close(false) });
  const update = useUpdateTag(tag?.id ?? '', { onSuccess: () => close(false) });
  const isPending = create.isPending || update.isPending;

  const name = useWatch({ control: form.control, name: 'name' });
  const slugDirty = form.getFieldState('slug').isDirty;
  const slugPreview = slugDirty ? form.getValues('slug') : slugify(name);

  const submit = form.handleSubmit((v) => {
    const slug = v.slug?.trim() ? v.slug.trim() : undefined;
    if (isEdit) update.mutate({ name: v.name, slug });
    else create.mutate({ name: v.name, slug });
  });

  return (
    <CreateDialog
      trigger={trigger}
      title={isEdit ? 'Editar etiqueta' : 'Crear etiqueta'}
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
        </div>
      </Form>
    </CreateDialog>
  );
}
