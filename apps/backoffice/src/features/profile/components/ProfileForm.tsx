import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FieldWrapper } from '@/components/forms/FieldWrapper';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateProfile } from '../hooks/use-update-profile';

const schema = z.object({
  firstName: z.string().max(100),
  lastName: z.string().max(100),
});

type FormValues = z.infer<typeof schema>;

interface ProfileFormProps {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const { mutate, isPending } = useUpdateProfile(user.id);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
    },
  });

  const submit = form.handleSubmit((v) =>
    mutate({ firstName: v.firstName || null, lastName: v.lastName || null }),
  );

  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-2">
          <Label>Email</Label>
          <Input value={user.email} readOnly disabled />
        </div>
        <FieldWrapper control={form.control} name="firstName" label="Nombre">
          {(field) => <Input {...field} />}
        </FieldWrapper>
        <FieldWrapper control={form.control} name="lastName" label="Apellido">
          {(field) => <Input {...field} />}
        </FieldWrapper>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </form>
    </Form>
  );
}
