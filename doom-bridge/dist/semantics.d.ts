/**
 * Doom Bridge - Semantic Helpers
 *
 * Provides higher-level understanding of game state:
 * - Object categorization (enemies, pickups, hazards)
 * - Relative direction computation
 * - Natural language descriptions
 * - Threat assessment
 */
import type { Player, MapObject, Door, ObjectCategory, RelativeDirection, DistanceBucket, SemanticObject, EnvironmentDescription } from "./types.js";
export declare function categorizeObject(obj: MapObject): ObjectCategory;
export declare function isEnemy(obj: MapObject): boolean;
export declare function isPickup(obj: MapObject): boolean;
export declare function isAlive(obj: MapObject): boolean;
export declare function getThreatLevel(obj: MapObject): "low" | "medium" | "high" | "extreme" | undefined;
/**
 * Compute relative direction from player to an object.
 * Uses 8-point compass (ahead, ahead-left, left, etc.)
 */
export declare function computeRelativeDirection(playerX: number, playerY: number, playerAngle: number, objectX: number, objectY: number): RelativeDirection;
/**
 * Convert distance in Doom units to a human-readable bucket.
 */
export declare function computeDistanceBucket(distance: number): DistanceBucket;
/**
 * Compute distance between two positions.
 */
export declare function computeDistance(x1: number, y1: number, x2: number, y2: number): number;
/**
 * Enhance a MapObject with semantic information.
 */
export declare function createSemanticObject(obj: MapObject, player: Player): SemanticObject;
/**
 * Get a friendly name for an object type.
 */
export declare function getFriendlyName(type: string): string;
/**
 * Describe a single object in natural language.
 */
export declare function describeObject(obj: SemanticObject): string;
/**
 * Group objects by category and describe them.
 */
export declare function describeObjectGroup(objects: SemanticObject[], category: ObjectCategory): string[];
/**
 * Build a complete environment description from game state.
 */
export declare function describeEnvironment(player: Player, objects: MapObject[], doors: Door[]): EnvironmentDescription;
/**
 * Describe player's current weapon.
 */
export declare function describeWeapon(player: Player): string;
/**
 * Describe player's overall status.
 */
export declare function describePlayerStatus(player: Player): string;
/**
 * Generate a complete status update for Doomguy to speak.
 */
export declare function generateStatusUpdate(player: Player, objects: MapObject[], doors: Door[], world: {
    episode: number;
    map: number;
}): string;
//# sourceMappingURL=semantics.d.ts.map