import { Pencil, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EFFORT_LABELS, useAiAgents } from './hooks';

export function AiAgentsPage() {
  const { data, isLoading } = useAiAgents();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Agentes"
        description="Asistentes de IA que usa la app. Cada uno tiene sus instrucciones, modelo, esfuerzo de razonamiento, skills y herramientas."
        actions={
          <Button asChild>
            <Link to="/ai/agents/new">
              <Plus size={16} /> Nuevo agente
            </Link>
          </Button>
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agente</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Modelo</TableHead>
            <TableHead>Esfuerzo</TableHead>
            <TableHead>Skills</TableHead>
            <TableHead>Herramientas</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={8}>Cargando…</TableCell>
            </TableRow>
          ) : (data ?? []).length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-muted-foreground">
                Aún no hay agentes.
              </TableCell>
            </TableRow>
          ) : (
            (data ?? []).map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">
                  {a.name}
                  {a.description ? <div className="text-muted-foreground text-xs">{a.description}</div> : null}
                </TableCell>
                <TableCell className="font-mono text-xs">{a.code}</TableCell>
                <TableCell>{a.model.label}</TableCell>
                <TableCell>{EFFORT_LABELS[a.reasoningEffort] ?? a.reasoningEffort}</TableCell>
                <TableCell className="text-sm">{a.skills.map((s) => s.name).join(', ') || '—'}</TableCell>
                <TableCell className="tabular-nums">{a.tools.length}</TableCell>
                <TableCell>
                  <Badge variant={a.enabled ? 'default' : 'secondary'}>{a.enabled ? 'Activo' : 'Apagado'}</Badge>
                </TableCell>
                <TableCell>
                  <Button asChild variant="ghost" size="icon" className="size-8" title="Editar">
                    <Link to={`/ai/agents/${a.id}`}>
                      <Pencil size={14} />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
