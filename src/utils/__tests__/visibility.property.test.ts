// Feature: wander-game, Property 5: Visibility by role
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { isVisibleTo } from "../visibility";

const arbElement = fc.record({ hidden: fc.boolean() });

describe("Property 5: Visibility by role", () => {
  it("hidden elements are never visible to players", () => {
    // **Validates: Requirements 2.2, 2.5**
    fc.assert(
      fc.property(fc.record({ hidden: fc.constant(true) }), (el) => {
        expect(isVisibleTo(el, "player")).toBe(false);
      })
    );
  });

  it("gm always sees every element", () => {
    // **Validates: Requirements 2.2, 2.5**
    fc.assert(
      fc.property(arbElement, (el) => {
        expect(isVisibleTo(el, "gm")).toBe(true);
      })
    );
  });

  it("non-hidden elements are visible to all roles", () => {
    // **Validates: Requirements 2.2, 2.5**
    fc.assert(
      fc.property(fc.record({ hidden: fc.constant(false) }), (el) => {
        expect(isVisibleTo(el, "player")).toBe(true);
        expect(isVisibleTo(el, "gm")).toBe(true);
        expect(isVisibleTo(el, "spectator")).toBe(true);
      })
    );
  });
});
