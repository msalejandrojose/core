import { getDefaultValues } from '@core/forms';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CreateDialog } from '@/components/dialogs/CreateDialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FormRenderer, coreFormsResolver } from '@/features/forms';
import { useCreateUser } from '../hooks/use-create-user';
import {
  createUserForm,
  type CreateUserFormValues,
} from '../forms/create-user.form';

const DEFAULTS = getDefaultValues(createUserForm) as CreateUserFormValues;

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const form = useForm<CreateUserFormValues>({
    resolver: coreFormsResolver<CreateUserFormValues>(createUserForm),
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
      userType: v.userType as 'BACKOFFICE' | 'APP',
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
        <FormRenderer schema={createUserForm} control={form.control} />
      </Form>
    </CreateDialog>
  );
}
