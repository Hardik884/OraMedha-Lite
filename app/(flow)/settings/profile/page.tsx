import type { Metadata } from "next";
import { FlowHeader } from "@/components/layout/FlowHeader";
import { requirePg } from "@/lib/pg/require";
import { getSpecialties } from "@/lib/data/settings";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const pg = await requirePg();
  const specialties = await getSpecialties();

  return (
    <>
      <FlowHeader backHref="/settings" backLabel="Back to Settings" title="Profile" />
      <ProfileForm
        initial={{ fullName: pg.fullName, college: pg.college, specialtyId: pg.specialty.id }}
        specialties={specialties}
      />
    </>
  );
}
