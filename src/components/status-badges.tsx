import { Badge } from "@/components/ui/badge";

const ATT = {
  PRESENT: ["success", "Present"],
  HALF_DAY: ["warning", "Half-Day"],
  ABSENT: ["danger", "Absent"],
  LEAVE: ["info", "Leave"],
  NOT_YET: ["neutral", "Not checked in"],
} as const;

export function AttendanceBadge({ status }: { status: keyof typeof ATT }) {
  const [tone, label] = ATT[status];
  return <Badge tone={tone}>{label}</Badge>;
}

const LEAVE = { PENDING: ["warning", "Pending"], APPROVED: ["success", "Approved"], REJECTED: ["danger", "Rejected"], CANCELLED: ["neutral", "Cancelled"] } as const;

export function LeaveBadge({ status }: { status: keyof typeof LEAVE }) {
  const [tone, label] = LEAVE[status];
  return <Badge tone={tone}>{label}</Badge>;
}
