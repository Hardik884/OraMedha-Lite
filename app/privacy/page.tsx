import type { Metadata } from "next";
import { LegalList, LegalPage, LegalSection } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Privacy policy" };

/** Public: Google's OAuth consent screen links here. Plain words, true to how the app works. */
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="3 October 2026">
      <p>
        OraMedha Lite helps dental postgraduate students (&ldquo;PGs&rdquo;) keep track of their patients,
        appointments, case progress, files and logbook. This page explains what information the app keeps, why,
        and who can see it. OraMedha Lite is an early test version made by the OraMedha team.
      </p>

      <LegalSection title="Signing in with Google">
        <p>
          You sign in with your Google account. From Google we receive only your <strong>name</strong> and{" "}
          <strong>email address</strong>. We use your name to fill in your profile (you can change it) and your
          email to identify your account. We never see your Google password and get no access to your Gmail,
          contacts, Drive or anything else in your Google account.
        </p>
      </LegalSection>

      <LegalSection title="What the app keeps">
        <LegalList
          items={[
            "Your profile: name, college and specialty.",
            "What you enter about your patients: name, phone number, age and OPD number if you add them, the cases, visits and appointments you record, and your notes.",
            "Files you add to a case: X-rays, photos and documents.",
            "Your settings: clinic timings, blocked times, reminder timing, your own durations, gaps and targets.",
            "A note each time you open a WhatsApp message to a patient from the app (which message, and when). The message itself is sent by you, from your own WhatsApp.",
            "Feedback you send from the app.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Who can see it">
        <p>
          Only you. Every record is tied to your account, and the database itself refuses to show one PG&apos;s
          data to anyone else. Files are kept in private storage and opened only through short-lived links. We
          don&apos;t sell your data, show ads, or share it with anyone for marketing. The app has no advertising
          or analytics trackers.
        </p>
      </LegalSection>

      <LegalSection title="Where it is stored">
        <p>
          Data and files are stored with our database provider, Supabase, in its Mumbai (India) region. The app
          is served by Vercel. Both act only on our instructions to run the app. Google handles your sign-in.
        </p>
      </LegalSection>

      <LegalSection title="Cookies and your device">
        <p>
          The app uses cookies only to keep you signed in, and remembers your light/dark choice on your device.
          It does not keep copies of patient information in your phone&apos;s offline storage.
        </p>
      </LegalSection>

      <LegalSection title="Your patients' information">
        <p>
          You decide what patient information to record. Please record only what you need for their care and
          your training, and follow your college&apos;s and hospital&apos;s rules on patient consent and
          confidentiality, including the Digital Personal Data Protection Act, 2023.
        </p>
      </LegalSection>

      <LegalSection title="Keeping and deleting data">
        <p>
          Your records stay until you or we remove them, so your logbook stays complete. To have your account and
          all its data deleted, or to get a copy of it, use <strong>Settings → Send feedback</strong> in the app.
          We&apos;ll confirm before deleting, because deletion can&apos;t be undone.
        </p>
      </LegalSection>

      <LegalSection title="Changes and questions">
        <p>
          If we change this policy we&apos;ll update the date above, and tell you in the app if the change is
          important. Questions or concerns: <strong>Settings → Send feedback</strong> in the app.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
