import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { initRenderer } from "./initRenderer";

export function CanvasMount() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const app = new PIXI.Application();
    let mounted = true;

    (async () => {
      await app.init({ resizeTo: container });
      if (!mounted) {
        app.destroy(true);
        return;
      }
      container.appendChild(app.canvas);
      initRenderer(app);
    })();

    return () => {
      mounted = false;
      app.destroy(true);
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
