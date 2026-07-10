// Feature: wander-game, Property 17: Trigger cross-reference validation
import * as fc from "fast-check";
import { validateTrigger } from "@/utils/triggers";
import type {
  EventTrigger,
  Campaign,
  StoryNode,
  TriggerAction,
} from "@/types";

const isoDate = fc
  .integer({ min: 0, max: 4102444800000 })
  .map((ms) => new Date(ms).toISOString());

const stateObjectFields = fc.record({
  id: fc.uuid(),
  schemaVersion: fc.integer({ min: 1, max: 100 }),
  createdAt: isoDate,
  updatedAt: isoDate,
});

const storyNodeArb = stateObjectFields.chain((base) =>
  fc.record({
    campaignId: fc.uuid(),
    label: fc.string({ minLength: 1 }),
    description: fc.string(),
    position: fc.record({ x: fc.integer(), y: fc.integer() }),
  }).map((rest) => ({ ...base, ...rest } as StoryNode))
);

const triggerConditionArb: fc.Arbitrary<TriggerCondition> = fc.record({
  type: fc.constantFrom(
    "token_enter_region" as const,
    "token_exit_region" as const,
    "gm_manual" as const
  ),
});

function makeMinimalCampaign(nodes: StoryNode[]): Campaign {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
    name: "test",
    ownerId: "test",
    maps: [],
    templates: [],
    characters: [],
    sheets: [],
    tokens: [],
    story: { nodes, edges: [] },
    triggers: [],
  };
}

function makeValidTrigger(
  nodeIds: string[],
  base: { id: string; schemaVersion: number; createdAt: string; updatedAt: string }
): EventTrigger {
  const actions: TriggerAction[] = nodeIds.map((nodeId) => ({
    type: "advance_story_node" as const,
    payload: { nodeId },
  }));
  return {
    ...base,
    campaignId: crypto.randomUUID(),
    name: "test-trigger",
    condition: { type: "gm_manual" },
    actions,
  };
}

describe("Property 17: Trigger cross-reference validation", () => {
  it("returns ok:true when all advance_story_node payloads reference existing nodes", { timeout: 30000 }, () => {
    // Validates: Requirements 1.2
    fc.assert(
      fc.property(
        fc.array(storyNodeArb, { minLength: 1, maxLength: 5 }),
        stateObjectFields,
        (nodes, base) => {
          const nodeIds = nodes.map((n) => n.id);
          const trigger = makeValidTrigger(nodeIds, base);
          const campaign = makeMinimalCampaign(nodes);
          const result = validateTrigger(trigger, campaign);
          expect(result.ok).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("returns ok:false when any advance_story_node payload references a missing node", { timeout: 30000 }, () => {
    // Validates: Requirements 1.2
    const missingIdArb = fc.uuid();

    fc.assert(
      fc.property(
        fc.array(storyNodeArb, { maxLength: 5 }),
        stateObjectFields,
        missingIdArb,
        (nodes, base, missingId) => {
          fc.pre(!nodes.some((n) => n.id === missingId));

          const actions: TriggerAction[] = [
            { type: "advance_story_node", payload: { nodeId: missingId } },
          ];
          const trigger: EventTrigger = {
            ...base,
            campaignId: crypto.randomUUID(),
            name: "test-trigger",
            condition: { type: "gm_manual" },
            actions,
          };
          const campaign = makeMinimalCampaign(nodes);
          const result = validateTrigger(trigger, campaign);
          expect(result.ok).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });
});
