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
import { useApiSections } from '@/features/roles/hooks/use-api-sections';
import { useUpdateApiSection } from '../hooks/use-update-api-section';

// Centinela para "sin sección padre" (Radix Select no admite value vacío).
const NO_PARENT = '__none__';

const schema = z.object({
  name: z.string().min(1, 'Obligatorio').max(100),
  description: z.string().max(500),
  parentSectionId: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface EditApiSectionFormProps {
  section: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    parentSectionId: string | null;
  };
}

export function EditApiSectionForm({ section }: EditApiSectionFormProps) {
  const { mutate, isPending } = useUpdateApiSection(section.id);
  const { data: sections } = useApiSections();
  // Excluye la propia sección para no asignarse como su propio padre.
  const parentOptions = (sections?.data ?? []).filter(
    (s) => s.id !== section.id,
  );
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: section.name,
      description: section.description ?? '',
      parentSectionId: section.parentSectionId ?? NO_PARENT,
    },
  });

  const submit = form.handleSubmit((v) =>
    mutate({
      name: v.name,
      description: v.description || null,
      parentSectionId: v.parentSectionId === NO_PARENT ? null : v.parentSectionId,
    }),
  );

  return (
    <Form {...form}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-2">
          <Label>Código</Label>
          <Input value={section.code} readOnly disabled className="font-mono" />
        </div>
        <FieldWrapper control={form.control} name="name" label="Nombre">
          {(field) => <Input {...field} />}
        </FieldWrapper>
        <FieldWrapper
          control={form.control}
          name="parentSectionId"
          label="Sección padre"
        >
          {(field) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PARENT}>Sin sección padre</SelectItem>
                {parentOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
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
