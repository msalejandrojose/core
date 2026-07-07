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
import type { PostalCodeRow } from '../types';
import { useMunicipalities } from '../municipalities/hooks/use-municipalities';
import {
  useCreatePostalCode,
  useUpdatePostalCode,
} from './hooks/use-postal-code-mutations';

const schema = z.object({
  code: z.string().min(1, 'Obligatorio').max(10),
  municipalityId: z.string().uuid('Selecciona un municipio'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  trigger: ReactNode;
  postalCode?: PostalCodeRow;
}

export function PostalCodeFormDialog({ trigger, postalCode }: Props) {
  const isEdit = Boolean(postalCode);
  const [open, setOpen] = useState(false);

  const defaults: FormValues = {
    code: postalCode?.code ?? '',
    municipalityId: postalCode?.municipalityId ?? '',
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) form.reset(defaults);
  };

  const create = useCreatePostalCode({ onSuccess: () => close(false) });
  const update = useUpdatePostalCode(postalCode?.id ?? '', {
    onSuccess: () => close(false),
  });
  const isPending = create.isPending || update.isPending;

  const { data: municipalitiesData } = useMunicipalities({ page: 1, limit: 200 });
  const municipalities = municipalitiesData?.data ?? [];

  const submit = form.handleSubmit((v) => {
    if (isEdit) update.mutate(v);
    else create.mutate(v);
  });

  return (
    <CreateDialog
      trigger={trigger}
      title={isEdit ? 'Editar código postal' : 'Crear código postal'}
      open={open}
      onOpenChange={close}
      onSubmit={submit}
      isPending={isPending}
      submitLabel={isEdit ? 'Guardar' : 'Crear'}
    >
      <Form {...form}>
        <div className="space-y-3">
          <FieldWrapper control={form.control} name="municipalityId" label="Municipio">
            {(field) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un municipio" />
                </SelectTrigger>
                <SelectContent>
                  {municipalities.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FieldWrapper>
          <FieldWrapper control={form.control} name="code" label="Código postal">
            {(field) => <Input placeholder="28001" {...field} />}
          </FieldWrapper>
        </div>
      </Form>
    </CreateDialog>
  );
}
