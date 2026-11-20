import type { SceneWeather } from "@/rules/game-atmosphere";

type Particle = {
  x: number;
  y: number;
  /// Висота над мапою: 1 — під камерою, 0 — на землі.
  z: number;
  speed: number;
  size: number;
  phase: number;
  /// Секунди після падіння; −1, поки частинка в повітрі.
  landed: number;
};
type ActiveWeather = Exclude<SceneWeather, "none">;
type FallingWeather = Exclude<ActiveWeather, "fog">;
export type WeatherArea = { x: number; y: number; width: number; height: number };
/// width/height — полотно; map — мапа на ньому; visible — її видима частина, де падає погода.
export type WeatherParticles = {
  weather: ActiveWeather;
  width: number;
  height: number;
  map: WeatherArea;
  visible: WeatherArea;
  particles: Particle[];
  flash: { at: number; next: number };
};

/// Густота — частинок на 10 000 px² видимої мапи (віддалену мапу рахуємо як вписану в екран), зі стелею, щоб великий монітор не гальмував.
/// speed — частка висоти за секунду; wind і sway — px/с; streak — довжина краплі в частках висоти; landing — секунди сліду на землі.
const FALLING = {
  rain: { density: 2.6, speed: [1.3, 1.9], size: [1, 1], wind: 30, sway: 0, streak: 0.22, landing: 0.35, color: "170 200 255", alpha: 0.5 },
  storm: { density: 4, speed: [1.8, 2.5], size: [1, 1], wind: 150, sway: 0, streak: 0.24, landing: 0.3, color: "180 205 255", alpha: 0.6 },
  snow: { density: 3, speed: [0.16, 0.26], size: [1, 2.4], wind: 12, sway: 16, streak: 0, landing: 0.8, color: "255 255 255", alpha: 0.85 },
  blizzard: { density: 5, speed: [0.45, 0.7], size: [0.8, 2], wind: 220, sway: 30, streak: 0, landing: 0.35, color: "235 242 255", alpha: 0.85 },
} as const;
type FallingLook = (typeof FALLING)[FallingWeather];
const FOG = { density: 0.012, speed: [8, 22], size: [0.35, 0.6] } as const;
const MAX_PARTICLES = 700;
/// Камера над центром кадру: що вище частинка, то далі від центру й більша. 0.4 — без «тунелю гіперпростору».
const DEPTH = 0.4;
const ALPHA_STEPS = 4;
const EDGE = 24;

const pick = ([min, max]: readonly [number, number]) => min + Math.random() * (max - min);
const isFalling = (weather: ActiveWeather): weather is FallingWeather => weather !== "fog";

export function makeWeatherParticles(weather: ActiveWeather, width: number, height: number, map: WeatherArea): WeatherParticles {
  const visible = findVisibleArea(map, width, height);
  const state: WeatherParticles = { weather, width, height, map, visible, particles: [], flash: { at: -Infinity, next: performance.now() + pick([3000, 8000]) } };
  matchParticleCount(state);
  return state;
}

/// Мапу зсунули чи наблизили: частинки їдуть разом із нею, а ті, що випали за край, заходять з іншого боку.
export function fitWeatherToMap(state: WeatherParticles, map: WeatherArea) {
  const { map: old } = state;
  if (old.x === map.x && old.y === map.y && old.width === map.width && old.height === map.height) return false;
  const visible = findVisibleArea(map, state.width, state.height);
  for (const particle of state.particles) {
    const x = old.width > 0 ? map.x + ((particle.x - old.x) * map.width) / old.width : particle.x;
    const y = old.height > 0 ? map.y + ((particle.y - old.y) * map.height) / old.height : particle.y;
    particle.x = wrapInto(x, visible.x, visible.width);
    particle.y = wrapInto(y, visible.y, visible.height);
  }
  Object.assign(state, { map, visible });
  matchParticleCount(state);
  return true;
}

function findVisibleArea(map: WeatherArea, width: number, height: number): WeatherArea {
  const x = Math.max(0, map.x);
  const y = Math.max(0, map.y);
  return { x, y, width: Math.max(0, Math.min(width, map.x + map.width) - x), height: Math.max(0, Math.min(height, map.y + map.height) - y) };
}

const findLook = (weather: ActiveWeather) => (isFalling(weather) ? FALLING[weather] : FOG);
/// Віддалена мапа тримає ту саму кількість частинок, що й мапа на весь екран, — інакше при віддаленні погода рідшає.
function findParticleCount({ weather, width, height, map, visible }: WeatherParticles) {
  const mapArea = map.width * map.height;
  const fittedArea = map.width / map.height > width / height ? (width * width * map.height) / map.width : (height * height * map.width) / map.height;
  const area = visible.width * visible.height * (mapArea > 0 ? Math.max(1, fittedArea / mapArea) : 1);
  return Math.min(MAX_PARTICLES, Math.max(weather === "fog" ? 6 : 20, Math.round((area / 10000) * findLook(weather).density)));
}
const wrapInto = (value: number, start: number, size: number) => (size > 0 ? start + ((((value - start) % size) + size) % size) : value);

function spawnParticle(weather: ActiveWeather, area: WeatherArea): Particle {
  const look = findLook(weather);
  return { x: area.x + Math.random() * area.width, y: area.y + Math.random() * area.height, z: Math.random(), speed: pick(look.speed), size: pick(look.size), phase: Math.random() * Math.PI * 2, landed: -1 };
}

function matchParticleCount(state: WeatherParticles) {
  const count = findParticleCount(state);
  if (state.particles.length > count) state.particles.length = count;
  while (state.particles.length < count) state.particles.push(spawnParticle(state.weather, state.visible));
}

export function drawWeatherFrame(context: CanvasRenderingContext2D, state: WeatherParticles, seconds: number, now: number, isMoving: boolean) {
  const { weather, width, height, visible } = state;
  context.clearRect(0, 0, width, height);
  if (visible.width <= 0 || visible.height <= 0) return;
  context.save();
  context.beginPath();
  context.rect(visible.x, visible.y, visible.width, visible.height);
  context.clip();
  if (isFalling(weather)) drawFalling(context, state, FALLING[weather], seconds, now);
  else drawFog(context, state, seconds);
  if (weather === "blizzard") fillHaze(context, width, height, "rgb(220 230 255 / 0.14)");
  if (weather === "storm" && isMoving) drawLightning(context, state, now);
  context.restore();
}

function drawFalling(context: CanvasRenderingContext2D, state: WeatherParticles, look: FallingLook, seconds: number, now: number) {
  const isRain = look.streak > 0;
  const layers = Array.from({ length: ALPHA_STEPS }, () => new Path2D());
  const project = projectFromAbove(state);
  for (const particle of state.particles) {
    moveParticle(particle, look, state, seconds, now);
    if (particle.landed >= 0) {
      const fade = 1 - particle.landed / look.landing;
      const path = layers[findAlphaStep(fade * (isRain ? 0.8 : 0.5))];
      if (isRain) addCircle(path, particle.x, particle.y, 1 + 5 * (1 - fade));
      else addCircle(path, particle.x, particle.y, particle.size * 0.8);
      continue;
    }
    const head = project(particle.x, particle.y, particle.z);
    const path = layers[findAlphaStep(findHeightAlpha(particle.z))];
    if (isRain) {
      const lag = look.streak / particle.speed;
      const tail = project(particle.x - look.wind * lag, particle.y, Math.min(1, particle.z + look.streak));
      path.moveTo(head.x, head.y);
      path.lineTo(tail.x, tail.y);
    } else addCircle(path, head.x, head.y, particle.size * head.scale * head.scale);
  }
  context.lineWidth = state.weather === "storm" ? 1.4 : 1.1;
  layers.forEach((path, step) => {
    const color = `rgb(${look.color} / ${((look.alpha * (step + 1)) / ALPHA_STEPS).toFixed(3)})`;
    if (isRain) {
      context.strokeStyle = color;
      context.stroke(path);
    } else {
      context.fillStyle = color;
      context.fill(path);
    }
  });
}

function projectFromAbove({ width, height }: WeatherParticles) {
  const centreX = width / 2;
  const centreY = height / 2;
  return (x: number, y: number, z: number) => {
    const scale = 1 / (1 - DEPTH * z);
    return { x: centreX + (x - centreX) * scale, y: centreY + (y - centreY) * scale, scale };
  };
}

/// Згори частинка проявляється, а ближче до камери лишається напівпрозорою, як не у фокусі.
const findHeightAlpha = (z: number) => Math.min(1, (1 - z) / 0.25) * (1 - 0.35 * z);
const findAlphaStep = (alpha: number) => Math.max(0, Math.min(ALPHA_STEPS - 1, Math.ceil(alpha * ALPHA_STEPS) - 1));

function addCircle(path: Path2D, x: number, y: number, radius: number) {
  path.moveTo(x + radius, y);
  path.arc(x, y, radius, 0, Math.PI * 2);
}

function moveParticle(particle: Particle, look: FallingLook, state: WeatherParticles, seconds: number, now: number) {
  if (particle.landed >= 0) {
    particle.landed += seconds;
    const { visible } = state;
    if (particle.landed > look.landing) Object.assign(particle, { x: visible.x + Math.random() * visible.width, y: visible.y + Math.random() * visible.height, z: 1, landed: -1 });
    return;
  }
  particle.z -= particle.speed * seconds;
  particle.x += (look.wind + Math.sin(now / 1000 + particle.phase) * look.sway) * seconds;
  const right = state.visible.x + state.visible.width;
  if (particle.x > right + EDGE) particle.x -= state.visible.width + EDGE * 2;
  if (particle.z <= 0) Object.assign(particle, { z: 0, landed: 0 });
}

function drawFog(context: CanvasRenderingContext2D, state: WeatherParticles, seconds: number) {
  const { visible } = state;
  const reach = Math.min(visible.width, visible.height);
  for (const cloud of state.particles) {
    const radius = cloud.size * reach;
    cloud.x += cloud.speed * seconds;
    if (cloud.x - radius > visible.x + visible.width) cloud.x = visible.x - radius;
    const gradient = context.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, radius);
    gradient.addColorStop(0, "rgb(215 225 235 / 0.22)");
    gradient.addColorStop(1, "rgb(215 225 235 / 0)");
    context.fillStyle = gradient;
    context.fillRect(cloud.x - radius, cloud.y - radius, radius * 2, radius * 2);
  }
}

function drawLightning(context: CanvasRenderingContext2D, state: WeatherParticles, now: number) {
  if (now >= state.flash.next) state.flash = { at: now, next: now + pick([4000, 11000]) };
  const fade = 1 - (now - state.flash.at) / 300;
  if (fade > 0) fillHaze(context, state.width, state.height, `rgb(235 240 255 / ${(0.35 * fade).toFixed(3)})`);
}

function fillHaze(context: CanvasRenderingContext2D, width: number, height: number, color: string) {
  context.fillStyle = color;
  context.fillRect(0, 0, width, height);
}
