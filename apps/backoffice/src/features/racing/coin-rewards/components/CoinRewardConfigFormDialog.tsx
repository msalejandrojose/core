import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactNode, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CreateDialog } from '@/components/dialogs/CreateDialog';
import { FieldWrapper } from '@/components/forms/FieldWrapper';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { COIN_REWARD_KEY_LABELS, type CoinRewardConfigRow } from '../../types';
import { useUpdateCoinRewardConfig } from '../hooks/use-update-coin-reward-config';

const schema = z.object({
  amount: z.number().int().min(0),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  trigger: ReactNode;
  config: CoinRewardConfigRow;
}

// Sin modo "crear": las nueve claves son un conjunto cerrado (ver el
// comentario del modelo en schema.prisma) — este diálogo solo ajusta el
// importe de una que ya existe. 0 desactiva el bono, no lo borra.
export function CoinRewardConfigFormDialog({ trigger, config }: Props) {
  const [open, setOpen] = useState(false);

  const defaults: FormValues = { amount: config.amount };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) form.reset(defaults);
  };

  const update = useUpdateCoinRewardConfig(config.key, {
    onSuccess: () => close(false),
  });

  const submit = form.handleSubmit((v) => {
    update.mutate(v.amount);
  });

  return (
    <CreateDialog
      trigger={trigger}
      title={`Editar "${COIN_REWARD_KEY_LABELS[config.key]}"`}
      open={open}
      onOpenChange={close}
      onSubmit={submit}
      isPending={update.isPending}
      submitLabel="Guardar"
    >
      <Form {...form}>
        <div className="space-y-3">
          <FieldWrapper control={form.control} name="amount" label="Monedas">
            {(field) => (
              <Input
                type="number"
                min={0}
                step={5}
                {...field}
                onChange={(e) => field.onChange(e.target.valueAsNumber)}
              />
            )}
          </FieldWrapper>
          <p className="text-muted-foreground text-xs">
            0 desactiva este bono — no se acredita nada, sin necesidad de desplegar código.
          </p>
        </div>
      </Form>
    </CreateDialog>
  );
}
