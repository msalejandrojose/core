import { useState, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { CreateDialog } from '@/components/dialogs/CreateDialog';
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
import { useCreateAccountType } from '../hooks/use-create-account-type';
import {
  CHANNEL_LABELS,
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
} from '../types';

interface FormValues {
  key: string;
  name: string;
  channel: NotificationChannel;
}

export function AccountTypeFormDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({
    defaultValues: { key: '', name: '', channel: 'EMAIL' },
  });
  const channel = useWatch({ control: form.control, name: 'channel' });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) form.reset({ key: '', name: '', channel: 'EMAIL' });
  }

  const { mutate, isPending } = useCreateAccountType({
    onSuccess: () => handleOpenChange(false),
  });

  const submit = form.handleSubmit((values) => {
    let ok = true;
    if (!/^[a-z0-9_]+$/.test(values.key)) {
      form.setError('key', {
        message: 'Solo minúsculas, dígitos y _ (p. ej. email_marketing)',
      });
      ok = false;
    }
    if (!values.name.trim()) {
      form.setError('name', { message: 'Obligatorio' });
      ok = false;
    }
    if (!ok) return;
    mutate({
      key: values.key,
      name: values.name.trim(),
      channel: values.channel,
    });
  });

  return (
    <CreateDialog
      trigger={trigger}
      title="Nuevo tipo de cuenta"
      description="El canal define qué campos de configuración y de mensaje tendrá."
      open={open}
      onOpenChange={handleOpenChange}
      onSubmit={submit}
      isPending={isPending}
    >
      <Form {...form}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="at-key">Key</Label>
            <Input
              id="at-key"
              placeholder="email_marketing"
              className="font-mono"
              {...form.register('key')}
            />
            {form.formState.errors.key && (
              <p className="text-destructive text-xs">
                {form.formState.errors.key.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="at-name">Nombre</Label>
            <Input id="at-name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-destructive text-xs">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="at-channel">Canal</Label>
            <Select
              value={channel}
              onValueChange={(v) =>
                form.setValue('channel', v as NotificationChannel)
              }
            >
              <SelectTrigger id="at-channel" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CHANNEL_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Form>
    </CreateDialog>
  );
}
