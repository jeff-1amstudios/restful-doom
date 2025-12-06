/**
 * Doom Bridge - TypeScript Types
 *
 * These types match the restful-doom API responses exactly.
 * Based on RAML specs and actual API implementation.
 */
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
export interface MapObjectFlags {
    MF_SPECIAL?: boolean;
    MF_SOLID?: boolean;
    MF_SHOOTABLE?: boolean;
    MF_NOSECTOR?: boolean;
    MF_NOBLOCKMAP?: boolean;
    MF_AMBUSH?: boolean;
    MF_JUSTHIT?: boolean;
    MF_JUSTATTACKED?: boolean;
    MF_SPAWNCEILING?: boolean;
    MF_NOGRAVITY?: boolean;
    MF_DROPOFF?: boolean;
    MF_PICKUP?: boolean;
    MF_NOCLIP?: boolean;
    MF_SLIDE?: boolean;
    MF_FLOAT?: boolean;
    MF_TELEPORT?: boolean;
    MF_MISSILE?: boolean;
    MF_DROPPED?: boolean;
    MF_SHADOW?: boolean;
    MF_NOBLOOD?: boolean;
    MF_CORPSE?: boolean;
    MF_INFLOAT?: boolean;
    MF_COUNTKILL?: boolean;
    MF_COUNTITEM?: boolean;
    MF_SKULLFLY?: boolean;
    MF_NOTDMATCH?: boolean;
    MF_TRANSLATION?: boolean;
}
export interface MapObject {
    id: number;
    position: Position;
    angle: number;
    height: number;
    health: number;
    type: string;
    typeId: number;
    attacking?: number;
    distance?: number;
    flags: MapObjectFlags;
}
export interface PlayerWeapons {
    Handgun: boolean;
    Shotgun: boolean;
    Chaingun: boolean;
    "Rocket Launcher": boolean;
    "Plasma Rifle": boolean;
    "BFG?": boolean;
    Chainsaw: boolean;
    "Super Shotgun"?: boolean;
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
    color: string;
    armor: number;
    kills: number;
    items: number;
    secrets: number;
    weapon: number;
    weapons: PlayerWeapons;
    ammo: PlayerAmmo;
    keyCards: PlayerKeyCards;
    cheatFlags?: PlayerCheatFlags;
}
export type SkillLevel = "I'm too young to die" | "Hey, not too rough" | "Hurt me plenty" | "Ultra-Violence" | "Nightmare";
export interface World {
    episode: number;
    map: number;
    wad: string;
    skill: SkillLevel;
    lights: "on" | "off";
}
export type DoorKeyColor = "blue" | "red" | "yellow" | "none";
export interface Door {
    id: number;
    state: "open" | "closed";
    keyRequired: DoorKeyColor;
    specialType: number;
    line: Line;
    distance?: number;
}
export type PlayerActionType = "forward" | "backward" | "strafe-left" | "strafe-right" | "turn-left" | "turn-right" | "shoot" | "use" | "switch-weapon";
export interface PlayerAction {
    type: PlayerActionType;
    amount?: number;
}
export interface TurnAction {
    target_angle: number;
}
export interface LineOfSightResult {
    canSee: boolean;
}
export interface MoveTestResult {
    traversable: boolean;
}
export interface HudMessage {
    message: string;
}
export type ObjectCategory = "enemy" | "weapon" | "ammo" | "health" | "armor" | "powerup" | "key" | "door" | "decoration" | "hazard" | "unknown";
export type RelativeDirection = "ahead" | "ahead-left" | "left" | "behind-left" | "behind" | "behind-right" | "right" | "ahead-right";
export type DistanceBucket = "very close" | "close" | "near" | "far" | "very far";
export interface SemanticObject extends MapObject {
    category: ObjectCategory;
    direction: RelativeDirection;
    distanceBucket: DistanceBucket;
    threat?: "low" | "medium" | "high" | "extreme";
}
export interface EnvironmentDescription {
    enemies: SemanticObject[];
    threats: string[];
    pickups: SemanticObject[];
    doors: Array<Door & {
        direction: RelativeDirection;
        distanceBucket: DistanceBucket;
    }>;
    nearbyItems: string[];
    summary: string;
}
export interface DoomState {
    player: Player;
    world: World;
    nearbyObjects: MapObject[];
    doors: Door[];
    environment: EnvironmentDescription;
}
export declare const WEAPON_NAMES: Record<number, string>;
export declare const WEAPON_AMMO_TYPES: Record<number, keyof PlayerAmmo | null>;
export type DoomEventType = "low_health" | "critical_health" | "health_recovered" | "armor_depleted" | "level_started" | "level_completed" | "secret_found" | "key_acquired" | "weapon_acquired" | "player_died" | "boss_killed" | "ammo_low" | "ammo_depleted";
export interface DoomEvent {
    type: DoomEventType;
    timestamp: number;
    data: Record<string, unknown>;
    message: string;
}
export type DoomEventHandler = (event: DoomEvent) => void | Promise<void>;
//# sourceMappingURL=types.d.ts.map