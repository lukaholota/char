import { describe, expect, it } from "vitest";
import { fitWeatherToMap, makeWeatherParticles, type WeatherArea, type WeatherParticles } from "@/components/games/weather-particles";

const isInside = (state: WeatherParticles, area: WeatherArea) => state.particles.every((particle) => particle.x >= area.x && particle.x <= area.x + area.width && particle.y >= area.y && particle.y <= area.y + area.height);

describe("погода над мапою", () => {
  it("частинки народжуються лише над видимою частиною мапи", () => {
    const state = makeWeatherParticles("snow", 1000, 800, { x: -400, y: 100, width: 1200, height: 800 });
    expect(state.visible).toEqual({ x: 0, y: 100, width: 800, height: 700 });
    expect(state.particles).toHaveLength(168);
    expect(isInside(state, state.visible)).toBe(true);
  });

  it("віддалена мапа не рідшає: частинок стільки ж, як на мапі на весь екран", () => {
    const fitted = makeWeatherParticles("snow", 1000, 800, { x: 0, y: 0, width: 1000, height: 500 });
    const far = makeWeatherParticles("snow", 1000, 800, { x: 250, y: 275, width: 500, height: 250 });
    expect(fitted.particles).toHaveLength(150);
    expect(far.particles).toHaveLength(150);
  });

  it("при зсуві частинки їдуть разом із мапою", () => {
    const state = makeWeatherParticles("rain", 1000, 800, { x: 100, y: 100, width: 400, height: 400 });
    const before = state.particles.map((particle) => ({ ...particle }));
    expect(fitWeatherToMap(state, { x: 150, y: 120, width: 400, height: 400 })).toBe(true);
    state.particles.forEach((particle, index) => {
      expect(particle.x - before[index].x).toBeCloseTo(50);
      expect(particle.y - before[index].y).toBeCloseTo(20);
    });
    expect(fitWeatherToMap(state, { x: 150, y: 120, width: 400, height: 400 })).toBe(false);
  });

  it("при наближенні частинок стає більше, і всі лишаються в кадрі", () => {
    const state = makeWeatherParticles("rain", 1000, 800, { x: 300, y: 200, width: 400, height: 400 });
    const before = state.particles.length;
    fitWeatherToMap(state, { x: -500, y: -400, width: 2000, height: 1600 });
    expect(state.visible).toEqual({ x: 0, y: 0, width: 1000, height: 800 });
    expect(state.particles.length).toBeGreaterThan(before);
    expect(isInside(state, state.visible)).toBe(true);
  });
});
