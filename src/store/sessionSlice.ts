import type { StateCreator } from "zustand";
import type { Session, Participant, ChatMessage } from "@/types";

type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

export interface SessionSlice {
  session: Session | null;
  participants: Participant[];
  chatLog: ChatMessage[];
  connectionStatus: ConnectionStatus;
  setSession: (session: Session | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  appendChat: (message: ChatMessage) => void;
  upsertParticipant: (participant: Participant) => void;
}

export const createSessionSlice: StateCreator<SessionSlice> = (set) => ({
  session: null,
  participants: [],
  chatLog: [],
  connectionStatus: "disconnected",

  setSession: (session) => set({ session }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  appendChat: (message) =>
    set((state) => ({ chatLog: [...state.chatLog, message] })),

  upsertParticipant: (participant) =>
    set((state) => {
      const idx = state.participants.findIndex(
        (p) => p.userId === participant.userId
      );
      if (idx === -1) {
        return { participants: [...state.participants, participant] };
      }
      const updated = [...state.participants];
      updated[idx] = participant;
      return { participants: updated };
    }),
});
