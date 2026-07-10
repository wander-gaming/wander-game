// Feature: wander-game, Property 1: Zoom clamping
// Feature: wander-game, Property 2: Undo/redo round-trip
import * as fc from "fast-check";
import { create } from "zustand";
import { createMapSlice, type MapSlice } from "../mapSlice";
import type { GameMap, TerrainType } from "@/types";

const terrains: TerrainType[] = ["grass", "stone", "dirt", "water", "sand", "snow", "void"];

function makeInitialMap(): GameMap {
  const tiles: GameMap["tiles"] = {};
  for (let x = 0; x < 4; x++) {
    for (let y = 0; y < 4; y++) {
      tiles[`${x},${y}`] = { x, y, terrain: "grass", structuralElement: null, hidden: false, revealed: false };
    }
  }
  return {
    id: "test-map",
    schemaVersion: 1,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    campaignId: "test-campaign",
    name: "Test Map",
    width: 4,
    height: 4,
    cellSize: 32,
    tiles,
    layers: [],
  };
}

const arbPaintOp = fc.record({
  x: fc.integer({ min: 0, max: 3 }),
  y: fc.integer({ min: 0, max: 3 }),
  terrain: fc.constantFrom(...terrains),
});

describe("Property 1: Zoom clamping", () => {
  it("zoom is always in [0.25, 4.0]", () => {
    // Validates: Requirements 1.4
    const store = create<MapSlice>()((...a) => createMapSlice(...a));
    fc.assert(
      fc.property(fc.float({ noNaN: true }), (z) => {
        store.getState().setZoom(z);
        const zoom = store.getState().zoom;
        return zoom >= 0.25 && zoom <= 4.0;
      })
    );
  });
});

describe("Property 2: Undo/redo round-trip", () => {
  it("undo-all then redo-all restores post-mutation state", () => {
    // Validates: Requirements 1.5, 1.6
    fc.assert(
      fc.property(fc.array(arbPaintOp, { minLength: 1, maxLength: 20 }), (ops) => {
        const store = create<MapSlice>()((...a) => createMapSlice(...a));
        store.setState({ map: makeInitialMap() });

        for (const op of ops) {
          store.getState().paintTile(op.x, op.y, op.terrain);
        }

        const snapshot = store.getState().map;

        const undoCount = store.getState().undoStack.length;
        for (let i = 0; i < undoCount; i++) {
          store.getState().undo();
        }

        const redoCount = store.getState().redoStack.length;
        for (let i = 0; i < redoCount; i++) {
          store.getState().redo();
        }

        expect(store.getState().map).toEqual(snapshot);
      })
    );
  });
});

// Feature: wander-game, Property 6: Fog reveal radius
describe("Property 6: Fog reveal radius", () => {
  it("all tiles within Chebyshev radius are revealed", { timeout: 15000 }, () => {
    // **Validates: Requirements 2.4**
    fc.assert(
      fc.property(
        fc.record({
          tx: fc.integer({ min: 0, max: 9 }),
          ty: fc.integer({ min: 0, max: 9 }),
          r: fc.integer({ min: 0, max: 3 }),
        }),
        ({ tx, ty, r }) => {
          const tiles: GameMap["tiles"] = {};
          for (let x = 0; x < 10; x++) {
            for (let y = 0; y < 10; y++) {
              tiles[`${x},${y}`] = { x, y, terrain: "grass", structuralElement: null, hidden: false, revealed: false };
            }
          }
          const map: GameMap = {
            id: "fog-test",
            schemaVersion: 1,
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
            campaignId: "test-campaign",
            name: "Fog Test Map",
            width: 10,
            height: 10,
            cellSize: 32,
            tiles,
            layers: [],
          };

          const store = create<MapSlice>()((...a) => createMapSlice(...a));
          store.setState({ map });
          store.getState().revealTiles(tx, ty, r, "fog-test");

          const resultMap = store.getState().map!;
          for (let x = 0; x < 10; x++) {
            for (let y = 0; y < 10; y++) {
              if (Math.max(Math.abs(x - tx), Math.abs(y - ty)) <= r) {
                expect(resultMap.tiles[`${x},${y}`].revealed).toBe(true);
              }
            }
          }
        }
      )
    );
  });
});
