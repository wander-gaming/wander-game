// Feature: wander-game, Property 4: Layer z-order invariant
import { describe, it, expect, vi, beforeAll } from "vitest";
import * as fc from "fast-check";

vi.mock("pixi.js", () => {
  class Container {
    zIndex = 0;
    sortableChildren = false;
    children: Container[] = [];
    addChild(c: Container) {
      this.children.push(c);
      return c;
    }
  }
  return {
    Container,
    Application: class {
      stage = new Container();
      canvas = document.createElement("canvas");
      async init() {}
      destroy() {}
    },
  };
});

import { initLayers, getLayers } from "../layers";
import * as PIXI from "pixi.js";

describe("layers", () => {
  beforeAll(() => {
    const app = new PIXI.Application();
    initLayers(app);
  });

  it("Property 4: layer z-order is terrain < objects < characters < fog", () => {
    // **Validates: Requirements 2.1**
    fc.assert(
      fc.property(fc.constant(null), () => {
        const { terrainLayer, objectsLayer, charactersLayer, fogLayer } = getLayers();
        expect(terrainLayer.zIndex).toBeLessThan(objectsLayer.zIndex);
        expect(objectsLayer.zIndex).toBeLessThan(charactersLayer.zIndex);
        expect(charactersLayer.zIndex).toBeLessThan(fogLayer.zIndex);
      })
    );
  });
});
