import { Outlet } from 'react-router-dom';

/**
 * Layout de rutas públicas (login, reset, verificación). Split-screen en lg+:
 * panel de marca a la izquierda (drenched en el acento) y el contenido del
 * formulario centrado a la derecha. En móvil solo se ve el formulario.
 */
export function AuthLayout() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <aside className="bg-primary text-primary-foreground relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
        {/* Textura sutil: anillos concéntricos muy tenues. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12] [background:repeating-radial-gradient(circle_at_30%_20%,white_0,white_1px,transparent_1px,transparent_22px)]"
        />
        <div className="relative flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-current" />
          <span className="font-semibold tracking-tight">Core</span>
        </div>
        <div className="relative space-y-3">
          <p className="text-3xl leading-tight font-semibold tracking-tight text-balance">
            Panel de administración
          </p>
          <p className="max-w-sm text-sm text-pretty opacity-80">
            Gestiona usuarios, roles, permisos y contenido de la plataforma
            Core desde un solo sitio.
          </p>
        </div>
        <p className="relative text-xs opacity-60">
          © {new Date().getFullYear()} Core
        </p>
      </aside>

      <main className="flex items-center justify-center p-6">
        <Outlet />
      </main>
    </div>
  );
}
