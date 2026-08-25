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
import { TERRAIN_LABELS, type TerrainEffectRow } from '../../types';
import { useUpdateTerrainEffect } from '../hooks/use-update-terrain-effect';

const schema = z.object({
  grip: z.number(),
  slowsTopSpeed: z.enum(['true', 'false']),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  trigger: ReactNode;
  effect: TerrainEffectRow;
}

// Sin modo "crear": los cuatro tipos son un conjunto cerrado (ver el
// comentario del modelo en schema.prisma) — este diálogo solo ajusta los
// factores de uno que ya existe.
export function TerrainEffectFormDialog({ trigger, effect }: Props) {
  const [open, setOpen] = useState(false);

  const defaults: FormValues = {
    grip: effect.grip,
    slowsTopSpeed: effect.slowsTopSpeed ? 'true' : 'false',
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) form.reset(defaults);
  };

  const update = useUpdateTerrainEffect(effect.type, {
    onSuccess: () => close(false),
  });

  const submit = form.handleSubmit((v) => {
    update.mutate({ grip: v.grip, slowsTopSpeed: v.slowsTopSpeed === 'true' });
  });

  return (
    <CreateDialog
      trigger={trigger}
      title={`Editar ${TERRAIN_LABELS[effect.type]}`}
      open={open}
      onOpenChange={close}
      onSubmit={submit}
      isPending={update.isPending}
      submitLabel="Guardar"
    >
      <Form {...form}>
        <div className="space-y-3">
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
            name="slowsTopSpeed"
            label="Frena la velocidad punta"
          >
            {(field) => (
              <Select
                value={field.value as string}
                onValueChange={field.onChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Sí</SelectItem>
                  <SelectItem value="false">No, solo pierde agarre</SelectItem>
                </SelectContent>
              </Select>
            )}
          </FieldWrapper>
        </div>
      </Form>
    </CreateDialog>
  );
}
