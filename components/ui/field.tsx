import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Field — form field wrapper with label, error, and hint support.
 * Used across all forms for consistent spacing and visual hierarchy.
 */
export function Field({ label, required, error, hint, htmlFor, className, children }: FieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      {hint && !error && (
        <p className="text-xs text-text-secondary">{hint}</p>
      )}
      {error && (
        <p className="text-sm text-danger flex items-center gap-1.5" role="alert">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}
