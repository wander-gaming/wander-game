// ─── Base ─────────────────────────────────────────────────────────────────────

export interface StateObject {
  id: string;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
}

// ─── World ────────────────────────────────────────────────────────────────────

export type CellSize = 16 | 32 | 64;

export type TerrainType =
  | "grass" | "stone" | "dirt" | "water" | "sand" | "snow" | "void";

export type StructuralElementType =
  | "wall" | "door" | "window" | "stairs" | "furniture";

export interface Tile {
  x: number;
  y: number;
  terrain: TerrainType;
  structuralElement: StructuralElementType | null;
  hidden: boolean;
  revealed: boolean;
}

export interface GameMap extends StateObject {
  campaignId: string;
  name: string;
  width: number;
  height: number;
  cellSize: CellSize;
  tiles: Record<string, Tile>;
  layers: LayerConfig[];
}

export interface LayerConfig {
  id: string;
  name: "Terrain" | "Objects" | "Characters" | "Fog";
  zIndex: number;
  visible: boolean;
}

// ─── Character ────────────────────────────────────────────────────────────────

export type FieldType = "text" | "numeric" | "checkbox" | "dropdown";

export interface FieldDefinition {
  id: string;
  name: string;
  type: FieldType;
  defaultValue: string | number | boolean;
  options?: string[];
  min?: number;
  max?: number;
}

export interface SectionDefinition {
  id: string;
  name: string;
  fieldIds: string[];
}

export interface SheetTemplate extends StateObject {
  campaignId: string;
  name: string;
  fields: FieldDefinition[];
  sections: SectionDefinition[];
}

export interface CharacterSheet extends StateObject {
  campaignId: string;
  templateId: string;
  characterId: string;
  values: Record<string, string | number | boolean>;
}

export interface Character extends StateObject {
  campaignId: string;
  name: string;
  imageUrl: string | null;
  sheetId: string;
  tokenColor: string;
}

// ─── Token ────────────────────────────────────────────────────────────────────

export interface Token extends StateObject {
  characterId: string;
  mapId: string;
  x: number;
  y: number;
  visionRadius: number;
  hidden: boolean;
  ownerId: string;
}

// ─── Story ────────────────────────────────────────────────────────────────────

export interface StoryNode extends StateObject {
  campaignId: string;
  label: string;
  description: string;
  position: { x: number; y: number };
}

export interface StoryEdge extends StateObject {
  campaignId: string;
  sourceId: string;
  targetId: string;
  label: string;
}

export interface StoryGraph {
  nodes: StoryNode[];
  edges: StoryEdge[];
}

// ─── Event Triggers ───────────────────────────────────────────────────────────

export type TriggerConditionType = "token_enter_region" | "token_exit_region" | "gm_manual";
export type TriggerActionType = "spawn_token" | "chat_message" | "advance_story_node";

export interface TriggerRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TriggerCondition {
  type: TriggerConditionType;
  region?: TriggerRegion;
}

export interface TriggerAction {
  type: TriggerActionType;
  payload: Record<string, unknown>;
}

export interface EventTrigger extends StateObject {
  campaignId: string;
  name: string;
  condition: TriggerCondition;
  actions: TriggerAction[];
}

export interface TriggerLogEntry {
  triggerId: string;
  triggerName: string;
  timestamp: string;
  outcome: "success" | "error";
  error?: string;
}

// ─── Campaign ─────────────────────────────────────────────────────────────────

export interface Campaign extends StateObject {
  name: string;
  ownerId: string;
  maps: GameMap[];
  templates: SheetTemplate[];
  characters: Character[];
  sheets: CharacterSheet[];
  tokens: Token[];
  story: StoryGraph;
  triggers: EventTrigger[];
}

// ─── Session ──────────────────────────────────────────────────────────────────

export type ParticipantRole = "gm" | "player" | "spectator";

export interface Participant {
  userId: string;
  displayName: string;
  role: ParticipantRole;
  characterId: string | null;
  connected: boolean;
}

export interface Session extends StateObject {
  campaignId: string;
  participants: Participant[];
  activeMapId: string;
  godModeEnabled: boolean;
  playerMovementEnabled: boolean;
  eventLog: TriggerLogEntry[];
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
}

// ─── Dice ─────────────────────────────────────────────────────────────────────

export interface DiceRollResult {
  expr: string;
  rolls: Array<{ sides: number; value: number }>;
  total: number;
}

// ─── Sync Protocol ────────────────────────────────────────────────────────────

export type FieldValue = string | number | boolean;

export type StateDelta =
  | { entity: "token";    id: string; patch: Partial<Token> }
  | { entity: "tile";     mapId: string; x: number; y: number; patch: Partial<Tile> }
  | { entity: "sheet";    id: string; fieldId: string; value: FieldValue }
  | { entity: "chat";     message: ChatMessage }
  | { entity: "dice";     roll: DiceRollResult }
  | { entity: "fog";      mapId: string; revealed: Array<[number, number]> }
  | { entity: "trigger";  logEntry: TriggerLogEntry }
  | { entity: "story";    patch: Partial<StoryGraph> };

export type WsMessage =
  | { type: "join_session";   sessionId: string; userId: string; role: ParticipantRole }
  | { type: "leave_session";  sessionId: string; userId: string }
  | { type: "state_delta";    sessionId: string; delta: StateDelta; timestamp: number }
  | { type: "state_snapshot"; sessionId: string; campaign: Campaign; session: Session }
  | { type: "ping" }
  | { type: "pong" };

// ─── Map Mutations ────────────────────────────────────────────────────────────

export type MapMutation =
  | { type: "paint"; x: number; y: number; before: TerrainType; after: TerrainType }
  | { type: "place"; x: number; y: number; before: Tile; after: Tile }
  | { type: "bulk";  mutations: MapMutation[] };

// ─── Generator ────────────────────────────────────────────────────────────────

export type GeneratorResult =
  | { ok: true;  tiles: Tile[] }
  | { ok: false; error: string };

// ─── Validation ───────────────────────────────────────────────────────────────

export type ValidationResult = { ok: true } | { ok: false; error: string };
export type EdgeResult = ValidationResult & { edge?: StoryEdge };

// ─── Errors ───────────────────────────────────────────────────────────────────

export class CampaignParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CampaignParseError";
  }
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}
