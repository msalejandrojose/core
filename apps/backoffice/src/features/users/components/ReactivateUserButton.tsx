import { Button } from '@/components/ui/button';
import { useUpdateUser } from '../hooks/use-update-user';

/** Reactiva un usuario desactivado: `PATCH /users/:id { isActive: true }`. */
export function ReactivateUserButton({ id }: { id: string }) {
  const { mutate, isPending } = useUpdateUser(id);

  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() => mutate({ isActive: true })}
    >
      {isPending ? 'Reactivando…' : 'Reactivar usuario'}
    </Button>
  );
}
