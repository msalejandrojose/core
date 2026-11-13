import type { CSSProperties } from 'react';

/** Avatar de inicial sobre el color de la persona. */
export function Avatar({ name, color, size }: { name: string; color: string; size: number }) {
  const style: CSSProperties = { width: size, height: size, background: color, fontSize: Math.round(size * 0.42) };
  return (
    <span className="social__avatar" style={style} aria-hidden="true">
      {name[0]}
    </span>
  );
}

export function Heart({ on, size = 18 }: { on: boolean; size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24">
      <path
        d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"
        fill={on ? 'var(--brio-heart)' : 'none'}
        stroke={on ? 'var(--brio-heart)' : 'currentColor'}
        strokeWidth="2"
      />
    </svg>
  );
}
