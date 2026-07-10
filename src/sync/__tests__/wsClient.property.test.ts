// Feature: wander-game, Property 19: Session state restoration completeness
import * as fc from "fast-check";
import { store } from "@/store";
import type { Campaign, GameMap, Session, Token, Participant, LayerConfig, Tile } from "@/types";

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

const tileArb: fc.Arbitrary<Tile> = fc.record({
  x: fc.integer({ min: 0, max: 100 }),
  y: fc.integer({ min: 0, max: 100 }),
  terrain: terrainArb,
  structuralElement: fc.option(
    fc.constantFrom("wall" as const, "door" as const, "window" as const, "stairs" as const, "furniture" as const),
    { nil: null }
  ),
  hidden: fc.boolean(),
  revealed: fc.boolean(),
});

const layerArb: fc.Arbitrary<LayerConfig> = fc.record({
  id: fc.uuid(),
  name: fc.constantFrom("Terrain" as const, "Objects" as const, "Characters" as const, "Fog" as const),
  zIndex: fc.integer({ min: 0, max: 10 }),
  visible: fc.boolean(),
});

const gameMapArb: fc.Arbitrary<GameMap> = stateObjectFields.chain((base) =>
  fc.record({
    campaignId: fc.uuid(),
    name: fc.string({ minLength: 1 }),
    width: fc.integer({ min: 1, max: 50 }),
    height: fc.integer({ min: 1, max: 50 }),
    cellSize: fc.constantFrom(16 as const, 32 as const, 64 as const),
    tiles: fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), tileArb, { maxKeys: 5 }),
    layers: fc.array(layerArb, { maxLength: 4 }),
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

const participantArb: fc.Arbitrary<Participant> = fc.record({
  userId: fc.uuid(),
  displayName: fc.string({ minLength: 1 }),
  role: fc.constantFrom("gm" as const, "player" as const, "spectator" as const),
  characterId: fc.option(fc.uuid(), { nil: null }),
  connected: fc.boolean(),
});

const campaignArb: fc.Arbitrary<Campaign> = stateObjectFields.chain((base) =>
  fc.record({
    name: fc.string({ minLength: 1 }),
    ownerId: fc.uuid(),
    maps: fc.array(gameMapArb, { minLength: 1, maxLength: 2 }),
    templates: fc.constant([] as Campaign["templates"]),
    characters: fc.constant([] as Campaign["characters"]),
    sheets: fc.constant([] as Campaign["sheets"]),
    tokens: fc.array(tokenArb, { maxLength: 3 }),
    story: fc.constant({ nodes: [] as Campaign["story"]["nodes"], edges: [] as Campaign["story"]["edges"] }),
    triggers: fc.constant([] as Campaign["triggers"]),
  }).map((rest) => ({ ...base, ...rest }))
);

const sessionArb: fc.Arbitrary<Session> = stateObjectFields.chain((base) =>
  fc.record({
    campaignId: fc.uuid(),
    participants: fc.array(participantArb, { maxLength: 4 }),
    activeMapId: fc.uuid(),
    godModeEnabled: fc.boolean(),
    playerMovementEnabled: fc.boolean(),
    eventLog: fc.constant([] as Session["eventLog"]),
  }).map((rest) => ({ ...base, ...rest }))
);

describe("Property 19: Session state restoration completeness", () => {
  beforeEach(() => {
    store.setState({ session: null, participants: [], tokens: [] });
  });

  it("snapshot application restores session, map, tokens and participants", { timeout: 30000 }, () => {
    // Validates: Requirements 11.1
    fc.assert(
      fc.property(campaignArb, sessionArb, (campaign, session) => {
        store.setState({ session: null, participants: [], tokens: [] });

        const s = store.getState();
        s.setSession(session);
        if (campaign.maps[0]) {
          store.setState({ map: campaign.maps[0] });
        }
        s.setTokens(campaign.tokens);
        session.participants.forEach((p) => s.upsertParticipant(p));

        const state = store.getState();

        expect(state.session).toEqual(session);

        if (campaign.maps[0]) {
          expect(state.map).toEqual(campaign.maps[0]);
        }

        expect(state.tokens).toEqual(campaign.tokens);

        session.participants.forEach((p) => {
          const found = state.participants.find((sp) => sp.userId === p.userId);
          expect(found).toEqual(p);
        });
      }),
      { numRuns: 50 }
    );
  });
});
