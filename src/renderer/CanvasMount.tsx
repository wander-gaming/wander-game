import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { initRenderer } from "./initRenderer";

export function CanvasMount() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const app = new PIXI.Application();
    let initialized = false;
    let cancelled = false;

    (async () => {
      await app.init({ resizeTo: container });
      if (cancelled) {
        app.destroy();
        return;
      }
      initialized = true;
      container.appendChild(app.canvas);
      initRenderer(app);
    })();

    return () => {
      cancelled = true;
      if (initialized) {
        app.destroy();
      }
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
