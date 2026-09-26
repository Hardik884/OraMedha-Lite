import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Every page, but not static assets, which carry no session and must load
     * even when signed out (the PWA icons, the service worker, the logo).
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|icon.png|apple-icon.png|manifest.webmanifest|sw.js|icons/|brand/).*)",
  ],
};
