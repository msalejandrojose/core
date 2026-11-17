/**
 * Hojas a pantalla completa que se cierran deslizando hacia abajo, como las
 * pequeñas: son «sheet modals» de Ionic con un único punto de anclaje arriba
 * (1) y el cero para cerrar. Arrastrar desde la cabecera, o desde el contenido
 * cuando ya está arriba del todo, la cierra.
 */
export const SWIPE_TO_CLOSE: { initialBreakpoint: number; breakpoints: number[]; handle: boolean } = {
  initialBreakpoint: 1,
  breakpoints: [0, 1],
  // La asa visual ya la pinta cada hoja (`.rk-grab`).
  handle: false,
};
