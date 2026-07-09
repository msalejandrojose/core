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
import { useSendingAccounts } from '../hooks/use-sending-accounts';
import {
  useCreateMessageType,
  useUpdateMessageType,
} from '../hooks/use-message-type-mutations';
import {
  buildPayload,
  initialValues,
  validateDynamic,
  type FieldErrors,
} from '../lib/dynamic-fields';
import {
  CHANNEL_LABELS,
  type FieldDescriptor,
  type MessageType,
} from '../types';
import { DynamicFields } from './DynamicFields';

interface FormValues {
  key: string;
  name: string;
  accountId: string;
  isActive: boolean;
  content: Record<string, unknown>;
}

interface MessageTypeFormDialogProps {
  trigger: ReactNode;
  messageType?: MessageType;
}

export function MessageTypeFormDialog({
  trigger,
  messageType,
}: MessageTypeFormDialogProps) {
  const isEdit = !!messageType;
  const [open, setOpen] = useState(false);
  const [dynErrors, setDynErrors] = useState<FieldErrors>({});
  const { data: accountsPage } = useSendingAccounts({ limit: 100 });
  const { data: types = [] } = useAccountTypes();
  const accounts = useMemo(() => accountsPage?.data ?? [], [accountsPage]);

  // `values` rehidrata el form en edición cuando ya están cargados cuentas y
  // tipos (que traen el `messageSchema`). `undefined` en creación ⇒ form libre.
  const values = useMemo<FormValues | undefined>(() => {
    // Gate por `open`: al reabrir se recalcula ⇒ RHF vuelve a los valores del
    // server (descarta ediciones sin guardar de una apertura anterior).
    if (!open || !isEdit || !messageType) return undefined;
    const account = accounts.find((a) => a.id === messageType.accountId);
    const type = types.find((t) => t.id === account?.typeId);
    if (!type) return undefined;
    return {
      key: messageType.key,
      name: messageType.name,
      accountId: messageType.accountId,
      isActive: messageType.isActive,
      content: initialValues(type.messageSchema, messageType.content),
    };
  }, [open, isEdit, messageType, accounts, types]);

  const form = useForm<FormValues>({
    defaultValues: {
      key: '',
      name: '',
      accountId: '',
      isActive: true,
      content: {},
    },
    values,
  });

  const accountId = useWatch({ control: form.control, name: 'accountId' });
  const isActive = useWatch({ control: form.control, name: 'isActive' });
  // messageSchema del canal = el del tipo de la cuenta elegida.
  const descriptors: FieldDescriptor[] = useMemo(() => {
    const account = accounts.find((a) => a.id === accountId);
    const type = types.find((t) => t.id === account?.typeId);
    return type?.messageSchema ?? [];
  }, [accounts, types, accountId]);

  const selectedAccount = accounts.find((a) => a.id === accountId);

  function handleAccountChange(next: string) {
    form.setValue('accountId', next);
    const account = accounts.find((a) => a.id === next);
    const type = types.find((t) => t.id === account?.typeId);
    form.setValue('content', initialValues(type?.messageSchema ?? []));
    setDynErrors({});
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setDynErrors({});
      if (!isEdit) form.reset();
    }
  }

  const create = useCreateMessageType({
    onSuccess: () => handleOpenChange(false),
  });
  const update = useUpdateMessageType({
    onSuccess: () => handleOpenChange(false),
  });
  const isPending = create.isPending || update.isPending;

  const submit = form.handleSubmit((values) => {
    let ok = true;
    if (!isEdit && !/^[a-z0-9_]+$/.test(values.key)) {
      form.setError('key', {
        message: 'Solo minúsculas, dígitos y _ (p. ej. welcome_email)',
      });
      ok = false;
    }
    if (!values.name.trim()) {
      form.setError('name', { message: 'Obligatorio' });
      ok = false;
    }
    if (!values.accountId) {
      form.setError('accountId', { message: 'Selecciona una cuenta' });
      ok = false;
    }
    const errs = validateDynamic(
      descriptors,
      values.content,
      isEdit ? 'edit' : 'create',
    );
    setDynErrors(errs);
    if (!ok || Object.keys(errs).length > 0) return;

    const content = buildPayload(descriptors, values.content);
    if (isEdit && messageType) {
      update.mutate({
        id: messageType.id,
        body: {
          name: values.name.trim(),
          accountId: values.accountId,
          content,
          isActive: values.isActive,
        },
      });
    } else {
      create.mutate({
        key: values.key,
        name: values.name.trim(),
        accountId: values.accountId,
        content,
        isActive: values.isActive,
      });
    }
  });

  return (
    <CreateDialog
      trigger={trigger}
      title={isEdit ? 'Editar tipo de mensaje' : 'Nuevo tipo de mensaje'}
      description="El contenido admite variables con la sintaxis {{ variable }}."
      open={open}
      onOpenChange={handleOpenChange}
      onSubmit={submit}
      isPending={isPending}
      submitLabel={isEdit ? 'Guardar' : 'Crear'}
    >
      <Form {...form}>
        <div className="space-y-4">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                placeholder="welcome_email"
                className="font-mono"
                {...form.register('key')}
              />
              {form.formState.errors.key && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.key.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="mt-name">Nombre</Label>
            <Input
              id="mt-name"
              placeholder="p. ej. Email de bienvenida"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-destructive text-xs">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="accountId">Cuenta de envío</Label>
            <Select value={accountId} onValueChange={handleAccountChange}>
              <SelectTrigger id="accountId" className="w-full">
                <SelectValue placeholder="Selecciona una cuenta…" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                    {a.channel ? ` · ${CHANNEL_LABELS[a.channel]}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.accountId && (
              <p className="text-destructive text-xs">
                {form.formState.errors.accountId.message}
              </p>
            )}
          </div>

          {selectedAccount && (
            <div className="border-t pt-3">
              <DynamicFields
                prefix="content"
                descriptors={descriptors}
                errors={dynErrors}
                existing={messageType?.content}
              />
            </div>
          )}

          <div className="border-t pt-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isActive}
                onCheckedChange={(c) => form.setValue('isActive', c === true)}
              />
              Activo
            </label>
          </div>
        </div>
      </Form>
    </CreateDialog>
  );
}
