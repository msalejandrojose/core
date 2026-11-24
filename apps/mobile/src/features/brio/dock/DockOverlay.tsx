import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHistory, useLocation } from 'react-router-dom';
import { useBrioStore } from '../brio.store';
import { mealLabel } from '../format';
import { planApi, type PlanWeek } from '../plan/plan.api';
import { useRegisterStore } from '../register.store';
import { Icon } from '../ui/kit';
import { PATHS } from '../ui/paths';
import { useDockStore } from './dock.store';
import { currentMoment, type Moment } from './moment';
import { useKeyboardLayout } from './keyboard';
import './dock.css';

/** Pantallas raíz de las pestañas: solo en ellas flota la píldora del momento. */
const ROOTS = ['/tabs/today', '/tabs/entrenos', '/tabs/comida', '/tabs/social'];

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

const HINT_KEY = 'brio-orb-hint';
const readHint = () => {
  try {
    return Number(localStorage.getItem(HINT_KEY) ?? '0');
  } catch {
    return 99;
  }
};
const writeHint = (n: number) => {
  try {
    localStorage.setItem(HINT_KEY, String(n));
  } catch {
    // Sin almacenamiento: la pista simplemente vuelve a salir.
  }
};

/**
 * Pista «mantén o desliza para hablar» sobre el orbe: sale en las tres primeras
 * aperturas, unos segundos, y deja de salir en cuanto se usa la voz.
 */
function useOrbHint(mode: string): boolean {
  const [show, setShow] = useState(() => readHint() < 3);
  useEffect(() => {
    if (!show) return;
    writeHint(readHint() + 1);
    const id = window.setTimeout(() => setShow(false), 7000);
    return () => window.clearTimeout(id);
  }, [show]);
  useEffect(() => {
    if (mode === 'listening') {
      writeHint(99);
      setShow(false);
    }
  }, [mode]);
  return show;
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
    moment.kind === 'workout' ? moment.title : moment.kind === 'weigh' ? 'Pésate' : `Apunta ${moment.meal === 'BREAKFAST' ? 'el' : 'la'} ${mealLabel(moment.meal).toLowerCase()}`;
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
    if (!reply) return;
    const id = window.setTimeout(dismiss, reply.local ? 3500 : 7000);
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
      {reply.error || reply.local ? null : (
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
 * Lo que flota sobre la barra de pestañas: la píldora del momento, la burbuja
 * de voz (mantener el +) y la respuesta del coach.
 */
export function DockOverlay({ hidden }: { hidden: boolean }) {
  const mode = useDockStore((s) => s.mode);
  const close = useDockStore((s) => s.close);
  const { pathname } = useLocation();
  useKeyboardLayout();
  const moment = useMoment();
  const modalOpen = useModalOpen();
  const history = useHistory();
  const pending = useDockStore((s) => s.pending);
  const hint = useOrbHint(mode);
  const calm = !hidden && !modalOpen && mode === 'idle' && ROOTS.includes(pathname);
  const showHint = calm && hint;
  const showMoment = calm && !hint && moment;

  // Lo dicho por voz se lleva al chat del coach, que lo manda y enseña la respuesta.
  useEffect(() => {
    if (pending && pathname !== '/tabs/today/coach') history.push('/tabs/today/coach');
  }, [pending, pathname, history]);

  // Si la app se va a segundo plano mientras escucha, se cancela.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && useDockStore.getState().mode === 'listening') close();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [close]);

  // En `body`: dentro del router de Ionic quedaría por debajo de las páginas.
  return createPortal(
    <div className={`dock dock--${mode}`}>
      {mode === 'listening' || mode === 'sending' ? (
        <div className="dock-scrim" onClick={() => (mode === 'listening' ? close() : undefined)} />
      ) : null}
      {showHint ? (
        <div className="dock-hint brio-glass" role="note">
          <Icon d={PATHS.mic} size={16} stroke={2.2} />
          Mantén o desliza ↑ para hablarme
        </div>
      ) : null}
      {showMoment ? <MomentPill moment={moment} /> : null}
      {mode === 'listening' || mode === 'sending' ? <VoiceBubble /> : null}
      <ReplyCard />
    </div>,
    document.body,
  );
}
