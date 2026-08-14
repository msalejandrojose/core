export type TrackTheme = 'MEADOW' | 'SNOW';

export interface TrackCellRow {
  x: number;
  y: number;
  terrain?: 'ASPHALT' | 'ICE' | 'MUD' | 'WATER';
}

export interface TrackRow {
  id: string;
  slug: string;
  name: string;
  sectorCount: number;
  minPlausibleMs: number;
  path: TrackCellRow[];
  theme: TrackTheme;
  grip: number;
  isActive: boolean;
}

export const TRACK_THEME_LABELS: Record<TrackTheme, string> = {
  MEADOW: 'Pradera',
  SNOW: 'Nieve',
};

export const TERRAIN_LABELS: Record<
  NonNullable<TrackCellRow['terrain']>,
  string
> = {
  ASPHALT: 'Asfalto',
  ICE: 'Hielo',
  MUD: 'Barro',
  WATER: 'Agua',
};

export interface CarArchetypeRow {
  id: string;
  code: string;
  name: string;
  speedScale: number;
  grip: number;
  offroadGripModifier: number;
  isActive: boolean;
}

export type CarPartCategory = 'TIRES' | 'WING' | 'CHASSIS';

export const CAR_PART_CATEGORY_LABELS: Record<CarPartCategory, string> = {
  TIRES: 'Neumáticos',
  WING: 'Alerón',
  CHASSIS: 'Chasis',
};

export interface CarPartRow {
  id: string;
  code: string;
  category: CarPartCategory;
  name: string;
  /** Delta sobre el speedScale del arquetipo equipado. */
  speedScale: number;
  /** Delta sobre el grip del arquetipo equipado. */
  grip: number;
  isActive: boolean;
}

export type TerrainType = NonNullable<TrackCellRow['terrain']>;

export interface TerrainEffectRow {
  type: TerrainType;
  grip: number;
  slowsTopSpeed: boolean;
}

export interface AdminLapTimeRow {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  trackId: string;
  trackSlug: string;
  trackName: string;
  durationMs: number;
  splitsMs: number[];
  clientVersion: string;
  createdAt: string;
  invalidatedAt: string | null;
  isPersonalBest: boolean;
}
