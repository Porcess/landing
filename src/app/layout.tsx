import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";

import { SessionStart } from "@/components/analytics/session-start";
import { siteCopy } from "@/content/copy";
import { SITE_URL } from "@/lib/site";

import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

/**
 * The display face for the agent cards. Geist carries the body copy; the cards
 * get a face with more character so the deck reads as the product's own
 * furniture rather than as more body type. It is the same family the product
 * application uses for display headings, so the two surfaces agree.
 */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["500", "600", "700"],
});

/**
 * The site is meant to be found, which is why robots is permissive here.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: siteCopy.meta.title,
  description: siteCopy.meta.description,
  applicationName: siteCopy.brand,
  authors: [{ name: siteCopy.brand }],
  creator: siteCopy.brand,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: siteCopy.brand,
    title: siteCopy.meta.title,
    description: siteCopy.meta.description,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: siteCopy.meta.ogAlt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteCopy.meta.title,
    description: siteCopy.meta.description,
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f6f4ee",
};

/**
 * Reveals the hero copy for visitors without scripting. The same rules exist in
 * the stylesheet for reduced motion; this covers the case where no script runs
 * at all and there is no animation to wait for.
 */
const NOSCRIPT_REVEAL =
  "[data-reveal]{opacity:1 !important;transform:none !important}";

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable}`}
      lang="en"
    >
      <body className="font-sans">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <SessionStart />
        <noscript>
          <style dangerouslySetInnerHTML={{ __html: NOSCRIPT_REVEAL }} />
        </noscript>
        {children}
      </body>
    </html>
  );
}
