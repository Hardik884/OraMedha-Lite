import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarOff,
  ChevronRight,
  Clock,
  Compass,
  FileText,
  KeyRound,
  MessageSquareText,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  Timer,
} from "lucide-react";
import { FlowHeader } from "@/components/layout/FlowHeader";
import { PatientAvatar } from "@/components/shared/PatientAvatar";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { SettingsGroup, SettingsRow } from "@/components/settings/SettingsRow";
import { ReminderPicker } from "@/components/settings/ReminderPicker";
import { SignOutButton } from "@/components/settings/SignOutButton";
import { requirePg } from "@/lib/pg/require";
import { getBlockedTimes, getModifierDefaults, getPreferences, getStageDefaults } from "@/lib/data/settings";
import { getTargets } from "@/lib/data/progress";
import { settingsBackHref } from "@/lib/feedback/screen";
import { summarizeWorkingHours } from "@/lib/settings/working-hours";
import { isCurrentBlock } from "@/lib/settings/blocked";

export const metadata: Metadata = { title: "Settings" };

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const pg = await requirePg();
  const { from } = await searchParams;
  const [prefs, blocks, stageDefaults, modifiers, targets] = await Promise.all([
    getPreferences(),
    getBlockedTimes(),
    getStageDefaults(pg.specialty.id),
    getModifierDefaults(pg.specialty.id),
    getTargets(),
  ]);
  const targetCount = Object.keys(targets).length;

  const now = new Date();
  const currentBlocks = blocks.filter((b) => isCurrentBlock(b, now)).length;
  const changedStages = stageDefaults.flatMap((ct) => ct.stages).filter((s) => s.override).length;
  const changedModifiers = modifiers.filter((m) => m.override).length;

  return (
    <>
      <FlowHeader backHref={settingsBackHref(from)} backLabel="Back" title="Settings" />
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
            {pg.email && <span className="block truncate text-sm text-text-secondary">{pg.email}</span>}
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

        <SettingsGroup title="Progress">
          <ul className="divide-y divide-border">
            <SettingsRow
              href="/settings/targets"
              icon={Target}
              title="Targets"
              summary={targetCount === 0 ? "None set" : `${plural(targetCount, "case type", "case types")} with a target`}
            />
          </ul>
        </SettingsGroup>

        <SettingsGroup title="Patient reminders">
          <ReminderPicker initial={prefs.reminderTiming} />
        </SettingsGroup>

        <SettingsGroup title="Account">
          <ul className="divide-y divide-border">
            <SettingsRow
              href="/set-password?from=settings"
              icon={KeyRound}
              title="Password"
              summary="Set or change the password for email sign-in"
            />
          </ul>
        </SettingsGroup>

        <SettingsGroup title="Appearance">
          <div className="p-4">
            <ThemeToggle className="w-full" />
          </div>
        </SettingsGroup>

        <SettingsGroup title="Help">
          <ul className="divide-y divide-border">
            <SettingsRow href="/welcome?replay=1" icon={Compass} title="How OraMedha works" summary="The three-screen tour" />
            <SettingsRow
              href={`/settings/feedback${from ? `?from=${encodeURIComponent(from)}` : ""}`}
              icon={MessageSquareText}
              title="Send feedback"
              summary="Tell us what's confusing, missing or broken"
            />
            <SettingsRow href="/privacy" icon={ShieldCheck} title="Privacy policy" summary="What the app keeps, and who sees it" />
            <SettingsRow href="/terms" icon={FileText} title="Terms of service" />
          </ul>
        </SettingsGroup>

        <SignOutButton />
      </main>
    </>
  );
}
