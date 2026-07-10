import { useRef, useEffect } from "react";
import { useStore } from "@/store";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatLog() {
  const chatLog = useStore((s) => s.chatLog);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog]);

  return (
    <div style={{ maxHeight: "300px", overflowY: "auto", padding: "8px 0" }}>
      {chatLog.map((msg) => (
        <div key={msg.id} style={{ padding: "4px 16px" }}>
          <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{msg.senderName}</span>
          <span style={{ color: "#cbd5e1", margin: "0 6px" }}>{msg.content}</span>
          <span style={{ color: "#64748b", fontSize: "0.75em" }}>{formatTime(msg.timestamp)}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
