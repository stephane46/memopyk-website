import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Gallery Video Range Request Fix - July 27, 2025 - FORCE REBUILD
export const DEPLOYMENT_VERSION = "1.0.2-range-fix-force-rebuild";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
