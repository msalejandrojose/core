import {
  GrandPrix,
  GrandPrixCircuitWeather,
  GrandPrixDifficulty,
  GrandPrixStage,
} from '../../domain/entities/grand-prix.entity';

// Fila esperada: `RacingGrandPrix` con `stages` incluidos (`orderBy: { order: 'asc' }`)
// y cada manga con su `track` — y a su vez el `circuit` padre del track, que
// es de dónde salen `imageId` y `weather` para denormalizarlos en el stage.
export interface GrandPrixRowWithStages {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  difficulty: GrandPrixDifficulty;
  creditsReward: number;
  xpReward: number;
  imageId: string | null;
  stages: {
    order: number;
    laps: number;
    track: {
      id: string;
      slug: string;
      name: string;
      circuit: {
        weather: GrandPrixCircuitWeather;
        imageId: string | null;
      };
    };
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
        new GrandPrixStage(
          s.track.id,
          s.track.slug,
          s.track.name,
          s.order,
          s.laps,
          s.track.circuit.weather,
          s.track.circuit.imageId,
        ),
    ),
    row.difficulty,
    row.creditsReward,
    row.xpReward,
    row.imageId,
  );
}
