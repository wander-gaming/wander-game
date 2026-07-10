import { create } from "zustand";
import type { StateCreator } from "zustand";
import { createMapSlice } from "./mapSlice";
import { createCharacterSlice } from "./characterSlice";
import { createStorySlice } from "./storySlice";
import { createSessionSlice } from "./sessionSlice";
import type { MapSlice } from "./mapSlice";
import type { CharacterSlice } from "./characterSlice";
import type { StorySlice } from "./storySlice";
import type { SessionSlice } from "./sessionSlice";

type StoreState = MapSlice & CharacterSlice & StorySlice & SessionSlice;

export const store = create<StoreState>()((...a) => ({
  ...createMapSlice(...(a as Parameters<StateCreator<MapSlice>>)),
  ...createCharacterSlice(...(a as Parameters<StateCreator<CharacterSlice>>)),
  ...createStorySlice(...(a as Parameters<StateCreator<StorySlice>>)),
  ...createSessionSlice(...(a as Parameters<StateCreator<SessionSlice>>)),
}));

export const useStore = store;
export type { StoreState };
