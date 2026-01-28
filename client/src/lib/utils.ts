import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const DEPLOYMENT_VERSION = "2.0.0-clean-rebuild";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
