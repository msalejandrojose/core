import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { WhatsappConversation } from '../api/types';

interface Props {
  conversations: WhatsappConversation[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (conversation: WhatsappConversation) => void;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
}

function displayName(c: WhatsappConversation): string {
  return c.contactName ?? `+${c.contactPhone}`;
}

export function ConversationList({
  conversations,
  selectedId,
  loading,
  onSelect,
}: Props) {
  if (loading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No hay conversaciones todavía.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {conversations.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            onClick={() => onSelect(c)}
            className={cn(
              'flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/60',
              selectedId === c.id && 'bg-muted',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{displayName(c)}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatTime(c.lastMessageAt)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm text-muted-foreground">
                {c.lastDirection === 'OUTBOUND' && 'Tú: '}
                {c.lastMessagePreview ?? '—'}
              </span>
              {c.unreadCount > 0 && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-xs font-medium text-white">
                  {c.unreadCount}
                </span>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
