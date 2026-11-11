/**
 * Con qué se entró por última vez (Google o correo). Solo sirve para que el
 * alta enseñe la cuenta con su etiqueta ("Google"), como en el diseño; la API
 * no lo devuelve en el usuario.
 */
export type LoginMethod = 'google' | 'email';

const KEY = 'ritmo-login-method';

export function rememberLoginMethod(method: LoginMethod): void {
  try {
    localStorage.setItem(KEY, method);
  } catch {
    // Sin almacenamiento (modo privado): la etiqueta simplemente no se muestra.
  }
}

export function lastLoginMethod(): LoginMethod | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'google' || v === 'email' ? v : null;
  } catch {
    return null;
  }
}
