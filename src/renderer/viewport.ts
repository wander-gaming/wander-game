import * as PIXI from "pixi.js";
import type { Container } from "pixi.js";
import { store } from "@/store";

let worldContainer: Container;

export function initViewport(app: PIXI.Application): void {
  worldContainer = new PIXI.Container();
  app.stage.addChild(worldContainer);

  store.subscribe((state) => {
    worldContainer.scale.set(state.zoom);
    worldContainer.position.set(state.pan.x, state.pan.y);
  });
}

export function getWorldContainer(): Container {
  return worldContainer;
}
