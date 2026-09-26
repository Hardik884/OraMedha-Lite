import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn — merge Tailwind classes safely.
 * Combines clsx (conditional classes) + tailwind-merge (conflict resolution),
 * so a caller's `className` can override a component's default size or colour.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
