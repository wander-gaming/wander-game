import { store } from "@/store";
import type { WsMessage, ParticipantRole, StateDelta } from "@/types";

let ws: WebSocket | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;
let pongTimeout: ReturnType<typeof setTimeout> | null = null;
let retryTimeout: ReturnType<typeof setTimeout> | null = null;
let intentionalClose = false;
let currentUrl = "";
let currentSessionId = "";
let currentUserId = "";
let currentRole: ParticipantRole = "spectator";

export function connect(url: string, sessionId: string, userId: string, role: ParticipantRole): void {
  intentionalClose = false;
  currentUrl = url;
  currentSessionId = sessionId;
  currentUserId = userId;
  currentRole = role;
  open();
}

export function disconnect(): void {
  intentionalClose = true;
  cleanup();
  ws?.close();
  ws = null;
  store.getState().setConnectionStatus("disconnected");
}

export function send(msg: WsMessage): void {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function open(): void {
  ws = new WebSocket(currentUrl);

  ws.onopen = () => {
    store.getState().setConnectionStatus("connected");
    send({ type: "join_session", sessionId: currentSessionId, userId: currentUserId, role: currentRole });
    startPing();
  };

  ws.onmessage = (event) => {
    let msg: WsMessage;
    try {
      msg = JSON.parse(event.data as string) as WsMessage;
    } catch {
      return;
    }
    handleMessage(msg);
  };

  ws.onclose = () => {
    if (!intentionalClose) scheduleReconnect();
  };

  ws.onerror = () => {
    if (!intentionalClose) {
      store.getState().setConnectionStatus("reconnecting");
      scheduleReconnect();
    }
  };
}

function handleMessage(msg: WsMessage): void {
  if (msg.type === "pong") {
    clearPongTimeout();
    return;
  }

  if (msg.type === "state_snapshot") {
    const s = store.getState();
    s.setSession(msg.session);
    if (msg.campaign.maps[0]) {
      const map = msg.campaign.maps[0];
      // Direct set via internal store state since MapSlice has no setMap action;
      // use the store's setState to replace the map
      store.setState({ map });
    }
    s.setTokens(msg.campaign.tokens);
    msg.session.participants.forEach((p) => s.upsertParticipant(p));
    return;
  }

  if (msg.type === "state_delta") {
    applyDelta(msg.delta);
  }
}

function applyDelta(delta: StateDelta): void {
  const s = store.getState();
  switch (delta.entity) {
    case "token":
      s.updateTokenPosition(delta.id, delta.patch.x ?? 0, delta.patch.y ?? 0);
      break;
    case "fog":
      delta.revealed.forEach(([x, y]) => s.revealTiles(x, y, 0, delta.mapId));
      break;
    case "chat":
      s.appendChat(delta.message);
      break;
    case "sheet":
      s.updateSheetValue(delta.id, delta.fieldId, delta.value);
      break;
    case "story": {
      const patch = delta.patch;
      if (patch.nodes) patch.nodes.forEach((n) => s.addNode(n));
      if (patch.edges) patch.edges.forEach((e) => s.addEdge(e.sourceId, e.targetId, e.label));
      break;
    }
  }
}

function startPing(): void {
  cleanup();
  pingTimer = setInterval(() => {
    send({ type: "ping" });
    pongTimeout = setTimeout(() => {
      store.getState().setConnectionStatus("reconnecting");
      scheduleReconnect();
    }, 3000);
  }, 10000);
}

function clearPongTimeout(): void {
  if (pongTimeout) {
    clearTimeout(pongTimeout);
    pongTimeout = null;
  }
}

function cleanup(): void {
  if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
  clearPongTimeout();
  if (retryTimeout) { clearTimeout(retryTimeout); retryTimeout = null; }
}

function scheduleReconnect(): void {
  cleanup();
  ws?.close();
  ws = null;
  retryTimeout = setTimeout(() => {
    if (!intentionalClose) open();
  }, 5000);
}
