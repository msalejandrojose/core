// Un circuito del Grand Prix y su orden de disputa (TASK-247/248). Se
// hidrata con el slug/nombre del `Track` para que el cliente no tenga que
// resolverlos por separado — el Grand Prix siempre se lee junto a sus
// circuitos, nunca solo el id.
export class GrandPrixStage {
  constructor(
    readonly trackId: string,
    readonly trackSlug: string,
    readonly trackName: string,
    readonly order: number,
  ) {}
}

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
  ) {}
}
