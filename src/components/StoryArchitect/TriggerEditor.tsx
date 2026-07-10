import { useState } from "react";
import { useStore } from "@/store";
import { validateTrigger } from "@/utils/triggers";
import type {
  TriggerConditionType,
  TriggerActionType,
  TriggerAction,
  TriggerCondition,
  TriggerRegion,
} from "@/types";

interface Props {
  campaignId: string;
}

interface ActionState {
  id: string;
  type: TriggerActionType;
  nodeId: string;
  content: string;
  tokenX: string;
  tokenY: string;
}

const CONDITION_TYPES: TriggerConditionType[] = [
  "token_enter_region",
  "token_exit_region",
  "gm_manual",
];

const ACTION_TYPES: TriggerActionType[] = [
  "spawn_token",
  "chat_message",
  "advance_story_node",
];

function newAction(): ActionState {
  return {
    id: crypto.randomUUID(),
    type: "chat_message",
    nodeId: "",
    content: "",
    tokenX: "0",
    tokenY: "0",
  };
}

export function TriggerEditor({ campaignId }: Props) {
  const graph = useStore((s) => s.graph);

  const [conditionType, setConditionType] = useState<TriggerConditionType>("gm_manual");
  const [region, setRegion] = useState({ x: "0", y: "0", width: "0", height: "0" });
  const [actions, setActions] = useState<ActionState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const regionVisible =
    conditionType === "token_enter_region" || conditionType === "token_exit_region";

  function updateAction(id: string, patch: Partial<ActionState>) {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function removeAction(id: string) {
    setActions((prev) => prev.filter((a) => a.id !== id));
  }

  function buildCondition(): TriggerCondition {
    if (!regionVisible) return { type: conditionType };
    const r: TriggerRegion = {
      x: Number(region.x),
      y: Number(region.y),
      width: Number(region.width),
      height: Number(region.height),
    };
    return { type: conditionType, region: r };
  }

  function buildActions(): TriggerAction[] {
    return actions.map((a) => {
      if (a.type === "advance_story_node") {
        return { type: a.type, payload: { nodeId: a.nodeId } };
      }
      if (a.type === "chat_message") {
        return { type: a.type, payload: { content: a.content } };
      }
      return { type: a.type, payload: { x: Number(a.tokenX), y: Number(a.tokenY) } };
    });
  }

  function handleSave() {
    const now = new Date().toISOString();
    const trigger = {
      id: crypto.randomUUID(),
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      campaignId,
      name: "trigger",
      condition: buildCondition(),
      actions: buildActions(),
    };

    const campaign = {
      id: crypto.randomUUID(),
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      name: "local",
      ownerId: "local",
      maps: [],
      templates: [],
      characters: [],
      sheets: [],
      tokens: [],
      story: { nodes: graph.nodes, edges: [] },
      triggers: [],
    };

    const result = validateTrigger(trigger, campaign);
    if (!result.ok) {
      setError(result.error);
      setSuccess(false);
    } else {
      setError(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 400 }}>
        <label>Condition type</label>
        <select
          value={conditionType}
          onChange={(e) => setConditionType(e.target.value as TriggerConditionType)}
        >
          {CONDITION_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {regionVisible && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {(["x", "y", "width", "height"] as const).map((field) => (
              <label key={field} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 48 }}>{field}</span>
                <input
                  type="number"
                  value={region[field]}
                  onChange={(e) => setRegion((r) => ({ ...r, [field]: e.target.value }))}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 400 }}>
        {actions.map((action) => (
          <div
            key={action.id}
            style={{ border: "1px solid #ccc", padding: 8, display: "flex", flexDirection: "column", gap: 6 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <select
                value={action.type}
                onChange={(e) => updateAction(action.id, { type: e.target.value as TriggerActionType })}
              >
                {ACTION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button onClick={() => removeAction(action.id)}>Remove</button>
            </div>

            {action.type === "advance_story_node" && (
              <select
                value={action.nodeId}
                onChange={(e) => updateAction(action.id, { nodeId: e.target.value })}
              >
                <option value="">-- select node --</option>
                {graph.nodes.map((n) => (
                  <option key={n.id} value={n.id}>{n.label}</option>
                ))}
              </select>
            )}

            {action.type === "chat_message" && (
              <input
                placeholder="Message content"
                value={action.content}
                onChange={(e) => updateAction(action.id, { content: e.target.value })}
              />
            )}

            {action.type === "spawn_token" && (
              <div style={{ display: "flex", gap: 8 }}>
                <label>
                  x
                  <input
                    type="number"
                    value={action.tokenX}
                    onChange={(e) => updateAction(action.id, { tokenX: e.target.value })}
                    style={{ marginLeft: 4, width: 60 }}
                  />
                </label>
                <label>
                  y
                  <input
                    type="number"
                    value={action.tokenY}
                    onChange={(e) => updateAction(action.id, { tokenY: e.target.value })}
                    style={{ marginLeft: 4, width: 60 }}
                  />
                </label>
              </div>
            )}
          </div>
        ))}

        <button onClick={() => setActions((prev) => [...prev, newAction()])}>
          Add action
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={handleSave}>Save</button>
        {error && <span style={{ color: "red", fontSize: 13 }}>{error}</span>}
        {success && <span style={{ color: "green", fontSize: 13 }}>Valid</span>}
      </div>
    </div>
  );
}
