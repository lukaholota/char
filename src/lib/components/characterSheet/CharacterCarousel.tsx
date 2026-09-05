"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PersWithRelations } from "@/lib/actions/pers";
import MainStatsSlide from "./slides/MainStatsSlide";
import SkillsSlide from "./slides/SkillsSlide";
import CombatSlide from "./slides/CombatSlide";
import MagicSlide from "./slides/MagicSlide";
import FeaturesSlide from "./slides/FeaturesSlide";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterFeaturesGroupedResult } from "@/lib/actions/pers";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import { buildBeastFormPers, listBeastAbilities } from "@/lib/logic/beast-form";
import { BeastFormBar } from "./BeastFormBar";
import type { BeastFormView } from "./BeastFormMarks";
import { useWildshapeState } from "./useWildshapeState";

interface CharacterCarouselProps {
  pers: PersWithRelations;
  onPersUpdate: (next: PersWithRelations) => void;
  groupedFeatures: CharacterFeaturesGroupedResult | null;
  isReadOnly?: boolean;
  reloadFeatures?: () => void;
}

export default function CharacterCarousel({ pers, onPersUpdate, groupedFeatures, isReadOnly, reloadFeatures }: CharacterCarouselProps) {
  const swiperRef = useRef<SwiperType | null>(null);
  const wildshape = useWildshapeState(pers.persId);
  const [showBeastLayer, setShowBeastLayer] = useState(true);

  /// Пул використань один, а лічильників на листі два: бейдж Дикої форми зі стану форми й
  /// «Ресурси класу» на слайді Рис із серверних фіч (KR24.5). Тому вхід у форму й вихід із неї
  /// перечитують фічі — інакше слайд Рис показував би число, витрачене хвилину тому.
  /// Зворотний бік — ручна витрата — перечитує стан форми сам, через `onResourcesChanged`.
  const activeFormId = wildshape.active?.wildshapeId ?? null;
  const seenFormId = useRef(activeFormId);
  useEffect(() => {
    if (seenFormId.current === activeFormId) return;
    seenFormId.current = activeFormId;
    reloadFeatures?.();
  }, [activeFormId, reloadFeatures]);

  /// Точка підміни одна ([Р-1](docs/o24-wildshape-second-layer/README.md)): калькулятори
  /// лишаються чистими функціями від `pers`, а навички, рятівні, КБ і швидкість
  /// перераховуються самі — секції для цього не переписуються.
  const beastForm = useMemo<BeastFormView | undefined>(() => {
    const active = wildshape.active;
    const standing = wildshape.standing;
    if (!active?.creature || !standing || !showBeastLayer) return undefined;

    return {
      layer: {
        creature: active.creature,
        /// Правила бере персонаж, не каталог: рівень друїда, коло й редакція вирішують і хіти,
        /// і КБ, і те, чиє володіння показати ([KR24.6](docs/o24-wildshape-second-layer/kr24.6-wildshape-2024.md)).
        context: standing,
        beastCurrentHp: active.beastCurrentHp,
        beastMaxHp: active.beastMaxHp,
      },
      ownPers: pers,
      beastAbilities: listBeastAbilities(active.creature),
      onChanged: wildshape.reload,
    };
  }, [wildshape.active, wildshape.standing, wildshape.reload, showBeastLayer, pers]);

  const sheetPers = useMemo(
    () => (beastForm ? buildBeastFormPers(pers, beastForm.layer) : pers),
    [beastForm, pers]
  );

  type SlideId = "stats" | "skills" | "equipment" | "magic" | "features";
  type SlideDef = { id: SlideId; label: string };

  const allSlides: SlideDef[] = useMemo(
    () => [
      { id: "stats", label: "Головна" },
      { id: "skills", label: "Навички" },
      { id: "equipment", label: "Спорядження" },
      { id: "magic", label: "Магія" },
      { id: "features", label: "Фічі" },
    ],
    []
  );

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (swiperRef.current) {
      const isLg = window.matchMedia("(min-width: 1024px)").matches;
      if (isLg) {
        swiperRef.current.slideToLoop(4, 0);
        setCurrentIndex(4);
      } else {
        const isMd = window.matchMedia("(min-width: 768px)").matches;
        if (isMd) {
          swiperRef.current.slideToLoop(0, 0);
          setCurrentIndex(0);
        }
      }
    }
  }, []);

  /// Спорядження, магія й риси лишаються персонажевими: обладунок у формі злився з подобою,
  /// заклинальна характеристика ніколи не Сила й не Спритність, а риси форма не міняє. Туди
  /// їде власний лист — щоб підміна не протекла в те, що вона змінювати не мусить.
  const renderSlide = (id: SlideId) => {
    if (id === "stats") return <MainStatsSlide pers={sheetPers} onPersUpdate={onPersUpdate} isReadOnly={isReadOnly} beastForm={beastForm} />;
    if (id === "skills") return <SkillsSlide pers={sheetPers} onPersUpdate={onPersUpdate} isReadOnly={isReadOnly} beastForm={beastForm} />;
    if (id === "equipment") return <CombatSlide pers={pers} onPersUpdate={onPersUpdate} isReadOnly={isReadOnly} wildshape={wildshape} />;
    if (id === "magic") return <MagicSlide pers={pers} onPersUpdate={onPersUpdate} isReadOnly={isReadOnly} />;
    if (id === "features") return <FeaturesSlide pers={pers} onPersUpdate={onPersUpdate} groupedFeatures={groupedFeatures} isReadOnly={isReadOnly} onResourcesChanged={wildshape.reload} />;
    return null;
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {wildshape.active?.creature && (
        <BeastFormBar
          creature={wildshape.active.creature}
          is2024={wildshape.standing?.ruleset === "RULES_2024"}
          showBeastLayer={showBeastLayer}
          onToggleLayer={setShowBeastLayer}
        />
      )}

      {/* Content */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div className="h-full min-h-0 px-3 pt-3 pb-2 md:px-4 md:pt-4 md:absolute md:inset-0">
          <Swiper
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
            }}
            onSlideChange={(swiper) => {
              if (currentIndex !== swiper.realIndex) {
                setCurrentIndex(swiper.realIndex);
              }
            }}
            loop={true}
            speed={400}
            touchRatio={1.2}
            grabCursor={true}
            watchSlidesProgress={true}
            slidesPerView={1}
            spaceBetween={12}
            breakpoints={{
              768: {
                slidesPerView: 2,
                spaceBetween: 16,
              },
              1024: {
                slidesPerView: 3,
                spaceBetween: 16,
              },
            }}
            className="h-full w-full select-none"
          >
            {allSlides.map((slide) => (
              <SwiperSlide key={slide.id} className="h-full">
                <div className="bg-slate-900/90 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl shadow-black/30 h-full min-h-0 overflow-hidden">
                  <div className="h-full min-h-0 overflow-y-auto" style={{ scrollBehavior: "smooth" }}>
                    {renderSlide(slide.id)}
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Side navigation arrows (all breakpoints) */}
          <Button
            className="fixed left-2 md:left-28 top-1/2 -translate-y-1/2 bg-slate-900/50 hover:bg-slate-800/60 border border-white/20 text-white rounded-full w-10 h-10 md:w-12 md:h-12 p-0 shadow-xl z-10"
            size="icon"
            aria-label="Previous slide"
            onClick={() => {
              swiperRef.current?.slidePrev(100);
            }}
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </Button>
          <Button
            className="fixed right-2 md:right-6 top-1/2 -translate-y-1/2 bg-slate-900/50 hover:bg-slate-800/60 border border-white/20 text-white rounded-full w-10 h-10 md:w-12 md:h-12 p-0 shadow-xl z-10"
            size="icon"
            aria-label="Next slide"
            onClick={() => {
              swiperRef.current?.slideNext(100);
            }}
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </Button>
        </div>
      </div>

      {/* Bottom navigation (always visible) */}
      <div className="fixed bottom-[75px] left-0 w-full md:sticky md:bottom-0 z-20 border-t border-white/10 bg-slate-900/95 backdrop-blur-xl px-2 py-2 shadow-xl shadow-black/30">
        <div className="mx-auto max-w-5xl flex items-center justify-center gap-1">
          {allSlides.map((s, idx) => {
            const active = idx === currentIndex;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  swiperRef.current?.slideToLoop(idx);
                }}
                className={
                  "px-2 py-1 rounded-md text-[10px] sm:text-xs transition border " +
                  (active
                    ? "bg-indigo-500/20 border-indigo-400/40 text-indigo-100"
                    : "bg-white/5 border-white/10 text-slate-200/80 hover:bg-white/10")
                }
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
