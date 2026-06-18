import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useVerifyEmail } from './hooks/use-verify-email';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { isSuccess, isError } = useVerifyEmail(token);

  const hasToken = Boolean(token);

  return (
    <div className="bg-card w-full max-w-sm space-y-6 rounded-xl border p-8 text-center shadow-sm">
      {!hasToken || isError ? (
        <>
          <XCircle className="text-destructive mx-auto" size={40} />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">No se pudo verificar</h1>
            <p className="text-muted-foreground text-sm">
              {hasToken
                ? 'El enlace no es válido o ha caducado. Pide que te reenvíen el correo de verificación.'
                : 'Falta el token de verificación en el enlace.'}
            </p>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">Ir al inicio de sesión</Link>
          </Button>
        </>
      ) : isSuccess ? (
        <>
          <CheckCircle2 className="mx-auto text-emerald-600" size={40} />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Email verificado</h1>
            <p className="text-muted-foreground text-sm">
              Tu cuenta ha quedado activada. Ya puedes iniciar sesión.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link to="/login">Iniciar sesión</Link>
          </Button>
        </>
      ) : (
        <>
          <Loader2 className="text-muted-foreground mx-auto animate-spin" size={40} />
          <p className="text-muted-foreground text-sm">
            Verificando tu email…
          </p>
        </>
      )}
    </div>
  );
}
