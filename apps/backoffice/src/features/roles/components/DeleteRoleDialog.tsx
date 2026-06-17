import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { useDeleteRole } from '../hooks/use-delete-role';

export function DeleteRoleDialog({ id }: { id: string }) {
  const navigate = useNavigate();
  const { mutate, isPending } = useDeleteRole({
    onSuccess: () => navigate('/roles', { replace: true }),
  });

  return (
    <ConfirmDialog
      trigger={<Button variant="destructive">Eliminar rol</Button>}
      title="¿Eliminar rol?"
      description="Los usuarios con este rol perderán sus permisos asociados. No se puede deshacer."
      onConfirm={() => mutate(id)}
      isPending={isPending}
    />
  );
}
