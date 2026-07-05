import { type ReactNode, useState } from 'react';
import { CreateDialog } from '@/components/dialogs/CreateDialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useUpdateLead } from '../hooks/use-lead-mutations';
import type { LeadRow } from '../types';

export function EditLeadDialog({
  lead,
  trigger,
}: {
  lead: LeadRow;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: lead.firstName ?? '',
    lastName: lead.lastName ?? '',
    email: lead.email ?? '',
    phone: lead.phone ?? '',
    company: lead.company ?? '',
  });

  const update = useUpdateLead(lead.id);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    update.mutate(
      {
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        company: form.company.trim() || undefined,
      },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <CreateDialog
      trigger={trigger}
      title="Editar datos del lead"
      open={open}
      onOpenChange={setOpen}
      onSubmit={submit}
      isPending={update.isPending}
      submitLabel="Guardar"
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input value={form.firstName} onChange={set('firstName')} />
          </div>
          <div className="space-y-1.5">
            <Label>Apellidos</Label>
            <Input value={form.lastName} onChange={set('lastName')} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={set('email')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Teléfono</Label>
            <Input value={form.phone} onChange={set('phone')} />
          </div>
          <div className="space-y-1.5">
            <Label>Empresa</Label>
            <Input value={form.company} onChange={set('company')} />
          </div>
        </div>
      </div>
    </CreateDialog>
  );
}
