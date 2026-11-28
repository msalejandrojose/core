import { call } from '../api';

/** Contrato de `/ai/agents/:code/*` (agentes de IA del backoffice). */

export const COACH_AGENT = 'brio-coach';

export interface CoachMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  toolsUsed: string[];
  /** Fotos que se adjuntaron (no se guardan en el servidor). */
  imageCount: number;
  createdAt: string;
  /** Solo en el móvil: las fotos recién mandadas, para verlas en la burbuja. */
  localImages?: string[];
}

export interface CoachConversation {
  id: string;
  title: string;
  updatedAt: string;
}

const base = `/ai/agents/${COACH_AGENT}`;

export const coachApi = {
  send: (message: string, conversationId?: string, images: string[] = []) =>
    call<{ conversationId: string; message: CoachMessage }>('POST', `${base}/chat`, {
      body: {
        message,
        ...(images.length ? { images } : {}),
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
  brio_log_weight: 'Ha apuntado tu peso',
  brio_delete_meal: 'Ha borrado una comida',
  brio_create_recipe: 'Ha guardado una receta',
  brio_plan_meal: 'Ha puesto algo en tu menú',
  brio_remove_planned_meal: 'Ha quitado algo de tu menú',
  brio_log_planned_meal: 'Ha apuntado una comida del menú',
};
