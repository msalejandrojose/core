import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CreateDialog } from '@/components/dialogs/CreateDialog';
import { Button } from '@/components/ui/button';
import { FieldWrapper } from '@/components/forms/FieldWrapper';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { TrackRow } from '../../types';
import { useUpdateTrack } from '../hooks/use-update-track';

const schema = z.object({
  name: z.string().min(1, 'Obligatorio').max(120),
  sectorCount: z.number().int().min(1, 'Al menos 1'),
  minPlausibleMs: z.number().int().min(1, 'Al menos 1'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  track: TrackRow;
}

// Sin trazado/tema/agarre/imagen aquí (TASK-336): eso vive en el circuito
// padre, se edita desde `/racing/circuits/:id`. Esta variante solo ajusta su
// nombre y los dos campos que sí le son propios.
export function TrackFormDialog({ track }: Props) {
  const [open, setOpen] = useState(false);

  const defaults: FormValues = {
    name: track.name,
    sectorCount: track.sectorCount,
    minPlausibleMs: track.minPlausibleMs,
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) form.reset(defaults);
  };

  const update = useUpdateTrack(track.id, { onSuccess: () => close(false) });

  const submit = form.handleSubmit((v) => {
    update.mutate(v);
  });

  const trigger: ReactNode = (
    <Button variant="ghost" size="icon" className="size-8" title="Editar">
      <Pencil size={14} />
    </Button>
  );

  return (
    <CreateDialog
      trigger={trigger}
      title={`Editar "${track.name}"`}
      open={open}
      onOpenChange={close}
      onSubmit={submit}
      isPending={update.isPending}
      submitLabel="Guardar"
    >
      <Form {...form}>
        <div className="space-y-3">
          <FieldWrapper control={form.control} name="name" label="Nombre">
            {(field) => <Input {...field} />}
          </FieldWrapper>
          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper control={form.control} name="sectorCount" label="Sectores">
              {(field) => (
                <Input
                  type="number"
                  min={1}
                  {...field}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              )}
            </FieldWrapper>
            <FieldWrapper control={form.control} name="minPlausibleMs" label="Mínimo (ms)">
              {(field) => (
                <Input
                  type="number"
                  min={1}
                  {...field}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              )}
            </FieldWrapper>
          </div>
        </div>
      </Form>
    </CreateDialog>
  );
}
