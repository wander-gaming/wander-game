import * as PIXI from "pixi.js";
import { store } from "@/store";
import { getLayers } from "./layers";
import type { Token, Character, CellSize, StateDelta } from "@/types";

type SyncClient = { sendDelta: (delta: StateDelta) => void };
let syncClient: SyncClient | null = null;

export function setSyncClient(client: SyncClient): void {
  syncClient = client;
}

let tokenContainers = new Map<string, PIXI.Container>();

function buildMask(radius: number): PIXI.Graphics {
  const g = new PIXI.Graphics();
  g.circle(radius, radius, radius).fill(0xffffff);
  return g;
}

function buildColorFill(radius: number, color: number): PIXI.Graphics {
  const g = new PIXI.Graphics();
  g.circle(radius, radius, radius).fill(color);
  return g;
}

function buildLabel(name: string, cellSize: CellSize): PIXI.Text {
  const label = new PIXI.Text({ text: name, style: { fontSize: 10, fill: 0xffffff } });
  label.position.set(0, cellSize + 2);
  return label;
}

function hexColor(css: string): number {
  return parseInt(css.replace("#", ""), 16);
}

function createTokenContainer(
  token: Token,
  char: Character,
  cellSize: CellSize
): PIXI.Container {
  const container = new PIXI.Container();
  container.position.set(token.x * cellSize, token.y * cellSize);

  const radius = cellSize / 2;
  const mask = buildMask(radius);
  container.addChild(mask);

  const color = hexColor(char.tokenColor);
  const fill = buildColorFill(radius, color);
  fill.mask = mask;
  container.addChild(fill);

  if (char.imageUrl) {
    const sprite = PIXI.Sprite.from(char.imageUrl);
    sprite.width = cellSize;
    sprite.height = cellSize;
    sprite.mask = mask;
    container.addChild(sprite);
  }

  const label = buildLabel(char.name, cellSize);
  container.addChild(label);

  container.eventMode = "static";
  container.cursor = "pointer";

  let dragging = false;
  let startPos = { x: 0, y: 0 };

  container.on("pointerdown", (e: PIXI.FederatedPointerEvent) => {
    dragging = true;
    startPos = { x: e.globalX, y: e.globalY };
  });

  container.on("pointermove", (e: PIXI.FederatedPointerEvent) => {
    if (!dragging) return;
    const { map, cellSize: cs } = store.getState();
    if (!map) return;

    const dx = e.globalX - startPos.x;
    const dy = e.globalY - startPos.y;
    const newX = Math.max(0, Math.min(map.width - 1, Math.round((token.x * cs + dx) / cs)));
    const newY = Math.max(0, Math.min(map.height - 1, Math.round((token.y * cs + dy) / cs)));

    container.position.set(newX * cs, newY * cs);
  });

  container.on("pointerup", (e: PIXI.FederatedPointerEvent) => {
    if (!dragging) return;
    dragging = false;

    const { map, cellSize: cs, updateTokenPosition, revealTiles } = store.getState();
    if (!map) return;

    const dx = e.globalX - startPos.x;
    const dy = e.globalY - startPos.y;
    const newX = Math.max(0, Math.min(map.width - 1, Math.round((token.x * cs + dx) / cs)));
    const newY = Math.max(0, Math.min(map.height - 1, Math.round((token.y * cs + dy) / cs)));

    updateTokenPosition(token.id, newX, newY);
    revealTiles(newX, newY, token.visionRadius, token.mapId);
    syncClient?.sendDelta({ entity: "token", id: token.id, patch: { x: newX, y: newY } });
  });

  container.on("pointerupoutside", () => {
    dragging = false;
  });

  return container;
}

export function initTokenRenderer(_app: PIXI.Application): void {
  tokenContainers = new Map();
  store.subscribe((state) => {
    const { tokens, characters, cellSize, map } = state;
    if (!map) return;

    const { charactersLayer } = getLayers();
    const currentIds = new Set(tokens.map((t) => t.id));

    for (const [id, container] of tokenContainers) {
      if (!currentIds.has(id)) {
        container.removeFromParent();
        tokenContainers.delete(id);
      }
    }

    for (const token of tokens) {
      const char = characters.find((c) => c.id === token.characterId);
      if (!char) continue;

      if (!tokenContainers.has(token.id)) {
        const container = createTokenContainer(token, char, cellSize);
        charactersLayer.addChild(container);
        tokenContainers.set(token.id, container);
      } else {
        const container = tokenContainers.get(token.id)!;
        container.position.set(token.x * cellSize, token.y * cellSize);
      }
    }
  });
}
