import type { SessionRoom, ClientSocket, Participant } from "../types";

export class SessionManager {
  private rooms = new Map<string, SessionRoom>();

  getRoom(sessionId: string): SessionRoom | undefined {
    return this.rooms.get(sessionId);
  }

  setRoom(room: SessionRoom): void {
    this.rooms.set(room.sessionId, room);
  }

  removeRoom(sessionId: string): void {
    this.rooms.delete(sessionId);
  }

  addClient(sessionId: string, client: ClientSocket): void {
    const room = this.rooms.get(sessionId);
    if (!room) return;
    room.clients.push(client);

    const participant: Participant = {
      userId: client.userId,
      displayName: client.userId,
      role: client.role,
      characterId: null,
      connected: true,
    };

    const existing = room.session.participants.findIndex(p => p.userId === client.userId);
    if (existing >= 0) {
      room.session.participants[existing].connected = true;
    } else {
      room.session.participants.push(participant);
    }
  }

  removeClient(sessionId: string, userId: string): void {
    const room = this.rooms.get(sessionId);
    if (!room) return;

    room.clients = room.clients.filter(c => c.userId !== userId);

    const participant = room.session.participants.find(p => p.userId === userId);
    if (participant) participant.connected = false;

    if (room.clients.length === 0) {
      this.rooms.delete(sessionId);
    }
  }

  getParticipants(sessionId: string): Participant[] {
    return this.rooms.get(sessionId)?.session.participants ?? [];
  }
}
