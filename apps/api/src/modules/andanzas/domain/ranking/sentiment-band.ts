// Primer paso al puntuar un sitio visitado: una pregunta de sentimiento
// grueso (no una comparación) que decide en qué banda de nota entra el
// sitio. Las comparaciones binarias (ver insertion-stepper.ts) solo se
// hacen luego, entre sitios de la MISMA banda — nunca se le pide al
// usuario comparar un sitio que odió con uno que le encantó.
export type Sentiment = 'DISLIKED' | 'NEUTRAL' | 'LIKED';

export interface ScoreBand {
  min: number;
  max: number;
}

// Rangos de nota (0-10) por banda. Ajustables sin tocar el algoritmo de
// inserción, que solo conoce el rango de su banda.
export const SCORE_BANDS: Record<Sentiment, ScoreBand> = {
  DISLIKED: { min: 0, max: 4.9 },
  NEUTRAL: { min: 5, max: 6.9 },
  LIKED: { min: 7, max: 10 },
};

export function bandFor(sentiment: Sentiment): ScoreBand {
  return SCORE_BANDS[sentiment];
}

// A qué banda pertenece un score ya calculado. Sirve para filtrar, del
// listado completo de SiteEntry visitados de un usuario, cuáles compiten
// en la misma banda que un nuevo sitio.
export function sentimentForScore(score: number): Sentiment {
  if (score >= SCORE_BANDS.LIKED.min) return 'LIKED';
  if (score >= SCORE_BANDS.NEUTRAL.min) return 'NEUTRAL';
  return 'DISLIKED';
}
