import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function truncateHash(hash: string | undefined | null, length = 6): string {
  if (!hash) return "0x0";
  if (hash.length <= length * 2 + 2) return hash;
  return `${hash.slice(0, length + 2)}...${hash.slice(-length)}`;
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleString();
}
