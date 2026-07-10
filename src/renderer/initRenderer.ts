import * as PIXI from "pixi.js";
import { initLayers } from "./layers";
import { initViewport } from "./viewport";

export function initRenderer(app: PIXI.Application): void {
  initLayers(app);
  initViewport(app);
}
