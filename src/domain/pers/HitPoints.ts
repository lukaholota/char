export class HitPoints {
  constructor(
    private current: number,
    private max: number,
    private temp: number = 0,
  ) {
    if (current > max) {
      throw new Error("Current HP cannot exceed max HP");
    }
  }

  getCurrent() {
    return this.current;
  }

  getMax() {
    return this.max;
  }

  getTemp() {
    return this.temp;
  }
}
