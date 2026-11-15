import { call } from '../api';

/** Contrato de `/ai/agents/:code/*` (agentes de IA del backoffice). */

export const COACH_AGENT = 'brio-coach';

export interface CoachMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  toolsUsed: string[];
  createdAt: string;
}

export interface CoachConversation {
  id: string;
  title: string;
  updatedAt: string;
}

const base = `/ai/agents/${COACH_AGENT}`;

export const coachApi = {
  send: (message: string, conversationId?: string) =>
    call<{ conversationId: string; message: CoachMessage }>('POST', `${base}/chat`, {
      body: {
        message,
        conversationId,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    }),
  conversations: () => call<CoachConversation[]>('GET', `${base}/conversations`),
  messages: (id: string) => call<CoachMessage[]>('GET', `${base}/conversations/${id}/messages`),
  remove: (id: string) => call<void>('DELETE', `${base}/conversations/${id}`),
};

/** Qué hizo el coach con cada herramienta, para enseñarlo bajo su respuesta. */
export const TOOL_NOTES: Record<string, string> = {
  brio_log_meal: 'Ha apuntado una comida',
  brio_log_workout: 'Ha apuntado un entreno',
};
