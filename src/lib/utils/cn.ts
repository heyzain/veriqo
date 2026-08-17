import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names and resolves conflicting Tailwind utilities
 * (e.g. `cn("p-2", condition && "p-4")` keeps only one padding value).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
