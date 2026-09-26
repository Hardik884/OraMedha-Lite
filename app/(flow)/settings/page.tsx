import type { Metadata } from "next";
import Link from "next/link";
import { CalendarOff, ChevronRight, Clock, SlidersHorizontal, Timer } from "lucide-react";
import { FlowHeader } from "@/components/layout/FlowHeader";
import { PatientAvatar } from "@/components/shared/PatientAvatar";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsRow";
import { ReminderPicker } from "@/components/settings/ReminderPicker";
import { SignOutButton } from "@/components/settings/SignOutButton";
import { requirePg } from "@/lib/pg/require";
import { getBlockedTimes, getModifierDefaults, getPreferences, getStageDefaults } from "@/lib/data/settings";
import { summarizeWorkingHours } from "@/lib/settings/working-hours";
import { isCurrentBlock } from "@/lib/settings/blocked";
import { formatIndianMobile } from "@/lib/auth/phone";

export const metadata: Metadata = { title: "Settings" };

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export default async function SettingsPage() {
  const pg = await requirePg();
  const [prefs, blocks, stageDefaults, modifiers] = await Promise.all([
    getPreferences(),
    getBlockedTimes(),
    getStageDefaults(pg.specialty.id),
    getModifierDefaults(pg.specialty.id),
  ]);

  const now = new Date();
  const currentBlocks = blocks.filter((b) => isCurrentBlock(b, now)).length;
  const changedStages = stageDefaults.flatMap((ct) => ct.stages).filter((s) => s.override).length;
  const changedModifiers = modifiers.filter((m) => m.override).length;
  const national = pg.phone?.replace(/^\+?91/, "") ?? null;

  return (
    <>
      <FlowHeader backHref="/today" backLabel="Back to Today" title="Settings" />
      <main className="mx-auto max-w-lg space-y-6 px-4 pt-5 pb-12">
        {/* Profile */}
        <Link
          href="/settings/profile"
          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-xs active:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <PatientAvatar name={pg.fullName} size="lg" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-lg font-semibold text-text-primary">{pg.fullName}</span>
            <span className="block truncate text-sm text-text-secondary">
              {pg.specialty.name} · {pg.college}
            </span>
            {national && (
              <span className="block text-sm tabular-nums text-text-secondary">+91 {formatIndianMobile(national)}</span>
            )}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-text-disabled" aria-hidden />
        </Link>

        <SettingsGroup title="Scheduling">
          <ul className="divide-y divide-border">
            <SettingsRow
              href="/settings/timings"
              icon={Clock}
              title="Clinic timings"
              summary={`${summarizeWorkingHours(prefs.workingHours)} · ${prefs.slotStepMin}-min slots`}
            />
            <SettingsRow
              href="/settings/blocked"
              icon={CalendarOff}
              title="Blocked times"
              summary={currentBlocks === 0 ? "None" : plural(currentBlocks, "block", "blocks")}
            />
          </ul>
        </SettingsGroup>

        <SettingsGroup title="My clinical defaults">
          <ul className="divide-y divide-border">
            <SettingsRow
              href="/settings/defaults"
              icon={Timer}
              title="Durations and gaps"
              summary={changedStages === 0 ? "Using template defaults" : `${plural(changedStages, "stage", "stages")} changed by you`}
            />
            <SettingsRow
              href="/settings/modifiers"
              icon={SlidersHorizontal}
              title="Modifier rules"
              summary={
                modifiers.length === 0
                  ? "None for your specialty yet"
                  : changedModifiers === 0
                    ? "Using template defaults"
                    : `${plural(changedModifiers, "rule", "rules")} changed by you`
              }
            />
          </ul>
        </SettingsGroup>

        <SettingsGroup title="Patient reminders">
          <ReminderPicker initial={prefs.reminderTiming} />
        </SettingsGroup>

        <SettingsGroup title="Appearance">
          <div className="p-4">
            <ThemeToggle className="w-full" />
          </div>
        </SettingsGroup>

        <SignOutButton />
      </main>
    </>
  );
}
