import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  useIslandStore,
  type IslandToast,
  type LiveIsland,
  type ToastIcon,
  type ToastKind,
  type ToastTone,
} from '@/lib/toast';
import './island-toaster.css';

/** Forma de arriba del móvil, deducida del safe-area: isla, notch o nada. */
type Cutout = 'island' | 'notch' | 'none';

function detectCutout(): Cutout {
  if (typeof document === 'undefined') return 'none';
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;visibility:hidden;padding-top:env(safe-area-inset-top,0px)';
  document.body.appendChild(probe);
  const top = parseFloat(getComputedStyle(probe).paddingTop) || 0;
  probe.remove();
  // iPhone con Dynamic Island: 54–62 pt; con notch: 44–50 pt.
  if (top >= 51) return 'island';
  if (top >= 40) return 'notch';
  return 'none';
}

const ISLAND_ICONS: Record<ToastIcon, string> = {
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M7 7l10 10M17 7L7 17',
  warning: 'M12 6v8M12 18h.01',
  info: 'M12 11v6M12 7h.01',
  food: 'M7 4v7a2 2 0 0 0 4 0V4M9 11v9M16 4c-1.7 1.2-2.5 3.2-2.5 6h2.5v10',
  scale: 'M5 20h14l-2-12H7zM9 8a3 3 0 0 1 6 0M12 12l1.5 3',
  link: 'M10 14l4-4M8 12l-2 2a3 3 0 0 0 4 4l2-2M16 12l2-2a3 3 0 0 0-4-4l-2 2',
  medal: 'M8 3l4 7 4-7M12 21a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
  week: 'M5 7h14v12H5zM5 11h14M9 4v4M15 4v4M9 15l2 2 4-4',
  spark: 'M12 4l1.8 4.7L18.5 10.5 13.8 12.3 12 17l-1.8-4.7L5.5 10.5 10.2 8.7z',
  sync: 'M5 12a7 7 0 0 1 12-4.9M19 5v4h-4M19 12a7 7 0 0 1-12 4.9M5 19v-4h4',
  dumbbell: 'M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12',
  book: 'M6 4h9a3 3 0 0 1 3 3v13H9a3 3 0 0 1-3-3zM6 17a3 3 0 0 1 3-3h9',
  leaf: 'M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19l7-7',
};

const KIND_ICON: Record<Exclude<ToastKind, 'loading'>, ToastIcon> = {
  success: 'check',
  error: 'x',
  warning: 'warning',
  info: 'info',
};

const LABEL: Record<ToastKind, string> = {
  success: 'Hecho',
  error: 'Error',
  warning: 'Aviso',
  info: 'Información',
  loading: 'En curso',
};

/** Fondo del círculo y color del trazo (sobre el negro de la isla, variantes oscuras de iOS). */
const KIND_COLOR: Record<Exclude<ToastKind, 'loading'>, [string, string]> = {
  success: ['#30d158', '#fff'],
  error: ['#ff453a', '#fff'],
  warning: ['#ff9f0a', '#000'],
  info: ['#0a84ff', '#fff'],
};
const TONE_COLOR: Record<ToastTone, [string, string]> = {
  food: ['#ff9f0a', '#000'],
  activity: ['#30d158', '#000'],
  weight: ['#5e5ce6', '#fff'],
  digestion: ['#ac8e68', '#000'],
  gold: ['#ffd60a', '#000'],
  bronze: ['#c8875a', '#000'],
  coach: ['#0a84ff', '#fff'],
  social: ['#5e5ce6', '#fff'],
};

/** Anillo de «Deshacer», por fuera del icono de 30 px (radio 17; ver `island-ring` en el CSS). */
const RING = 2 * Math.PI * 17;
/** «1.140»: con 4 cifras, `toLocaleString('es-ES')` no pone el punto de millar. */
const thousands = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

function ToastIconSlot({ item, paused }: { item: IslandToast; paused: boolean }) {
  if (item.kind === 'loading') {
    return (
      <span className="island__icon island__icon--loading" aria-label={LABEL.loading}>
        <span className="island__spin" aria-hidden="true" />
      </span>
    );
  }
  const [bg, ink] = item.tone ? TONE_COLOR[item.tone] : KIND_COLOR[item.kind];
  return (
    <span className="island__icon-wrap">
      {item.avatar ? (
        <span className="island__icon island__avatar" style={{ background: TONE_COLOR[item.tone ?? 'social'][0] }} aria-label={LABEL[item.kind]}>
          {item.avatar}
        </span>
      ) : (
        <span className="island__icon" style={{ background: bg, color: ink }} aria-label={LABEL[item.kind]}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d={ISLAND_ICONS[item.icon ?? KIND_ICON[item.kind]]}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
      {item.countdown && item.duration > 0 ? (
        <svg className="island__ring" width="38" height="38" viewBox="0 0 38 38" aria-hidden="true">
          <circle
            key={`${item.id}:${item.version}`}
            className={`island__ring-arc${paused ? ' is-paused' : ''}`}
            cx="19"
            cy="19"
            r="17"
            strokeDasharray={RING}
            style={{ animationDuration: `${item.duration}ms` } as CSSProperties}
          />
        </svg>
      ) : null}
    </span>
  );
}

function LiveCompact({ live, now }: { live: LiveIsland; now: number }) {
  if (live.kind === 'rest') {
    const left = live.until - now;
    const late = left <= 10_000;
    const frac = Math.max(0, Math.min(1, left / (live.total * 1000)));
    const c = 2 * Math.PI * 9;
    return (
      <>
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className={late ? 'is-late' : ''}>
          <circle cx="12" cy="12" r="9" className="island__live-track" />
          <circle cx="12" cy="12" r="9" className="island__live-arc" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform="rotate(-90 12 12)" />
        </svg>
        <span className={`island__live-time${late ? ' is-late' : ''}`}>{clock(left)}</span>
      </>
    );
  }
  return (
    <>
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path d={ISLAND_ICONS.dumbbell} fill="none" stroke="#30d158" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span className="island__live-time is-plain">{clock(now - live.startedAt)}</span>
    </>
  );
}

function LiveExpanded({ live, now }: { live: LiveIsland; now: number }) {
  if (live.kind === 'rest') {
    const left = live.until - now;
    const late = left <= 10_000;
    const frac = Math.max(0, Math.min(1, left / (live.total * 1000)));
    const c = 2 * Math.PI * 22;
    return (
      <div className="island__live">
        <div className="island__row">
          <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true" className={`island__live-ring${late ? ' is-late' : ''}`}>
            <circle cx="26" cy="26" r="22" className="island__live-track" />
            <circle cx="26" cy="26" r="22" className="island__live-arc" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform="rotate(-90 26 26)" />
          </svg>
          <span className="island__text">
            <span className="island__desc">{live.next ? `Descanso · luego ${live.next}` : 'Descanso'}</span>
            <span className={`island__big${late ? ' is-late' : ''}`}>{clock(left)}</span>
          </span>
        </div>
        <div className="island__buttons">
          <button
            type="button"
            className="island__btn"
            onClick={(e) => {
              e.stopPropagation();
              live.onAdd();
            }}
          >
            +15 s
          </button>
          <button
            type="button"
            className="island__btn island__btn--go"
            onClick={(e) => {
              e.stopPropagation();
              live.onSkip();
            }}
          >
            Saltar
          </button>
        </div>
      </div>
    );
  }
  const frac = live.total ? live.done / live.total : 0;
  return (
    <div className="island__live">
      <div className="island__row">
        <span className="island__icon" style={{ background: '#30d158', color: '#000' }} aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d={ISLAND_ICONS.dumbbell} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </span>
        <span className="island__text">
          <span className="island__title">{live.name}</span>
          <span className="island__desc">
            {live.done} de {live.total} series{live.volumeKg ? ` · ${thousands(live.volumeKg)} kg` : ''}
          </span>
        </span>
        <span className="island__elapsed">{clock(now - live.startedAt)}</span>
      </div>
      <div className="island__bar island__bar--live" aria-hidden="true">
        <span style={{ width: `${Math.round(frac * 100)}%` }} />
      </div>
      <button
        type="button"
        className="island__btn island__btn--wide"
        onClick={(e) => {
          e.stopPropagation();
          live.onOpen();
        }}
      >
        Volver al entreno
      </button>
    </div>
  );
}

/**
 * Avisos de arriba que salen de la Dynamic Island (o del notch): una píldora
 * negra que crece desde la forma del móvil, enseña el mensaje y vuelve a
 * encogerse. Se cierra sola, al tocarla o deslizándola hacia arriba; mantenerla
 * pulsada congela el tiempo. Sin aviso, enseña en pequeño el descanso o el
 * entreno en curso (`live`); al tocarlo se abre.
 */
export function IslandToaster() {
  const current = useIslandStore((s) => s.current);
  const queued = useIslandStore((s) => s.queue.length);
  const live = useIslandStore((s) => s.live);
  const dismiss = useIslandStore((s) => s.dismiss);
  const [cutout] = useState(detectCutout);
  const [item, setItem] = useState<IslandToast | null>(null);
  const [open, setOpen] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const startY = useRef<number | null>(null);
  const timer = useRef<{ id: number; endsAt: number; left: number } | null>(null);

  // Entra el nuevo (o cambia el texto si ya estaba abierta); al quitarse, se encoge.
  useEffect(() => {
    if (current) {
      setItem(current);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)));
      return () => cancelAnimationFrame(raf);
    }
    setOpen(false);
    const t = window.setTimeout(() => setItem(null), 420);
    return () => window.clearTimeout(t);
  }, [current]);

  // Se cierra sola a su tiempo (0 = hasta que se quite). Cada `update` reinicia la cuenta.
  useEffect(() => {
    setPaused(false);
    if (!current || current.duration <= 0) return;
    const id = window.setTimeout(() => dismiss(current.id), current.duration);
    timer.current = { id, endsAt: Date.now() + current.duration, left: current.duration };
    return () => {
      window.clearTimeout(id);
      timer.current = null;
    };
  }, [current?.id, current?.version, current?.duration, dismiss]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reloj del descanso / entreno, solo mientras se enseña.
  useEffect(() => {
    if (!live) {
      setLiveOpen(false);
      return;
    }
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [live]);

  // De descanso a entreno (al saltarlo o acabar) vuelve a lo pequeño.
  const liveKind = live?.kind;
  useEffect(() => setLiveOpen(false), [liveKind]);

  function pause() {
    const t = timer.current;
    if (!t || paused) return;
    window.clearTimeout(t.id);
    t.left = Math.max(0, t.endsAt - Date.now());
    setPaused(true);
  }
  function resume() {
    const t = timer.current;
    if (!t || !paused || !current) return;
    const id = current.id;
    t.id = window.setTimeout(() => dismiss(id), t.left);
    t.endsAt = Date.now() + t.left;
    setPaused(false);
  }

  const showingToast = !!item;
  const shape = showingToast ? (open ? 'is-open' : '') : live ? (liveOpen ? 'is-open' : 'is-compact') : '';
  if (!item && !live) return null;

  const tap = () => {
    if (current) dismiss(current.id);
    else if (live) setLiveOpen((o) => !o);
  };

  const error = item?.kind === 'error';
  return (
    <div
      className={`island island--${cutout} ${shape}${item?.glow && open ? ' has-glow' : ''}`}
      role={error ? 'alert' : 'status'}
      aria-live={error ? 'assertive' : 'polite'}
      onClick={tap}
      onPointerDown={pause}
      onPointerUp={resume}
      onPointerCancel={resume}
      onPointerLeave={resume}
      onTouchStart={(e) => {
        startY.current = e.touches[0].clientY;
      }}
      onTouchEnd={(e) => {
        const s = startY.current;
        startY.current = null;
        if (s === null || s - e.changedTouches[0].clientY <= 20) return;
        if (current) dismiss(current.id);
        else setLiveOpen(false);
      }}
    >
      {item ? (
        <div className="island__body" key={item.id}>
          <div className="island__row">
            <ToastIconSlot item={item} paused={paused} />
            <span className="island__text">
              <span className="island__title">{item.title}</span>
              {item.description ? <span className="island__desc">{item.description}</span> : null}
            </span>
            {item.action ? (
              <button
                type="button"
                className="island__action"
                onClick={(e) => {
                  e.stopPropagation();
                  const { run } = item.action!;
                  dismiss(item.id);
                  void run();
                }}
              >
                {item.action.label}
              </button>
            ) : queued > 0 ? (
              <span className="island__more" aria-label={`${queued} aviso${queued === 1 ? '' : 's'} más`}>
                +{queued}
              </span>
            ) : null}
          </div>
          {item.progress !== undefined ? (
            <div className="island__bar" aria-hidden="true">
              <span style={{ width: `${Math.round(item.progress * 100)}%` }} />
            </div>
          ) : null}
        </div>
      ) : live ? (
        <>
          <div
            className="island__compact"
            aria-label={
              live.kind === 'rest'
                ? `Descanso, quedan ${clock(live.until - now)}. Toca para abrirlo.`
                : `Entreno en curso, ${clock(now - live.startedAt)}. Toca para abrirlo.`
            }
          >
            <LiveCompact live={live} now={now} />
          </div>
          <div className="island__body">
            <LiveExpanded live={live} now={now} />
          </div>
        </>
      ) : null}
    </div>
  );
}
