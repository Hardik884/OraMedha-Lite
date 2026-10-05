import { APP_NAME, APP_SHORT_NAME } from "@/lib/brand/name";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ServiceWorkerRegister } from "@/components/providers/ServiceWorkerRegister";
import { UploadWatcher } from "@/components/files/UploadWatcher";
import { THEME_INIT_SCRIPT } from "@/lib/theme/script";
import { THEME_COLORS } from "@/lib/theme/colors";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: "Patients, appointments, case progress and logbook for dental PGs.",
  applicationName: APP_NAME,
  // SVG first: it carries a prefers-color-scheme rule, so the mark is dark on a
  // light tab strip and light on a dark one. PNGs are the fallback, and the
  // Apple touch icon must be raster.
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/icon.svg",
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: APP_SHORT_NAME,
    statusBarStyle: "default",
  },
  formatDetection: {
    // Stop iOS turning OPD numbers and tooth numbers into phone links.
    telephone: false,
  },
  // Health-data app: nothing here should ever be indexed.
  robots: { index: false, follow: false },
};

/**
 * Mobile viewport:
 * - `viewportFit: "cover"` lets the app draw under the notch/home indicator;
 *   the layout keeps content clear with the safe-area utilities.
 * - No maximumScale: pinch-zoom stays available (accessibility). iOS focus-zoom
 *   is avoided instead by giving every input 16px text.
 * - `themeColor` matches the browser bar to the painted theme; ThemeProvider
 *   corrects it when the PG picks Light/Dark explicitly.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light.background },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark.background },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: THEME_INIT_SCRIPT edits <html>'s class and
    // style before React hydrates, deliberately, to prevent a theme flash.
    <html
      lang="en-IN"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          {children}
          {/* File uploads carry on across screens; this watches them. */}
          <UploadWatcher />
        </ThemeProvider>
        <ServiceWorkerRegister />
        {/*
          NO PRODUCT ANALYTICS, DELIBERATELY (same rule as the main app).
          Every screen in the app shows patient data, and paths will carry record
          ids. Nothing third-party is mounted here.
        */}
      </body>
    </html>
  );
}
