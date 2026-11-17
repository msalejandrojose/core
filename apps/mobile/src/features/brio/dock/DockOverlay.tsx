import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHistory, useLocation } from 'react-router-dom';
import { useBrioStore } from '../brio.store';
import { photoToDataUrl } from '../coach/photos';
import { mealLabel } from '../format';
import { planApi, type PlanWeek } from '../plan/plan.api';
import { useRegisterStore } from '../register.store';
import { Icon } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { useDockStore } from './dock.store';
import { currentMoment, type Moment } from './moment';
import './dock.css';

/** Pantallas raíz de las pestañas: solo en ellas flota la píldora del momento. */
const ROOTS = ['/tabs/today', '/tabs/plan', '/tabs/progress', '/tabs/social'];

function useMoment(): Moment | null {
  const summary = useBrioStore((s) => s.summary);
  const today = useBrioStore((s) => s.day);
  const [week, setWeek] = useState<PlanWeek | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    planApi.week().then(setWeek).catch(() => setWeek(null));
  }, [today]);
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const plannedDay = week?.days.find((d) => d.day === week.today);
  const p = plannedDay?.planned;
  const pending = p && !p.completedAt && !p.skipped && !plannedDay?.actual ? p : null;
  const isToday = summary?.day === week?.today || !week;
  return currentMoment({
    now,
    planned: pending ? { title: pending.title, startTime: pending.startTime } : null,
    mealsLogged: isToday ? (summary?.meals ?? []).map((m) => m.mealType) : [],
    weighedToday: isToday ? summary?.totals.weightKg != null : true,
  });
}

/** ¿Hay una hoja (IonModal) abierta? Entonces la píldora no debe flotar encima. */
function useModalOpen(): boolean {
  const [open, setOpen] = useState(0);
  useEffect(() => {
    const up = () => setOpen((n) => n + 1);
    const down = () => setOpen((n) => Math.max(0, n - 1));
    document.addEventListener('ionModalWillPresent', up);
    document.addEventListener('ionModalWillDismiss', down);
    return () => {
      document.removeEventListener('ionModalWillPresent', up);
      document.removeEventListener('ionModalWillDismiss', down);
    };
  }, []);
  return open > 0;
}

function MomentPill({ moment }: { moment: Moment }) {
  const open = useRegisterStore((s) => s.open);
  const icon = moment.kind === 'workout' ? PATHS.run : moment.kind === 'weigh' ? PATHS.scale : PATHS.fork;
  const label =
    moment.kind === 'workout' ? moment.title : moment.kind === 'weigh' ? 'Pésate' : `Apunta la ${mealLabel(moment.meal).toLowerCase()}`;
  const detail = moment.kind === 'workout' ? moment.time : null;
  const run = () =>
    moment.kind === 'workout' ? open('activity') : moment.kind === 'weigh' ? open('weight') : open('meal', moment.meal);
  return (
    <button type="button" className="dock-moment brio-glass" onClick={run}>
      <span className="dock-moment__dot">
        <Icon d={icon} size={16} stroke={2.2} />
      </span>
      {label}
      {detail ? <small>{detail}</small> : null}
    </button>
  );
}

function Composer() {
  const send = useDockStore((s) => s.send);
  const close = useDockStore((s) => s.close);
  const openRegister = useRegisterStore((s) => s.open);
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => input.current?.focus(), 220);
    return () => window.clearTimeout(id);
  }, []);

  const submit = () => {
    const clean = text.trim();
    if (!clean) return close();
    setText('');
    void send(clean);
  };
  const photo = async (files: FileList | null) => {
    const f = files?.[0];
    if (file.current) file.current.value = '';
    if (!f) return;
    const url = await photoToDataUrl(f).catch(() => null);
    if (url) void send(text.trim() || 'Mira esta foto', [url]);
    setText('');
  };

  return (
    <form
      className="dock-composer brio-glass"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <button
        type="button"
        className="dock-composer__btn"
        aria-label="Registrar a mano"
        onClick={() => {
          close();
          openRegister('menu');
        }}
      >
        <Icon d={PATHS.plus} size={22} />
      </button>
      <input
        ref={input}
        value={text}
        maxLength={4000}
        enterKeyHint="send"
        placeholder="Dime qué has comido o entrenado"
        aria-label="Mensaje para el coach"
        onChange={(e) => setText(e.target.value)}
      />
      <input ref={file} type="file" accept="image/*" hidden onChange={(e) => void photo(e.target.files)} />
      <button type="button" className="dock-composer__btn" aria-label="Mandar una foto" onClick={() => file.current?.click()}>
        <Icon d={PATHS.camera} size={22} />
      </button>
      <button type="submit" className="dock-composer__send" aria-label={text.trim() ? 'Enviar' : 'Cerrar'}>
        <Icon d={text.trim() ? PATHS.arrowUp : PATHS.close} size={20} stroke={2.4} />
      </button>
    </form>
  );
}

function VoiceBubble() {
  const mode = useDockStore((s) => s.mode);
  const heard = useDockStore((s) => s.heard);
  const cancelArmed = useDockStore((s) => s.cancelArmed);
  const sending = mode === 'sending';
  return (
    <div className={`dock-voice brio-glass${cancelArmed ? ' is-cancel' : ''}`} role="status" aria-live="polite">
      <span className={`dock-voice__orb${sending ? ' is-sending' : ''}`} aria-hidden="true">
        <Icon d={PATHS.spark} size={24} stroke={2} />
      </span>
      {sending ? (
        <div className="dock-voice__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : (
        <div className="dock-voice__wave" aria-hidden="true">
          {[0.1, 0.5, 0.3, 0.7, 0.2, 0.6, 0.4].map((d) => (
            <i key={d} style={{ animationDelay: `-${d}s` }} />
          ))}
        </div>
      )}
      <p className="dock-voice__heard">{heard || 'Te escucho…'}</p>
      <p className="dock-voice__hint">
        {sending ? 'Se lo paso al coach…' : cancelArmed ? 'Suelta para cancelar' : 'Suelta para mandarlo · desliza abajo para cancelar'}
      </p>
    </div>
  );
}

function ReplyCard() {
  const reply = useDockStore((s) => s.reply);
  const dismiss = useDockStore((s) => s.dismissReply);
  const history = useHistory();

  useEffect(() => {
    if (!reply || reply.error) return;
    const id = window.setTimeout(dismiss, 7000);
    return () => window.clearTimeout(id);
  }, [reply, dismiss]);

  if (!reply) return null;
  return (
    <div className={`dock-reply brio-glass${reply.error ? ' is-error' : ''}`} role="status">
      <button type="button" className="dock-reply__body" onClick={dismiss}>
        {reply.notes.length ? (
          <span className="dock-reply__notes">
            <Icon d={PATHS.check} size={14} stroke={2.6} /> {reply.notes.join(' · ')}
          </span>
        ) : null}
        <span className="dock-reply__text">{reply.text}</span>
      </button>
      {reply.error ? null : (
        <button
          type="button"
          className="dock-reply__open"
          onClick={() => {
            dismiss();
            history.push('/tabs/today/coach');
          }}
        >
          Abrir chat
        </button>
      )}
    </div>
  );
}

/**
 * Lo que flota sobre la barra de pestañas: la píldora del momento, el campo
 * del coach (toque en el orbe), la burbuja de voz (mantener) y la respuesta.
 */
export function DockOverlay({ hidden }: { hidden: boolean }) {
  const mode = useDockStore((s) => s.mode);
  const close = useDockStore((s) => s.close);
  const { pathname } = useLocation();
  const moment = useMoment();
  const modalOpen = useModalOpen();
  const showMoment = !hidden && !modalOpen && mode === 'idle' && ROOTS.includes(pathname) && moment;

  // Cambiar de pantalla cierra el campo del coach.
  useEffect(() => {
    if (useDockStore.getState().mode === 'typing') close();
  }, [pathname, close]);

  // En `body`: dentro del router de Ionic quedaría por debajo de las páginas.
  return createPortal(
    <div className={`dock dock--${mode}`}>
      {mode === 'listening' || mode === 'sending' ? <div className="dock-scrim" /> : null}
      {mode === 'typing' ? <div className="dock-scrim dock-scrim--clear" onClick={close} /> : null}
      {showMoment ? <MomentPill moment={moment} /> : null}
      {mode === 'typing' && !hidden ? <Composer /> : null}
      {mode === 'listening' || mode === 'sending' ? <VoiceBubble /> : null}
      <ReplyCard />
    </div>,
    document.body,
  );
}
