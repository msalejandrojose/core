import { useEffect, useRef, useState } from 'react';
import { IonContent, IonPage, IonFooter } from '@ionic/react';
import { isApiError } from '../api';
import { useBrioStore } from '../brio.store';
import { BackLink, Icon, NavRow } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { toast } from '@/lib/toast';
import { coachApi, TOOL_NOTES, type CoachConversation, type CoachMessage } from './coach.api';
import './coach.css';

const SUGGESTIONS = [
  '¿Cómo voy hoy de calorías?',
  'He desayunado un café con leche y una tostada con tomate',
  '¿Qué ceno para llegar a mi proteína?',
  'Hoy he corrido 30 minutos',
  '¿Entreno fuerte mañana o descanso?',
];

/**
 * Coach con IA (agente `brio-coach`, se configura en el backoffice): pregúntale
 * por tu día, pídele consejo o cuéntale lo que has comido o entrenado y lo
 * apunta. Muestra la última conversación y permite empezar otra.
 */
export default function CoachPage() {
  const refreshDay = useBrioStore((s) => s.refreshDay);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [history, setHistory] = useState<CoachConversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const content = useRef<HTMLIonContentElement>(null);
  const tmpId = useRef(0);

  const scrollDown = () => window.setTimeout(() => void content.current?.scrollToBottom(250), 50);

  async function open(id: string) {
    setShowHistory(false);
    setConversationId(id);
    setMessages(await coachApi.messages(id));
    scrollDown();
  }

  useEffect(() => {
    coachApi
      .conversations()
      .then(async (list) => {
        setHistory(list);
        if (list[0]) await open(list[0].id);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  async function send(message: string) {
    const clean = message.trim();
    if (!clean || sending) return;
    setText('');
    setSending(true);
    const pending: CoachMessage = {
      id: `tmp-${++tmpId.current}`,
      role: 'USER',
      content: clean,
      toolsUsed: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, pending]);
    scrollDown();
    try {
      const out = await coachApi.send(clean, conversationId);
      if (!conversationId) {
        setConversationId(out.conversationId);
        void coachApi.conversations().then(setHistory).catch(() => undefined);
      }
      setMessages((m) => [...m, out.message]);
      // Si ha apuntado algo, que Hoy lo refleje al volver.
      if (out.message.toolsUsed.some((t) => t in TOOL_NOTES)) void refreshDay();
      scrollDown();
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== pending.id));
      setText(clean);
      toast.error(
        'El coach no ha podido responder',
        isApiError(e) && e.status === 404 ? 'El coach no está activado.' : 'Prueba otra vez en un momento.',
      );
    } finally {
      setSending(false);
    }
  }

  function startNew() {
    setConversationId(undefined);
    setMessages([]);
    setShowHistory(false);
  }

  return (
    <IonPage>
      <IonContent ref={content}>
        <div className="rk-screen coach">
          <NavRow
            back={<BackLink label="Hoy" fallback="/tabs/today" />}
            actions={
              <>
                {history.length > 0 ? (
                  <button type="button" className="rk-textbtn" onClick={() => setShowHistory((v) => !v)}>
                    Conversaciones
                  </button>
                ) : null}
                <button type="button" className="rk-textbtn" onClick={startNew}>
                  Nueva
                </button>
              </>
            }
          />
          <h1 className="coach__title">Coach</h1>

          {showHistory ? (
            <ul className="rk-list coach__history">
              {history.map((c) => (
                <li key={c.id}>
                  <button type="button" className="rk-row coach__history-item" onClick={() => void open(c.id)}>
                    <span className="rk-row__main">
                      <span className="rk-row__title">{c.title}</span>
                      <span className="rk-row__sub">
                        {new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(
                          new Date(c.updatedAt),
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : loading ? null : messages.length === 0 ? (
            <div className="coach__empty">
              <div className="coach__avatar" aria-hidden="true">
                <Icon d={PATHS.chat} size={28} />
              </div>
              <p>Pregúntame por tu día, pídeme consejo o cuéntame lo que has comido o entrenado y lo apunto.</p>
              <div className="coach__chips">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="coach__chip" onClick={() => void send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="coach__messages" aria-live="polite">
              {messages.map((m) => (
                <div key={m.id} className={`coach__msg coach__msg--${m.role === 'USER' ? 'me' : 'coach'}`}>
                  <p>{m.content}</p>
                  {m.toolsUsed
                    .filter((t) => t in TOOL_NOTES)
                    .map((t) => (
                      <span key={t} className="coach__note">
                        <Icon d={PATHS.check} size={14} stroke={2.4} /> {TOOL_NOTES[t]}
                      </span>
                    ))}
                </div>
              ))}
              {sending ? (
                <div className="coach__msg coach__msg--coach coach__typing" aria-label="El coach está escribiendo">
                  <span />
                  <span />
                  <span />
                </div>
              ) : null}
            </div>
          )}
        </div>
      </IonContent>
      <IonFooter className="coach__footer">
        <form
          className="coach__input"
          onSubmit={(e) => {
            e.preventDefault();
            void send(text);
          }}
        >
          <textarea
            rows={1}
            value={text}
            maxLength={4000}
            placeholder="Escribe al coach"
            aria-label="Mensaje para el coach"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send(text);
              }
            }}
          />
          <button type="submit" className="coach__send" aria-label="Enviar" disabled={sending || !text.trim()}>
            <Icon d={PATHS.send} size={20} stroke={2.2} />
          </button>
        </form>
        <p className="coach__disclaimer">El coach usa IA y puede equivocarse. No sustituye a un médico.</p>
      </IonFooter>
    </IonPage>
  );
}
