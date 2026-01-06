"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, WandSparkles, Hammer, Languages } from "lucide-react";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.08 },
  },
} as const;

const item = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

type Feature = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
};

const features: Feature[] = [
  {
    icon: Hammer,
    title: "Кузня Героїв",
    description:
      "Збирай образ мандрівника з легенд: класи, шляхи й мультиклас — без зайвого шурхоту сторінок.",
  },
  {
    icon: Sparkles,
    title: "Ритуал Піднесення",
    description:
      "Піднімай рівні одним ритуалом: здібності, таланти та вибори — усе лягає на місце, як руни у колі.",
  },
  {
    icon: WandSparkles,
    title: "Нескінченний Гримуар",
    description:
      "Закляття, предмети й інвентар під рукою — нехай пригоди тривають, а не підрахунки.",
  },
  {
    icon: Languages,
    title: "Мовою Рідних Земель",
    description:
      "Повна українська локалізація, щоб кожне слово звучало як клятва біля вогнища, а не як переклад з печатки.",
  },
];

export function HomeDescriptionSection({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <section className={cn("w-full px-6 pb-24 pt-16 md:px-10", className)}>
      <div className="mx-auto w-full max-w-6xl">
        {/* Hero text */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          transition={reduceMotion ? { duration: 0 } : undefined}
          className="glass-card rounded-3xl border border-white/10 bg-slate-950/40 p-8 backdrop-blur-xl md:p-10"
        >
          <h2 className="font-rpg-display text-3xl leading-tight text-slate-50 md:text-4xl">
            Сховай важкі фоліанти, пригоднику. Твоя легенда починається тут.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-300 md:text-lg">
            Ми забираємо рутину з твого столу: підрахунки, дрібні правки й нескінченні звіряння з правилами. Ти
            зосереджуєшся на герої, його вчинках і виборах — а не на математиці між кидками.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/char/home"
              className="inline-flex items-center justify-center rounded-2xl bg-teal-500/15 px-5 py-2.5 text-sm font-semibold text-teal-200 ring-1 ring-teal-400/25 transition-colors hover:bg-teal-500/20"
            >
              Розпочати свій шлях
            </Link>
            <Link
              href="/spells"
              className="inline-flex items-center justify-center rounded-2xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 ring-1 ring-white/10 transition-colors hover:bg-white/10"
            >
              Зазирнути в Гримуар
            </Link>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          className="mt-10"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  variants={item}
                  className="glass-card rounded-2xl border border-white/10 bg-slate-950/35 p-6 backdrop-blur-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                      <Icon className="h-5 w-5 text-slate-200" />
                    </div>
                    <div className="text-sm font-semibold text-slate-100">{f.title}</div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">{f.description}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Pre-footer CTA */}
        <motion.div
          className="mt-12 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-teal-500/10 via-purple-500/5 to-transparent p-8 ring-1 ring-white/5 md:p-10"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
        >
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="font-rpg-display text-2xl text-slate-50 md:text-3xl">
                Твої кубики вже чекають. Світ потребує героїв, а не бухгалтерів.
              </div>
              <div className="mt-2 text-sm text-slate-300">
                Увійди, щоб зберегти персонажів, підготувати інвентар і рушити в наступну пригоду.
              </div>
            </div>

            <Link
              href="/char/home"
              className="inline-flex items-center justify-center rounded-2xl bg-slate-50/10 px-5 py-2.5 text-sm font-semibold text-slate-100 ring-1 ring-white/10 transition-colors hover:bg-slate-50/15"
            >
              Увійти в Таверну
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="mt-8 text-center text-sm text-slate-300"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
        >
          Знайшли баг або щось працює дивно? Напишіть про це на{" "}
          <a
            href="https://www.reddit.com/r/char_holota_family/"
            target="_blank"
            rel="noreferrer"
            className="text-slate-100 underline underline-offset-4 hover:text-slate-50"
          >
            Reddit
          </a>
          .
        </motion.div>

        <motion.div
          className="mt-8 text-center text-sm text-slate-300"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
        >
          Щиро дякуємо littlegenius666 за допомогу з перекладами заклинань!
        </motion.div>
      </div>
    </section>
  );
}

