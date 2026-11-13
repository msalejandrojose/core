import { toast } from '@/lib/toast';
import { isApiError, brioApi, type BrioProfile, type SaveProfileBody } from '../api';

/**
 * Cuerpo de `PUT /brio/profile` con lo que ya hay y los cambios encima. La API
 * reescribe el perfil entero, así que hay que reenviar todos los campos.
 */
export function profileBody(profile: BrioProfile, changes: Partial<SaveProfileBody>): SaveProfileBody {
  return {
    sex: profile.sex ?? undefined,
    birthDate: profile.birthDate ?? undefined,
    heightCm: profile.heightCm ?? undefined,
    activityLevel: profile.activityLevel,
    goalType: profile.goalType,
    targetWeightKg: profile.targetWeightKg ?? undefined,
    weeklyWeightChangeKg: profile.weeklyWeightChangeKg ?? undefined,
    timezone: profile.timezone,
    ...changes,
  };
}

/** dd/mm/aaaa a partir de una fecha ISO (solo día). */
export function shortDate(iso: string | null): string {
  if (!iso) return 'Sin indicar';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** Descarga un JSON en el navegador (PWA). */
function saveJson(data: unknown, name: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadMyData(): Promise<void> {
  try {
    const data = await brioApi.exportMyData();
    saveJson(data, `brio-mis-datos-${new Date().toISOString().slice(0, 10)}.json`);
    toast.success('Datos descargados', 'Tienes una copia en JSON con todo lo guardado.');
  } catch (e) {
    toast.error('No se pudieron descargar tus datos', isApiError(e) ? e.message : undefined);
  }
}
