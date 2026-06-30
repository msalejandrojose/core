import { Inbox } from 'lucide-react';
import { type ReactNode } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';

export function DataTableEmptyState({
  colSpan,
  message,
  cta,
}: {
  colSpan: number;
  message: string;
  cta?: ReactNode;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="h-48 text-center">
        <div className="text-muted-foreground flex flex-col items-center gap-2">
          <Inbox size={32} />
          <span className="text-sm">{message}</span>
          {cta && <div className="mt-1">{cta}</div>}
        </div>
      </TableCell>
    </TableRow>
  );
}
