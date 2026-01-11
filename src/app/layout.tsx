import React, { Suspense } from "react";
import Script from "next/script";
import { Cinzel, Forum, Inter, JetBrains_Mono } from "next/font/google";
import { Metadata, Viewport } from "next";
import './globals.css'
import { Navigation } from "@/components/ui/Navigation";
import { App } from "@/components/ui/App";
import { Providers } from "@/app/providers";
import { SpellInfoModal } from "@/lib/components/characterSheet/SpellInfoModal";
import { DiceOverlay } from "@/lib/components/dice/DiceOverlay";
import { DiceSidebar } from "@/lib/components/dice/DiceSidebar";
import { RootGrid } from "@/components/ui/RootGrid";

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-jetbrains-mono',
});

// Cinzel looks great for Latin, but has no Cyrillic glyphs (UA titles would fallback).
const cinzel = Cinzel({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-cinzel",
});

// Primary RPG display font: Cyrillic-capable carved/antique vibe.
const rpgDisplay = Forum({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  weight: ["400"],
  variable: "--font-rpg-display",
});


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: 'ДнД українською',
  description: 'char.holota.family - твій особистий помічник у світі днд! Створюй персонажа, знаходь заклинання, магічні предмети та кидай кубики прямо на сайиі!',
  icons: {
    icon: [
      {
        media: '(prefers-color-scheme: light)',
        url: '/images/dark-favicon.ico',
        href: '/images/dark-favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        media: '(prefers-color-scheme: dark)',
        url: '/images/favicon.ico',
        href: '/images/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },

    ]
  }
}

export default function RootLayout(
  { children, }:
    { children: React.ReactNode }
) {
  return (
    <html lang={ 'uk' } className="h-full w-full dark" suppressHydrationWarning>
    <body
      className={ `${ jetBrainsMono.variable } ${ inter.variable } ${ cinzel.variable } ${ rpgDisplay.variable } relative bg-slate-950 text-slate-200 h-full w-full overflow-x-hidden antialiased` }>
    <Script
      src="https://cloud.umami.is/script.js"
      data-website-id="527c4413-3d86-4a9e-a886-a9e2548838c3"
      strategy="afterInteractive"
    />
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-slate-950" />
      {/* Mesh gradient layers */}
      <div className="absolute -inset-[30%] bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-950/55 via-purple-950/10 to-transparent blur-3xl" />
      <div className="absolute -inset-[30%] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-950/45 via-indigo-950/0 to-transparent blur-3xl" />
      <div className="absolute -inset-[30%] bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-indigo-950/45 via-slate-950/0 to-transparent blur-3xl" />

      {/* Noise overlay via SVG turbulence */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.05] mix-blend-overlay"
        aria-hidden="true"
      >
        <filter id="rpg-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#rpg-noise)" />
      </svg>
    </div>
    <Providers>
      <Suspense fallback={null}>
        <RootGrid>
          <App>{ children }</App>
          <Navigation/>
        </RootGrid>
      </Suspense>
      <Suspense fallback={null}>
        <SpellInfoModal />
      </Suspense>
      {/* Dice overlay - mounted globally, stays on top of everything */}
      <DiceOverlay />
      <DiceSidebar />
    </Providers>
    </body>
    </html>
  )
}
