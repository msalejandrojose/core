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
import { useCreateUser } from '../hooks/use-create-user';

const schema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  userType: z.enum(['BACKOFFICE', 'APP']),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
  email: '',
  password: '',
  userType: 'BACKOFFICE',
  firstName: '',
  lastName: '',
};

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  });
  const { mutate, isPending } = useCreateUser({
    onSuccess: () => handleOpenChange(false),
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) form.reset(DEFAULTS);
  }

  const submit = form.handleSubmit((v) =>
    mutate({
      email: v.email,
      password: v.password,
      userType: v.userType,
      firstName: v.firstName || undefined,
      lastName: v.lastName || undefined,
    }),
  );

  return (
    <CreateDialog
      trigger={
        <Button>
          <Plus size={16} />
          Nuevo usuario
        </Button>
      }
      title="Crear usuario"
      open={open}
      onOpenChange={handleOpenChange}
      onSubmit={submit}
      isPending={isPending}
    >
      <Form {...form}>
        <div className="space-y-3">
          <FieldWrapper control={form.control} name="email" label="Email">
            {(field) => <Input type="email" autoComplete="off" {...field} />}
          </FieldWrapper>
          <FieldWrapper
            control={form.control}
            name="password"
            label="Contraseña"
          >
            {(field) => (
              <Input type="password" autoComplete="new-password" {...field} />
            )}
          </FieldWrapper>
          <FieldWrapper control={form.control} name="userType" label="Tipo">
            {(field) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BACKOFFICE">BACKOFFICE</SelectItem>
                  <SelectItem value="APP">APP</SelectItem>
                </SelectContent>
              </Select>
            )}
          </FieldWrapper>
          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper
              control={form.control}
              name="firstName"
              label="Nombre"
            >
              {(field) => <Input {...field} />}
            </FieldWrapper>
            <FieldWrapper
              control={form.control}
              name="lastName"
              label="Apellido"
            >
              {(field) => <Input {...field} />}
            </FieldWrapper>
          </div>
        </div>
      </Form>
    </CreateDialog>
  );
}
