/**
 * Validadores de formato puros y sin dependencias, reutilizados por las
 * validaciones built-in del catálogo (`iban`, `taxId`, `creditCard`,
 * `phone`, `url`, `integer`). Todos operan sobre strings ya recortados y
 * devuelven boolean; no lanzan.
 */

export function isUrl(value: string): boolean {
  const v = value.trim();
  if (v === '') return false;
  try {
    const url = new URL(v);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isInteger(value: unknown): boolean {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isInteger(n);
}

/** Teléfono internacional laxo: opcional `+`, 6–15 dígitos, separadores comunes. */
export function isPhone(value: string): boolean {
  const v = value.trim();
  if (!/^\+?[0-9\s\-().]{6,20}$/.test(v)) return false;
  const digits = v.replace(/\D/g, '');
  return digits.length >= 6 && digits.length <= 15;
}

/** Algoritmo de Luhn (tarjetas de crédito). */
export function isLuhnValid(value: string): boolean {
  const digits = value.replace(/[\s-]/g, '');
  if (!/^\d{12,19}$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** IBAN: longitud por país + checksum mod-97 (ISO 7064). */
export function isIban(value: string): boolean {
  const iban = value.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  // Mueve los 4 primeros caracteres al final y convierte letras a números
  // (A=10 … Z=35), luego comprueba mod 97 === 1.
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    const chunk = code >= 65 ? String(code - 55) : ch; // A-Z → 10-35
    for (const digit of chunk) {
      remainder = (remainder * 10 + (digit.charCodeAt(0) - 48)) % 97;
    }
  }
  return remainder === 1;
}

const NIF_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

function isNif(value: string): boolean {
  const m = /^(\d{8})([A-Z])$/.exec(value);
  if (!m) return false;
  return NIF_LETTERS[Number(m[1]) % 23] === m[2];
}

function isNie(value: string): boolean {
  const m = /^([XYZ])(\d{7})([A-Z])$/.exec(value);
  if (!m) return false;
  const prefix = { X: '0', Y: '1', Z: '2' }[m[1]] ?? '';
  return NIF_LETTERS[Number(prefix + m[2]) % 23] === m[3];
}

function isCif(value: string): boolean {
  const m = /^([ABCDEFGHJNPQRSUVW])(\d{7})([0-9A-J])$/.exec(value);
  if (!m) return false;
  const digits = m[2];
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let n = digits.charCodeAt(i) - 48;
    if (i % 2 === 0) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  const control = (10 - (sum % 10)) % 10;
  const provided = m[3];
  // El control puede expresarse como dígito o como letra (JABCDEFGHI).
  const controlLetter = 'JABCDEFGHI'[control];
  if (/[0-9]/.test(provided)) return provided === String(control);
  return provided === controlLetter;
}

/** NIF / NIE / CIF españoles. */
export function isSpanishTaxId(value: string): boolean {
  const v = value.replace(/[\s-]/g, '').toUpperCase();
  return isNif(v) || isNie(v) || isCif(v);
}

/**
 * Validación de identificador fiscal por país. Hoy solo `ES` tiene algoritmo;
 * para otros países se acepta cualquier valor no vacío (placeholder hasta
 * añadir sus reglas).
 */
export function isTaxId(value: string, country = 'ES'): boolean {
  if (country.toUpperCase() === 'ES') return isSpanishTaxId(value);
  return value.trim() !== '';
}
