import { ArrowLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import { DynamicFields } from './components/DynamicFields';
import { MessageTypePreviewPanel } from './components/MessageTypePreviewPanel';
import { useAccountTypes } from './hooks/use-account-types';
import { useMessageType } from './hooks/use-message-type';
import { useUpdateMessageType } from './hooks/use-message-type-mutations';
import { useSendingAccounts } from './hooks/use-sending-accounts';
import {
  buildPayload,
  initialValues,
  validateDynamic,
  type FieldErrors,
} from './lib/dynamic-fields';
import { CHANNEL_LABELS, type FieldDescriptor } from './types';

interface FormValues {
  name: string;
  accountId: string;
  isActive: boolean;
  content: Record<string, unknown>;
}

export function MessageTypeEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dynErrors, setDynErrors] = useState<FieldErrors>({});

  const { data: messageType, isLoading } = useMessageType(id);
  const { data: accountsPage } = useSendingAccounts({ limit: 100 });
  const { data: types = [] } = useAccountTypes();
  const accounts = useMemo(() => accountsPage?.data ?? [], [accountsPage]);

  const values = useMemo<FormValues | undefined>(() => {
    if (!messageType) return undefined;
    const account = accounts.find((a) => a.id === messageType.accountId);
    const type = types.find((t) => t.id === account?.typeId);
    if (!type) return undefined;
    return {
      name: messageType.name,
      accountId: messageType.accountId,
      isActive: messageType.isActive,
      content: initialValues(type.messageSchema, messageType.content),
    };
  }, [messageType, accounts, types]);

  const form = useForm<FormValues>({
    defaultValues: { name: '', accountId: '', isActive: true, content: {} },
    values,
  });

  const accountId = useWatch({ control: form.control, name: 'accountId' });
  const isActive = useWatch({ control: form.control, name: 'isActive' });
  const draftContent = useWatch({ control: form.control, name: 'content' });

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const descriptors: FieldDescriptor[] = useMemo(() => {
    const type = types.find((t) => t.id === selectedAccount?.typeId);
    return type?.messageSchema ?? [];
  }, [types, selectedAccount]);

  const update = useUpdateMessageType();

  async function save(): Promise<boolean> {
    const v = form.getValues();
    let ok = true;
    if (!v.name.trim()) {
      form.setError('name', { message: 'Obligatorio' });
      ok = false;
    }
    if (!v.accountId) {
      form.setError('accountId', { message: 'Selecciona una cuenta' });
      ok = false;
    }
    const errs = validateDynamic(descriptors, v.content, 'edit');
    setDynErrors(errs);
    if (!ok || Object.keys(errs).length > 0 || !id) return false;

    await update.mutateAsync({
      id,
      body: {
        name: v.name.trim(),
        accountId: v.accountId,
        content: buildPayload(descriptors, v.content),
        isActive: v.isActive,
      },
    });
    return true;
  }

  const submit = form.handleSubmit(() => {
    void save();
  });

  if (isLoading || !messageType) {
    return <Skeleton className="h-96 w-full rounded-lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/notifications/message-types')}
          aria-label="Volver"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {messageType.name}
          </h1>
          <p className="text-muted-foreground font-mono text-sm">
            {messageType.key}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Contenido</CardTitle>
            <Button size="sm" disabled={update.isPending} onClick={submit}>
              {update.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mt-name">Nombre</Label>
                  <Input id="mt-name" {...form.register('name')} />
                  {form.formState.errors.name && (
                    <p className="text-destructive text-xs">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="accountId">Cuenta de envío</Label>
                  <Select
                    value={accountId}
                    onValueChange={(v) => form.setValue('accountId', v)}
                  >
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
                </div>

                {selectedAccount && (
                  <div className="border-t pt-3">
                    <DynamicFields
                      prefix="content"
                      descriptors={descriptors}
                      errors={dynErrors}
                      existing={messageType.content}
                    />
                  </div>
                )}

                <div className="border-t pt-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={isActive}
                      onCheckedChange={(c) =>
                        form.setValue('isActive', c === true)
                      }
                    />
                    Activo
                  </label>
                </div>
              </div>
            </Form>
          </CardContent>
        </Card>

        <MessageTypePreviewPanel
          messageTypeId={messageType.id}
          content={buildPayload(descriptors, draftContent ?? {})}
          channel={selectedAccount?.channel}
          onBeforePreview={save}
        />
      </div>
    </div>
  );
}
