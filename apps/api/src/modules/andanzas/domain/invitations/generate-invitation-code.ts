// Alfabeto sin caracteres ambiguos al leer/escribir a mano (sin 0/O, 1/I/L).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

// Genera un código de invitación aleatorio, compartible de palabra o por
// enlace. `random` es inyectable (por defecto Math.random) para que el test
// pueda darle una fuente determinista sin mockear globals.
export function generateInvitationCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return code;
}
