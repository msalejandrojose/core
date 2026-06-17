import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CreateDialog } from '@/components/dialogs/CreateDialog';
import { FieldWrapper } from '@/components/forms/FieldWrapper';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateRole } from '../hooks/use-create-role';
import { ROLE_SCOPES } from '../types';

const schema = z.object({
  code: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .max(64)
    .regex(/^[a-z0-9_-]+$/, 'Solo minúsculas, dígitos, _ y -'),
  name: z.string().min(1, 'Obligatorio').max(100),
  scope: z.enum(['BACKOFFICE', 'APP', 'SHARED']),
  description: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
  code: '',
  name: '',
  scope: 'BACKOFFICE',
  description: '',
};

export function CreateRoleDialog() {
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  });
  const { mutate, isPending } = useCreateRole({
    onSuccess: () => handleOpenChange(false),
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) form.reset(DEFAULTS);
  }

  const submit = form.handleSubmit((v) =>
    mutate({
      code: v.code,
      name: v.name,
      scope: v.scope,
      description: v.description || undefined,
    }),
  );

  return (
    <CreateDialog
      trigger={
        <Button>
          <Plus size={16} />
          Nuevo rol
        </Button>
      }
      title="Crear rol"
      open={open}
      onOpenChange={handleOpenChange}
      onSubmit={submit}
      isPending={isPending}
    >
      <Form {...form}>
        <div className="space-y-3">
          <FieldWrapper control={form.control} name="code" label="Código">
            {(field) => (
              <Input placeholder="p. ej. admin_soporte" {...field} />
            )}
          </FieldWrapper>
          <FieldWrapper control={form.control} name="name" label="Nombre">
            {(field) => <Input {...field} />}
          </FieldWrapper>
          <FieldWrapper control={form.control} name="scope" label="Scope">
            {(field) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_SCOPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FieldWrapper>
          <FieldWrapper
            control={form.control}
            name="description"
            label="Descripción"
          >
            {(field) => <Textarea rows={3} {...field} />}
          </FieldWrapper>
        </div>
      </Form>
    </CreateDialog>
  );
}
