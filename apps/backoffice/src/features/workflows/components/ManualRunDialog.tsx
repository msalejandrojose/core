import { Loader2, Play } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { JsonField } from '../editor/JsonField';
import { useTriggerManualRun } from '../hooks/use-trigger-manual-run';

/**
 * Dispara manualmente la versión activa de un workflow con un payload opcional
 * y navega al detalle del run resultante.
 */
export function ManualRunDialog({ workflowKey }: { workflowKey: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<Record<string, unknown> | undefined>(undefined);

  const run = useTriggerManualRun(workflowKey, {
    onSuccess: (r) => {
      setOpen(false);
      navigate(`/workflows/runs/${r.id}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Play size={16} />
          Ejecutar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disparo manual</DialogTitle>
          <DialogDescription>
            Ejecuta la versión activa con un payload de evento opcional.
          </DialogDescription>
        </DialogHeader>
        <JsonField
          label="Payload (opcional)"
          value={payload}
          onChange={setPayload}
          placeholder='{ "userId": "123" }'
          rows={6}
        />
        <DialogFooter>
          <Button
            onClick={() => run.mutate(payload ?? {})}
            disabled={run.isPending}
          >
            {run.isPending ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Ejecutar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
