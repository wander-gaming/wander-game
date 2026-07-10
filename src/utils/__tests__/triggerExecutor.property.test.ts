// Feature: wander-game, Property 18: Trigger log completeness
import * as fc from "fast-check";
import { executeTrigger } from "@/utils/triggerExecutor";
import type { EventTrigger, Session, TriggerCondition, TriggerAction } from "@/types";
import type { StoreState } from "@/store";

const isoDate = fc
  .integer({ min: 0, max: 4102444800000 })
  .map((ms) => new Date(ms).toISOString());

const stateObjectFields = fc.record({
  id: fc.uuid(),
  schemaVersion: fc.integer({ min: 1, max: 100 }),
  createdAt: isoDate,
  updatedAt: isoDate,
});

const triggerConditionArb: fc.Arbitrary<TriggerCondition> = fc.record({
  type: fc.constantFrom(
    "token_enter_region" as const,
    "token_exit_region" as const,
    "gm_manual" as const
  ),
});

const triggerActionArb: fc.Arbitrary<TriggerAction> = fc.record({
  type: fc.constantFrom(
    "spawn_token" as const,
    "chat_message" as const,
    "advance_story_node" as const
  ),
  payload: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 10 }),
    fc.oneof(fc.string(), fc.integer(), fc.boolean()),
    { maxKeys: 3 }
  ),
});

const eventTriggerArb: fc.Arbitrary<EventTrigger> = stateObjectFields.chain((base) =>
  fc.record({
    campaignId: fc.uuid(),
    name: fc.string({ minLength: 1 }),
    condition: triggerConditionArb,
    actions: fc.array(triggerActionArb, { maxLength: 3 }),
  }).map((rest) => ({ ...base, ...rest }))
);

function makeMinimalSession(): Session {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
    campaignId: crypto.randomUUID(),
    participants: [],
    activeMapId: crypto.randomUUID(),
    godModeEnabled: false,
    playerMovementEnabled: true,
    eventLog: [],
  };
}

function makeMinimalStore(): StoreState {
  return {
    appendChat: vi.fn(),
  } as unknown as StoreState;
}

describe("Property 18: Trigger log completeness", () => {
  it("executeTrigger always returns a valid TriggerLogEntry", { timeout: 30000 }, () => {
    // Validates: Requirements 1.2
    fc.assert(
      fc.property(eventTriggerArb, (trigger) => {
        const session = makeMinimalSession();
        const store = makeMinimalStore();
        const entry = executeTrigger(trigger, session, store);

        expect(typeof entry.triggerId).toBe("string");
        expect(entry.triggerId.length).toBeGreaterThan(0);

        expect(typeof entry.triggerName).toBe("string");
        expect(entry.triggerName.length).toBeGreaterThan(0);

        expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

        expect(["success", "error"]).toContain(entry.outcome);
      }),
      { numRuns: 100 }
    );
  });
});
