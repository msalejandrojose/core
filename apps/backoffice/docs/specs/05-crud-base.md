# Spec BO-05: CRUD base — formularios, diálogos y notificaciones

> **Estado:** draft  
> **Prioridad:** Media | **Categoría:** Backoffice

## Objetivo

Establecer los patrones reutilizables para crear, editar y borrar recursos:
un `CreateDialog` genérico, un `ConfirmDialog` para borrado, y la configuración
de notificaciones toast con `sonner`.

Estos componentes son el andamiaje que usan BO-06 (Usuarios) y BO-08 (Roles).

> **Notas de implementación:** (1) `FieldWrapper` tipa el render-prop como
> `ControllerRenderProps<T, FieldPath<T>>` en vez de `any`. (2) El botón destructivo de
> `ConfirmDialog` usa el token `bg-destructive` del tema (no `bg-red-600` hardcoded). (3) El
> ejemplo `CreateUserDialog` es solo referencia para BO-06; no se crea en esta tarea.

## Prerrequisitos

- BO-01: `react-hook-form`, `zod`, `@hookform/resolvers`, `sonner` instalados.
- BO-03: `AppLayout` disponible.

## Componentes shadcn a instalar

```bash
pnpm --filter @core/backoffice dlx shadcn@latest add \
  dialog alert-dialog badge
```

## Estructura de archivos

```
src/components/
├── dialogs/
│   ├── CreateDialog.tsx       # Dialog genérico con cualquier form
│   └── ConfirmDialog.tsx      # AlertDialog de confirmación (borrar)
└── forms/
    └── FieldWrapper.tsx       # Wrapper sobre shadcn FormField (reduce boilerplate)
```

## `src/components/dialogs/CreateDialog.tsx`

Envuelve cualquier formulario en un `<Dialog>`. El form vive fuera del dialog y
se pasa como `children`; el botón de submit se pasa como prop para que el dialog
controle el estado `isPending`.

```tsx
import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

interface CreateDialogProps {
  trigger: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit: () => void;
  isPending?: boolean;
  submitLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateDialog({
  trigger, title, description, children,
  onSubmit, isPending, submitLabel = 'Crear',
  open, onOpenChange,
}: CreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="py-2">{children}</div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={onSubmit} disabled={isPending}>
            {isPending ? 'Guardando…' : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## `src/components/dialogs/ConfirmDialog.tsx`

```tsx
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { type ReactNode } from 'react';

interface ConfirmDialogProps {
  trigger: ReactNode;
  title?: string;
  description?: string;
  onConfirm: () => void;
  isPending?: boolean;
  destructiveLabel?: string;
}

export function ConfirmDialog({
  trigger,
  title = '¿Estás seguro?',
  description = 'Esta acción no se puede deshacer.',
  onConfirm,
  isPending,
  destructiveLabel = 'Eliminar',
}: ConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {isPending ? 'Eliminando…' : destructiveLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

## `src/components/forms/FieldWrapper.tsx`

Reduce el boilerplate de `FormField > FormItem > FormLabel > FormControl > FormMessage`:

```tsx
import { type ReactNode } from 'react';
import { type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import {
  FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';

interface FieldWrapperProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  children: (field: any) => ReactNode;
}

export function FieldWrapper<T extends FieldValues>({
  control, name, label, children,
}: FieldWrapperProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>{children(field)}</FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
```

## Configuración de toasts — `sonner`

`sonner` ya está montado en `main.tsx` (BO-01). Se usa así en cualquier mutation:

```ts
import { toast } from 'sonner';

// Éxito:
toast.success('Usuario creado correctamente');

// Error (mensaje de la API):
toast.error(error?.message ?? 'Ha ocurrido un error');

// Con promesa (async):
toast.promise(mutateAsync(data), {
  loading: 'Guardando…',
  success: 'Guardado',
  error: 'Error al guardar',
});
```

## Patrón completo de uso — crear un recurso

```tsx
// src/features/users/components/CreateUserDialog.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { CreateDialog } from '@/components/dialogs/CreateDialog';
import { FieldWrapper } from '@/components/forms/FieldWrapper';
import { useCreateUser } from '../hooks/use-create-user';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const { mutate, isPending } = useCreateUser({ onSuccess: () => setOpen(false) });

  return (
    <CreateDialog
      trigger={<Button><Plus size={16} className="mr-2" />Nuevo usuario</Button>}
      title="Crear usuario"
      open={open}
      onOpenChange={setOpen}
      onSubmit={form.handleSubmit((v) => mutate(v))}
      isPending={isPending}
    >
      <Form {...form}>
        <div className="space-y-3">
          <FieldWrapper control={form.control} name="email" label="Email">
            {(f) => <Input type="email" {...f} />}
          </FieldWrapper>
          <FieldWrapper control={form.control} name="password" label="Contraseña">
            {(f) => <Input type="password" {...f} />}
          </FieldWrapper>
          <div className="grid grid-cols-2 gap-3">
            <FieldWrapper control={form.control} name="firstName" label="Nombre">
              {(f) => <Input {...f} />}
            </FieldWrapper>
            <FieldWrapper control={form.control} name="lastName" label="Apellido">
              {(f) => <Input {...f} />}
            </FieldWrapper>
          </div>
        </div>
      </Form>
    </CreateDialog>
  );
}
```

## Checklist de aceptación

- [ ] `CreateDialog` abre y cierra correctamente con `open`/`onOpenChange`
- [ ] Botón "Crear" se deshabilita y muestra "Guardando…" cuando `isPending=true`
- [ ] `ConfirmDialog` muestra botón de confirmación en rojo
- [ ] `ConfirmDialog` llama `onConfirm` solo al confirmar, no al cancelar
- [ ] `FieldWrapper` muestra el mensaje de error de validación bajo el campo
- [ ] `toast.success` y `toast.error` aparecen en top-right y desaparecen solos
- [ ] Cerrar el dialog reinicia el formulario (llamar `form.reset()` en `onOpenChange`)
- [ ] Sin errores TypeScript

## Fuera de scope

- Formulario de edición inline (dentro de la página de detalle → BO-06).
- Upload de archivos en formularios.
- Formularios multi-paso.
