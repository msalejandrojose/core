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
import type { CarArchetypeRow } from '../../../types';
import {
  useCreateArchetype,
  useUpdateArchetype,
} from '../hooks/use-archetype-mutations';

const schema = z.object({
  code: z
    .string()
    .min(1, 'Obligatorio')
    .max(64)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'kebab-case: minúsculas, dígitos y guiones'),
  name: z.string().min(1, 'Obligatorio').max(120),
  speedScale: z.number(),
  grip: z.number(),
  offroadGripModifier: z.number(),
  isActive: z.enum(['true', 'false']),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  trigger: ReactNode;
  archetype?: CarArchetypeRow;
}

export function ArchetypeFormDialog({ trigger, archetype }: Props) {
  const isEdit = Boolean(archetype);
  const [open, setOpen] = useState(false);

  const defaults: FormValues = {
    code: archetype?.code ?? '',
    name: archetype?.name ?? '',
    speedScale: archetype?.speedScale ?? 1,
    grip: archetype?.grip ?? 1,
    offroadGripModifier: archetype?.offroadGripModifier ?? 1,
    isActive: archetype && !archetype.isActive ? 'false' : 'true',
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) form.reset(defaults);
  };

  const create = useCreateArchetype({ onSuccess: () => close(false) });
  const update = useUpdateArchetype(archetype?.id ?? '', {
    onSuccess: () => close(false),
  });
  const isPending = create.isPending || update.isPending;

  const submit = form.handleSubmit((v) => {
    const isActive = v.isActive === 'true';
    if (isEdit) {
      update.mutate({
        name: v.name,
        speedScale: v.speedScale,
        grip: v.grip,
        offroadGripModifier: v.offroadGripModifier,
        isActive,
      });
    } else {
      create.mutate({
        code: v.code,
        name: v.name,
        speedScale: v.speedScale,
        grip: v.grip,
        offroadGripModifier: v.offroadGripModifier,
        isActive,
      });
    }
  });

  return (
    <CreateDialog
      trigger={trigger}
      title={isEdit ? 'Editar arquetipo' : 'Crear arquetipo'}
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
              {(field) => <Input placeholder="Normal" {...field} />}
            </FieldWrapper>
            <FieldWrapper control={form.control} name="code" label="Código">
              {(field) => (
                <Input placeholder="normal" disabled={isEdit} {...field} />
              )}
            </FieldWrapper>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FieldWrapper
              control={form.control}
              name="speedScale"
              label="Velocidad punta"
            >
              {(field) => (
                <Input
                  type="number"
                  step={0.05}
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
                  {...field}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              )}
            </FieldWrapper>
            <FieldWrapper
              control={form.control}
              name="offroadGripModifier"
              label="Agarre fuera de asfalto"
            >
              {(field) => (
                <Input
                  type="number"
                  step={0.05}
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
