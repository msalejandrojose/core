import { randomInt } from 'crypto';

// Sin 0/O/1/I/L: nada que se confunda al leerlo en voz alta o transcribirlo
// desde un mensaje — mismo criterio que el código de invitación cerrada del
// resto de la plataforma.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LENGTH = 8;

export function generateFriendCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}
