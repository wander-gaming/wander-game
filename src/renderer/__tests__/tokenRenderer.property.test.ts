// Feature: wander-game, Property 14: Token size matches cell size
import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";

const mockStore = vi.hoisted(() => ({
  _state: {} as Record<string, unknown>,
  _subs: [] as Array<(s: unknown) => void>,
  getState() { return this._state; },
  subscribe(fn: (s: unknown) => void) {
    this._subs.push(fn);
    return () => { this._subs = this._subs.filter((x) => x !== fn); };
  },
  push(partial: Record<string, unknown>) {
    this._state = { ...this._state, ...partial };
    for (const fn of this._subs) fn(this._state);
  },
  reset() {
    this._state = {};
    this._subs = [];
  },
}));

vi.mock("@/store", () => ({ store: mockStore }));

vi.mock("pixi.js", () => {
  class Container {
    children: unknown[] = [];
    parent: any = null;
    position = { x: 0, y: 0, set(x: number, y: number) { this.x = x; this.y = y; } };
    zIndex = 0;
    sortableChildren = false;
    eventMode = "auto";
    cursor = "";
    mask: unknown = null;
    addChild(c: any) { c.parent = this; this.children.push(c); return c; }
    removeChild(c: unknown) { this.children = this.children.filter((x) => x !== c); return c; }
    removeFromParent() { if (this.parent) this.parent.removeChild(this); }
    on(_event: string, _fn: unknown) {}
  }

  class Graphics {
    _radius = 0;
    _color = 0;
    mask: unknown = null;
    blendMode = "normal";
    circle(_cx: number, _cy: number, r: number) { this._radius = r; return this; }
    fill(c: number) { this._color = c; return this; }
    rect() { return this; }
    clear() { return this; }
    beginFill() { return this; }
    endFill() { return this; }
    removeFromParent() {}
    addChild(c: unknown) { return c; }
  }

  class Text {
    text = "";
    position = { x: 0, y: 0, set(x: number, y: number) { this.x = x; this.y = y; } };
    constructor(opts: { text: string; style?: unknown }) { this.text = opts.text; }
    removeFromParent() {}
  }

  class Sprite {
    width = 0;
    height = 0;
    mask: unknown = null;
    static from(_url: string) { return new Sprite(); }
    removeFromParent() {}
  }

  class Application {
    stage = new Container();
    screen = { width: 800, height: 600 };
    ticker = { add: () => {} };
    canvas = typeof document !== "undefined" ? document.createElement("canvas") : {};
    async init() {}
    destroy() {}
  }

  return { Container, Graphics, Text, Sprite, Application };
});

const layerHolder = vi.hoisted(() => ({ layer: null as any }));

vi.mock("../layers", () => ({
  initLayers: () => {},
  getLayers: () => ({
    terrainLayer: { addChild: () => {}, children: [] },
    objectsLayer: { addChild: () => {}, children: [] },
    charactersLayer: layerHolder.layer,
    fogLayer: { addChild: () => {}, children: [] },
  }),
}));

import * as PIXI from "pixi.js";
import { initTokenRenderer } from "../tokenRenderer";

const now = new Date().toISOString();

function makeChar(id: string) {
  return { id, campaignId: "c1", name: "Hero", imageUrl: null, sheetId: "s1", tokenColor: "#3a86ff", schemaVersion: 1, createdAt: now, updatedAt: now };
}

function makeToken(charId: string) {
  return { id: "tok-1", characterId: charId, mapId: "m1", x: 0, y: 0, visionRadius: 3, hidden: false, ownerId: "u1", schemaVersion: 1, createdAt: now, updatedAt: now };
}

describe("Property 14: Token size matches cell size", () => {
  it("rendered mask radius equals cellSize / 2 for all valid cell sizes", () => {
    // **Validates: Requirements 6.1**
    const charArb = fc.record({ id: fc.uuid() });

    fc.assert(
      fc.property(fc.constantFrom(16 as const, 32 as const, 64 as const), charArb, (cellSize, charData) => {
        mockStore.reset();
        layerHolder.layer = new PIXI.Container();

        mockStore._state = {
          map: { id: "m1", width: 32, height: 32, tiles: {} },
          cellSize,
          tokens: [],
          characters: [],
          revealTiles: () => {},
          updateTokenPosition: () => {},
        };

        const app = new PIXI.Application();
        initTokenRenderer(app);

        const char = makeChar(charData.id);
        const token = makeToken(char.id);
        mockStore.push({ tokens: [token], characters: [char] });

        const container = layerHolder.layer.children.at(-1) as any;
        expect(container).toBeDefined();

        const mask = container?.children?.find((c: any) => c._radius !== undefined && c._radius > 0);
        expect(mask).toBeDefined();
        expect(mask._radius).toBe(cellSize / 2);
      })
    );
  });
});
