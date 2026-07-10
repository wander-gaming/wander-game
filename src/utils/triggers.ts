import type { EventTrigger, Campaign, ValidationResult } from "@/types";

export function validateTrigger(trigger: EventTrigger, campaign: Campaign): ValidationResult {
  const { condition, actions } = trigger;

  if (condition.type === "token_enter_region" || condition.type === "token_exit_region") {
    if (!condition.region) {
      return { ok: false, error: `Trigger "${trigger.name}" condition requires a region` };
    }
  }

  const nodeIds = new Set(campaign.story.nodes.map(n => n.id));

  for (const action of actions) {
    if (action.type === "advance_story_node") {
      const nodeId = action.payload.nodeId as string | undefined;
      if (!nodeId || !nodeIds.has(nodeId)) {
        return { ok: false, error: `Story node "${nodeId}" not found in campaign` };
      }
    }
  }

  return { ok: true };
}
