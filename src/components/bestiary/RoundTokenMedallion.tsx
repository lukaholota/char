"use client";

import { ContentImage, useIsArtHidden } from "@/components/no-ai/ContentImage";

/// Токен 5etools — кругла картина у власному кільці, з прозорими кутами. Раніше ми вирізали з
/// нього квадрат у 58% сторони, щоб кільце не сперечалося з рамкою сайта: від малюнка лишалася
/// приблизно третина, а силует — роги, крила, пащу — зрізало. Рішення власника 2026-09-20:
/// малювати токен цілим і без рамки. `object-contain`, бо він уже квадратний і вписаний.
export function RoundTokenMedallion({ src, alt }: { src: string; alt: string }) {
  /// Порожню коробку не лишаємо: хто резервує місце під картинку, питає про режим сам.
  if (useIsArtHidden(src, "manual")) return null;

  return (
    <div className="relative h-[88px] w-[88px] shrink-0 self-center sm:h-24 sm:w-24">
      <ContentImage
        src={src}
        alt={alt}
        provenance="manual"
        fill
        sizes="96px"
        loading="lazy"
        className="object-contain transition-transform duration-500 group-hover:scale-105"
      />
    </div>
  );
}
