import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Terms of service" };

/** Public: Google's OAuth consent screen links here. */
export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="3 October 2026">
      <p>
        These terms apply when you use OraMedha Lite, an app made by the OraMedha team for dental postgraduate
        students. By signing in you agree to them. Please also read the{" "}
        <Link href="/privacy" className="font-medium text-accent underline-offset-4 hover:underline">
          privacy policy
        </Link>
        .
      </p>

      <LegalSection title="An early test version">
        <p>
          OraMedha Lite is free and still being tested. Features may change, and things may sometimes break or be
          unavailable. Please tell us through <strong>Settings → Send feedback</strong> when they do.
        </p>
      </LegalSection>

      <LegalSection title="Clinical decisions are yours">
        <p>
          The app suggests next steps, visit gaps, durations and appointment slots from general templates and
          your own settings. These are reminders to help you organise your work, not clinical advice. You and
          your supervisors decide every patient&apos;s treatment. Always check a suggestion before you act on it.
        </p>
      </LegalSection>

      <LegalSection title="Your account and your patients">
        <LegalList
          items={[
            "Keep your Google account secure. You're responsible for what's done in the app with your account.",
            "Record patient information only where you're allowed to, follow your college's and hospital's rules on consent and confidentiality, and keep the information accurate.",
            "Messages to patients are sent by you, from your own WhatsApp. You're responsible for what you send.",
            "Don't use the app for anything unlawful, to harass anyone, or to try to reach other people's data.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Your data">
        <p>
          What you enter remains yours. We keep it only to run the app for you, as described in the privacy
          policy. You can ask for a copy or for your account to be deleted at any time.
        </p>
      </LegalSection>

      <LegalSection title="No guarantees">
        <p>
          We work to keep the app reliable and your data safe, but it is provided &ldquo;as is&rdquo;, without
          guarantees. Keep your own records of anything you must not lose, such as official logbook entries. As
          far as the law allows, the OraMedha team is not liable for losses from using, or being unable to use,
          the app.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          We may update these terms. We&apos;ll change the date above, and tell you in the app if the change is
          important. If you keep using the app after that, the new terms apply. You can stop using it at any
          time.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
