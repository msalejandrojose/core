import { Icon } from './kit';
import { activityLook, type ActivityRef } from './activity-look';

/**
 * Icono de una actividad en un círculo de su color. `tone="soft"` lo pinta
 * en el color sobre fondo claro (filas de lista); por defecto, blanco sobre
 * el color (tarjetas).
 */
export function ActivityIcon({
  size = 30,
  tone = 'solid',
  ...ref
}: ActivityRef & { size?: number; tone?: 'solid' | 'soft' }) {
  const { path, color } = activityLook(ref);
  const solid = tone === 'solid';
  return (
    <span
      className="brio-activity-icon"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        background: solid ? color : `color-mix(in srgb, ${color} 14%, transparent)`,
        color: solid ? '#fff' : color,
      }}
    >
      <Icon d={path} size={Math.round(size * 0.6)} stroke={2.2} />
    </span>
  );
}
