import { type ReactNode, useState } from 'react';
import { CreateDialog } from '@/components/dialogs/CreateDialog';
import { Label } from '@/components/ui/label';
import { useConvertLead } from '../hooks/use-lead-mutations';
import { UserSelect } from './UserSelect';

interface Props {
  leadId: string;
  trigger: ReactNode;
}

export function ConvertLeadDialog({ leadId, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const convert = useConvertLead(leadId);

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) setUserId('');
  };

  const submit = () => {
    if (!userId) return;
    convert.mutate({ userId }, { onSuccess: () => close(false) });
  };

  return (
    <CreateDialog
      trigger={trigger}
      title="Convertir lead"
      description="Marca el lead como ganado y lo vincula al usuario/cliente creado."
      open={open}
      onOpenChange={close}
      onSubmit={submit}
      isPending={convert.isPending}
      submitLabel="Convertir"
    >
      <div className="space-y-1.5">
        <Label>Usuario vinculado</Label>
        <UserSelect
          value={userId}
          onChange={setUserId}
          placeholder="Selecciona el usuario creado"
        />
      </div>
    </CreateDialog>
  );
}
