// domain/character/Money.ts
export class Money {
  constructor(
    readonly cp = 0,
    readonly sp = 0,
    readonly gp = 0,
    readonly pp = 0,
  ) {}

  toPrimitives() {
    return {
      cp: this.cp,
      sp: this.sp,
      gp: this.gp,
      pp: this.pp,
    };
  }
}
