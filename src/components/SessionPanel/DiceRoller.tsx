import { useState } from "react";
import { parseDice, evalDice } from "@/utils/dice";
import { send } from "@/sync/wsClient";
import { useStore } from "@/store";
import type { DiceRollResult } from "@/types";
import { ParseError } from "@/types";

export function DiceRoller() {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState<DiceRollResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionId = useStore((s) => s.session?.id ?? "");
  const senderName = useStore(
    (s) => s.participants.find((p) => p.connected)?.displayName ?? "Player"
  );
  const appendChat = useStore((s) => s.appendChat);

  function roll() {
    setError(null);
    setResult(null);

    let rollResult: DiceRollResult;
    try {
      rollResult = evalDice(parseDice(expr));
    } catch (e) {
      if (e instanceof ParseError) {
        setError(e.message);
        return;
      }
      throw e;
    }

    setResult(rollResult);

    const rolls = `[${rollResult.rolls.map((r) => r.value).join(", ")}]`;
    const content = `🎲 ${rollResult.expr}: ${rolls} = ${rollResult.total}`;

    appendChat({
      id: crypto.randomUUID(),
      sessionId,
      senderId: "local",
      senderName,
      content,
      timestamp: new Date().toISOString(),
    });

    send({
      type: "state_delta",
      sessionId,
      delta: { entity: "dice", roll: rollResult },
      timestamp: Date.now(),
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") roll();
  }

  return (
    <div style={{ padding: "8px 16px" }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="e.g. 2d6+3"
          style={{
            flex: 1,
            background: "#1e1e2e",
            color: "#cdd6f4",
            border: "1px solid #45475a",
            borderRadius: 4,
            padding: "4px 8px",
            fontSize: 14,
          }}
        />
        <button
          onClick={roll}
          style={{
            background: "#313244",
            color: "#cdd6f4",
            border: "1px solid #45475a",
            borderRadius: 4,
            padding: "4px 12px",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Roll
        </button>
      </div>
      {error && (
        <div role="alert" style={{ color: "#f38ba8", fontSize: 13, marginTop: 4 }}>
          {error}
        </div>
      )}
      {result && !error && (
        <div style={{ color: "#a6e3a1", fontSize: 13, marginTop: 4 }}>
          {`[${result.rolls.map((r) => r.value).join(", ")}]`} = {result.total}
        </div>
      )}
    </div>
  );
}
