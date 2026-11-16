import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EFFORT_LABELS, formatInt, formatUsd, useAiAgents, useAiUsage } from './hooks';

const PERIODS = [
  { value: '1', label: 'Hoy' },
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: 'all', label: 'Todo' },
];

function since(days: string): string | undefined {
  if (days === 'all') return undefined;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (Number(days) - 1));
  return d.toISOString();
}

const dateTime = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(iso));

export function AiUsagePage() {
  const [agentId, setAgentId] = useState('all');
  const [period, setPeriod] = useState('30');
  const [page, setPage] = useState(1);
  const agents = useAiAgents();
  const { data, isLoading } = useAiUsage({
    agentId: agentId === 'all' ? undefined : agentId,
    from: since(period),
    page,
    limit: 50,
  });
  const t = data?.totals;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  const tiles = t
    ? [
        { label: 'Peticiones', value: formatInt(t.requests), note: t.errors ? `${formatInt(t.errors)} con error` : 'sin errores' },
        { label: 'Tokens de entrada', value: formatInt(t.inputTokens), note: `${formatInt(t.cachedInputTokens)} en caché` },
        { label: 'Tokens de salida', value: formatInt(t.outputTokens), note: `${formatInt(t.reasoningTokens)} razonando` },
        { label: 'Coste', value: formatUsd(t.costUsd), note: t.requests ? `${formatUsd(t.costUsd / t.requests)} por petición` : '—' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consumo"
        description="Cada petición a OpenAI con sus tokens de entrada y salida y su coste, calculado con el precio del modelo en ese momento."
        actions={
          <div className="flex gap-2">
            <Select value={agentId} onValueChange={(v) => { setAgentId(v); setPage(1); }}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los agentes</SelectItem>
                {(agents.data ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={(v) => { setPeriod(v); setPage(1); }}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardHeader className="pb-2">
              <CardDescription>{tile.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{tile.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-xs">{tile.note}</CardContent>
          </Card>
        ))}
      </div>

      {data && data.byAgent.length > 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Por agente</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agente</TableHead>
                  <TableHead className="text-right">Peticiones</TableHead>
                  <TableHead className="text-right">Entrada</TableHead>
                  <TableHead className="text-right">Salida</TableHead>
                  <TableHead className="text-right">Coste</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byAgent.map((g) => (
                  <TableRow key={g.agentId ?? 'none'}>
                    <TableCell>{g.agentName ?? 'Sin agente'}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatInt(g.requests)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatInt(g.inputTokens)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatInt(g.outputTokens)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatUsd(g.costUsd)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Peticiones</CardTitle>
          <CardDescription>Una fila por llamada a OpenAI (una pregunta con herramientas hace varias).</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Agente</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead className="text-right">Entrada</TableHead>
                <TableHead className="text-right">Salida</TableHead>
                <TableHead className="text-right">Coste</TableHead>
                <TableHead className="text-right">Tiempo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9}>Cargando…</TableCell>
                </TableRow>
              ) : (data?.data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground">
                    No hay peticiones en este periodo.
                  </TableCell>
                </TableRow>
              ) : (
                (data?.data ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums">{dateTime(r.createdAt)}</TableCell>
                    <TableCell>{r.agentName ?? '—'}</TableCell>
                    <TableCell className="text-xs">{r.userEmail ?? '—'}</TableCell>
                    <TableCell className="text-xs">
                      <span className="font-mono">{r.modelId}</span>
                      {r.reasoningEffort ? (
                        <span className="text-muted-foreground"> · {EFFORT_LABELS[r.reasoningEffort] ?? r.reasoningEffort}</span>
                      ) : null}
                      {r.toolCalls.length ? (
                        <div className="text-muted-foreground font-mono">→ {r.toolCalls.join(', ')}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatInt(r.inputTokens)}
                      {r.cachedInputTokens ? (
                        <div className="text-muted-foreground text-xs">{formatInt(r.cachedInputTokens)} caché</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatInt(r.outputTokens)}
                      {r.reasoningTokens ? (
                        <div className="text-muted-foreground text-xs">{formatInt(r.reasoningTokens)} razonando</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatUsd(r.costUsd)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{(r.durationMs / 1000).toFixed(1)} s</TableCell>
                    <TableCell>
                      {r.status === 'OK' ? (
                        <Badge variant="secondary">OK</Badge>
                      ) : (
                        <Badge variant="destructive" title={r.error ?? ''}>
                          Error
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {pages > 1 ? (
            <div className="mt-4 flex items-center justify-end gap-2 text-sm">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <span className="tabular-nums">
                {page} / {pages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                Siguiente
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
