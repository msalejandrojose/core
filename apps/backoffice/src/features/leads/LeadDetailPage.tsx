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
import { AddNoteForm } from './components/AddNoteForm';
import { AssignLeadDialog } from './components/AssignLeadDialog';
import { ChangeStatusDialog } from './components/ChangeStatusDialog';
import { ConvertLeadDialog } from './components/ConvertLeadDialog';
import { EditLeadDialog } from './components/EditLeadDialog';
import { LeadSourceBadge } from './components/LeadSourceBadge';
import { LeadStatusBadge } from './components/LeadStatusBadge';
import { LeadTagsEditor } from './components/LeadTagsEditor';
import { LeadTimeline } from './components/LeadTimeline';
import { useLead } from './hooks/use-lead';
import { leadDisplayName, type LeadRow } from './types';

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right break-words">{value ?? '—'}</span>
    </div>
  );
}

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useLead(id);

  if (isLoading || !data) {
    return <Skeleton className="h-96 w-full rounded-lg" />;
  }

  const lead = data as LeadRow;
  const isWon = lead.status === 'WON';
  const consent = lead.consentGiven
    ? `Sí${lead.consentAt ? ` · ${new Date(lead.consentAt).toLocaleDateString('es-ES')}` : ''}`
    : 'No';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/leads')}
            aria-label="Volver"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {leadDisplayName(lead)}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <LeadStatusBadge status={lead.status} />
              <LeadSourceBadge source={lead.source} />
              <span className="text-muted-foreground text-sm">
                Score {lead.score}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ChangeStatusDialog
            leadId={lead.id}
            currentStatus={lead.status}
            trigger={<Button variant="outline">Cambiar estado</Button>}
          />
          <AssignLeadDialog
            leadId={lead.id}
            currentOwnerId={lead.ownerId}
            trigger={<Button variant="outline">Asignar</Button>}
          />
          <ConvertLeadDialog
            leadId={lead.id}
            trigger={<Button disabled={isWon}>Convertir</Button>}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Actividad */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Añadir nota</CardTitle>
            </CardHeader>
            <CardContent>
              <AddNoteForm leadId={lead.id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Actividad</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadTimeline leadId={lead.id} />
            </CardContent>
          </Card>
        </div>

        {/* Datos y acciones */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Contacto</CardTitle>
              <EditLeadDialog
                lead={lead}
                trigger={
                  <Button variant="ghost" size="sm">
                    Editar
                  </Button>
                }
              />
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <InfoRow label="Email" value={lead.email} />
              <InfoRow label="Teléfono" value={lead.phone} />
              <InfoRow label="Empresa" value={lead.company} />
              <InfoRow label="Consentimiento" value={consent} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Atribución</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              <InfoRow label="Origen" value={lead.source} />
              <InfoRow label="UTM source" value={lead.utmSource} />
              <InfoRow label="UTM medium" value={lead.utmMedium} />
              <InfoRow label="UTM campaign" value={lead.utmCampaign} />
              <InfoRow label="Form response" value={lead.formResponseId} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Etiquetas</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadTagsEditor leadId={lead.id} tags={lead.tags} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
