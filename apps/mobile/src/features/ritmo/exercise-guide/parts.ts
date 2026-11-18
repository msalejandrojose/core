// Qué parte de la figura representa a cada músculo, para resaltar los principales.

/** Qué parte de la figura se colorea para cada músculo principal. */
export type Part = 'torso' | 'shoulder' | 'upperArm' | 'forearm' | 'thigh' | 'shin' | 'hip';
const PART: Record<string, Part> = {
  CHEST: 'torso',
  LATS: 'torso',
  TRAPS: 'torso',
  ABS: 'torso',
  LOWER_BACK: 'torso',
  FRONT_DELT: 'shoulder',
  SIDE_DELT: 'shoulder',
  REAR_DELT: 'shoulder',
  BICEPS: 'upperArm',
  TRICEPS: 'upperArm',
  FOREARMS: 'forearm',
  QUADS: 'thigh',
  HAMSTRINGS: 'thigh',
  GLUTES: 'hip',
  CALVES: 'shin',
};

export function partsFor(muscles: string[]): Set<Part> {
  return new Set(muscles.map((m) => PART[m]).filter((p): p is Part => !!p));
}
