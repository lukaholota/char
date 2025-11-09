import React from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Metadata } from "next";
import './globals.css'
import { Navigation } from "@/components/ui/Navigation";
import { App } from "@/components/ui/App";
import { SessionProvider } from "next-auth/react";
import GoogleOneTap from "@/components/auth/GoogleOneTap";

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
      <div className="flex flex-col md:flex-row h-full w-full">
        <Navigation/>
        <App>{ children }</App>
      </div>
    </SessionProvider>
    </body>
    </html>
  )
}