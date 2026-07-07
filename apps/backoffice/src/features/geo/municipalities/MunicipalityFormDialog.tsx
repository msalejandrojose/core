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
import type { MunicipalityRow } from '../types';
import { useProvinces } from '../provinces/hooks/use-provinces';
import {
  useCreateMunicipality,
  useUpdateMunicipality,
} from './hooks/use-municipality-mutations';

const schema = z.object({
  code: z.string().min(1, 'Obligatorio').max(10),
  name: z.string().min(1, 'Obligatorio').max(160),
  provinceId: z.string().uuid('Selecciona una provincia'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  trigger: ReactNode;
  municipality?: MunicipalityRow;
}

export function MunicipalityFormDialog({ trigger, municipality }: Props) {
  const isEdit = Boolean(municipality);
  const [open, setOpen] = useState(false);

  const defaults: FormValues = {
    code: municipality?.code ?? '',
    name: municipality?.name ?? '',
    provinceId: municipality?.provinceId ?? '',
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) form.reset(defaults);
  };

  const create = useCreateMunicipality({ onSuccess: () => close(false) });
  const update = useUpdateMunicipality(municipality?.id ?? '', {
    onSuccess: () => close(false),
  });
  const isPending = create.isPending || update.isPending;

  const { data: provincesData } = useProvinces({ page: 1, limit: 200 });
  const provinces = provincesData?.data ?? [];

  const submit = form.handleSubmit((v) => {
    if (isEdit) update.mutate(v);
    else create.mutate(v);
  });

  return (
    <CreateDialog
      trigger={trigger}
      title={isEdit ? 'Editar municipio' : 'Crear municipio'}
      open={open}
      onOpenChange={close}
      onSubmit={submit}
      isPending={isPending}
      submitLabel={isEdit ? 'Guardar' : 'Crear'}
    >
      <Form {...form}>
        <div className="space-y-3">
          <FieldWrapper control={form.control} name="provinceId" label="Provincia">
            {(field) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una provincia" />
                </SelectTrigger>
                <SelectContent>
                  {provinces.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FieldWrapper>
          <div className="grid grid-cols-3 gap-3">
            <FieldWrapper control={form.control} name="code" label="Código INE">
              {(field) => <Input placeholder="28079" {...field} />}
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
