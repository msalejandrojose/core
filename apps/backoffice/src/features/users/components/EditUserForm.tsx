import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FieldWrapper } from '@/components/forms/FieldWrapper';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateUser } from '../hooks/use-update-user';

const schema = z.object({
  firstName: z.string().max(100),
  lastName: z.string().max(100),
});

type FormValues = z.infer<typeof schema>;

interface EditUserFormProps {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

function Fieldset({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="text-muted-foreground mb-3 text-[10px] font-semibold tracking-widest uppercase">
        {legend}
      </legend>
      {children}
    </fieldset>
  );
}

export function EditUserForm({ user }: EditUserFormProps) {
  const { mutate, isPending } = useUpdateUser(user.id);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
    },
  });

  const isDirty = form.formState.isDirty;

  const submit = form.handleSubmit((v) =>
    mutate(
      { firstName: v.firstName || null, lastName: v.lastName || null },
      { onSuccess: () => form.reset(v) },
    ),
  );

  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-6">
        <Fieldset legend="Cuenta">
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input value={user.email} readOnly disabled />
          </div>
        </Fieldset>

        <Fieldset legend="Identidad">
          <FieldWrapper control={form.control} name="firstName" label="Nombre">
            {(field) => <Input {...field} />}
          </FieldWrapper>
          <FieldWrapper control={form.control} name="lastName" label="Apellido">
            {(field) => <Input {...field} />}
          </FieldWrapper>
        </Fieldset>

        <Button type="submit" disabled={isPending || !isDirty} className="w-full sm:w-auto">
          {isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </form>
    </Form>
  );
}
