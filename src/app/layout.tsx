import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
 * The site is meant to be found, which is why robots is permissive here. The
 * description sells the problem and never the undisclosed product.
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
  colorScheme: "dark",
  themeColor: "#0c0c0b",
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
    <html className={`${geistSans.variable} ${geistMono.variable}`} lang="en">
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
