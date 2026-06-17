import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { useDeactivateUser } from '../hooks/use-deactivate-user';

export function DeactivateUserDialog({ id }: { id: string }) {
  const { mutate, isPending } = useDeactivateUser(id);

  return (
    <ConfirmDialog
      trigger={<Button variant="destructive">Desactivar usuario</Button>}
      title="¿Desactivar usuario?"
      description="El usuario no podrá iniciar sesión. Se puede reactivar editando su estado."
      onConfirm={() => mutate()}
      isPending={isPending}
      destructiveLabel="Desactivar"
    />
  );
}
