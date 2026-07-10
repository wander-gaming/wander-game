import type { WebSocket } from "ws";
import type { SessionRoom, ClientSocket, StateDelta, WsMessage } from "../types";
import type { StateStore } from "../state/StateStore";

const GM_ONLY_ENTITIES = new Set(["tile", "fog", "trigger", "story"]);

function canSendDelta(client: ClientSocket, delta: StateDelta): boolean {
  if (client.role === "gm") return true;
  if (delta.entity === "token") {
    return true;
  }
  if (GM_ONLY_ENTITIES.has(delta.entity)) return false;
  return true;
}

function applyDelta(room: SessionRoom, delta: StateDelta): void {
  if (delta.entity === "token") return;

  if (delta.entity === "tile") {
    const map = room.campaign.maps.find(m => m.id === delta.mapId);
    if (!map) return;
    const key = `${delta.x},${delta.y}`;
    if (map.tiles[key]) {
      Object.assign(map.tiles[key], delta.patch);
    }
    return;
  }

  if (delta.entity === "sheet") {
    const sheet = room.campaign.sheets.find(s => s.id === delta.id);
    if (sheet) {
      sheet.values[delta.fieldId] = delta.value;
    }
    return;
  }

  if (delta.entity === "chat") {
    room.session.eventLog;
    return;
  }

  if (delta.entity === "fog") {
    const map = room.campaign.maps.find(m => m.id === delta.mapId);
    if (!map) return;
    for (const [x, y] of delta.revealed) {
      const key = `${x},${y}`;
      if (map.tiles[key]) {
        map.tiles[key].revealed = true;
      }
    }
    return;
  }

  if (delta.entity === "trigger") {
    room.session.eventLog.push(delta.logEntry);
    return;
  }

  if (delta.entity === "story") {
    Object.assign(room.campaign.story, delta.patch);
    return;
  }
}

function broadcast(room: SessionRoom, message: WsMessage, excludeWs?: WebSocket): void {
  const payload = JSON.stringify(message);
  for (const client of room.clients) {
    if (client.ws !== excludeWs && client.ws.readyState === 1) {
      client.ws.send(payload);
    }
  }
}

export class DeltaRouter {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private store: StateStore) {}

  route(room: SessionRoom, sender: ClientSocket, delta: StateDelta): void {
    if (!canSendDelta(sender, delta)) return;

    if (delta.entity === "token") {
      broadcast(room, {
        type: "state_delta",
        sessionId: room.sessionId,
        delta,
        timestamp: Date.now(),
      }, sender.ws);
      return;
    }

    applyDelta(room, delta);

    broadcast(room, {
      type: "state_delta",
      sessionId: room.sessionId,
      delta,
      timestamp: Date.now(),
    }, sender.ws);

    this.schedulePersist(room);
  }

  private schedulePersist(room: SessionRoom): void {
    const existing = this.timers.get(room.sessionId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.timers.delete(room.sessionId);
      this.store.write(room.campaign);
    }, 10_000);

    this.timers.set(room.sessionId, timer);
  }
}
