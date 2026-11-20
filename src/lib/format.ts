import { TZ } from "@/lib/dates";

const pkr = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
export const formatPKR = (amount: number): string => `PKR ${pkr.format(amount)}`;

const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: true });
export const formatTime = (date: Date | null | undefined): string => (date ? timeFmt.format(date) : "-");

export function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return "-";
  const total = Math.round(hours * 60);
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, "0")}m`;
}
