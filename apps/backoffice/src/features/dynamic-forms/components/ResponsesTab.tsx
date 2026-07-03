import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatAnswer } from '../schema';
import { useFormInstances } from '../hooks/use-form-instances';
import { useFormResponses } from '../hooks/use-form-responses';
import { RESPONSE_POLICY_LABELS, type FormResponseDto } from '../types';
import { ResponseDetailDialog } from './ResponseDetailDialog';

const PAGE_SIZE = 20;

/** Resumen de 1-2 campos clave de una respuesta para la fila. */
function responsePreview(response: FormResponseDto): string {
  const fields = response.schemaSnapshot?.fields ?? [];
  return (
    fields
      .slice(0, 2)
      .map((f) => formatAnswer(f, response.answers?.[f.key]))
      .filter((v) => v !== '—')
      .join(' · ') || '—'
  );
}

export function ResponsesTab({ formId }: { formId: string }) {
  const { data: instancesData, isLoading: loadingInstances } =
    useFormInstances(formId);
  const instances = useMemo(
    () => instancesData?.data ?? [],
    [instancesData],
  );

  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [selected, setSelected] = useState<FormResponseDto | null>(null);

  // Instancia efectiva: la elegida o, por defecto, la primera disponible.
  const effectiveInstanceId = instanceId ?? instances[0]?.id ?? null;

  const resetPaging = () => setCursors([undefined]);
  const currentCursor = cursors[cursors.length - 1];

  const { data, isLoading } = useFormResponses({
    instanceId: effectiveInstanceId ?? '',
    limit: PAGE_SIZE,
    cursor: currentCursor,
  });
  const responses = data?.data ?? [];

  if (loadingInstances) return <Skeleton className="h-48 w-full" />;

  if (instances.length === 0) {
    return (
      <div className="text-muted-foreground rounded-md border border-dashed px-4 py-10 text-center text-sm">
        Crea un enlace en la pestaña «Enlaces» para empezar a recibir
        respuestas.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          value={effectiveInstanceId ?? undefined}
          onValueChange={(v) => {
            setInstanceId(v);
            resetPaging();
          }}
        >
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Selecciona un enlace" />
          </SelectTrigger>
          <SelectContent>
            {instances.map((instance) => (
              <SelectItem key={instance.id} value={instance.id}>
                {RESPONSE_POLICY_LABELS[instance.responsePolicy]} ·{' '}
                <span className="font-mono text-xs">{instance.hash}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" disabled title="Próximamente">
          <Download size={14} />
          Exportar CSV
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : responses.length === 0 ? (
        <div className="text-muted-foreground rounded-md border border-dashed px-4 py-10 text-center text-sm">
          Este enlace todavía no tiene respuestas.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Resumen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((response) => (
                <TableRow
                  key={response.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(response)}
                >
                  <TableCell className="whitespace-nowrap">
                    {new Date(response.submittedAt).toLocaleString('es-ES', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </TableCell>
                  <TableCell>
                    {response.submittedById ? 'Autenticado' : 'Anónimo'}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[360px] truncate">
                    {responsePreview(response)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {(cursors.length > 1 || data?.meta.hasMore) && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={cursors.length <= 1}
            onClick={() =>
              setCursors((s) => (s.length > 1 ? s.slice(0, -1) : s))
            }
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!data?.meta.hasMore}
            onClick={() => {
              const next = data?.meta.nextCursor;
              if (next) setCursors((s) => [...s, next]);
            }}
          >
            Siguiente
          </Button>
        </div>
      )}

      <ResponseDetailDialog
        response={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
