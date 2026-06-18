import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
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
import { useRequestPasswordReset } from './hooks/use-request-password-reset';

const schema = z.object({ email: z.email('Email inválido') });

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const { mutate, isPending, isSuccess } = useRequestPasswordReset();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  return (
    <div className="bg-card w-full max-w-sm space-y-6 rounded-xl border p-8 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Recuperar contraseña</h1>
        <p className="text-muted-foreground text-sm">
          Te enviaremos un enlace para restablecerla.
        </p>
      </div>

      {isSuccess ? (
        <div className="space-y-4">
          <p className="text-sm">
            Si existe una cuenta con ese email, recibirás un correo con las
            instrucciones para restablecer tu contraseña.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">Volver al inicio de sesión</Link>
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutate(v.email))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Enviando…' : 'Enviar enlace'}
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/login">Volver al inicio de sesión</Link>
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
