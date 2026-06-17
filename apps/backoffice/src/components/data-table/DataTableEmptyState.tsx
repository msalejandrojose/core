import { Inbox } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';

export function DataTableEmptyState({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="h-48 text-center">
        <div className="text-muted-foreground flex flex-col items-center gap-2">
          <Inbox size={32} />
          <span className="text-sm">{message}</span>
        </div>
      </TableCell>
    </TableRow>
  );
}
