export type {
  StateObject,
  CellSize,
  TerrainType,
  StructuralElementType,
  Tile,
  GameMap,
  LayerConfig,
  FieldType,
  FieldDefinition,
  SectionDefinition,
  SheetTemplate,
  CharacterSheet,
  Character,
  Token,
  StoryNode,
  StoryEdge,
  StoryGraph,
  TriggerConditionType,
  TriggerActionType,
  TriggerRegion,
  TriggerCondition,
  TriggerAction,
  EventTrigger,
  TriggerLogEntry,
  Campaign,
  ParticipantRole,
  Participant,
  Session,
  ChatMessage,
  DiceRollResult,
  FieldValue,
  StateDelta,
  WsMessage,
  MapMutation,
  GeneratorResult,
  ValidationResult,
  EdgeResult,
} from "../src/types/index";

export { CampaignParseError, ParseError } from "../src/types/index";

import type { WebSocket } from "ws";
import type { ParticipantRole, Session, Campaign } from "../src/types/index";

export interface ClientSocket {
  ws: WebSocket;
  userId: string;
  role: ParticipantRole;
  sessionId: string;
}

export interface SessionRoom {
  sessionId: string;
  clients: ClientSocket[];
  session: Session;
  campaign: Campaign;
}
