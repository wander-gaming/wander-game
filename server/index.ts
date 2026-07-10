import { WebSocketServer, WebSocket } from "ws";
import type { WsMessage, StateDelta, ParticipantRole } from "./types";
import { SessionManager } from "./session/SessionManager";
import { DeltaRouter } from "./delta/DeltaRouter";
import { StateStore } from "./state/StateStore";
import { EventTriggerExecutor } from "./triggers/EventTriggerExecutor";
import type { SessionRoom, ClientSocket } from "./types";
import type { Session, Campaign } from "./types";

const PORT = Number(process.env.PORT ?? 3001);

const store = new StateStore();
const sessions = new SessionManager();
const router = new DeltaRouter(store);
const triggerExecutor = new EventTriggerExecutor();

const wss = new WebSocketServer({ port: PORT });

function send(ws: WebSocket, msg: WsMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function makeEmptySession(sessionId: string, campaignId: string): Session {
  const now = new Date().toISOString();
  return {
    id: sessionId,
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
    campaignId,
    participants: [],
    activeMapId: "",
    godModeEnabled: false,
    playerMovementEnabled: true,
    eventLog: [],
  };
}

function makeEmptyCampaign(campaignId: string): Campaign {
  const now = new Date().toISOString();
  return {
    id: campaignId,
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
    name: campaignId,
    ownerId: "",
    maps: [],
    templates: [],
    characters: [],
    sheets: [],
    tokens: [],
    story: { nodes: [], edges: [] },
    triggers: [],
  };
}

wss.on("connection", (ws: WebSocket) => {
  let client: ClientSocket | null = null;

  ws.on("message", (raw: Buffer) => {
    let msg: WsMessage;
    try {
      msg = JSON.parse(raw.toString()) as WsMessage;
    } catch {
      return;
    }

    if (msg.type === "ping") {
      send(ws, { type: "pong" });
      return;
    }

    if (msg.type === "join_session") {
      const { sessionId, userId, role } = msg;

      client = { ws, userId, role: role as ParticipantRole, sessionId };

      let room = sessions.getRoom(sessionId);
      if (!room) {
        const campaign = store.read(sessionId) ?? makeEmptyCampaign(sessionId);
        const session = makeEmptySession(sessionId, sessionId);
        const newRoom: SessionRoom = { sessionId, clients: [], session, campaign };
        sessions.setRoom(newRoom);
        room = newRoom;
      }

      sessions.addClient(sessionId, client);

      send(ws, {
        type: "state_snapshot",
        sessionId,
        campaign: room.campaign,
        session: room.session,
      });
      return;
    }

    if (msg.type === "leave_session") {
      if (client) {
        sessions.removeClient(msg.sessionId, msg.userId);
        client = null;
      }
      return;
    }

    if (msg.type === "state_delta") {
      if (!client) return;
      const room = sessions.getRoom(msg.sessionId);
      if (!room) return;

      const delta = msg.delta as StateDelta;

      if (delta.entity === "trigger") {
        const trigger = room.campaign.triggers.find(t => t.id === delta.logEntry.triggerId);
        if (trigger) {
          const broadcastFn = (m: WsMessage) => {
            for (const c of room.clients) send(c.ws, m);
          };
          triggerExecutor.execute(trigger, room.session, room.campaign, broadcastFn);
        }
        return;
      }

      router.route(room, client, delta);
    }
  });

  ws.on("close", () => {
    if (client) {
      sessions.removeClient(client.sessionId, client.userId);
    }
  });
});

console.log(`WebSocket server listening on port ${PORT}`);
