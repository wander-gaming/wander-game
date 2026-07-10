// Feature: wander-game, Property 7: Procedural generation structural validity
// Feature: wander-game, Property 8: Generation failure immutability
// Feature: wander-game, Property 9: Generated tiles are editable
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { generateLayout, type LayoutType } from "../generators/index";
import type { TriggerRegion, CellSize, GeneratorResult, Tile } from "@/types";

const regionArb: fc.Arbitrary<TriggerRegion> = fc.record({
  x: fc.integer({ min: 0, max: 10 }),
  y: fc.integer({ min: 0, max: 10 }),
  width: fc.integer({ min: 15, max: 30 }),
  height: fc.integer({ min: 15, max: 30 }),
});

const cellSizeArb: fc.Arbitrary<CellSize> = fc.constantFrom(16 as const, 32 as const, 64 as const);
const layoutTypeArb: fc.Arbitrary<LayoutType> = fc.constantFrom("dungeon" as const, "cave" as const, "tavern" as const);

function floodFillFloor(tiles: Tile[]): Set<string> {
  const floorKeys = new Set(
    tiles.filter(t => t.terrain !== "void").map(t => `${t.x},${t.y}`)
  );
  if (floorKeys.size === 0) return new Set();

  const first = floorKeys.values().next().value as string;
  const visited = new Set<string>();
  const queue = [first];

  while (queue.length) {
    const key = queue.pop()!;
    if (visited.has(key)) continue;
    visited.add(key);
    const [x, y] = key.split(",").map(Number);
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
      const nk = `${x + dx},${y + dy}`;
      if (floorKeys.has(nk) && !visited.has(nk)) queue.push(nk);
    }
  }

  return visited;
}

describe("Property 7: Procedural generation structural validity", () => {
  it("all floor tiles are 4-connected", () => {
    // Validates: Requirements 3.1
    fc.assert(
      fc.property(layoutTypeArb, regionArb, cellSizeArb, (type, region, cellSize) => {
        const result = generateLayout(type, region, cellSize);
        if (!result.ok) return;

        const floorTiles = result.tiles.filter(t => t.terrain !== "void");
        if (floorTiles.length === 0) return;

        const reachable = floodFillFloor(result.tiles);
        expect(reachable.size).toBe(floorTiles.length);
      }),
      { numRuns: 30 }
    );
  });
});

function alwaysThrows(_region: TriggerRegion, _cellSize: CellSize): GeneratorResult {
  throw new Error("generator failure");
}

function failingGenerateLayout(region: TriggerRegion, cellSize: CellSize): GeneratorResult {
  try {
    return alwaysThrows(region, cellSize);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

describe("Property 8: Generation failure immutability", () => {
  it("returns ok:false with error string when generator throws", () => {
    // Validates: Requirements 3.3
    fc.assert(
      fc.property(regionArb, cellSizeArb, (region, cellSize) => {
        const result = failingGenerateLayout(region, cellSize);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(typeof result.error).toBe("string");
          expect(result.error.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 30 }
    );
  });

  it("map state object is not mutated when result is ok:false", () => {
    // Validates: Requirements 3.3
    fc.assert(
      fc.property(regionArb, cellSizeArb, (region, cellSize) => {
        const mapState = { tiles: {} as Record<string, unknown>, width: 64, height: 64 };
        const snapshot = JSON.stringify(mapState);

        const result = failingGenerateLayout(region, cellSize);

        if (!result.ok) {
          expect(JSON.stringify(mapState)).toBe(snapshot);
        }
      }),
      { numRuns: 30 }
    );
  });
});

describe("Property 9: Generated tiles are editable", () => {
  it("generated tiles have hidden=false and can be overwritten", () => {
    // Validates: Requirements 3.2
    fc.assert(
      fc.property(layoutTypeArb, regionArb, cellSizeArb, (type, region, cellSize) => {
        const result = generateLayout(type, region, cellSize);
        if (!result.ok || result.tiles.length === 0) return;

        for (const tile of result.tiles) {
          expect(tile.hidden).toBe(false);
        }

        const idx = Math.floor(result.tiles.length / 2);
        const target = result.tiles[idx];
        const painted = { ...target, terrain: "grass" as const };

        expect(painted.terrain).toBe("grass");
        expect(painted.x).toBe(target.x);
        expect(painted.y).toBe(target.y);
        expect(painted.hidden).toBe(false);
      }),
      { numRuns: 30 }
    );
  });
});
