import { PLATFORM_BACKDROP } from "@/styles/palette";

/// Was `HomeBackdrop`, local to the two home screens. KR15.1 §1: the same backdrop paints every
/// route, so it lives in the root layout now. The blue mesh it replaced was rejected by the owner
/// (KR13.5 §12).
export function PlatformBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{
        backgroundColor: PLATFORM_BACKDROP.base,
        backgroundImage: PLATFORM_BACKDROP.glow,
      }}
    >
      <div className="absolute inset-0" style={{ backgroundImage: PLATFORM_BACKDROP.vignette }} />
      <GrainOverlay />
    </div>
  );
}

/// Той самий шум, що й SVG `feTurbulence` (baseFrequency 0.85, 3 октави, без кольору), але
/// відрендерений один раз у плитку. Живий фільтр на весь екран WebKit перераховував на кожній
/// зміні кадру поверх нього, і будь-яка модалка на iPhone відкривалась і закривалась із фризом
/// ~250 мс. Плитка — `scripts/render-platform-grain.mjs`.
function GrainOverlay() {
  return (
    <div
      className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
      style={{ backgroundImage: "url(/assets/platform-grain-v1.webp)", backgroundSize: "128px 128px" }}
    />
  );
}
