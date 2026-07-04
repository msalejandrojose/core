import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CreateDialog } from '@/components/dialogs/CreateDialog';
import { FieldWrapper } from '@/components/forms/FieldWrapper';
import { Button } from '@/components/ui/button';
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
import { useApiSections } from '@/features/roles/hooks/use-api-sections';
import { useCreateApiSection } from '../hooks/use-create-api-section';

// Centinela para "sin sección padre" (Radix Select no admite value vacío).
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
  description: z.string().max(500).optional(),
  parentSectionId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
  code: '',
  name: '',
  description: '',
  parentSectionId: NO_PARENT,
};

export function CreateApiSectionDialog() {
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  });
  const { mutate, isPending } = useCreateApiSection({
    onSuccess: () => handleOpenChange(false),
  });
  const { data: sections } = useApiSections();
  const parentOptions = sections?.data ?? [];

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) form.reset(DEFAULTS);
  }

  const submit = form.handleSubmit((v) =>
    mutate({
      code: v.code,
      name: v.name,
      description: v.description || undefined,
      parentSectionId:
        v.parentSectionId && v.parentSectionId !== NO_PARENT
          ? v.parentSectionId
          : undefined,
    }),
  );

  return (
    <CreateDialog
      trigger={
        <Button>
          <Plus size={16} />
          Nueva sección
        </Button>
      }
      title="Crear sección"
      open={open}
      onOpenChange={handleOpenChange}
      onSubmit={submit}
      isPending={isPending}
    >
      <Form {...form}>
        <div className="space-y-3">
          <FieldWrapper control={form.control} name="code" label="Código">
            {(field) => <Input placeholder="p. ej. users.create" {...field} />}
          </FieldWrapper>
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
        </div>
      </Form>
    </CreateDialog>
  );
}
