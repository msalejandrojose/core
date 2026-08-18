// Una temporada acota qué intentos entran en la clasificación (TASK-227).
// `endsAt` null = temporada abierta (la actual).
export class Season {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly startsAt: Date,
    readonly endsAt: Date | null,
  ) {}

  isOpen(): boolean {
    return this.endsAt === null;
  }
}
