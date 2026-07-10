import type { EventTrigger, Session, TriggerLogEntry, ChatMessage, Token } from "@/types";
import type { StoreState } from "@/store";

export function executeTrigger(trigger: EventTrigger, session: Session, store: StoreState): TriggerLogEntry {
  try {
    for (const action of trigger.actions) {
      if (action.type === "spawn_token") {
        if ("addToken" in store && typeof (store as Record<string, unknown>).addToken === "function") {
          (store as Record<string, unknown> & { addToken: (t: Partial<Token>) => void }).addToken(
            action.payload as Partial<Token>
          );
        }
      } else if (action.type === "chat_message") {
        const msg: ChatMessage = {
          id: crypto.randomUUID(),
          sessionId: session.id,
          senderId: "system",
          senderName: "system",
          content: action.payload.content as string,
          timestamp: new Date().toISOString(),
        };
        store.appendChat(msg);
      } else if (action.type === "advance_story_node") {
        if ("advanceStoryNode" in store && typeof (store as Record<string, unknown>).advanceStoryNode === "function") {
          (store as Record<string, unknown> & { advanceStoryNode: (id: string) => void }).advanceStoryNode(
            action.payload.nodeId as string
          );
        }
      }
    }

    return {
      triggerId: trigger.id,
      triggerName: trigger.name,
      timestamp: new Date().toISOString(),
      outcome: "success",
    };
  } catch (err) {
    return {
      triggerId: trigger.id,
      triggerName: trigger.name,
      timestamp: new Date().toISOString(),
      outcome: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
