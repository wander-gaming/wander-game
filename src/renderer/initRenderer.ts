import * as PIXI from "pixi.js";
import { initLayers } from "./layers";
import { initViewport } from "./viewport";
import { initFogRenderer } from "./fogRenderer";

export function initRenderer(app: PIXI.Application): void {
  initLayers(app);
  initViewport(app);
  initFogRenderer(app);
}
