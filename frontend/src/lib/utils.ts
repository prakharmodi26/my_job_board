import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSalary(
  min: number | null,
  max: number | null,
  period: string | null
): string {
  if (!min && !max) return "";
  const fmt = (n: number) =>
    n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`;
  const periodLabel =
    period === "YEAR" ? "/yr" : period === "HOUR" ? "/hr" : "";

  if (min && max) return `${fmt(min)} - ${fmt(max)}${periodLabel}`;
  if (min) return `${fmt(min)}+${periodLabel}`;
  return `Up to ${fmt(max!)}${periodLabel}`;
}

export function formatRelativeDate(date: string | null): string {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export const STATUS_OPTIONS = [
  { value: "saved", label: "Saved", color: "bg-gray-100 text-gray-700" },
  { value: "applied", label: "Applied", color: "bg-blue-100 text-blue-700" },
  { value: "oa", label: "OA", color: "bg-amber-100 text-amber-700" },
  {
    value: "interview",
    label: "Interview",
    color: "bg-purple-100 text-purple-700",
  },
  { value: "offer", label: "Offer", color: "bg-emerald-100 text-emerald-700" },
  {
    value: "rejected",
    label: "Rejected",
    color: "bg-red-100 text-red-700",
  },
] as const;

export function getStatusColor(status: string): string {
  return (
    STATUS_OPTIONS.find((s) => s.value === status)?.color ??
    "bg-gray-100 text-gray-700"
  );
}
