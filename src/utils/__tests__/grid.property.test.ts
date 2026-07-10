// Feature: wander-game, Property 3: Grid snap correctness
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { snapToGrid } from "../grid";

describe("snapToGrid", () => {
  it("Property 3: snapped cell center is within cellSize/2 of the original pixel", () => {
    // **Validates: Requirements 1.3**
    fc.assert(
      fc.property(
        fc.tuple(fc.integer(), fc.integer(), fc.constantFrom(16 as const, 32 as const, 64 as const)),
        ([pixelX, pixelY, cellSize]) => {
          const result = snapToGrid(pixelX, pixelY, cellSize);
          expect(Math.abs(result.x * cellSize - pixelX)).toBeLessThanOrEqual(cellSize / 2);
          expect(Math.abs(result.y * cellSize - pixelY)).toBeLessThanOrEqual(cellSize / 2);
        }
      )
    );
  });
});
