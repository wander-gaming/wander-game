import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("pixi.js", () => {
  class Container {
    children: unknown[] = [];
    parent: Container | null = null;
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

const mockLayerHolder = { charactersLayer: null as unknown };

vi.mock("../layers", () => {
  return {
    initLayers: () => {},
    getLayers: () => ({
      terrainLayer: { addChild: () => {}, children: [] },
      objectsLayer: { addChild: () => {}, children: [] },
      charactersLayer: mockLayerHolder.charactersLayer,
      fogLayer: { addChild: () => {}, children: [] },
    }),
  };
});

let mockStoreState: Record<string, unknown> = {};
let subscribers: Array<(s: unknown) => void> = [];

vi.mock("@/store", () => {
  const storeObj = {
    getState: () => mockStoreState,
    subscribe: (fn: (s: unknown) => void) => {
      subscribers.push(fn);
      return () => { subscribers = subscribers.filter((x) => x !== fn); };
    },
  };
  return { store: storeObj };
});

import * as PIXI from "pixi.js";
import { initTokenRenderer } from "../tokenRenderer";

const now = new Date().toISOString();

function baseState(overrides: Record<string, unknown> = {}) {
  return {
    map: { id: "m1", width: 32, height: 32, tiles: {} },
    cellSize: 32,
    zoom: 1,
    pan: { x: 0, y: 0 },
    tokens: [],
    characters: [],
    session: null,
    revealTiles: vi.fn(),
    updateTokenPosition: vi.fn(),
    ...overrides,
  };
}

function setState(partial: Record<string, unknown>) {
  mockStoreState = { ...mockStoreState, ...partial };
  for (const fn of subscribers) fn(mockStoreState);
}

function char(id: string, name: string, tokenColor: string, imageUrl: string | null = null) {
  return { id, campaignId: "c1", name, imageUrl, sheetId: "s1", tokenColor, schemaVersion: 1, createdAt: now, updatedAt: now };
}

function token(id: string, charId: string, x = 2, y = 3) {
  return { id, characterId: charId, mapId: "m1", x, y, visionRadius: 3, hidden: false, ownerId: "u1", schemaVersion: 1, createdAt: now, updatedAt: now };
}

beforeEach(() => {
  mockLayerHolder.charactersLayer = new PIXI.Container();
  mockStoreState = baseState();
  subscribers = [];
  const app = new PIXI.Application();
  initTokenRenderer(app);
});

describe("tokenRenderer", () => {
  it("adds a container to charactersLayer when a token is set", () => {
    const c = char("c1", "Arya", "#ff0000");
    const t = token("tok-1", "c1");
    setState({ tokens: [t], characters: [c] });
    expect((mockLayerHolder.charactersLayer as any).children.length).toBeGreaterThan(0);
  });

  it("positions token container at (x * cellSize, y * cellSize)", () => {
    const c = char("c1", "Arya", "#ff0000");
    const t = token("tok-1", "c1", 4, 5);
    setState({ tokens: [t], characters: [c] });
    const container = (mockLayerHolder.charactersLayer as any).children.at(-1) as any;
    expect(container.position.x).toBe(4 * 32);
    expect(container.position.y).toBe(5 * 32);
  });

  it("includes a Graphics mask with radius = cellSize / 2", () => {
    const c = char("c1", "Arya", "#00ff00");
    const t = token("tok-1", "c1");
    setState({ tokens: [t], characters: [c], cellSize: 64 });
    const container = (mockLayerHolder.charactersLayer as any).children.at(-1) as any;
    const mask = container.children.find((ch: any) => ch._radius !== undefined && ch._radius > 0);
    expect(mask).toBeDefined();
    expect(mask._radius).toBe(32);
  });

  it("includes a Text label with the character name", () => {
    const c = char("c1", "Gandalf", "#ffffff");
    const t = token("tok-1", "c1");
    setState({ tokens: [t], characters: [c] });
    const container = (mockLayerHolder.charactersLayer as any).children.at(-1) as any;
    const label = container.children.find((ch: any) => ch.text === "Gandalf");
    expect(label).toBeDefined();
  });

  it("uses tokenColor as fallback fill when imageUrl is null", () => {
    const c = char("c1", "Merlin", "#3a86ff");
    const t = token("tok-1", "c1");
    setState({ tokens: [t], characters: [c] });
    const container = (mockLayerHolder.charactersLayer as any).children.at(-1) as any;
    const fill = container.children.find((ch: any) => ch._color === parseInt("3a86ff", 16));
    expect(fill).toBeDefined();
  });

  it("adds a Sprite when character has imageUrl", () => {
    const c = char("c1", "Frodo", "#000000", "https://example.com/img.png");
    const t = token("tok-1", "c1");
    setState({ tokens: [t], characters: [c] });
    const container = (mockLayerHolder.charactersLayer as any).children.at(-1) as any;
    const sprite = container.children.find((ch: any) => ch.constructor.name === "Sprite");
    expect(sprite).toBeDefined();
  });

  it("removes container when token is removed from state", () => {
    const c = char("c1", "Sam", "#ffaa00");
    const t = token("tok-1", "c1");
    setState({ tokens: [t], characters: [c] });
    expect((mockLayerHolder.charactersLayer as any).children.length).toBeGreaterThan(0);
    setState({ tokens: [] });
    expect((mockLayerHolder.charactersLayer as any).children.length).toBe(0);
  });

  it("updates position when token coordinates change", () => {
    const c = char("c1", "Legolas", "#aaddff");
    const t = token("tok-1", "c1", 1, 1);
    setState({ tokens: [t], characters: [c] });
    setState({ tokens: [{ ...t, x: 5, y: 7 }] });
    const container = (mockLayerHolder.charactersLayer as any).children.at(-1) as any;
    expect(container.position.x).toBe(5 * 32);
    expect(container.position.y).toBe(7 * 32);
  });
});
