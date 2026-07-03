import { getDefaultValues } from '@core/forms';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { FormRenderer } from '@/features/forms';
import { apiSchemaToCoreSchema } from '../schema';
import type { FormSchemaJson } from '../types';

/**
 * Previsualización WYSIWYG del formulario. Traduce el schema del builder al de
 * `@core/forms` y lo pinta con el mismo `FormRenderer` compartido que usará el
 * render público, garantizando paridad exacta.
 */
export function FormPreview({ schema }: { schema: FormSchemaJson }) {
  const coreSchema = useMemo(() => apiSchemaToCoreSchema(schema), [schema]);
  const form = useForm({ defaultValues: getDefaultValues(coreSchema) });

  // El schema cambia con cada edición del builder: reseteamos los valores por
  // defecto para que el preview refleje siempre la definición actual.
  useEffect(() => {
    form.reset(getDefaultValues(coreSchema));
  }, [coreSchema, form]);

  if (schema.fields.length === 0) {
    return (
      <div className="text-muted-foreground rounded-md border border-dashed px-4 py-10 text-center text-sm">
        El formulario no tiene campos todavía.
      </div>
    );
  }

  return (
    <Form {...form}>
      <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
        <FormRenderer schema={coreSchema} control={form.control} />
      </form>
    </Form>
  );
}
