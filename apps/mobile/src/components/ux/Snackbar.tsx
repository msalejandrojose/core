import { useEffect } from 'react';
import { SNACKBAR_MS, useSnackbarStore } from '@/lib/snackbar';

/**
 * Pinta el snackbar activo sobre la tab bar y lo retira solo a los
 * `SNACKBAR_MS`. Montar una vez, en el shell autenticado.
 */
export function Snackbar() {
  const current = useSnackbarStore((s) => s.current);
  const dismiss = useSnackbarStore((s) => s.dismiss);

  useEffect(() => {
    if (!current) return;
    const timer = window.setTimeout(() => dismiss(current.id), SNACKBAR_MS);
    return () => window.clearTimeout(timer);
  }, [current, dismiss]);

  if (!current) return null;

  return (
    <div className="ritmo-snackbar" role="status">
      <span className="ritmo-snackbar__text">{current.text}</span>
      {current.action ? (
        <button
          type="button"
          className="ritmo-snackbar__action"
          onClick={() => {
            const { run } = current.action!;
            dismiss(current.id);
            void run();
          }}
        >
          {current.action.label}
        </button>
      ) : null}
    </div>
  );
}
