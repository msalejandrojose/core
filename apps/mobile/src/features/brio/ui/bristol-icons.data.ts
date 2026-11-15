/** Datos de los dibujos de Bristol (ver bristol-icons.tsx). */

const D = '#8b5a2b'; // --brio-earth
const M = '#a8713c';
const L = '#c48d55';

/** Formas de cada tipo, en una caja de 48×48. */
export const BRISTOL_SHAPES: Record<number, string> = {
  1: `<circle cx="14" cy="20" r="5" fill="${D}"/><circle cx="27" cy="16" r="4.5" fill="${M}"/><circle cx="34" cy="28" r="5" fill="${D}"/><circle cx="20" cy="32" r="4.5" fill="${M}"/>`,
  2: `<g fill="${D}"><circle cx="12" cy="28" r="6"/><circle cx="20" cy="23" r="6.5"/><circle cx="29" cy="22" r="6.5"/><circle cx="37" cy="26" r="6"/></g><g fill="${M}"><circle cx="16" cy="29" r="4"/><circle cx="25" cy="26" r="4"/><circle cx="33" cy="27" r="4"/></g>`,
  3: `<path d="M8 27c0-4 4-7 9-7h14c5 0 9 3 9 7s-4 7-9 7H17c-5 0-9-3-9-7z" fill="${D}"/><path d="M15 22l2 4M22 21l1 4M29 21l-1 4M35 23l-2 3M18 33l1-3M27 34l1-3" stroke="${L}" stroke-width="1.8" stroke-linecap="round"/>`,
  4: `<path d="M24 9c1 3 4 3 4 6 0 1-.4 2-1 2.6 4 .6 7 3 7 6.4 0 .8-.2 1.6-.6 2.2C37 27 40 29.6 40 33c0 4-4 6-16 6S8 37 8 33c0-3.4 3-6 6.6-6.8-.4-.6-.6-1.4-.6-2.2 0-3.4 3-5.8 7-6.4C19 15 23 13 24 9z" fill="${D}"/><path d="M14 33h20M17 26h14" stroke="${M}" stroke-width="2" stroke-linecap="round"/>`,
  5: `<ellipse cx="15" cy="29" rx="7" ry="5" fill="${D}"/><ellipse cx="30" cy="31" rx="8" ry="5.5" fill="${M}"/><ellipse cx="25" cy="20" rx="6.5" ry="4.5" fill="${D}"/>`,
  6: `<path d="M8 32c0-4 3-6 6-6 0-4 4-7 8-6 2-3 8-3 10 1 4 0 7 3 6 7 2 1 3 2 3 4 0 3-4 5-16 5S8 36 8 32z" fill="${M}"/><circle cx="17" cy="30" r="2" fill="${L}"/><circle cx="27" cy="27" r="2.4" fill="${L}"/><circle cx="33" cy="32" r="1.8" fill="${L}"/>`,
  7: `<path d="M7 33c0-3 6-5 17-5s17 2 17 5-6 5-17 5S7 36 7 33z" fill="${M}"/><path d="M18 13c2 4 4 6 4 9a4 4 0 0 1-8 0c0-3 2-5 4-9zM31 17c1.4 2.8 3 4.2 3 6.4a3 3 0 0 1-6 0c0-2.2 1.6-3.6 3-6.4z" fill="${D}"/>`,
};

export const BRISTOL_LABELS: Record<number, string> = {
  1: 'Bolitas',
  2: 'Grumoso',
  3: 'Agrietado',
  4: 'Liso',
  5: 'Trozos',
  6: 'Pastoso',
  7: 'Líquido',
};

/** 1-2 duro, 3-5 normal, 6-7 blando. */
export const bristolCategory = (n: number) => (n <= 2 ? 'Duro' : n <= 5 ? 'Normal' : 'Blando');
