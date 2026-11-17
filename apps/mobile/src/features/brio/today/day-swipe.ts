/** Distancia mínima (px) para que un deslizamiento cambie de día. */
export const SWIPE_MIN = 50;

/**
 * Qué día pide un deslizamiento: −1 (hacia la derecha: el anterior), +1
 * (hacia la izquierda: el siguiente) o null si fue corto o más vertical que
 * horizontal (era scroll).
 */
export function swipeStep(dx: number, dy: number): -1 | 1 | null {
  if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.5) return null;
  return dx > 0 ? -1 : 1;
}
