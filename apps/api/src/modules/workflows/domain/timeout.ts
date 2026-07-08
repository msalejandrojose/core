// Tope por defecto de duración de un handler externo (segundos). Evita que un
// proveedor colgado (una llamada HTTP que nunca responde, p.ej.) deje el run
// bloqueado indefinidamente. Un step puede sobreescribirlo con `timeoutSeconds`
// en el DSL.
export const DEFAULT_STEP_TIMEOUT_SECONDS = 60;

// Error de timeout de un step. El motor lo trata como un fallo normal del
// intento: entra en la ruta de retry/backoff (si el step declara `retry`) o
// marca el run FAILED, igual que cualquier otra excepción del handler.
export class StepTimeoutError extends Error {
  constructor(public readonly timeoutSeconds: number) {
    super(`El step excedió su timeout de ${timeoutSeconds}s.`);
    this.name = 'StepTimeoutError';
  }
}

// Corre `work` con un límite de tiempo. Si vence antes de que `work` resuelva o
// rechace, la promesa devuelta rechaza con `StepTimeoutError`. El timer se limpia
// siempre (resuelva o falle `work`).
//
// Nota: JS no puede cancelar la promesa subyacente; `work` puede seguir corriendo
// en segundo plano tras el timeout. Lo que se garantiza es que el motor deja de
// esperarla y puede avanzar (reintentar o fallar), que es el objetivo.
export async function withTimeout<T>(
  work: Promise<T>,
  timeoutSeconds: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const guard = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new StepTimeoutError(timeoutSeconds)),
      timeoutSeconds * 1000,
    );
  });
  try {
    return await Promise.race([work, guard]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
