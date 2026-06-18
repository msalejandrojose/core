import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FieldWrapper } from '@/components/forms/FieldWrapper';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useChangePassword } from '../hooks/use-change-password';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Obligatorio'),
    newPassword: z.string().min(8, 'Mínimo 8 caracteres'),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  });

type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
  currentPassword: '',
  newPassword: '',
  confirm: '',
};

export function ChangePasswordForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  });
  const { mutate, isPending } = useChangePassword({
    onSuccess: () => form.reset(DEFAULTS),
  });

  const submit = form.handleSubmit((v) =>
    mutate({ currentPassword: v.currentPassword, newPassword: v.newPassword }),
  );

  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-4">
        <FieldWrapper
          control={form.control}
          name="currentPassword"
          label="Contraseña actual"
        >
          {(field) => (
            <Input type="password" autoComplete="current-password" {...field} />
          )}
        </FieldWrapper>
        <FieldWrapper
          control={form.control}
          name="newPassword"
          label="Nueva contraseña"
        >
          {(field) => (
            <Input type="password" autoComplete="new-password" {...field} />
          )}
        </FieldWrapper>
        <FieldWrapper
          control={form.control}
          name="confirm"
          label="Repite la nueva contraseña"
        >
          {(field) => (
            <Input type="password" autoComplete="new-password" {...field} />
          )}
        </FieldWrapper>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Guardando…' : 'Cambiar contraseña'}
        </Button>
      </form>
    </Form>
  );
}
