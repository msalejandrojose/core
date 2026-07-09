import { useEffect, useRef } from 'react';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { WhatsappConversation, WhatsappMessage } from '../api/types';
import {
  useWhatsappMessages,
  useSendWhatsappMessage,
} from '../hooks/use-whatsapp-queries';
import { MessageComposer } from './MessageComposer';

interface Props {
  conversation: WhatsappConversation | null;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'read':
      return <CheckCheck className="h-3.5 w-3.5 text-sky-400" />;
    case 'delivered':
      return <CheckCheck className="h-3.5 w-3.5 opacity-70" />;
    case 'sent':
      return <Check className="h-3.5 w-3.5 opacity-70" />;
    case 'failed':
      return <AlertCircle className="h-3.5 w-3.5 text-red-400" />;
    default:
      return <Clock className="h-3.5 w-3.5 opacity-70" />;
  }
}

function Bubble({ message }: { message: WhatsappMessage }) {
  const outbound = message.direction === 'OUTBOUND';
  const time = new Date(message.timestamp).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <div className={cn('flex', outbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm',
          outbound
            ? 'rounded-br-sm bg-emerald-600 text-white'
            : 'rounded-bl-sm bg-muted text-foreground',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <div
          className={cn(
            'mt-1 flex items-center justify-end gap-1 text-[10px]',
            outbound ? 'text-white/80' : 'text-muted-foreground',
          )}
        >
          <span>{time}</span>
          {outbound && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}

export function ChatView({ conversation }: Props) {
  const { data: messages, isLoading } = useWhatsappMessages(
    conversation?.id ?? null,
  );
  const send = useSendWhatsappMessage(conversation?.id ?? '');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Selecciona una conversación para ver el chat.
      </div>
    );
  }

  const title = conversation.contactName ?? `+${conversation.contactPhone}`;

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-4 py-3">
        <h2 className="font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">+{conversation.contactPhone}</p>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn('h-10 w-1/2 rounded-2xl', i % 2 && 'ml-auto')}
            />
          ))
        ) : messages && messages.length > 0 ? (
          messages.map((m) => <Bubble key={m.id} message={m} />)
        ) : (
          <p className="pt-8 text-center text-sm text-muted-foreground">
            No hay mensajes en esta conversación.
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <MessageComposer
        sending={send.isPending}
        onSend={(body) => send.mutate(body)}
      />
    </div>
  );
}
