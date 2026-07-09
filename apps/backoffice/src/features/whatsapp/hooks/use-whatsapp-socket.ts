import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { getAuthToken } from '@/store/auth.store';
import type {
  WhatsappMessageEvent,
  WhatsappStatusEvent,
} from '../api/types';

const BASE_URL = import.meta.env.VITE_API_URL as string;

// Suscribe el componente al gateway de tiempo real (namespace /whatsapp) durante
// su vida. Ante cada evento invalida las queries afectadas, de modo que React
// Query refetchea y la UI refleja el nuevo mensaje / estado al instante. Es la
// estrategia más simple y robusta (evita cirugía manual de caché) y suficiente
// para el volumen de una bandeja de soporte.
export function useWhatsappRealtime(): void {
  const qc = useQueryClient();

  useEffect(() => {
    const socket = io(`${BASE_URL}/whatsapp`, {
      auth: { token: getAuthToken() },
      transports: ['websocket'],
    });

    const refresh = (conversationId: string) => {
      void qc.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
      void qc.invalidateQueries({
        queryKey: ['whatsapp', 'messages', conversationId],
      });
    };

    socket.on('whatsapp:message', (event: WhatsappMessageEvent) => {
      refresh(event.conversation.id);
    });
    socket.on('whatsapp:status', (event: WhatsappStatusEvent) => {
      refresh(event.conversationId);
    });

    return () => {
      socket.disconnect();
    };
  }, [qc]);
}
