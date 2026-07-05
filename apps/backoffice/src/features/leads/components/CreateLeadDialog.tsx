import { type ReactNode, useState } from 'react';
import { CreateDialog } from '@/components/dialogs/CreateDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateLead } from '../hooks/use-lead-mutations';
import { LEAD_SOURCES, LEAD_SOURCE_LABELS, type LeadSource } from '../types';

interface State {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  source: LeadSource;
  consentGiven: boolean;
}

const DEFAULTS: State = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: '',
  source: 'MANUAL',
  consentGiven: false,
};

export function CreateLeadDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<State>(DEFAULTS);
  const [error, setError] = useState('');

  const create = useCreateLead({
    onSuccess: () => {
      setOpen(false);
      setForm(DEFAULTS);
    },
  });

  const set =
    (k: keyof State) =>
    (e: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = () => {
    if (form.email.trim() === '' && form.phone.trim() === '') {
      setError('Indica al menos email o teléfono.');
      return;
    }
    setError('');
    create.mutate({
      firstName: form.firstName.trim() || undefined,
      lastName: form.lastName.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      company: form.company.trim() || undefined,
      source: form.source,
      consentGiven: form.consentGiven,
    });
  };

  return (
    <CreateDialog
      trigger={trigger}
      title="Nuevo lead"
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setForm(DEFAULTS);
          setError('');
        }
      }}
      onSubmit={submit}
      isPending={create.isPending}
      submitLabel="Crear"
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
        <div className="space-y-1.5">
          <Label>Origen</Label>
          <Select
            value={form.source}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, source: v as LeadSource }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {LEAD_SOURCE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.consentGiven}
            onCheckedChange={(c) =>
              setForm((f) => ({ ...f, consentGiven: c === true }))
            }
          />
          El contacto ha dado su consentimiento
        </label>
        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>
    </CreateDialog>
  );
}
