import { useStore } from "@/store";

export function ConnectionBanner() {
  const status = useStore((s) => s.connectionStatus);
  if (status === "connected") return null;

  return (
    <div role="status" style={{ background: "#b91c1c", color: "#fff", padding: "8px 16px", textAlign: "center" }}>
      {status === "reconnecting" ? "Reconnecting..." : "Disconnected"}
    </div>
  );
}
