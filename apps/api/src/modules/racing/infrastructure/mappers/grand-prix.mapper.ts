import {
  GrandPrix,
  GrandPrixStage,
} from '../../domain/entities/grand-prix.entity';

// Fila esperada: `RacingGrandPrix` con `stages` incluidos (`orderBy: { order: 'asc' }`)
// y cada manga con su `track` (solo id/slug/name hacen falta).
export interface GrandPrixRowWithStages {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  stages: {
    order: number;
    track: { id: string; slug: string; name: string };
  }[];
}

export function toGrandPrixDomain(row: GrandPrixRowWithStages): GrandPrix {
  return new GrandPrix(
    row.id,
    row.slug,
    row.name,
    row.isActive,
    row.stages.map(
      (s) =>
        new GrandPrixStage(s.track.id, s.track.slug, s.track.name, s.order),
    ),
  );
}
