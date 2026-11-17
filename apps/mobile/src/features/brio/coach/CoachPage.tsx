import { useEffect, useRef, useState } from 'react';
import { IonContent, IonPage, IonFooter } from '@ionic/react';
import { isApiError } from '../api';
import { useBrioStore } from '../brio.store';
import { BackLink, Icon, NavRow } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { toast } from '@/lib/toast';
import { coachApi, TOOL_NOTES, type CoachConversation, type CoachMessage } from './coach.api';
import { MAX_PHOTOS, photoToDataUrl } from './photos';
import { RECENT_MS, useDockStore } from '../dock/dock.store';
import './coach.css';

const SUGGESTIONS = [
  '¿Cómo voy hoy de calorías?',
  'He desayunado un café con leche y una tostada con tomate',
  '¿Qué ceno para llegar a mi proteína?',
  'Hoy he corrido 30 minutos',
  'Hoy peso 78,4 kg',
  'Guárdame la receta de mis lentejas: 300 g de lentejas, 80 g de chorizo y 2 patatas, para 4',
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
  const [photos, setPhotos] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
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

  // Lo dicho por voz desde la barra llega aquí: sigue la conversación reciente
  // (o empieza otra) y lo manda, para ver la respuesta y seguir hablando.
  const pending = useDockStore((s) => s.pending);
  useEffect(() => {
    if (!pending || loading) return;
    const said = useDockStore.getState().takePending();
    if (!said) return;
    void (async () => {
      const list = await coachApi.conversations().catch(() => [] as CoachConversation[]);
      setHistory(list);
      const last = list[0];
      if (last && Date.now() - new Date(last.updatedAt).getTime() < RECENT_MS) {
        await open(last.id);
        await send(said, last.id);
      } else {
        startNew();
        await send(said, null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al llegar algo nuevo
  }, [pending, loading]);

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

  async function addPhotos(files: FileList | null) {
    const list = Array.from(files ?? []).slice(0, MAX_PHOTOS - photos.length);
    if (fileInput.current) fileInput.current.value = '';
    try {
      const urls = await Promise.all(list.map((f) => photoToDataUrl(f)));
      setPhotos((p) => [...p, ...urls].slice(0, MAX_PHOTOS));
    } catch {
      toast.error('No se ha podido leer la foto', 'Prueba con otra.');
    }
  }

  /** `conv`: la conversación en la que mandarlo (null = nueva); por defecto, la abierta. */
  async function send(message: string, conv: string | null = conversationId ?? null) {
    const images = photos;
    const clean = message.trim() || (images.length ? 'Mira esta foto' : '');
    if (!clean || sending) return;
    setText('');
    setPhotos([]);
    setSending(true);
    const pending: CoachMessage = {
      id: `tmp-${++tmpId.current}`,
      role: 'USER',
      content: clean,
      toolsUsed: [],
      imageCount: images.length,
      localImages: images,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, pending]);
    scrollDown();
    try {
      const out = await coachApi.send(clean, conv ?? undefined, images);
      if (!conv) {
        setConversationId(out.conversationId);
        void coachApi.conversations().then(setHistory).catch(() => undefined);
      }
      setMessages((m) => [...m, out.message]);
      // Si ha apuntado algo, que Hoy lo refleje al volver.
      if (out.message.toolsUsed.some((t) => t in TOOL_NOTES)) void refreshDay();
      scrollDown();
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== pending.id));
      setText(message);
      setPhotos(images);
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
                  {m.localImages?.length ? (
                    <div className="coach__photos">
                      {m.localImages.map((src, i) => (
                        <img key={i} src={src} alt="" />
                      ))}
                    </div>
                  ) : m.imageCount ? (
                    <span className="coach__photo-tag">
                      <Icon d={PATHS.camera} size={14} /> {m.imageCount === 1 ? '1 foto' : `${m.imageCount} fotos`}
                    </span>
                  ) : null}
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
        {photos.length ? (
          <div className="coach__attachments">
            {photos.map((src, i) => (
              <div key={i} className="coach__attachment">
                <img src={src} alt={`Foto ${i + 1}`} />
                <button
                  type="button"
                  aria-label={`Quitar la foto ${i + 1}`}
                  onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <form
          className="coach__input"
          onSubmit={(e) => {
            e.preventDefault();
            void send(text);
          }}
        >
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => void addPhotos(e.target.files)}
          />
          <button
            type="button"
            className="coach__attach"
            aria-label="Adjuntar foto"
            disabled={sending || photos.length >= MAX_PHOTOS}
            onClick={() => fileInput.current?.click()}
          >
            <Icon d={PATHS.camera} size={22} />
          </button>
          <textarea
            rows={1}
            value={text}
            maxLength={4000}
            placeholder={photos.length ? 'Cuéntale qué es (opcional)' : 'Escribe o manda una foto'}
            aria-label="Mensaje para el coach"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send(text);
              }
            }}
          />
          <button type="submit" className="coach__send" aria-label="Enviar" disabled={sending || (!text.trim() && !photos.length)}>
            <Icon d={PATHS.send} size={20} stroke={2.2} />
          </button>
        </form>
        <p className="coach__disclaimer">El coach usa IA y puede equivocarse. No sustituye a un médico.</p>
      </IonFooter>
    </IonPage>
  );
}
