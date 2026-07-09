import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from '@/lib/toast';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { getApiErrorMessage } from '@/lib/api-error';
import { useResetPassword } from './hooks/use-reset-password';

const schema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  });

type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const { mutate, isPending } = useResetPassword();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  if (!token) {
    return (
      <div className="bg-card w-full max-w-sm space-y-4 rounded-xl border p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Enlace no válido</h1>
        <p className="text-muted-foreground text-sm">
          Falta el token de restablecimiento o el enlace ha caducado. Solicita
          uno nuevo.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link to="/forgot-password">Solicitar nuevo enlace</Link>
        </Button>
      </div>
    );
  }

  const submit = form.handleSubmit((v) =>
    mutate(
      { token, password: v.password },
      {
        onSuccess() {
          toast.success('Contraseña restablecida. Ya puedes iniciar sesión.');
          navigate('/login', { replace: true });
        },
        onError(error) {
          toast.error(
            getApiErrorMessage(error, 'El enlace no es válido o ha caducado'),
          );
        },
      },
    ),
  );

  return (
    <div className="bg-card w-full max-w-sm space-y-6 rounded-xl border p-8 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Nueva contraseña</h1>
        <p className="text-muted-foreground text-sm">
          Elige una contraseña nueva para tu cuenta.
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={submit} className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nueva contraseña</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Repite la contraseña</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Guardando…' : 'Restablecer contraseña'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
