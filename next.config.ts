import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Lets a dev server pointed at the LOCAL Supabase stack build into its own
   * folder (NEXT_DIST_DIR=.next-local). Public env vars are compiled into the
   * bundle, so sharing `.next` with a hosted-project build can silently serve
   * the hosted URL to what was meant to be a local test run.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",

  /*
   * The logbook export libraries read their own font/data files at run time,
   * so they're loaded from node_modules rather than bundled.
   */
  serverExternalPackages: ["pdfkit", "exceljs"],

  /* The PDF export's font files, read at run time — include them in the server output. */
  outputFileTracingIncludes: {
    "/api/logbook/export": ["./assets/fonts/**"],
  },

  /*
   * Lets `npm run dev:phone` be opened from a phone on the same Wi-Fi
   * (http://192.168.x.x:3000). Without it Next.js treats the phone as a
   * cross-origin client and can refuse dev assets and hot reload.
   * Development only — this setting has no effect on a production build.
   */
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],

  async headers() {
    return [
      {
        // The service worker must never be served stale, or a fixed bug
        // stays on PGs' phones until the cache happens to expire.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
