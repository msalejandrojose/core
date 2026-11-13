import type { BrioProfile } from './api';

/** ¿Se dio de alta hoy? Entonces Hoy enseña la bienvenida en vez del día normal. */
export function isFirstDay(
  profile: BrioProfile | null,
  today: string,
  timezone: string,
): boolean {
  if (!profile?.onboardedAt) return false;
  try {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(
      new Date(profile.onboardedAt),
    );
    return day === today;
  } catch {
    return false;
  }
}
