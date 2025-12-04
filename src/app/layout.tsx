import React from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Metadata } from "next";
import './globals.css'
import { Navigation } from "@/lib/components/ui/Navigation";
import { App } from "@/lib/components/ui/App";
import { SessionProvider } from "next-auth/react";
import GoogleOneTap from "@/lib/components/auth/GoogleOneTap";
import { Toaster } from "@/lib/components/ui/sonner";

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


export const metadata: Metadata = {
  title: 'ДнД українською',
  description: 'Spells Holota Family - твій особистий помічник у світі днд! Створюй персонажа, знаходь заклинання, зброю, класи, підкласи, риси - все!',
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
    <html lang={ 'uk' } className="h-full w-full">
    <body
      className={ `${ jetBrainsMono.variable } ${ inter.variable } bg-slate-900 text-slate-200 h-full w-full` }>
    <SessionProvider>
      <GoogleOneTap/>
      <div className="grid min-h-screen w-full grid-rows-[1fr_auto] md:grid-rows-1 md:grid-cols-[88px_1fr]">
        <Navigation/>
        <App>{ children }</App>
      </div>
      <Toaster position="top-right" richColors closeButton />
    </SessionProvider>
    </body>
    </html>
  )
}
