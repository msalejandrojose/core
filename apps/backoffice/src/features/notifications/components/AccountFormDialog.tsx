import { useMemo, useState, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { CreateDialog } from '@/components/dialogs/CreateDialog';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useAccountTypes } from '../hooks/use-account-types';
import {
  useCreateAccount,
  useUpdateAccount,
} from '../hooks/use-account-mutations';
import {
  buildPayload,
  initialValues,
  validateDynamic,
  type FieldErrors,
} from '../lib/dynamic-fields';
import { CHANNEL_LABELS, type SendingAccount } from '../types';
import { DynamicFields } from './DynamicFields';

interface FormValues {
  typeId: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  config: Record<string, unknown>;
}

interface AccountFormDialogProps {
  trigger: ReactNode;
  /** Si se pasa, el diálogo edita esa cuenta; si no, crea una nueva. */
  account?: SendingAccount;
}

export function AccountFormDialog({ trigger, account }: AccountFormDialogProps) {
  const isEdit = !!account;
  const [open, setOpen] = useState(false);
  const [dynErrors, setDynErrors] = useState<FieldErrors>({});
  const { data: types = [] } = useAccountTypes();

  // En edición el tipo es fijo (= el de la cuenta). Lo resolvemos directamente
  // para poder hidratar el formulario cuando los tipos terminen de cargar.
  const editType = useMemo(
    () =>
      isEdit && account ? types.find((t) => t.id === account.typeId) : undefined,
    [isEdit, account, types],
  );

  // `values` rehidrata el form cuando ya está el schema (RHF resetea al cambiar
  // la referencia; incluir `open` fuerza datos frescos en cada apertura). En
  // creación es `undefined` ⇒ formulario libre con `defaultValues`.
  const values = useMemo<FormValues | undefined>(() => {
    // Gate por `open`: al reabrir se recalcula ⇒ RHF vuelve a los valores del
    // server (descarta ediciones sin guardar de una apertura anterior).
    if (!open || !isEdit || !account || !editType) return undefined;
    return {
      typeId: account.typeId,
      name: account.name,
      isActive: account.isActive,
      isDefault: account.isDefault,
      config: initialValues(editType.configSchema, account.config),
    };
  }, [open, isEdit, account, editType]);

  const form = useForm<FormValues>({
    defaultValues: {
      typeId: '',
      name: '',
      isActive: true,
      isDefault: false,
      config: {},
    },
    values,
  });

  const selectedTypeId = useWatch({ control: form.control, name: 'typeId' });
  const isActive = useWatch({ control: form.control, name: 'isActive' });
  const isDefault = useWatch({ control: form.control, name: 'isDefault' });
  const selectedType = useMemo(
    () => types.find((t) => t.id === selectedTypeId),
    [types, selectedTypeId],
  );
  const descriptors = selectedType?.configSchema ?? [];

  // Al cambiar de tipo en creación, reinicializa la config con la forma del
  // nuevo schema.
  function handleTypeChange(typeId: string) {
    form.setValue('typeId', typeId);
    const type = types.find((t) => t.id === typeId);
    form.setValue('config', initialValues(type?.configSchema ?? []));
    setDynErrors({});
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setDynErrors({});
      if (!isEdit) form.reset();
    }
  }

  const create = useCreateAccount({ onSuccess: () => handleOpenChange(false) });
  const update = useUpdateAccount({ onSuccess: () => handleOpenChange(false) });
  const isPending = create.isPending || update.isPending;

  const submit = form.handleSubmit((values) => {
    let ok = true;
    if (!values.name.trim()) {
      form.setError('name', { message: 'Obligatorio' });
      ok = false;
    }
    if (!isEdit && !values.typeId) {
      form.setError('typeId', { message: 'Selecciona un tipo' });
      ok = false;
    }
    const errs = validateDynamic(
      descriptors,
      values.config,
      isEdit ? 'edit' : 'create',
    );
    setDynErrors(errs);
    if (!ok || Object.keys(errs).length > 0) return;

    const config = buildPayload(descriptors, values.config);
    if (isEdit && account) {
      update.mutate({
        id: account.id,
        body: {
          name: values.name.trim(),
          config,
          isActive: values.isActive,
          isDefault: values.isDefault,
        },
      });
    } else {
      create.mutate({
        typeId: values.typeId,
        name: values.name.trim(),
        config,
        isActive: values.isActive,
        isDefault: values.isDefault,
      });
    }
  });

  return (
    <CreateDialog
      trigger={trigger}
      title={isEdit ? 'Editar cuenta de envío' : 'Nueva cuenta de envío'}
      description={
        isEdit
          ? 'Los secretos no se muestran; déjalos vacíos para conservarlos.'
          : 'Elige un tipo (canal) y configura la cuenta.'
      }
      open={open}
      onOpenChange={handleOpenChange}
      onSubmit={submit}
      isPending={isPending}
      submitLabel={isEdit ? 'Guardar' : 'Crear'}
    >
      <Form {...form}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="typeId">Tipo de cuenta (canal)</Label>
            <Select
              value={selectedTypeId}
              onValueChange={handleTypeChange}
              disabled={isEdit}
            >
              <SelectTrigger id="typeId" className="w-full">
                <SelectValue placeholder="Selecciona un tipo…" />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} · {CHANNEL_LABELS[t.channel]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.typeId && (
              <p className="text-destructive text-xs">
                {form.formState.errors.typeId.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              placeholder="p. ej. Resend — producción"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-destructive text-xs">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {selectedType && (
            <div className="border-t pt-3">
              <DynamicFields
                prefix="config"
                descriptors={descriptors}
                errors={dynErrors}
                existing={account?.config}
              />
            </div>
          )}

          <div className="flex items-center gap-6 border-t pt-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isActive}
                onCheckedChange={(c) => form.setValue('isActive', c === true)}
              />
              Activa
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isDefault}
                onCheckedChange={(c) => form.setValue('isDefault', c === true)}
              />
              Cuenta por defecto del canal
            </label>
          </div>
        </div>
      </Form>
    </CreateDialog>
  );
}
