import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactNode, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CreateDialog } from '@/components/dialogs/CreateDialog';
import { FieldWrapper } from '@/components/forms/FieldWrapper';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { CIRCUIT_ROTATION_CONFIG_KEY_LABELS, type CircuitRotationConfigRow } from '../../types';
import { useUpdateCircuitRotationConfig } from '../hooks/use-update-circuit-rotation-config';

const schema = z.object({
  value: z.number().int().min(0),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  trigger: ReactNode;
  config: CircuitRotationConfigRow;
}

// Sin modo "crear": la única clave es un conjunto cerrado (ver el
// comentario del modelo en schema.prisma) — este diálogo solo ajusta el
// valor de una que ya existe. Mismo patrón que MatchmakingConfigFormDialog.
export function CircuitRotationConfigFormDialog({ trigger, config }: Props) {
  const [open, setOpen] = useState(false);

  const defaults: FormValues = { value: config.value };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) form.reset(defaults);
  };

  const update = useUpdateCircuitRotationConfig(config.key, {
    onSuccess: () => close(false),
  });

  const submit = form.handleSubmit((v) => {
    update.mutate(v.value);
  });

  return (
    <CreateDialog
      trigger={trigger}
      title={`Editar "${CIRCUIT_ROTATION_CONFIG_KEY_LABELS[config.key]}"`}
      open={open}
      onOpenChange={close}
      onSubmit={submit}
      isPending={update.isPending}
      submitLabel="Guardar"
    >
      <Form {...form}>
        <div className="space-y-3">
          <FieldWrapper control={form.control} name="value" label="Valor">
            {(field) => (
              <Input
                type="number"
                min={0}
                step={1}
                {...field}
                onChange={(e) => field.onChange(e.target.valueAsNumber)}
              />
            )}
          </FieldWrapper>
          <p className="text-muted-foreground text-xs">
            Se aplica en la siguiente rotación (automática al cambiar de día, o ya mismo con
            &quot;Rotar ahora&quot;).
          </p>
        </div>
      </Form>
    </CreateDialog>
  );
}
