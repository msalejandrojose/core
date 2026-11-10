import { Haptics, ImpactStyle } from '@capacitor/haptics';

/**
 * Confirmación háptica ligera al guardar un registro (DS §1b: la háptica es
 * parte del lenguaje táctil del producto). No-op en web/PWA, donde el plugin
 * no tiene implementación: se traga el error en vez de romper el guardado.
 *
 * Vive en la feature y no en `lib/` a propósito: el shell base de `main` no la
 * usa todavía. Si otra feature la necesita, ese es el momento de subirla.
 */
export async function tapSuccess(): Promise<void> {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Plataforma sin háptica: no es un error que deba ver el usuario.
  }
}
