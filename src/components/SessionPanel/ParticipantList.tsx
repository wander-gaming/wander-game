import { useStore } from "@/store";
import type { Participant } from "@/types";

const roleLabel: Record<string, string> = {
  gm: "GM",
  player: "Player",
  spectator: "Spectator",
};

function ParticipantRow({ participant }: { participant: Participant }) {
  const { displayName, role, connected } = participant;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: connected ? "#16a34a" : "#6b7280",
          flexShrink: 0,
        }}
      />
      <span style={{ flex: 1, fontSize: 14, color: "#f1f5f9" }}>{displayName}</span>
      <span style={{ fontSize: 12, color: "#94a3b8" }}>{roleLabel[role] ?? role}</span>
    </div>
  );
}

export function ParticipantList() {
  const participants = useStore((s) => s.participants);

  return (
    <div style={{ padding: "8px 16px" }}>
      {participants.map((p) => (
        <ParticipantRow key={p.userId} participant={p} />
      ))}
    </div>
  );
}
