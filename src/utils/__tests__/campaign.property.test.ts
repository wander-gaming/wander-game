// Feature: wander-game, Property 20: Campaign serialization round-trip
// Feature: wander-game, Property 21: Deserialization validation
import * as fc from "fast-check";
import { serializeCampaign, deserializeCampaign } from "../campaign";
import { CampaignParseError } from "@/types";
import type {
  Campaign,
  GameMap,
  SheetTemplate,
  Character,
  CharacterSheet,
  Token,
  StoryGraph,
  EventTrigger,
  Tile,
  LayerConfig,
  FieldDefinition,
  SectionDefinition,
  TriggerCondition,
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

const terrainArb = fc.constantFrom(
  "grass" as const, "stone" as const, "dirt" as const,
  "water" as const, "sand" as const, "snow" as const, "void" as const
);

const structuralArb = fc.option(
  fc.constantFrom(
    "wall" as const, "door" as const, "window" as const,
    "stairs" as const, "furniture" as const
  ),
  { nil: null }
);

const tileArb: fc.Arbitrary<Tile> = fc.record({
  x: fc.integer({ min: 0, max: 100 }),
  y: fc.integer({ min: 0, max: 100 }),
  terrain: terrainArb,
  structuralElement: structuralArb,
  hidden: fc.boolean(),
  revealed: fc.boolean(),
});

const layerArb: fc.Arbitrary<LayerConfig> = fc.record({
  id: fc.uuid(),
  name: fc.constantFrom("Terrain" as const, "Objects" as const, "Characters" as const, "Fog" as const),
  zIndex: fc.integer({ min: 0, max: 10 }),
  visible: fc.boolean(),
});

const cellSizeArb = fc.constantFrom(16 as const, 32 as const, 64 as const);

const gameMapArb: fc.Arbitrary<GameMap> = stateObjectFields.chain((base) =>
  fc.record({
    campaignId: fc.uuid(),
    name: fc.string({ minLength: 1 }),
    width: fc.integer({ min: 1, max: 50 }),
    height: fc.integer({ min: 1, max: 50 }),
    cellSize: cellSizeArb,
    tiles: fc.dictionary(
      fc.string({ minLength: 1, maxLength: 10 }),
      tileArb,
      { maxKeys: 5 }
    ),
    layers: fc.array(layerArb, { maxLength: 4 }),
  }).map((rest) => ({ ...base, ...rest }))
);

const fieldTypeArb = fc.constantFrom(
  "text" as const, "numeric" as const, "checkbox" as const, "dropdown" as const
);

const fieldDefArb: fc.Arbitrary<FieldDefinition> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1 }),
  type: fieldTypeArb,
  defaultValue: fc.oneof(fc.string(), fc.integer(), fc.boolean()),
});

const sectionDefArb: fc.Arbitrary<SectionDefinition> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1 }),
  fieldIds: fc.array(fc.uuid(), { maxLength: 5 }),
});

const sheetTemplateArb: fc.Arbitrary<SheetTemplate> = stateObjectFields.chain((base) =>
  fc.record({
    campaignId: fc.uuid(),
    name: fc.string({ minLength: 1 }),
    fields: fc.array(fieldDefArb, { maxLength: 5 }),
    sections: fc.array(sectionDefArb, { maxLength: 3 }),
  }).map((rest) => ({ ...base, ...rest }))
);

const characterArb: fc.Arbitrary<Character> = stateObjectFields.chain((base) =>
  fc.record({
    campaignId: fc.uuid(),
    name: fc.string({ minLength: 1 }),
    imageUrl: fc.option(fc.webUrl(), { nil: null }),
    sheetId: fc.uuid(),
    tokenColor: fc.stringMatching(/^[0-9a-f]{6}$/).map((h) => `#${h}`),
  }).map((rest) => ({ ...base, ...rest }))
);

const characterSheetArb: fc.Arbitrary<CharacterSheet> = stateObjectFields.chain((base) =>
  fc.record({
    campaignId: fc.uuid(),
    templateId: fc.uuid(),
    characterId: fc.uuid(),
    values: fc.dictionary(
      fc.string({ minLength: 1, maxLength: 10 }),
      fc.oneof(fc.string(), fc.integer(), fc.boolean()),
      { maxKeys: 5 }
    ),
  }).map((rest) => ({ ...base, ...rest }))
);

const tokenArb: fc.Arbitrary<Token> = stateObjectFields.chain((base) =>
  fc.record({
    characterId: fc.uuid(),
    mapId: fc.uuid(),
    x: fc.integer({ min: 0, max: 100 }),
    y: fc.integer({ min: 0, max: 100 }),
    visionRadius: fc.integer({ min: 0, max: 20 }),
    hidden: fc.boolean(),
    ownerId: fc.uuid(),
  }).map((rest) => ({ ...base, ...rest }))
);

const storyNodeArb = stateObjectFields.chain((base) =>
  fc.record({
    campaignId: fc.uuid(),
    label: fc.string({ minLength: 1 }),
    description: fc.string(),
    position: fc.record({ x: fc.integer(), y: fc.integer() }),
  }).map((rest) => ({ ...base, ...rest }))
);

const storyEdgeArb = stateObjectFields.chain((base) =>
  fc.record({
    campaignId: fc.uuid(),
    sourceId: fc.uuid(),
    targetId: fc.uuid(),
    label: fc.string(),
  }).map((rest) => ({ ...base, ...rest }))
);

const storyGraphArb: fc.Arbitrary<StoryGraph> = fc.record({
  nodes: fc.array(storyNodeArb, { maxLength: 5 }),
  edges: fc.array(storyEdgeArb, { maxLength: 5 }),
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

const campaignArb: fc.Arbitrary<Campaign> = stateObjectFields.chain((base) =>
  fc.record({
    name: fc.string({ minLength: 1 }),
    ownerId: fc.uuid(),
    maps: fc.array(gameMapArb, { maxLength: 2 }),
    templates: fc.array(sheetTemplateArb, { maxLength: 2 }),
    characters: fc.array(characterArb, { maxLength: 2 }),
    sheets: fc.array(characterSheetArb, { maxLength: 2 }),
    tokens: fc.array(tokenArb, { maxLength: 2 }),
    story: storyGraphArb,
    triggers: fc.array(eventTriggerArb, { maxLength: 2 }),
  }).map((rest) => ({ ...base, ...rest }))
);

describe("Property 20: Campaign serialization round-trip", () => {
  it("deserialize(serialize(C)) deeply equals C and second serialize is identical", () => {
    // Validates: Requirements 8.1
    fc.assert(
      fc.property(campaignArb, (campaign) => {
        const json1 = serializeCampaign(campaign);
        const roundTripped = deserializeCampaign(json1);
        const json2 = serializeCampaign(roundTripped);

        expect(roundTripped).toEqual(campaign);
        expect(json2).toBe(json1);
      })
    );
  });
});

describe("Property 21: Deserialization validation", () => {
  it("throws CampaignParseError for random non-JSON strings", () => {
    // Validates: Requirements 8.2
    const notJson = fc.string().filter((s) => {
      try { JSON.parse(s); return false; } catch { return true; }
    });

    fc.assert(
      fc.property(notJson, (s) => {
        expect(() => deserializeCampaign(s)).toThrow(CampaignParseError);
      })
    );
  });

  it("throws CampaignParseError for valid JSON missing required Campaign fields", () => {
    // Validates: Requirements 8.2
    const required = ["id", "name", "ownerId", "maps", "templates", "characters", "sheets", "tokens", "story", "triggers"];

    const missingFieldArb = fc.subarray(required, { minLength: 1 }).chain((toRemove) =>
      campaignArb.map((c) => {
        const obj = JSON.parse(serializeCampaign(c)) as Record<string, unknown>;
        for (const key of toRemove) delete obj[key];
        return JSON.stringify(obj);
      })
    );

    fc.assert(
      fc.property(missingFieldArb, (json) => {
        expect(() => deserializeCampaign(json)).toThrow(CampaignParseError);
      })
    );
  });

  it("throws CampaignParseError for invalid schemaVersion (0, negative, non-number)", () => {
    // Validates: Requirements 8.2
    const badVersionArb = fc.oneof(
      fc.constant(0),
      fc.integer({ max: -1 }),
      fc.string(),
      fc.constant(null),
      fc.constant(undefined),
      fc.double({ min: -999, max: -0.001 }),
    );

    fc.assert(
      fc.property(campaignArb, badVersionArb, (c, badVersion) => {
        const obj = JSON.parse(serializeCampaign(c)) as Record<string, unknown>;
        obj["schemaVersion"] = badVersion;
        const json = JSON.stringify(obj);
        expect(() => deserializeCampaign(json)).toThrow(CampaignParseError);
      })
    );
  });
});
