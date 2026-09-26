"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { ContentImage } from "@/components/no-ai/ContentImage";
import { ModeLink } from "@/components/no-ai/ModeLink";
import { ReportProblemDialog } from "@/lib/components/problemReport/ReportProblemDialog";

import { useWildMagicErrorCopy } from "./useWildMagicErrorCopy";

// Межа помилок вантажиться з кожною сторінкою, а діалог тягне markdown-рендерер — сотні КБ.
const WildMagicSurgeTableDialog = dynamic(
  () => import("./WildMagicSurgeTableDialog").then((module) => module.WildMagicSurgeTableDialog),
  { ssr: false },
);

const ILLUSTRATION_SRC = "/images/errors/wild-magic-surge.webp";
const OWNER_TELEGRAM_URL = "https://t.me/LukaHolota";

type Props = {
  /// `error.digest` межі помилок — стабільне зерно для серверного рендеру.
  seed?: string;
  /// `reset()` межі помилок; без нього лишається тільки повернення на головну.
  onRetry?: () => void;
};

export function WildMagicErrorScreen({ seed, onRetry }: Props) {
  const copy = useWildMagicErrorCopy(seed);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isTableOpen, setIsTableOpen] = useState(false);

  return (
    <section
      aria-labelledby="wild-magic-error-title"
      className="mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 py-8 sm:gap-8 md:min-h-[70vh] md:flex-row md:justify-center md:gap-12 md:px-8 md:py-12"
    >
      <div className="w-full max-w-[22rem] shrink-0 sm:max-w-[26rem] md:w-1/2 md:max-w-[30rem]">
        <ContentImage
          src={ILLUSTRATION_SRC}
          alt=""
          width={1088}
          height={1024}
          priority
          draggable={false}
          sizes="(min-width: 768px) 30rem, 100vw"
          className="h-auto w-full select-none"
        />
      </div>

      <div className="flex w-full min-w-0 flex-col items-center text-center md:w-1/2 md:items-start md:text-left">
        <p className="font-rpg-display text-xs uppercase tracking-[0.22em] text-arcane-300">Помилка 500</p>
        <h1
          id="wild-magic-error-title"
          className="mt-3 min-h-[2.5em] font-rpg-display text-2xl leading-tight text-slate-100 sm:text-3xl md:text-4xl"
        >
          {copy.title}
        </h1>
        <p className="mt-3 min-h-[6.5em] max-w-prose text-base leading-relaxed text-slate-300 sm:text-lg md:min-h-[4.9em]">
          <button
            type="button"
            onClick={() => setIsTableOpen(true)}
            className="text-arcane-300 underline underline-offset-4 hover:text-arcane-200"
          >
            У таблиці Дикої магії випало {copy.surgeRoll.replace("-", "–")}
          </button>
          : {copy.description}
        </p>

        <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center md:justify-start">
          {onRetry && (
            <Button onClick={onRetry} className="w-full sm:w-auto">
              Спробувати ще раз
            </Button>
          )}
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <ModeLink href="/">Повернутися на головну</ModeLink>
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsReportOpen(true)}>
            Повідомити про проблему
          </Button>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-slate-400">
          Для оперативного звʼязку пишіть мені{" "}
          <a
            href={OWNER_TELEGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="text-arcane-300 underline underline-offset-4 hover:text-arcane-200"
          >
            @LukaHolota
          </a>
        </p>

        <ReportProblemDialog open={isReportOpen} onOpenChange={setIsReportOpen} />
        <WildMagicSurgeTableDialog
          open={isTableOpen}
          onOpenChange={setIsTableOpen}
          selectedRoll={copy.surgeRoll}
        />
      </div>
    </section>
  );
}
