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
import type { RegionRow } from '../types';
import { useCountries } from '../countries/hooks/use-countries';
import { useCreateRegion, useUpdateRegion } from './hooks/use-region-mutations';

const schema = z.object({
  code: z.string().min(1, 'Obligatorio').max(10),
  name: z.string().min(1, 'Obligatorio').max(120),
  countryId: z.string().uuid('Selecciona un país'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  trigger: ReactNode;
  region?: RegionRow;
}

export function RegionFormDialog({ trigger, region }: Props) {
  const isEdit = Boolean(region);
  const [open, setOpen] = useState(false);

  const defaults: FormValues = {
    code: region?.code ?? '',
    name: region?.name ?? '',
    countryId: region?.countryId ?? '',
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) form.reset(defaults);
  };

  const create = useCreateRegion({ onSuccess: () => close(false) });
  const update = useUpdateRegion(region?.id ?? '', { onSuccess: () => close(false) });
  const isPending = create.isPending || update.isPending;

  const { data: countriesData } = useCountries({ page: 1, limit: 200 });
  const countries = countriesData?.data ?? [];

  const submit = form.handleSubmit((v) => {
    if (isEdit) update.mutate(v);
    else create.mutate(v);
  });

  return (
    <CreateDialog
      trigger={trigger}
      title={isEdit ? 'Editar comunidad' : 'Crear comunidad'}
      open={open}
      onOpenChange={close}
      onSubmit={submit}
      isPending={isPending}
      submitLabel={isEdit ? 'Guardar' : 'Crear'}
    >
      <Form {...form}>
        <div className="space-y-3">
          <FieldWrapper control={form.control} name="countryId" label="País">
            {(field) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un país" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FieldWrapper>
          <div className="grid grid-cols-3 gap-3">
            <FieldWrapper control={form.control} name="code" label="Código INE">
              {(field) => <Input placeholder="13" {...field} />}
            </FieldWrapper>
            <div className="col-span-2">
              <FieldWrapper control={form.control} name="name" label="Nombre">
                {(field) => <Input {...field} />}
              </FieldWrapper>
            </div>
          </div>
        </div>
      </Form>
    </CreateDialog>
  );
}
