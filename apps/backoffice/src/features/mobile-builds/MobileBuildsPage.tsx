import { Download, ExternalLink, Hammer, X } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  isActive,
  useCancelMobileBuild,
  useDownloadMobileBuild,
  useLaunchMobileBuild,
  useMobileBuilds,
  type LaunchMobileBuild,
  type MobileBuild,
  type MobileBuildList,
} from './hooks';

type Variant = 'default' | 'secondary' | 'outline' | 'destructive';

const STATE: Record<MobileBuild['state'], { label: string; variant: Variant }> = {
  QUEUED: { label: 'En cola', variant: 'secondary' },
  RUNNING: { label: 'Compilando', variant: 'default' },
  SUCCESS: { label: 'Hecho', variant: 'outline' },
  FAILED: { label: 'Falló', variant: 'destructive' },
  CANCELLED: { label: 'Cancelado', variant: 'outline' },
};

const PROFILES: { value: LaunchMobileBuild['profile']; label: string; hint: string }[] = [
  { value: 'device', label: 'Móvil (device)', hint: 'Compila e instala en el móvil por la Wi-Fi del Mac.' },
  { value: 'mac', label: 'Conectada al Mac (mac)', hint: 'La app carga la web del Mac por ZeroTier. Solo para pruebas.' },
  {
    value: 'testflight',
    label: 'TestFlight / pista interna',
    hint: 'Necesita la cuenta de pago de Apple o las claves de Google Play en el Mac.',
  },
  {
    value: 'production',
    label: 'Tiendas (production)',
    hint: 'Sube a la App Store (a revisión) o a producción de Google Play. Necesita las cuentas de pago.',
  },
];

const date = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

const duration = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`);

/**
 * Builds nativos de las apps: los compila el Mac Mini con GitHub Actions (el
 * runner self-hosted, apps/mobile/RUNNER.md). Aquí se lanzan con un perfil de
 * native.config.yml, se ve cómo van y se baja el resultado.
 */
export function MobileBuildsPage() {
  const { data, isLoading } = useMobileBuilds();
  const builds = data?.builds ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Builds de las apps"
        description="Compila la app en el Mac Mini: instala en el móvil por la Wi-Fi o sube a las tiendas, según el perfil. Con la cuenta gratuita de Apple la firma dura 7 días: basta con relanzar un build «Móvil» cada semana."
        actions={data?.configured ? <RunnerBadge runner={data.runner} /> : null}
      />

      {data && !data.configured ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin configurar</CardTitle>
            <CardDescription>
              Falta <code>GITHUB_BUILDS_TOKEN</code> en la API: un token de GitHub (fine-grained) solo para el repo, con
              «Actions: read and write» y, para ver el Mac, «Administration: read».
            </CardDescription>
          </CardHeader>
        </Card>
      ) : data ? (
        <LaunchForm list={data} />
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Estado</TableHead>
            <TableHead>Qué</TableHead>
            <TableHead>Rama</TableHead>
            <TableHead>Lanzado</TableHead>
            <TableHead className="text-right">Duración</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6}>Cargando…</TableCell>
            </TableRow>
          ) : !builds.length ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground">
                Todavía no hay builds.
              </TableCell>
            </TableRow>
          ) : (
            builds.map((b) => <BuildRow key={b.id} build={b} />)
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function RunnerBadge({ runner }: { runner: MobileBuildList['runner'] }) {
  if (!runner) return <Badge variant="outline">Mac: sin datos</Badge>;
  if (!runner.online) return <Badge variant="destructive">Mac desconectado</Badge>;
  return <Badge variant={runner.busy ? 'default' : 'secondary'}>{runner.busy ? 'Mac compilando' : 'Mac libre'}</Badge>;
}

function LaunchForm({ list }: { list: MobileBuildList }) {
  const launch = useLaunchMobileBuild();
  const [platform, setPlatform] = useState<LaunchMobileBuild['platform']>('ios');
  const [profile, setProfile] = useState<LaunchMobileBuild['profile']>('device');
  // null = sin tocar: se propone el móvil del último build de esa plataforma.
  const [typedDevice, setTypedDevice] = useState<string | null>(null);
  const [ref, setRef] = useState('');
  const lastDevice = list.builds.find((b) => b.platform === platform && b.device)?.device ?? '';
  const device = typedDevice ?? lastDevice;

  const installs = profile === 'device' || profile === 'mac';
  const hint = PROFILES.find((p) => p.value === profile)?.hint;
  const macOffline = list.runner ? !list.runner.online : false;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuevo build</CardTitle>
        <CardDescription>{hint}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 md:grid-cols-[10rem_14rem_1fr_12rem_auto] md:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            launch.mutate({
              platform,
              profile,
              ...(installs && device.trim() ? { device: device.trim() } : {}),
              ...(ref.trim() ? { ref: ref.trim() } : {}),
            });
          }}
        >
          <div className="space-y-2">
            <Label>Plataforma</Label>
            <Select
              value={platform}
              onValueChange={(v) => {
                setPlatform(v as LaunchMobileBuild['platform']);
                setTypedDevice(null);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ios">iOS</SelectItem>
                <SelectItem value="android">Android</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Perfil</Label>
            <Select value={profile} onValueChange={(v) => setProfile(v as LaunchMobileBuild['profile'])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROFILES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="build-device">Móvil</Label>
            <Input
              id="build-device"
              value={installs ? device : ''}
              disabled={!installs}
              maxLength={80}
              placeholder={
                installs ? (platform === 'ios' ? 'Vacío = el único iPhone emparejado' : 'ip:puerto de adb') : 'No instala'
              }
              onChange={(e) => setTypedDevice(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="build-ref">Rama</Label>
            <Input
              id="build-ref"
              value={ref}
              maxLength={100}
              placeholder={list.defaultRef}
              onChange={(e) => setRef(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={launch.isPending} title={macOffline ? 'El Mac está desconectado: se quedará en cola' : undefined}>
            <Hammer size={16} /> Compilar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function BuildRow({ build: b }: { build: MobileBuild }) {
  const cancel = useCancelMobileBuild();
  const download = useDownloadMobileBuild();
  const what = b.platform ? `${b.platform === 'ios' ? 'iOS' : 'Android'} · ${b.profile ?? '?'}` : 'Prueba';

  return (
    <TableRow>
      <TableCell>
        <Badge variant={STATE[b.state].variant}>{STATE[b.state].label}</Badge>
      </TableCell>
      <TableCell>
        <div className="font-medium">{what}</div>
        {b.device ? <div className="text-muted-foreground text-xs">{b.device}</div> : null}
      </TableCell>
      <TableCell className="font-mono text-sm">{b.ref}</TableCell>
      <TableCell className="text-sm">{date(b.createdAt)}</TableCell>
      <TableCell className="text-right tabular-nums text-sm">
        {b.durationSeconds != null ? duration(b.durationSeconds) : isActive(b) ? '…' : ''}
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          {b.state === 'SUCCESS' ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              title="Bajar el resultado (zip)"
              disabled={download.isPending}
              onClick={() => download.mutate(b.id)}
            >
              <Download size={14} />
            </Button>
          ) : null}
          {isActive(b) ? (
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="icon" className="size-8" title="Cancelar">
                  <X size={14} />
                </Button>
              }
              title="¿Cancelar el build?"
              description="Se para en el Mac. Si ya estaba instalando, el móvil se queda con lo que tuviera."
              destructiveLabel="Cancelar build"
              isPending={cancel.isPending}
              onConfirm={() => cancel.mutate(b.id)}
            />
          ) : null}
          <Button variant="ghost" size="icon" className="size-8" title="Ver en GitHub" asChild>
            <a href={b.url} target="_blank" rel="noreferrer">
              <ExternalLink size={14} />
            </a>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
