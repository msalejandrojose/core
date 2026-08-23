export type TrackTheme = 'MEADOW' | 'SNOW';

export interface TrackCellRow {
  x: number;
  y: number;
  terrain?: 'ASPHALT' | 'ICE' | 'MUD' | 'WATER';
}

// Variante jugable (sentido × cilindrada × arquetipo) de un `CircuitRow` —
// el trazado/tema/agarre/imagen viven en el circuito, no aquí (TASK-336).
export interface TrackRow {
  id: string;
  slug: string;
  name: string;
  circuitId: string;
  circuitSlug: string;
  circuitName: string;
  sectorCount: number;
  minPlausibleMs: number;
  isActive: boolean;
}

// Circuito base (Nevado, Chicane...) — agrupa varias `TrackRow` (TASK-336).
export interface CircuitRow {
  id: string;
  slug: string;
  name: string;
  checkpoints: number;
  path: TrackCellRow[];
  theme: TrackTheme;
  grip: number;
  isActive: boolean;
  /** Si está entre los circuitos destacados HOY (lo decide el rotador diario). */
  isInRotation: boolean;
  rotatedAt: string | null;
  imageId: string | null;
  /** Ruta relativa (`/files/view?token=...`) — ver `resolveCircuitImageUrl()`. */
  imageUrl: string | null;
}

export type RacingCircuitRotationConfigKey = 'CIRCUITS_PER_DAY';

export const CIRCUIT_ROTATION_CONFIG_KEY_LABELS: Record<
  RacingCircuitRotationConfigKey,
  string
> = {
  CIRCUITS_PER_DAY: 'Circuitos destacados por día',
};

export interface CircuitRotationConfigRow {
  key: RacingCircuitRotationConfigKey;
  value: number;
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

export interface GrandPrixStageRow {
  trackId: string;
  trackSlug: string;
  trackName: string;
  order: number;
}

export interface GrandPrixRow {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  stages: GrandPrixStageRow[];
}

export interface GrandPrixLeaderboardEntryRow {
  position: number;
  userId: string;
  displayName: string;
  totalDurationMs: number;
  completedAt: string;
}

export type RacingCoinRewardKey =
  | 'RACE_FIRST_PLACE'
  | 'RACE_SECOND_PLACE'
  | 'RACE_THIRD_PLACE'
  | 'REWARDED_AD'
  | 'PERSONAL_BEST'
  | 'BEAT_FRIEND'
  | 'WIN_STREAK_2'
  | 'WIN_STREAK_3'
  | 'WIN_STREAK_4_PLUS';

export const COIN_REWARD_KEY_LABELS: Record<RacingCoinRewardKey, string> = {
  RACE_FIRST_PLACE: '1º puesto en carrera online',
  RACE_SECOND_PLACE: '2º puesto en carrera online',
  RACE_THIRD_PLACE: '3º puesto en carrera online',
  REWARDED_AD: 'Ver un anuncio recompensado',
  PERSONAL_BEST: 'Batir tu récord personal',
  BEAT_FRIEND: 'Batir el fantasma de un amigo',
  WIN_STREAK_2: 'Racha de victorias — 2ª seguida',
  WIN_STREAK_3: 'Racha de victorias — 3ª seguida',
  WIN_STREAK_4_PLUS: 'Racha de victorias — 4ª seguida o más',
};

export interface CoinRewardConfigRow {
  key: RacingCoinRewardKey;
  amount: number;
}

export type RacingMatchmakingConfigKey =
  | 'RATING_K_FACTOR'
  | 'RATING_WINDOW_BASE_POINTS'
  | 'BOT_FILL_TIMEOUT_MS';

export const MATCHMAKING_CONFIG_KEY_LABELS: Record<RacingMatchmakingConfigKey, string> = {
  RATING_K_FACTOR: 'K del rating (cuánto se mueve por carrera)',
  RATING_WINDOW_BASE_POINTS: 'Ventana inicial de búsqueda (puntos de rating)',
  BOT_FILL_TIMEOUT_MS: 'Espera antes de rellenar con rivales ficticios (ms)',
};

export interface MatchmakingConfigRow {
  key: RacingMatchmakingConfigKey;
  value: number;
}

export interface PlayerRatingRow {
  userId: string;
  userEmail: string;
  userDisplayName: string;
  rating: number;
}

export interface TrackPopularityRow {
  trackId: string;
  trackSlug: string;
  trackName: string;
  isActive: boolean;
  totalLaps: number;
  distinctPlayers: number;
  lastPlayedAt: string | null;
  lapsLast30d: number;
  lapsPrev30d: number;
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
