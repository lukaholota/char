"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { SRD_2024_ATTRIBUTION } from "@/lib/refs/srd-attribution";
import { SrdAttribution } from "@/components/rules/SrdAttribution";
import type { Edition } from "@/rules/route-helpers";

const FEEDBACK_URL = "https://www.reddit.com/r/char_holota_family/";
const LINK = "text-slate-100 underline underline-offset-4 hover:text-slate-50";

const blockMotion = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
} as const;

/// Everything that survived the landing block the owner cut (KR15.5 §1–§3): the feedback
/// channel, the thanks, and the attributions. The attributions are a licence condition, not
/// decoration — SRD 5.2.1 ships under CC BY 4.0, so the 2024 screen has to carry its line too.
export function HomeFooter({ edition, className }: { edition: Edition; className?: string }) {
  return (
    <motion.footer
      variants={blockMotion}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.1 }}
      className={cn("mx-auto w-full max-w-3xl px-6 pt-12 text-center", className)}
    >
      <p className="text-sm text-slate-300">
        Знайшли баг або щось працює дивно? Напишіть про це на{" "}
        <a href={FEEDBACK_URL} target="_blank" rel="noreferrer" className={LINK}>
          Reddit
        </a>
        .
      </p>

      <p className="mt-6 text-sm text-slate-300">
        Щиро дякуємо littlegenius666 за допомогу з перекладами заклинань!
      </p>

      <p className="mt-2 text-sm text-slate-300">
        Безмежно дякуємо @tremblingsea за надзвичайні арти на головній!
      </p>

      <div className="mt-8 space-y-4 text-xs leading-relaxed text-slate-400">
        <p>
          Матеріали на цьому сайті не змінюють необхідності придбання офіційних матеріалів. Система{" "}
          <em>Dungeons &amp; Dragons</em> є власністю <em>Wizards of the Coast</em>.
        </p>

        <p>
          This site is unofficial Fan Content permitted under the Fan Content Policy. Not
          approved/endorsed by Wizards. Materials used are property of Wizards of the Coast.
          ©Wizards of the Coast LLC
        </p>

        {edition === "2024" ? (
          <SrdAttribution attribution={SRD_2024_ATTRIBUTION} variant="inline" />
        ) : null}
      </div>
    </motion.footer>
  );
}

