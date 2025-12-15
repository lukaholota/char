// domain/character/Race.ts
export class Race {
  constructor(
    readonly raceId: number,
    readonly name?: string,
    readonly subraceId?: number,
  ) {}
}
