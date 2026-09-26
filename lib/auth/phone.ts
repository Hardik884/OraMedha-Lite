/**
 * Indian mobile numbers for phone-OTP sign-in.
 *
 * PGs type numbers however they like — "98765 43210", "+91-98765-43210",
 * "09876543210" — so everything is normalised to 10 digits (what we show and
 * store) and E.164 (what Supabase Auth needs).
 */
export type PhoneParseResult =
  | { ok: true; national: string; e164: string }
  | { ok: false; error: string };

export function parseIndianMobile(input: string): PhoneParseResult {
  let digits = input.replace(/[\s\-().]/g, "");

  if (digits.startsWith("+91")) digits = digits.slice(3);
  else if (digits.startsWith("0091")) digits = digits.slice(4);
  else if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);

  if (digits.length === 0) return { ok: false, error: "Enter your mobile number" };
  if (!/^\d+$/.test(digits)) return { ok: false, error: "Use digits only" };
  if (digits.length !== 10) return { ok: false, error: "Enter a 10-digit mobile number" };
  if (!/^[6-9]/.test(digits)) {
    return { ok: false, error: "Indian mobile numbers start with 6, 7, 8 or 9" };
  }

  return { ok: true, national: digits, e164: `+91${digits}` };
}

/** "9876543210" → "98765 43210", the way people read numbers aloud. */
export function formatIndianMobile(national: string): string {
  return /^\d{10}$/.test(national) ? `${national.slice(0, 5)} ${national.slice(5)}` : national;
}

/** Length of the SMS code (Supabase Auth `sms_otp_length`). */
export const OTP_LENGTH = 6;

/** Keeps only digits, capped at the code length — safe to call on every keystroke. */
export function cleanOtp(input: string): string {
  return input.replace(/\D/g, "").slice(0, OTP_LENGTH);
}
