import Link from "next/link";
import { PatientAvatar } from "@/components/shared/PatientAvatar";

/** The PG's initials in the app bar — opens Settings. */
export function PgAvatarLink({ fullName }: { fullName: string }) {
  return (
    <Link
      href="/settings"
      aria-label="Settings and profile"
      className="-mr-1 flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <PatientAvatar name={fullName} size="sm" />
    </Link>
  );
}
