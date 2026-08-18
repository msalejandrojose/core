// Aspecto visual del coche (TASK-229). Puramente cosmético: sin
// `speedScale`/`grip` ni ningún eje de física — un skin que tocara
// rendimiento dejaría de ser cosmético y contaminaría las clasificaciones.
// `modelPath` es la ruta al recurso del cliente Godot que sustituye el
// modelo por defecto del arquetipo equipado.
export class CarSkin {
  constructor(
    readonly id: string,
    readonly code: string,
    readonly name: string,
    readonly modelPath: string,
    readonly isUnlockedByDefault: boolean,
    readonly isActive: boolean,
  ) {}
}
