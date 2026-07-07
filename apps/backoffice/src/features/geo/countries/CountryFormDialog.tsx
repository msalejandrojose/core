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
import type { CountryRow } from '../types';
import { useCreateCountry, useUpdateCountry } from './hooks/use-country-mutations';

// `isActive` se modela como string ('true'|'false') en el formulario para que
// todos los campos compartan el mismo tipo de valor (react-hook-form + el
// FieldWrapper genérico se comportan mejor sin mezclar boolean y string).
const schema = z.object({
  name: z.string().min(1, 'Obligatorio').max(120),
  iso2: z.string().length(2, '2 letras').toUpperCase(),
  iso3: z.string().length(3, '3 letras').toUpperCase(),
  numericCode: z.string().max(3).optional().or(z.literal('')),
  nativeName: z.string().max(120).optional().or(z.literal('')),
  phoneCode: z.string().max(8).optional().or(z.literal('')),
  isActive: z.enum(['true', 'false']),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  trigger: ReactNode;
  country?: CountryRow;
}

export function CountryFormDialog({ trigger, country }: Props) {
  const isEdit = Boolean(country);
  const [open, setOpen] = useState(false);

  const defaults: FormValues = {
    name: country?.name ?? '',
    iso2: country?.iso2 ?? '',
    iso3: country?.iso3 ?? '',
    numericCode: country?.numericCode ?? '',
    nativeName: country?.nativeName ?? '',
    phoneCode: country?.phoneCode ?? '',
    isActive: country && country.isActive === false ? 'false' : 'true',
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) form.reset(defaults);
  };

  const create = useCreateCountry({ onSuccess: () => close(false) });
  const update = useUpdateCountry(country?.id ?? '', {
    onSuccess: () => close(false),
  });
  const isPending = create.isPending || update.isPending;

  const submit = form.handleSubmit((v) => {
    const isActive = v.isActive === 'true';
    if (isEdit) {
      update.mutate({
        name: v.name,
        iso2: v.iso2,
        iso3: v.iso3,
        numericCode: v.numericCode?.trim() ? v.numericCode.trim() : null,
        nativeName: v.nativeName?.trim() ? v.nativeName.trim() : null,
        phoneCode: v.phoneCode?.trim() ? v.phoneCode.trim() : null,
        isActive,
      });
    } else {
      create.mutate({
        name: v.name,
        iso2: v.iso2,
        iso3: v.iso3,
        numericCode: v.numericCode?.trim() || undefined,
        nativeName: v.nativeName?.trim() || undefined,
        phoneCode: v.phoneCode?.trim() || undefined,
        isActive,
      });
    }
  });

  return (
    <CreateDialog
      trigger={trigger}
      title={isEdit ? 'Editar país' : 'Crear país'}
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
          <div className="grid grid-cols-3 gap-3">
            <FieldWrapper control={form.control} name="iso2" label="ISO alpha-2">
              {(field) => <Input placeholder="ES" {...field} />}
            </FieldWrapper>
            <FieldWrapper control={form.control} name="iso3" label="ISO alpha-3">
              {(field) => <Input placeholder="ESP" {...field} />}
            </FieldWrapper>
            <FieldWrapper control={form.control} name="numericCode" label="ISO num.">
              {(field) => <Input placeholder="724" {...field} />}
            </FieldWrapper>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper control={form.control} name="nativeName" label="Nombre nativo">
              {(field) => <Input {...field} />}
            </FieldWrapper>
            <FieldWrapper control={form.control} name="phoneCode" label="Prefijo tel.">
              {(field) => <Input placeholder="+34" {...field} />}
            </FieldWrapper>
          </div>
          <FieldWrapper control={form.control} name="isActive" label="Estado">
            {(field) => (
              <Select value={field.value} onValueChange={field.onChange}>
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
