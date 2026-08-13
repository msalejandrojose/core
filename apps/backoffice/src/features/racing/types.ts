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
