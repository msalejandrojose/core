import { create } from 'zustand';
import { useBrioStore } from '../brio.store';
import { coachApi, TOOL_NOTES } from '../coach/coach.api';
import { tapSuccess } from '../haptics';
import { requestSpeechPermission, speechPermission, startSpeech, type SpeechSession } from './speech';

export type DockMode = 'idle' | 'listening' | 'sending';

export interface CoachReply {
  text: string;
  notes: string[];
  error?: boolean;
  /** Aviso de la propia app (permisos, agua…), no una respuesta del coach. */
  local?: boolean;
}

interface DockState {
  mode: DockMode;
  /** Lo que se va entendiendo mientras hablas. */
  heard: string;
  /** Deslizando hacia abajo: al soltar se cancela. */
  cancelArmed: boolean;
  reply: CoachReply | null;
  /** Lo dicho por voz, a la espera de que el chat del coach lo mande. */
  pending: string | null;
  takePending: () => string | null;
  close: () => void;
  startListening: () => Promise<void>;
  armCancel: (armed: boolean) => void;
  finishListening: () => Promise<void>;
  send: (text: string, images?: string[]) => Promise<void>;
  dismissReply: () => void;
}

/** Conversación que se sigue desde la barra: la última si es de las últimas 6 h. */
export const RECENT_MS = 6 * 60 * 60 * 1000;
async function currentConversation(): Promise<string | undefined> {
  const list = await coachApi.conversations().catch(() => []);
  const last = list[0];
  return last && Date.now() - new Date(last.updatedAt).getTime() < RECENT_MS ? last.id : undefined;
}

let session: SpeechSession | null = null;

/**
 * Estado del dock de la barra: el orbe central abre el campo del coach (toque)
 * o escucha (mantener). Lo que se dice o escribe va al coach (`brio-coach`), y
 * su respuesta sale en una tarjeta arriba.
 */
export const useDockStore = create<DockState>((set, get) => ({
  mode: 'idle',
  heard: '',
  cancelArmed: false,
  reply: null,
  pending: null,

  takePending: () => {
    const text = get().pending;
    if (text) set({ pending: null });
    return text;
  },

  close: () => {
    session?.cancel();
    session = null;
    set({ mode: 'idle', heard: '', cancelArmed: false });
  },

  startListening: async () => {
    // Primera vez: se piden los permisos sin abrir la burbuja (los avisos de iOS
    // se tragarían el «soltar») y se invita a volver a mantener.
    const perm = await speechPermission().catch(() => 'granted' as const);
    if (perm !== 'granted') {
      set({ mode: 'idle', heard: '', cancelArmed: false });
      const ok = perm === 'prompt' && (await requestSpeechPermission().catch(() => false));
      set({
        reply: ok
          ? { local: true, notes: [], text: 'Listo. Mantén pulsado el botón y háblame; al soltar, lo apunto.' }
          : {
              error: true,
              notes: [],
              text: 'Brío no tiene permiso para el micro. Actívalo en Ajustes › Brío, o tócame y escríbelo.',
            },
      });
      return;
    }
    set({ mode: 'listening', heard: '', cancelArmed: false, reply: null });
    void tapSuccess();
    try {
      const s = await startSpeech((heard) => set({ heard }));
      // Si se soltó mientras arrancaba, no seguimos escuchando.
      if (get().mode !== 'listening') {
        s.cancel();
        return;
      }
      session = s;
    } catch {
      session = null;
      set({
        mode: 'idle',
        heard: '',
        reply: { error: true, notes: [], text: 'Ahora no puedo usar el micro. Tócame y escríbemelo.' },
      });
    }
  },

  armCancel: (armed) => {
    if (get().cancelArmed !== armed) set({ cancelArmed: armed });
  },

  finishListening: async () => {
    if (get().mode !== 'listening') return;
    const s = session;
    session = null;
    if (get().cancelArmed || !s) {
      s?.cancel();
      set({ mode: 'idle', heard: '', cancelArmed: false });
      return;
    }
    const text = (await s.stop()) || get().heard.trim();
    // Lo dicho se lleva al chat del coach (DockOverlay navega y CoachPage lo
    // manda), para ver la conversación y seguir hablando.
    set({ mode: 'idle', heard: '', pending: text || null });
  },

  send: async (text, images = []) => {
    set({ mode: 'sending', heard: text, reply: null });
    try {
      const out = await coachApi.send(text, await currentConversation(), images);
      const notes = out.message.toolsUsed.filter((t) => t in TOOL_NOTES).map((t) => TOOL_NOTES[t]);
      if (notes.length) void useBrioStore.getState().refreshDay();
      void tapSuccess();
      set({ mode: 'idle', heard: '', reply: { text: out.message.content, notes } });
    } catch {
      set({
        mode: 'idle',
        heard: '',
        reply: { error: true, notes: [], text: 'El coach no ha podido responder. Prueba otra vez en un momento.' },
      });
    }
  },

  dismissReply: () => set({ reply: null }),
}));
