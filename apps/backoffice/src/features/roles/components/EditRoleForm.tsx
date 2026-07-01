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
import { useRoles } from '../hooks/use-roles';
import { useUpdateRole } from '../hooks/use-update-role';
import { ROLE_SCOPES, type RoleScope } from '../types';

const NO_PARENT = '__none__';

const schema = z.object({
  name: z.string().min(1, 'Obligatorio').max(100),
  scope: z.enum(['BACKOFFICE', 'APP', 'SHARED']),
  description: z.string().max(500),
  parentRoleId: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface EditRoleFormProps {
  role: {
    id: string;
    code: string;
    name: string;
    scope: RoleScope;
    description: string | null;
    parentRoleId: string | null;
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

export function EditRoleForm({ role }: EditRoleFormProps) {
  const { mutate, isPending } = useUpdateRole(role.id);
  const { data: rolesData } = useRoles({ page: 1, limit: 100 });
  const parentOptions = (rolesData?.data ?? []).filter((r: any) => r.id !== role.id);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: role.name,
      scope: role.scope,
      description: role.description ?? '',
      parentRoleId: role.parentRoleId ?? NO_PARENT,
    },
  });

  const isDirty = form.formState.isDirty;

  const submit = form.handleSubmit((v) =>
    mutate(
      {
        name: v.name,
        scope: v.scope,
        description: v.description || null,
        parentRoleId: v.parentRoleId === NO_PARENT ? null : v.parentRoleId,
      },
      { onSuccess: () => form.reset(v) },
    ),
  );

  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-6">
        <Fieldset legend="Identificación">
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
        </Fieldset>

        <Fieldset legend="Configuración">
          <FieldWrapper control={form.control} name="parentRoleId" label="Rol padre">
            {(field) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARENT}>Sin rol padre</SelectItem>
                  {parentOptions.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FieldWrapper>
          <FieldWrapper control={form.control} name="description" label="Descripción">
            {(field) => <Textarea rows={3} {...field} />}
          </FieldWrapper>
        </Fieldset>

        <Button type="submit" disabled={isPending || !isDirty} className="w-full sm:w-auto">
          {isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </form>
    </Form>
  );
}
