import { type ReactNode, useState } from 'react';
import { CreateDialog } from '@/components/dialogs/CreateDialog';
import { Label } from '@/components/ui/label';
import { useAssignLead } from '../hooks/use-lead-mutations';
import { UserSelect } from './UserSelect';

interface Props {
  leadId: string;
  currentOwnerId: string | null;
  trigger: ReactNode;
}

export function AssignLeadDialog({ leadId, currentOwnerId, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [ownerId, setOwnerId] = useState(currentOwnerId ?? '');
  const assign = useAssignLead(leadId);

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) setOwnerId(currentOwnerId ?? '');
  };

  const submit = () => {
    if (!ownerId) return;
    assign.mutate({ ownerId }, { onSuccess: () => close(false) });
  };

  return (
    <CreateDialog
      trigger={trigger}
      title="Asignar responsable"
      open={open}
      onOpenChange={close}
      onSubmit={submit}
      isPending={assign.isPending}
      submitLabel="Asignar"
    >
      <div className="space-y-1.5">
        <Label>Responsable</Label>
        <UserSelect value={ownerId} onChange={setOwnerId} />
      </div>
    </CreateDialog>
  );
}
