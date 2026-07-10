import type { WebSocket } from "ws";
import type { EventTrigger, Session, Campaign, TriggerLogEntry, ChatMessage, Token, WsMessage } from "../types";

type BroadcastFn = (message: WsMessage) => void;

function spawnToken(payload: Record<string, unknown>, campaign: Campaign): void {
  const token = payload as Partial<Token> & { id: string };
  if (!token.id) return;
  campaign.tokens.push({
    id: token.id,
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    characterId: (token.characterId as string) ?? "",
    mapId: (token.mapId as string) ?? "",
    x: (token.x as number) ?? 0,
    y: (token.y as number) ?? 0,
    visionRadius: (token.visionRadius as number) ?? 3,
    hidden: (token.hidden as boolean) ?? false,
    ownerId: (token.ownerId as string) ?? "",
  });
}

function buildChatMessage(payload: Record<string, unknown>, sessionId: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    sessionId,
    senderId: "system",
    senderName: "system",
    content: (payload.content as string) ?? "",
    timestamp: new Date().toISOString(),
  };
}

export class EventTriggerExecutor {
  execute(
    trigger: EventTrigger,
    session: Session,
    campaign: Campaign,
    broadcast: BroadcastFn,
  ): TriggerLogEntry {
    const deadline = Date.now() + 500;

    try {
      for (const action of trigger.actions) {
        if (Date.now() > deadline) {
          throw new Error("trigger execution exceeded 500ms");
        }

        if (action.type === "spawn_token") {
          spawnToken(action.payload, campaign);
          broadcast({
            type: "state_delta",
            sessionId: session.id,
            delta: { entity: "trigger", logEntry: { triggerId: trigger.id, triggerName: trigger.name, timestamp: new Date().toISOString(), outcome: "success" } },
            timestamp: Date.now(),
          });
        } else if (action.type === "chat_message") {
          const msg = buildChatMessage(action.payload, session.id);
          broadcast({
            type: "state_delta",
            sessionId: session.id,
            delta: { entity: "chat", message: msg },
            timestamp: Date.now(),
          });
        } else if (action.type === "advance_story_node") {
          const nodeId = action.payload.nodeId as string;
          const node = campaign.story.nodes.find(n => n.id === nodeId);
          if (node) {
            broadcast({
              type: "state_delta",
              sessionId: session.id,
              delta: { entity: "story", patch: { nodes: campaign.story.nodes, edges: campaign.story.edges } },
              timestamp: Date.now(),
            });
          }
        }
      }

      const entry: TriggerLogEntry = {
        triggerId: trigger.id,
        triggerName: trigger.name,
        timestamp: new Date().toISOString(),
        outcome: "success",
      };
      session.eventLog.push(entry);

      broadcast({
        type: "state_delta",
        sessionId: session.id,
        delta: { entity: "trigger", logEntry: entry },
        timestamp: Date.now(),
      });

      return entry;
    } catch (err) {
      const entry: TriggerLogEntry = {
        triggerId: trigger.id,
        triggerName: trigger.name,
        timestamp: new Date().toISOString(),
        outcome: "error",
        error: err instanceof Error ? err.message : String(err),
      };
      session.eventLog.push(entry);
      return entry;
    }
  }
}
