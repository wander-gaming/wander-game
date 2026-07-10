import type { ParticipantRole } from "@/types";

export function isVisibleTo(element: { hidden: boolean }, role: ParticipantRole): boolean {
  if (role === "gm") return true;
  if (element.hidden) return false;
  return true;
}
