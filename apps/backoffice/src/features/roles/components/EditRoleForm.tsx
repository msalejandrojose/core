import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FieldWrapper } from '@/components/forms/FieldWrapper';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateRole } from '../hooks/use-update-role';
import { ROLE_SCOPES, type RoleScope } from '../types';

const schema = z.object({
  name: z.string().min(1, 'Obligatorio').max(100),
  scope: z.enum(['BACKOFFICE', 'APP', 'SHARED']),
  description: z.string().max(500),
});

type FormValues = z.infer<typeof schema>;

interface EditRoleFormProps {
  role: {
    id: string;
    code: string;
    name: string;
    scope: RoleScope;
    description: string | null;
  };
}

export function EditRoleForm({ role }: EditRoleFormProps) {
  const { mutate, isPending } = useUpdateRole(role.id);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: role.name,
      scope: role.scope,
      description: role.description ?? '',
    },
  });

  const submit = form.handleSubmit((v) =>
    mutate({
      name: v.name,
      scope: v.scope,
      description: v.description || null,
    }),
  );

  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-2">
          <Label>Código</Label>
          <Input value={role.code} readOnly disabled className="font-mono" />
        </div>
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
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </form>
    </Form>
  );
}
