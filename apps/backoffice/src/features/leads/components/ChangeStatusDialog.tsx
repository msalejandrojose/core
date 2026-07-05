import { type ReactNode, useMemo, useState } from 'react';
import { CreateDialog } from '@/components/dialogs/CreateDialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useChangeLeadStatus } from '../hooks/use-lead-mutations';
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_TRANSITIONS,
  type LeadStatus,
} from '../types';

interface Props {
  leadId: string;
  currentStatus: LeadStatus;
  trigger: ReactNode;
}

export function ChangeStatusDialog({ leadId, currentStatus, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState<LeadStatus | ''>('');
  const [reason, setReason] = useState('');

  // WON no se alcanza aquí: va por ConvertLeadDialog (spec §10).
  const options = useMemo(
    () => LEAD_STATUS_TRANSITIONS[currentStatus].filter((s) => s !== 'WON'),
    [currentStatus],
  );

  const change = useChangeLeadStatus(leadId);

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setTo('');
      setReason('');
    }
  };

  const submit = () => {
    if (!to) return;
    change.mutate(
      { to, reason: reason.trim() || undefined },
      { onSuccess: () => close(false) },
    );
  };

  return (
    <CreateDialog
      trigger={trigger}
      title="Cambiar estado"
      description={`Estado actual: ${LEAD_STATUS_LABELS[currentStatus]}`}
      open={open}
      onOpenChange={close}
      onSubmit={submit}
      isPending={change.isPending}
      submitLabel="Cambiar"
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Nuevo estado</Label>
          <Select value={to} onValueChange={(v) => setTo(v as LeadStatus)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un estado" />
            </SelectTrigger>
            <SelectContent>
              {options.length === 0 && (
                <SelectItem value="__none" disabled>
                  Sin transiciones disponibles
                </SelectItem>
              )}
              {options.map((s) => (
                <SelectItem key={s} value={s}>
                  {LEAD_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Motivo (opcional)</Label>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej. no encaja con el perfil"
          />
        </div>
      </div>
    </CreateDialog>
  );
}
