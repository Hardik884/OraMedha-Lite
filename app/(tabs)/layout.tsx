import { redirect } from "next/navigation";
import { AppBar } from "@/components/layout/AppBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { PgMenu } from "@/components/layout/PgMenu";
import { getCurrentPg } from "@/lib/pg/current";
import { LOGIN_PATH, ONBOARDING_PATH } from "@/lib/auth/routes";

/**
 * The mobile app shell shared by the three tabs: slim top bar, one centred
 * phone-width column, and the bottom navigation. On a laptop the column stays
 * phone-width so screens look the way PGs will see them.
 *
 * Also the onboarding gate: a signed-in PG without a profile is sent to
 * /onboarding before seeing any tab.
 */
export default async function TabsLayout({ children }: { children: React.ReactNode }) {
  const current = await getCurrentPg();
  if (current.state === "signed-out") redirect(LOGIN_PATH);
  if (current.state === "needs-onboarding") redirect(ONBOARDING_PATH);
  const { pg } = current;

  return (
    <div className="min-h-dvh bg-background">
      <AppBar
        right={
          <PgMenu
            pg={{
              fullName: pg.fullName,
              college: pg.college,
              specialtyName: pg.specialty.name,
              phone: pg.phone,
            }}
          />
        }
      />
      <main className="mx-auto w-full max-w-lg px-4 pb-nav">{children}</main>
      <BottomNav />
    </div>
  );
}
