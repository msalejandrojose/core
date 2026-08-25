import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUserRacingSummary } from './hooks/use-user-racing-summary';

// Mismo formato que en la pantalla de intentos (TASK-246): "1:07.482".
function formatDurationMs(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

/**
 * Ficha de racing de un jugador (TASK-251): circuitos con intento (mejor
 * tiempo y posición) y coche equipado ahora mismo. Solo tiene sentido para
 * usuarios `APP` — quien la usa ya filtra por `userType` antes de montarla.
 */
export function RacingProfileCard({ userId }: { userId: string }) {
  const { data: summary, isLoading } = useUserRacingSummary(userId);

  if (isLoading || !summary) {
    return <Skeleton className="h-32 w-full" />;
  }

  const { loadout, tracks } = summary;
  const parts = [
    ['Neumáticos', loadout.tiresPart?.name],
    ['Alerón', loadout.wingPart?.name],
    ['Chasis', loadout.chassisPart?.name],
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-medium">Coche equipado</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{loadout.archetype.name}</Badge>
          {parts.map(([label, name]) => (
            <Badge key={label} variant="outline">
              {label}: {name ?? 'ninguna'}
            </Badge>
          ))}
          <span className="text-muted-foreground text-xs tabular-nums">
            velocidad ×{loadout.stats.speedScale.toFixed(2)} · agarre ×
            {loadout.stats.grip.toFixed(2)}
          </span>
        </div>
        {/* Hueco reservado: todavía no hay catálogo de skins (TASK-229). */}
        <p className="text-muted-foreground mt-1 text-xs italic">
          Skin: aún no disponible
        </p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Circuitos</h3>
        {tracks.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Todavía no ha corrido ningún circuito.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Circuito</TableHead>
                <TableHead>Intentos</TableHead>
                <TableHead>Mejor tiempo</TableHead>
                <TableHead>Posición</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tracks.map((t) => (
                <TableRow key={t.trackId}>
                  <TableCell>
                    <div>{t.trackName}</div>
                    <div className="text-muted-foreground font-mono text-xs">
                      {t.trackSlug}
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {t.attempts}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {t.bestDurationMs !== null
                      ? formatDurationMs(t.bestDurationMs)
                      : '—'}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {t.position !== null ? `#${t.position}` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
