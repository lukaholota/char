/// Геометрія зору в координатах шару 100 × 100/aspect (toViewPoint), де відстані однакові в обох осях.
export type ViewPoint = { x: number; y: number };
export type SightSegment = { from: ViewPoint; to: ViewPoint };

const ANGLE_NUDGE = 0.0001;
const EYE_NUDGE = 0.001;
const ON_WALL = 1e-6;
const EDGE_SLACK = 1e-9;
const EYE_NUDGES: ViewPoint[] = [{ x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 }];

/// Що видно з origin: межею стає квадрат зі стороною 2·radius, коло домальовує шар.
/// shortcut: O(n²) у найгіршому разі (відкрите поле), до ~400 відрізків; далі — обхід за кутом (Red Blob)
export function buildVisibilityPolygon(origin: ViewPoint, segments: SightSegment[], radius: number): ViewPoint[] {
  const eye = moveEyeOffWalls(origin, segments);
  const walls = sortWallsByDistance(eye, [...segments.flatMap((segment) => clipSegmentToSquare(segment, eye, radius) ?? []), ...buildSquareSides(eye, radius)]);
  return collectRayAngles(eye, walls)
    .toSorted((left, right) => left - right)
    .map((angle) => castRay(eye, angle, walls, radius));
}

export function isPointInPolygon(point: ViewPoint, polygon: ViewPoint[]): boolean {
  let isInside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index];
    const b = polygon[previous];
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) isInside = !isInside;
  }
  return isInside;
}

/// Хід гравця не може перетнути стіну; старт просто на стіні не тримає токен на місці.
export function isMoveBlocked(from: ViewPoint, to: ViewPoint, segments: SightSegment[]): boolean {
  const mx = to.x - from.x;
  const my = to.y - from.y;
  return segments.some(({ from: start, to: end }) => {
    const sx = end.x - start.x;
    const sy = end.y - start.y;
    const denominator = mx * sy - my * sx;
    if (Math.abs(denominator) < 1e-12) return false;
    const ex = start.x - from.x;
    const ey = start.y - from.y;
    const moveShare = (ex * sy - ey * sx) / denominator;
    const wallShare = (ex * my - ey * mx) / denominator;
    return moveShare > ON_WALL && moveShare <= 1 && wallShare >= -EDGE_SLACK && wallShare <= 1 + EDGE_SLACK;
  });
}

/// Око точно на стіні бачило б нуль: зсуваємо на соту частку одиниці в перший вільний бік.
function moveEyeOffWalls(origin: ViewPoint, segments: SightSegment[]): ViewPoint {
  const isOffWalls = (point: ViewPoint) => !segments.some((segment) => findDistanceToSegment(point, segment) < ON_WALL);
  if (isOffWalls(origin)) return origin;
  return EYE_NUDGES.map((nudge) => ({ x: origin.x + nudge.x * EYE_NUDGE, y: origin.y + nudge.y * EYE_NUDGE })).find(isOffWalls) ?? origin;
}

function findDistanceToSegment(point: ViewPoint, { from, to }: SightSegment): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  const share = lengthSquared ? Math.min(1, Math.max(0, ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared)) : 0;
  return Math.hypot(point.x - (from.x + share * dx), point.y - (from.y + share * dy));
}

/// Liang–Barsky: стіна, що перетинає межу квадрата, обрізається по ній — тоді кут перетину теж стає вершиною.
function clipSegmentToSquare({ from, to }: SightSegment, centre: ViewPoint, radius: number): SightSegment | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const limits: [number, number][] = [
    [-dx, from.x - (centre.x - radius)],
    [dx, centre.x + radius - from.x],
    [-dy, from.y - (centre.y - radius)],
    [dy, centre.y + radius - from.y],
  ];
  let low = 0;
  let high = 1;
  for (const [direction, room] of limits) {
    if (direction === 0) {
      if (room < 0) return null;
      continue;
    }
    const share = room / direction;
    if (direction < 0) low = Math.max(low, share);
    else high = Math.min(high, share);
    if (low > high) return null;
  }
  return { from: { x: from.x + low * dx, y: from.y + low * dy }, to: { x: from.x + high * dx, y: from.y + high * dy } };
}

function buildSquareSides(centre: ViewPoint, radius: number): SightSegment[] {
  const corners = [
    { x: centre.x - radius, y: centre.y - radius },
    { x: centre.x + radius, y: centre.y - radius },
    { x: centre.x + radius, y: centre.y + radius },
    { x: centre.x - radius, y: centre.y + radius },
  ];
  return corners.map((corner, index) => ({ from: corner, to: corners[(index + 1) % corners.length] }));
}

type NearWall = SightSegment & { distance: number };

/// Найближчі стіни першими: промінь зупиняється, щойно наступна стіна далі за вже знайдену точку.
function sortWallsByDistance(eye: ViewPoint, walls: SightSegment[]): NearWall[] {
  return walls.map((wall) => ({ ...wall, distance: findDistanceToSegment(eye, wall) })).toSorted((left, right) => left.distance - right.distance);
}

/// Промінь у кінець стіни й два поруч: один ковзає повз кут і показує, що за ним.
function collectRayAngles(eye: ViewPoint, walls: SightSegment[]): number[] {
  return walls.flatMap(({ from, to }) => [from, to]).flatMap((end) => {
    const angle = Math.atan2(end.y - eye.y, end.x - eye.x);
    return [angle - ANGLE_NUDGE, angle, angle + ANGLE_NUDGE];
  });
}

function castRay(eye: ViewPoint, angle: number, walls: NearWall[], radius: number): ViewPoint {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let nearest = Infinity;
  for (const { from, to, distance: wallDistance } of walls) {
    if (wallDistance > nearest) break;
    const sx = to.x - from.x;
    const sy = to.y - from.y;
    const denominator = dx * sy - dy * sx;
    if (Math.abs(denominator) < 1e-12) continue;
    const ex = from.x - eye.x;
    const ey = from.y - eye.y;
    const distance = (ex * sy - ey * sx) / denominator;
    const share = (ex * dy - ey * dx) / denominator;
    if (distance >= 0 && share >= -EDGE_SLACK && share <= 1 + EDGE_SLACK && distance < nearest) nearest = distance;
  }
  const reach = Number.isFinite(nearest) ? nearest : radius;
  return { x: eye.x + dx * reach, y: eye.y + dy * reach };
}
