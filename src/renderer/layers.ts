import * as PIXI from "pixi.js";
import type { Container } from "pixi.js";

let terrainLayer: Container;
let objectsLayer: Container;
let charactersLayer: Container;
let fogLayer: Container;

export function initLayers(app: PIXI.Application): void {
  terrainLayer = new PIXI.Container();
  objectsLayer = new PIXI.Container();
  charactersLayer = new PIXI.Container();
  fogLayer = new PIXI.Container();

  terrainLayer.zIndex = 0;
  objectsLayer.zIndex = 1;
  charactersLayer.zIndex = 2;
  fogLayer.zIndex = 3;

  app.stage.sortableChildren = true;
  app.stage.addChild(terrainLayer);
  app.stage.addChild(objectsLayer);
  app.stage.addChild(charactersLayer);
  app.stage.addChild(fogLayer);
}

export function getLayers(): {
  terrainLayer: Container;
  objectsLayer: Container;
  charactersLayer: Container;
  fogLayer: Container;
} {
  return { terrainLayer, objectsLayer, charactersLayer, fogLayer };
}
