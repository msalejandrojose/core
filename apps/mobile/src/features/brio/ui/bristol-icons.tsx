/**
 * Dibujos de la escala de Bristol (1 bolitas … 7 líquido): formas planas en el
 * color de digestión sobre un círculo `-soft`, como los iconos de alimentos
 * (DS · Iconografía, sin contornos negros). Sirven para registrar con un toque
 * y para el calendario del histórico.
 */

import { BRISTOL_SHAPES } from './bristol-icons.data';

interface BristolIconProps {
  type: number;
  /** Diámetro del círculo en px. */
  size?: number;
  /** Sin el círculo de fondo (para el calendario). */
  bare?: boolean;
}

export function BristolIcon({ type, size = 44, bare = false }: BristolIconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      style={{ flex: 'none', display: 'block' }}
      dangerouslySetInnerHTML={{
        __html: `${bare ? '' : '<circle cx="24" cy="24" r="24" fill="#f5ebdd"/>'}${BRISTOL_SHAPES[type] ?? ''}`,
      }}
    />
  );
}
