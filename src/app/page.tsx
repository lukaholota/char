"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: {
    opacity: 0,
  },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.18,
      delayChildren: 0.1,
    },
  },
} as const;

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 28,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
    },
  },
} as const;

const textVariants = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: 0.15,
      ease: [0.22, 1, 0.36, 1],
    },
  },
} as const;

type HomeCard = {
  href: string;
  title: string;
  imageSrc: string;
  priority?: boolean;
  objectClassName?: string;
};

const cards: HomeCard[] = [
  {
    href: "/char/home",
    title: "ПЕРСОНАЖІ",
    imageSrc: "/images/home-characters.webp",
    priority: true,
    objectClassName: "object-center",
  },
  {
    href: "/spells",
    title: "ЗАКЛИНАННЯ",
    imageSrc: "/images/home-spells.webp",
    priority: true,
    objectClassName: "object-[center_85%]",
  },
];

export default function Page() {

  return (
    <motion.main
      className="h-[100dvh] w-full overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="flex h-full flex-col md:flex-row">
        {cards.map((card, index) => (
          <Link key={card.href} href={card.href} className="group relative flex-1 overflow-hidden">
            <motion.div className="h-full" variants={cardVariants}>
              <div className="glass-card relative h-full w-full overflow-hidden transition-transform duration-300 ease-out md:group-hover:-translate-y-4">
                <Image
                  src={card.imageSrc}
                  alt={card.title}
                  fill
                  priority={card.priority}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className={`object-cover ${card.objectClassName ?? "object-center"} grayscale saturate-[0.4] opacity-80 transition-all duration-300 ease-out group-hover:grayscale-0 group-hover:saturate-100 group-hover:opacity-100 group-hover:brightness-110`}
                />
                <div className="absolute inset-0 bg-background/30" />

                <div className="relative z-10 flex h-full items-center justify-center p-10">
                  <motion.h1
                    className="font-rpg-display text-center text-4xl uppercase tracking-[0.15em] text-foreground md:text-6xl md:tracking-[0.22em] lg:text-7xl"
                    variants={textVariants}
                    transition={{ ...textVariants.show.transition, delay: 0.25 + index * 0.08 }}
                  >
                    {card.title}
                  </motion.h1>
                </div>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </motion.main>
  );
}
