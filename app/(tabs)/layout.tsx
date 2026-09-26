import { AppBar } from "@/components/layout/AppBar";
import { BottomNav } from "@/components/layout/BottomNav";

/**
 * The mobile app shell shared by the three tabs: slim top bar, one centred
 * phone-width column, and the bottom navigation. On a laptop the column stays
 * phone-width so screens look the way PGs will see them.
 */
export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <AppBar />
      <main className="mx-auto w-full max-w-lg px-4 pb-nav">{children}</main>
      <BottomNav />
    </div>
  );
}
