import { ConnectionBanner } from "./ConnectionBanner";
import { ChatLog } from "./ChatLog";
import { DiceRoller } from "./DiceRoller";
import { ParticipantList } from "./ParticipantList";

const divider = { borderTop: "1px solid #313244", margin: "0" } as const;

export function SessionPanel() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "#1e1e2e",
        color: "#cdd6f4",
        border: "1px solid #313244",
        borderRadius: 6,
        overflow: "hidden",
        minWidth: 280,
      }}
    >
      <ConnectionBanner />
      <ChatLog />
      <hr style={divider} />
      <DiceRoller />
      <hr style={divider} />
      <ParticipantList />
    </div>
  );
}
