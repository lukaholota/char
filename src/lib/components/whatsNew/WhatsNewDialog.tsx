"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FramedIllustration } from "@/components/ui/FramedIllustration";
import { useIsArtHidden } from "@/components/no-ai/ContentImage";
import type { ReleaseSlide } from "@/lib/whats-new/release-notes";
import { cn } from "@/lib/utils";

type WhatsNewDialogProps = {
  slides: readonly ReleaseSlide[];
  isOpen: boolean;
  onClose: () => void;
};

export function WhatsNewDialog({ slides, isOpen, onClose }: WhatsNewDialogProps) {
  const [swiper, setSwiper] = useState<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isLast = activeIndex === slides.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent className="flex max-h-[88svh] max-w-md flex-col gap-3 overflow-hidden p-4 sm:p-6" closeLabel="Закрити">
        <DialogTitle className="sr-only">Що нового на сайті</DialogTitle>

        <Swiper
          className="min-h-0 w-full flex-1"
          onSwiper={setSwiper}
          onSlideChange={(instance) => setActiveIndex(instance.activeIndex)}
          spaceBetween={24}
          slidesPerView={1}
        >
          {slides.map((slide) => (
            <SwiperSlide key={slide.key}>
              <ReleaseSlideView slide={slide} />
            </SwiperSlide>
          ))}
        </Swiper>

        <SlideDots
          count={slides.length}
          activeIndex={activeIndex}
          onPick={(index) => swiper?.slideTo(index)}
        />

        <div className="flex shrink-0 items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-slate-400"
            onClick={() => swiper?.slidePrev()}
            disabled={activeIndex === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Назад
          </Button>

          {isLast ? (
            <Button type="button" size="sm" onClick={onClose}>
              Гарної гри
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={() => swiper?.slideNext()}>
              Далі
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReleaseSlideView({ slide }: { slide: ReleaseSlide }) {
  const isArtHidden = useIsArtHidden(slide.image);

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto">
      {isArtHidden ? null : (
        <div className="relative mx-auto aspect-[3/4] h-[36svh] max-h-[400px] w-auto max-w-full shrink-0 sm:h-[44svh]">
          <FramedIllustration src={slide.image} alt="" sizes="(max-width: 640px) 80vw, 320px" chamfer="sm" vignette="md" />
        </div>
      )}

      <div className="space-y-2 px-1">
        <h2 className="font-rpg-display text-lg uppercase tracking-[0.14em] text-slate-100 sm:text-xl">
          {slide.title}
        </h2>
        {slide.lines.map((line) => (
          <p key={line} className="text-sm leading-relaxed text-slate-300">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

function SlideDots({
  count,
  activeIndex,
  onPick,
}: {
  count: number;
  activeIndex: number;
  onPick: (index: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-1.5">
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          type="button"
          aria-label={`Слайд ${index + 1}`}
          aria-current={index === activeIndex}
          onClick={() => onPick(index)}
          className={cn(
            "h-1.5 rounded-full transition-[width,background-color]",
            index === activeIndex ? "w-5 bg-slate-200" : "w-1.5 bg-slate-600 hover:bg-slate-500",
          )}
        />
      ))}
    </div>
  );
}
