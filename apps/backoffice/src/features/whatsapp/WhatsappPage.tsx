import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import type { WhatsappConversation } from './api/types';
import {
  useWhatsappAccounts,
  useWhatsappConversations,
  useMarkConversationRead,
} from './hooks/use-whatsapp-queries';
import { useWhatsappRealtime } from './hooks/use-whatsapp-socket';
import { ConversationList } from './components/ConversationList';
import { ChatView } from './components/ChatView';

export function WhatsappPage() {
  const [accountId, setAccountId] = useState<string>('');
  const [selected, setSelected] = useState<WhatsappConversation | null>(null);

  const accounts = useWhatsappAccounts();
  const conversations = useWhatsappConversations(accountId || undefined);
  const markRead = useMarkConversationRead();

  // Refresco en vivo por WebSocket mientras la pantalla está montada.
  useWhatsappRealtime();

  const onSelect = (conversation: WhatsappConversation) => {
    setSelected(conversation);
    if (conversation.unreadCount > 0) markRead.mutate(conversation.id);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <MessageCircle className="h-6 w-6" />
          WhatsApp
        </h1>
        <select
          value={accountId}
          onChange={(e) => {
            setAccountId(e.target.value);
            setSelected(null);
          }}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="">Todas las cuentas</option>
          {(accounts.data ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid flex-1 grid-cols-[320px_1fr] overflow-hidden rounded-xl border border-border">
        <aside className="overflow-y-auto border-r border-border">
          <ConversationList
            conversations={conversations.data ?? []}
            selectedId={selected?.id ?? null}
            loading={conversations.isLoading}
            onSelect={onSelect}
          />
        </aside>
        <section className="overflow-hidden">
          <ChatView conversation={selected} />
        </section>
      </div>
    </div>
  );
}
