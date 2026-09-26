import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

/**
 * Input — Lite sizing: 44px tall and 16px text. Anything under 16px makes iOS
 * Safari zoom the whole page when the field is focused.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        aria-invalid={hasError || undefined}
        className={cn(
          "flex h-11 w-full rounded-[10px] border bg-surface px-3.5 py-2 text-base",
          "text-text-primary placeholder:text-text-disabled",
          "transition-[border-color,box-shadow] duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 focus-visible:border-accent",
          "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-disabled",
          hasError
            ? "border-danger focus-visible:ring-danger/20 focus-visible:border-danger"
            : "border-border hover:border-border-strong",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
