import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactNode, useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { CAR_PART_CATEGORY_LABELS, type CarPartRow } from '../../../types';
import { useCreatePart, useUpdatePart } from '../hooks/use-part-mutations';

const CATEGORIES = Object.keys(CAR_PART_CATEGORY_LABELS) as Array<
  keyof typeof CAR_PART_CATEGORY_LABELS
>;

const schema = z.object({
  code: z
    .string()
    .min(1, 'Obligatorio')
    .max(64)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'kebab-case: minúsculas, dígitos y guiones'),
  category: z.enum(['TIRES', 'WING', 'CHASSIS']),
  name: z.string().min(1, 'Obligatorio').max(120),
  speedScale: z.number(),
  grip: z.number(),
  isActive: z.enum(['true', 'false']),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  trigger: ReactNode;
  part?: CarPartRow;
  /** Preselecciona la categoría al crear desde la pestaña ya filtrada. */
  defaultCategory?: CarPartRow['category'];
}

export function PartFormDialog({ trigger, part, defaultCategory }: Props) {
  const isEdit = Boolean(part);
  const [open, setOpen] = useState(false);

  const defaults: FormValues = {
    code: part?.code ?? '',
    category: part?.category ?? defaultCategory ?? 'TIRES',
    name: part?.name ?? '',
    speedScale: part?.speedScale ?? 0,
    grip: part?.grip ?? 0,
    isActive: part && !part.isActive ? 'false' : 'true',
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) form.reset(defaults);
  };

  const create = useCreatePart({ onSuccess: () => close(false) });
  const update = useUpdatePart(part?.id ?? '', {
    onSuccess: () => close(false),
  });
  const isPending = create.isPending || update.isPending;

  const submit = form.handleSubmit((v) => {
    const isActive = v.isActive === 'true';
    if (isEdit) {
      update.mutate({
        category: v.category,
        name: v.name,
        speedScale: v.speedScale,
        grip: v.grip,
        isActive,
      });
    } else {
      create.mutate({
        code: v.code,
        category: v.category,
        name: v.name,
        speedScale: v.speedScale,
        grip: v.grip,
        isActive,
      });
    }
  });

  return (
    <CreateDialog
      trigger={trigger}
      title={isEdit ? 'Editar pieza' : 'Crear pieza'}
      open={open}
      onOpenChange={close}
      onSubmit={submit}
      isPending={isPending}
      submitLabel={isEdit ? 'Guardar' : 'Crear'}
    >
      <Form {...form}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper control={form.control} name="name" label="Nombre">
              {(field) => <Input placeholder="Neumáticos de agarre" {...field} />}
            </FieldWrapper>
            <FieldWrapper control={form.control} name="code" label="Código">
              {(field) => (
                <Input placeholder="tires-grip" disabled={isEdit} {...field} />
              )}
            </FieldWrapper>
          </div>
          <FieldWrapper control={form.control} name="category" label="Categoría">
            {(field) => (
              <Select
                value={field.value as string}
                onValueChange={field.onChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {CAR_PART_CATEGORY_LABELS[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FieldWrapper>
          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper
              control={form.control}
              name="speedScale"
              label="Delta velocidad"
            >
              {(field) => (
                <Input
                  type="number"
                  step={0.01}
                  {...field}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              )}
            </FieldWrapper>
            <FieldWrapper control={form.control} name="grip" label="Delta agarre">
              {(field) => (
                <Input
                  type="number"
                  step={0.01}
                  {...field}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              )}
            </FieldWrapper>
          </div>
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
      </Form>
    </CreateDialog>
  );
}
