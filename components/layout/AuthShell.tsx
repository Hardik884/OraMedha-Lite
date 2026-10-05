import { OraMedhaLogo } from "@/components/shared/OraMedhaLogo";

/**
 * AuthShell — the frame for sign-in and onboarding: the OraMedha - Resident lockup,
 * a title, and a single phone-width column that clears the notch and the
 * home indicator.
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-safe pb-safe">
      <div className="pt-10 pb-8">
        <OraMedhaLogo size={24} withWordmark />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-text-primary">{title}</h1>
      {subtitle && <p className="mt-1.5 text-base text-text-secondary">{subtitle}</p>}
      <div className="mt-8 flex flex-1 flex-col pb-6">{children}</div>
    </main>
  );
}
