import { Link2 } from 'lucide-react';
import { useState } from 'react';
import { CreateDialog } from '@/components/dialogs/CreateDialog';
import { Button } from '@/components/ui/button';
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
import { useCreateFormInstance } from '../hooks/use-create-form-instance';
import {
  RESPONSE_POLICIES,
  RESPONSE_POLICY_LABELS,
  type FormResponsePolicy,
} from '../types';

/** Convierte un valor `datetime-local` a ISO-8601, o null si está vacío. */
function toIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function CreateInstanceDialog({ formId }: { formId: string }) {
  const [open, setOpen] = useState(false);
  const [responsePolicy, setResponsePolicy] =
    useState<FormResponsePolicy>('UNLIMITED');
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [maxResponses, setMaxResponses] = useState('');

  const create = useCreateFormInstance(formId);

  const reset = () => {
    setResponsePolicy('UNLIMITED');
    setRequiresAuth(false);
    setOpensAt('');
    setClosesAt('');
    setMaxResponses('');
  };

  const handleSubmit = () => {
    create.mutate(
      {
        responsePolicy,
        requiresAuth,
        opensAt: toIso(opensAt),
        closesAt: toIso(closesAt),
        maxResponses: maxResponses.trim() ? Number(maxResponses) : null,
      },
      {
        onSuccess: () => {
          setOpen(false);
          reset();
        },
      },
    );
  };

  return (
    <CreateDialog
      trigger={
        <Button size="sm">
          <Link2 size={14} />
          Nuevo enlace
        </Button>
      }
      title="Nuevo enlace público"
      description="Genera una instancia con su propia política de respuesta."
      icon={<Link2 className="size-5" />}
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
      onSubmit={handleSubmit}
      isPending={create.isPending}
      submitLabel="Crear enlace"
    >
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label>Política de respuesta</Label>
          <Select
            value={responsePolicy}
            onValueChange={(v) => setResponsePolicy(v as FormResponsePolicy)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESPONSE_POLICIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {RESPONSE_POLICY_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="instance-requires-auth"
            checked={requiresAuth}
            onCheckedChange={(v) => setRequiresAuth(v === true)}
          />
          <Label htmlFor="instance-requires-auth" className="font-normal">
            Requiere que el usuario haya iniciado sesión
          </Label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="instance-opens">Abre</Label>
            <Input
              id="instance-opens"
              type="datetime-local"
              value={opensAt}
              onChange={(e) => setOpensAt(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="instance-closes">Cierra</Label>
            <Input
              id="instance-closes"
              type="datetime-local"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="instance-max">Máx. de respuestas (opcional)</Label>
          <Input
            id="instance-max"
            type="number"
            min={1}
            value={maxResponses}
            onChange={(e) => setMaxResponses(e.target.value)}
          />
        </div>
      </div>
    </CreateDialog>
  );
}
