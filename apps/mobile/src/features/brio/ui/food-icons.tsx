/**
 * Ilustraciones de alimentos del diseño de Brío: formas planas sencillas en
 * un círculo `-soft` de su color, sin contornos negros ni degradados (DS ·
 * Iconografía). Los trazados se copian tal cual del lienzo de diseño.
 *
 * El catálogo no guarda qué dibujo lleva cada alimento, así que se elige por
 * palabras del nombre (`iconForFood`). Lo que no encaja usa un plato neutro.
 */

import { FOOD_ICONS, iconForFood, type FoodIconKey } from './food-icons.data';

interface FoodIconProps {
  /** Nombre del alimento (se elige el dibujo por palabras) o clave directa. */
  name?: string;
  icon?: FoodIconKey;
  /** Diámetro del círculo en px. El dibujo ocupa ~70 %. */
  size?: number;
  /** `circle` (por defecto) o `square` (recetas: cuadrado redondeado). */
  shape?: 'circle' | 'square';
  className?: string;
  style?: React.CSSProperties;
}

export function FoodIcon({ name = '', icon, size = 40, shape = 'circle', className, style }: FoodIconProps) {
  const key = icon ?? iconForFood(name);
  const ill = FOOD_ICONS[key];
  const inner = Math.round(size * 0.7);
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: shape === 'circle' ? '50%' : 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: ill.bg,
        ...style,
      }}
    >
      <svg width={inner} height={inner} viewBox="0 0 40 40">
        {ill.paths.map(([d, fill, stroke], i) => (
          <path
            key={i}
            d={d}
            fill={fill}
            stroke={stroke}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </span>
  );
}
