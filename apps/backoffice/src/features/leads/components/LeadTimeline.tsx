import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeadActivities } from '../hooks/use-lead-activities';
import { LEAD_ACTIVITY_LABELS, type LeadActivityRow } from '../types';

const dateFmt = (iso: string) =>
  new Date(iso).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export function LeadTimeline({ leadId }: { leadId: string }) {
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const cursor = cursors[cursors.length - 1];
  const { data, isLoading } = useLeadActivities(leadId, cursor);

  const items: LeadActivityRow[] = data?.data ?? [];

  if (isLoading && items.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">Aún no hay actividad.</p>
    );
  }

  return (
    <div className="space-y-4">
      <ol className="space-y-4">
        {items.map((a) => (
          <li key={a.id} className="border-l-2 border-border pl-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">
                {LEAD_ACTIVITY_LABELS[a.type]}
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {dateFmt(a.createdAt)}
              </span>
            </div>
            {a.body && (
              <p className="text-muted-foreground mt-0.5 text-sm whitespace-pre-wrap">
                {a.body}
              </p>
            )}
          </li>
        ))}
      </ol>
      {data?.meta.hasMore && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const next = data.meta.nextCursor;
            if (next) setCursors((s) => [...s, next]);
          }}
        >
          Cargar más
        </Button>
      )}
    </div>
  );
}
