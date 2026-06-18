import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DangerZone } from '@/components/DangerZone';
import { DeleteApiSectionDialog } from './components/DeleteApiSectionDialog';
import { EditApiSectionForm } from './components/EditApiSectionForm';
import { useApiSection } from './hooks/use-api-section';

export function ApiSectionDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: section, isLoading } = useApiSection(id);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
        </Button>
        <h1 className="text-2xl font-semibold">Detalle de sección</h1>
      </div>

      {isLoading || !section ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Información de la sección</CardTitle>
            </CardHeader>
            <CardContent>
              <EditApiSectionForm key={section.id} section={section} />
            </CardContent>
          </Card>

          <DangerZone
            description="Solo se puede eliminar si ningún rol o usuario tiene permisos sobre ella. No se puede deshacer."
            action={<DeleteApiSectionDialog id={section.id} />}
          />
        </>
      )}
    </div>
  );
}
