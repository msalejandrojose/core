// Un circuito del Grand Prix y su orden de disputa (TASK-247/248). Se
// hidrata con el slug/nombre del `Track` para que el cliente no tenga que
// resolverlos por separado — el Grand Prix siempre se lee junto a sus
// circuitos, nunca solo el id.
//
// Denormaliza también los campos que el jugador ve en la pantalla intermedia
// entre mangas (clima, vueltas, imagen del circuito para la miniatura del
// mapa, dificultad) para el mismo motivo: la pantalla se pinta con lo que
// venga en el GET del GP, sin resolver por circuito aparte.
export class GrandPrixStage {
  constructor(
    readonly trackId: string,
    readonly trackSlug: string,
    readonly trackName: string,
    readonly order: number,
    readonly laps: number,
    readonly circuitWeather: GrandPrixCircuitWeather,
    readonly circuitImageId: string | null,
  ) {}
}

export type GrandPrixDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type GrandPrixCircuitWeather = 'SUNNY' | 'CLOUDY' | 'RAINY' | 'SNOWY';

// Agrupa varios circuitos en un orden fijo (TASK-247): decisión de partida
// — suma de tiempos, con clasificación agregada propia y reanudable.
export class GrandPrix {
  constructor(
    readonly id: string,
    readonly slug: string,
    readonly name: string,
    readonly isActive: boolean,
    // Ordenados por `order` ascendente — el orden de disputa real.
    readonly stages: GrandPrixStage[],
    readonly difficulty: GrandPrixDifficulty,
    readonly creditsReward: number,
    readonly xpReward: number,
    readonly imageId: string | null,
  ) {}
}
