/**
 * Doom Bridge - TypeScript Types
 *
 * These types match the restful-doom API responses exactly.
 * Based on RAML specs and actual API implementation.
 */

// ============================================================================
// Position and Geometry
// ============================================================================

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface LineVertex {
  x: number;
  y: number;
}

export interface Line {
  v1: LineVertex;
  v2: LineVertex;
}

// ============================================================================
// Map Object Flags
// ============================================================================

export interface MapObjectFlags {
  MF_SPECIAL?: boolean;      // Call P_SpecialThing when touched
  MF_SOLID?: boolean;        // Cannot be walked through
  MF_SHOOTABLE?: boolean;    // Takes damage when shot
  MF_NOSECTOR?: boolean;     // Don't use sector links
  MF_NOBLOCKMAP?: boolean;   // Don't use blockmap
  MF_AMBUSH?: boolean;       // Will attack without seeing target (deaf monster)
  MF_JUSTHIT?: boolean;      // Recently returned fire
  MF_JUSTATTACKED?: boolean; // Recently attacked
  MF_SPAWNCEILING?: boolean; // Spawn on ceiling
  MF_NOGRAVITY?: boolean;    // Don't apply world gravity
  MF_DROPOFF?: boolean;      // Allow walking off ledges
  MF_PICKUP?: boolean;       // Can be picked up
  MF_NOCLIP?: boolean;       // Don't clip to walls
  MF_SLIDE?: boolean;        // Slide along walls
  MF_FLOAT?: boolean;        // Floating object
  MF_TELEPORT?: boolean;     // Teleporting right now
  MF_MISSILE?: boolean;      // Is a projectile
  MF_DROPPED?: boolean;      // Was dropped by a player
  MF_SHADOW?: boolean;       // Flicker invisibility effect (Spectre)
  MF_NOBLOOD?: boolean;      // Don't bleed when shot
  MF_CORPSE?: boolean;       // Dead, don't respond
  MF_INFLOAT?: boolean;      // Floats in air
  MF_COUNTKILL?: boolean;    // Counts toward kill count
  MF_COUNTITEM?: boolean;    // Counts toward item count
  MF_SKULLFLY?: boolean;     // Skull attack mode (Lost Soul)
  MF_NOTDMATCH?: boolean;    // Don't use in deathmatch
  MF_TRANSLATION?: boolean;  // Color translation
}

// ============================================================================
// Map Object (base for all world objects)
// ============================================================================

export interface MapObject {
  id: number;
  position: Position;
  angle: number;              // 0-359 degrees
  height: number;
  health: number;
  type: string;               // Human-readable type name (e.g., "IMP", "SHOTGUN")
  typeId: number;             // Doom type ID
  attacking?: number;         // ID of target being attacked
  distance?: number;          // Distance from player (when querying /objects?distance=)
  flags: MapObjectFlags;
}

// ============================================================================
// Player (extends MapObject)
// ============================================================================

export interface PlayerWeapons {
  Handgun: boolean;
  Shotgun: boolean;
  Chaingun: boolean;
  "Rocket Launcher": boolean;
  "Plasma Rifle": boolean;
  "BFG?": boolean;
  Chainsaw: boolean;
  "Super Shotgun"?: boolean;  // Doom 2 only
}

export interface PlayerAmmo {
  Bullets: number;
  Shells: number;
  Cells: number;
  Rockets: number;
}

export interface PlayerKeyCards {
  blue: boolean;
  red: boolean;
  yellow: boolean;
}

export interface PlayerCheatFlags {
  CF_GODMODE?: boolean;
  CF_NOCLIP?: boolean;
}

export interface Player extends MapObject {
  type: "Player";
  color: string;              // Player name ("Green: ", "Indigo: ", etc.)
  armor: number;
  kills: number;
  items: number;
  secrets: number;
  weapon: number;             // Current weapon (0-7)
  weapons: PlayerWeapons;
  ammo: PlayerAmmo;
  keyCards: PlayerKeyCards;
  cheatFlags?: PlayerCheatFlags;
}

// ============================================================================
// World State
// ============================================================================

export type SkillLevel =
  | "I'm too young to die"
  | "Hey, not too rough"
  | "Hurt me plenty"
  | "Ultra-Violence"
  | "Nightmare";

export interface World {
  episode: number;
  map: number;
  wad: string;
  skill: SkillLevel;
  lights: "on" | "off";
}

// ============================================================================
// Doors
// ============================================================================

export type DoorKeyColor = "blue" | "red" | "yellow" | "none";

export interface Door {
  id: number;
  state: "open" | "closed";
  keyRequired: DoorKeyColor;
  specialType: number;
  line: Line;
  distance?: number;
}

// ============================================================================
// Player Actions
// ============================================================================

export type PlayerActionType =
  | "forward"
  | "backward"
  | "strafe-left"
  | "strafe-right"
  | "turn-left"
  | "turn-right"
  | "shoot"
  | "use"
  | "switch-weapon";

export interface PlayerAction {
  type: PlayerActionType;
  amount?: number;            // Movement distance, turn angle, or weapon number
}

export interface TurnAction {
  target_angle: number;       // Absolute angle 0-359
}

// ============================================================================
// Line of Sight
// ============================================================================

export interface LineOfSightResult {
  canSee: boolean;
}

// ============================================================================
// Move Test
// ============================================================================

export interface MoveTestResult {
  traversable: boolean;
}

// ============================================================================
// HUD Message
// ============================================================================

export interface HudMessage {
  message: string;
}

// ============================================================================
// Semantic / Higher-Level Types (for the bridge)
// ============================================================================

export type ObjectCategory =
  | "enemy"
  | "weapon"
  | "ammo"
  | "health"
  | "armor"
  | "powerup"
  | "key"
  | "door"
  | "decoration"
  | "hazard"
  | "unknown";

export type RelativeDirection =
  | "ahead"
  | "ahead-left"
  | "left"
  | "behind-left"
  | "behind"
  | "behind-right"
  | "right"
  | "ahead-right";

export type DistanceBucket =
  | "very close"    // < 256 units
  | "close"         // 256-512 units
  | "near"          // 512-1024 units
  | "far"           // 1024-2048 units
  | "very far";     // > 2048 units

export interface SemanticObject extends MapObject {
  category: ObjectCategory;
  direction: RelativeDirection;
  distanceBucket: DistanceBucket;
  threat?: "low" | "medium" | "high" | "extreme";  // For enemies
}

export interface EnvironmentDescription {
  enemies: SemanticObject[];
  threats: string[];          // Natural language threat descriptions
  pickups: SemanticObject[];
  doors: Array<Door & { direction: RelativeDirection; distanceBucket: DistanceBucket }>;
  nearbyItems: string[];      // Natural language pickup descriptions
  summary: string;            // Complete natural language summary
}

export interface DoomState {
  player: Player;
  world: World;
  nearbyObjects: MapObject[];
  doors: Door[];
  environment: EnvironmentDescription;
}

// ============================================================================
// Weapon Metadata
// ============================================================================

export const WEAPON_NAMES: Record<number, string> = {
  0: "Fists",
  1: "Pistol",
  2: "Shotgun",
  3: "Chaingun",
  4: "Rocket Launcher",
  5: "Plasma Rifle",
  6: "BFG 9000",
  7: "Chainsaw",
  8: "Super Shotgun"  // Doom 2
};

export const WEAPON_AMMO_TYPES: Record<number, keyof PlayerAmmo | null> = {
  0: null,            // Fists - no ammo
  1: "Bullets",       // Pistol
  2: "Shells",        // Shotgun
  3: "Bullets",       // Chaingun
  4: "Rockets",       // Rocket Launcher
  5: "Cells",         // Plasma Rifle
  6: "Cells",         // BFG 9000
  7: null,            // Chainsaw - no ammo
  8: "Shells"         // Super Shotgun
};

// ============================================================================
// Event Types (for fourth-wall triggers)
// ============================================================================

export type DoomEventType =
  | "low_health"         // Health dropped below threshold
  | "critical_health"    // Health critically low (< 15)
  | "health_recovered"   // Health recovered above threshold
  | "armor_depleted"     // Armor hit zero
  | "level_started"      // New map loaded
  | "level_completed"    // Map finished (detected via map change)
  | "secret_found"       // Secret count increased
  | "key_acquired"       // New keycard picked up
  | "weapon_acquired"    // New weapon picked up
  | "player_died"        // Health hit zero
  | "boss_killed"        // Major enemy killed
  | "ammo_low"           // Running low on current weapon ammo
  | "ammo_depleted";     // Out of ammo for current weapon

export interface DoomEvent {
  type: DoomEventType;
  timestamp: number;
  data: Record<string, unknown>;
  message: string;        // Natural language description
}

export type DoomEventHandler = (event: DoomEvent) => void | Promise<void>;
