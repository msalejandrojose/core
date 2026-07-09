import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { whatsappApi } from '../api/whatsapp-api';

export const whatsappKeys = {
  accounts: ['whatsapp', 'accounts'] as const,
  conversations: (accountId?: string) =>
    ['whatsapp', 'conversations', accountId ?? 'all'] as const,
  messages: (conversationId: string) =>
    ['whatsapp', 'messages', conversationId] as const,
};

export function useWhatsappAccounts() {
  return useQuery({
    queryKey: whatsappKeys.accounts,
    queryFn: () => whatsappApi.listAccounts(),
  });
}

export function useWhatsappConversations(accountId?: string) {
  return useQuery({
    queryKey: whatsappKeys.conversations(accountId),
    queryFn: () => whatsappApi.listConversations(accountId),
  });
}

export function useWhatsappMessages(conversationId: string | null) {
  return useQuery({
    queryKey: whatsappKeys.messages(conversationId ?? ''),
    enabled: Boolean(conversationId),
    queryFn: () => whatsappApi.listMessages(conversationId!),
  });
}

export function useSendWhatsappMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      whatsappApi.sendMessage(conversationId, body),
    onSuccess() {
      void qc.invalidateQueries({
        queryKey: whatsappKeys.messages(conversationId),
      });
      void qc.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
    },
    onError(error) {
      toast.error(
        error instanceof Error ? error.message : 'No se pudo enviar el mensaje',
      );
    },
  });
}

export function useMarkConversationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      whatsappApi.markRead(conversationId),
    onSuccess() {
      void qc.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
    },
  });
}
