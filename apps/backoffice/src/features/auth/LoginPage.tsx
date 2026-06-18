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
import { useLogin } from './hooks/use-login';

const schema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  const { mutate, isPending, isError } = useLogin();
  const form = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  return (
    <div className="bg-card w-full max-w-sm space-y-6 rounded-xl border p-8 shadow-sm">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="bg-primary size-2.5 rounded-full" />
          <span className="text-sm font-medium tracking-tight">
            Core <span className="text-muted-foreground">Backoffice</span>
          </span>
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Inicia sesión
          </h1>
          <p className="text-muted-foreground text-sm">
            Introduce tus credenciales para continuar.
          </p>
        </div>
      </div>

      {isError && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          Email o contraseña incorrectos. Inténtalo de nuevo.
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => mutate(v))} className="space-y-4">
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
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Entrando…' : 'Entrar'}
          </Button>
          <div className="text-center">
            <Link
              to="/forgot-password"
              className="text-muted-foreground hover:text-foreground text-sm hover:underline"
            >
              ¿Has olvidado tu contraseña?
            </Link>
          </div>
        </form>
      </Form>
    </div>
  );
}
