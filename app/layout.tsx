import type { Metadata } from "next";

import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";

import { ClerkProvider } from "@clerk/nextjs";

import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  preload: false,
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Relay — From research to a script you can stand behind",
    template: "%s · Relay",
  },
  description:
    "A shared workspace for your research and your agent. Keep findings, sources, scripts, and version-specific reviews together.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${instrumentSans.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        <ClerkProvider>{children}</ClerkProvider>
        <Analytics />
      </body>
    </html>
  );
}
