import React, { Suspense } from "react";
import { Cinzel, Forum, Inter, JetBrains_Mono } from "next/font/google";
import { Metadata, Viewport } from "next";
import './globals.css'
import { Navigation } from "@/components/ui/Navigation";
import { App } from "@/components/ui/App";
import { Providers } from "@/app/providers";
import { GlobalModals } from "@/components/ui/GlobalModals";
import { DiceOverlay } from "@/lib/components/dice/DiceOverlay";
import { DiceTray } from "@/lib/components/dice/DiceTray";
import { RootGrid } from "@/components/ui/RootGrid";
import { PlatformBackdrop } from "@/components/ui/PlatformBackdrop";
import { OfflineServiceWorker } from "@/components/ui/OfflineServiceWorker";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  variable: "--font-inter",
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
  manifest: '/manifest.json',
  // `follow: true` навмисне: щоб краулер побачив noindex на решті сторінок, він мусить дійти до
  // них посиланнями. `nofollow` тут сповільнив би саме те, заради чого це стоїть.
  robots: { index: false, follow: true },
  title: 'ДнД українською',
  description: 'char.holota.family - твій особистий помічник у світі днд! Створюй персонажа, знаходь заклинання, магічні предмети та кидай кубики прямо на сайті!',
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
    <PlatformBackdrop />
    <OfflineServiceWorker />
    <Providers>
      <Suspense fallback={null}>
        <RootGrid>
          <App>{ children }</App>
          <Navigation/>
        </RootGrid>
      </Suspense>
      <GlobalModals />
      <DiceOverlay />
      <DiceTray />
    </Providers>
    </body>
    </html>
  )
}
