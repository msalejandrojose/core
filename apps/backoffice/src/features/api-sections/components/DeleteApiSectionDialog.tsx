import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { useDeleteApiSection } from '../hooks/use-delete-api-section';

export function DeleteApiSectionDialog({ id }: { id: string }) {
  const navigate = useNavigate();
  const { mutate, isPending } = useDeleteApiSection({
    onSuccess: () => navigate('/sections', { replace: true }),
  });

  return (
    <ConfirmDialog
      trigger={<Button variant="destructive">Eliminar sección</Button>}
      title="¿Eliminar sección?"
      description="Solo se puede eliminar si ningún rol o usuario tiene permisos sobre ella. No se puede deshacer."
      onConfirm={() => mutate(id)}
      isPending={isPending}
    />
  );
}
