import * as PIXI from "pixi.js";
import { store } from "@/store";
import { getLayers } from "./layers";

let overlay: PIXI.Graphics;
let eraser: PIXI.Graphics;

export function initFogRenderer(app: PIXI.Application): void {
  const { fogLayer } = getLayers();

  overlay = new PIXI.Graphics();
  eraser = new PIXI.Graphics();
  eraser.blendMode = "erase";

  fogLayer.addChild(overlay);
  fogLayer.addChild(eraser);

  app.ticker.add(() => {
    const state = store.getState();
    const { map, session, cellSize } = state;
    const godMode = session?.godModeEnabled ?? false;
    const sessionActive = session !== null;

    // only apply fog during an active session
    fogLayer.visible = sessionActive && !godMode;

    if (!map || !sessionActive || godMode) return;

    const w = app.screen.width;
    const h = app.screen.height;

    overlay.clear();
    overlay.rect(0, 0, w, h).fill(0x000000);

    eraser.clear();
    for (const tile of Object.values(map.tiles)) {
      if (!tile.revealed) continue;
      eraser.rect(tile.x * cellSize, tile.y * cellSize, cellSize, cellSize).fill(0xffffff);
    }
  });
}
