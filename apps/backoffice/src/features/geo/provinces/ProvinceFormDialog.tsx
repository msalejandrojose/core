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
import type { ProvinceRow } from '../types';
import { useCountries } from '../countries/hooks/use-countries';
import { useRegions } from '../regions/hooks/use-regions';
import { useCreateProvince, useUpdateProvince } from './hooks/use-province-mutations';

const NO_REGION = '__none__';

const schema = z.object({
  code: z.string().min(1, 'Obligatorio').max(10),
  name: z.string().min(1, 'Obligatorio').max(120),
  countryId: z.string().uuid('Selecciona un país'),
  regionId: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  trigger: ReactNode;
  province?: ProvinceRow;
}

export function ProvinceFormDialog({ trigger, province }: Props) {
  const isEdit = Boolean(province);
  const [open, setOpen] = useState(false);

  const defaults: FormValues = {
    code: province?.code ?? '',
    name: province?.name ?? '',
    countryId: province?.countryId ?? '',
    regionId: province?.regionId ?? NO_REGION,
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) form.reset(defaults);
  };

  const create = useCreateProvince({ onSuccess: () => close(false) });
  const update = useUpdateProvince(province?.id ?? '', { onSuccess: () => close(false) });
  const isPending = create.isPending || update.isPending;

  const { data: countriesData } = useCountries({ page: 1, limit: 200 });
  const countries = countriesData?.data ?? [];

  const selectedCountry = useWatch({ control: form.control, name: 'countryId' });
  const { data: regionsData } = useRegions({
    page: 1,
    limit: 200,
    countryId: selectedCountry || undefined,
  });
  const regions = regionsData?.data ?? [];

  const submit = form.handleSubmit((v) => {
    const regionId = v.regionId === NO_REGION ? null : v.regionId;
    if (isEdit) {
      update.mutate({ code: v.code, name: v.name, countryId: v.countryId, regionId });
    } else {
      create.mutate({
        code: v.code,
        name: v.name,
        countryId: v.countryId,
        regionId: regionId ?? undefined,
      });
    }
  });

  return (
    <CreateDialog
      trigger={trigger}
      title={isEdit ? 'Editar provincia' : 'Crear provincia'}
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
          <FieldWrapper control={form.control} name="regionId" label="Comunidad autónoma">
            {(field) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_REGION}>Sin comunidad</SelectItem>
                  {regions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FieldWrapper>
          <div className="grid grid-cols-3 gap-3">
            <FieldWrapper control={form.control} name="code" label="Código INE">
              {(field) => <Input placeholder="28" {...field} />}
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
