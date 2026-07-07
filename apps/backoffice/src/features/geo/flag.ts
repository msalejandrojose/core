// Convierte un código ISO 3166-1 alpha-2 ("ES") en el emoji de su bandera
// usando los "regional indicator symbols" (U+1F1E6..U+1F1FF). No requiere
// assets externos: el propio SO renderiza la bandera. Devuelve '' si el
// código no es válido.
export function flagEmoji(iso2: string): string {
  if (!iso2 || iso2.length !== 2 || !/^[a-zA-Z]{2}$/.test(iso2)) return '';
  const codePoints = [...iso2.toUpperCase()].map(
    (c) => 0x1f1e6 + (c.charCodeAt(0) - 65),
  );
  return String.fromCodePoint(...codePoints);
}
