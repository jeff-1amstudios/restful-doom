/**
 * Doom Bridge
 *
 * Bridge service between restful-doom and AI agents.
 * Provides both MCP tools and OpenAI Realtime compatible interfaces.
 *
 * @example
 * ```typescript
 * import { createDoomBridge } from "doom-bridge";
 *
 * const bridge = createDoomBridge({ host: "localhost", port: 6666 });
 *
 * // Get complete state
 * const state = await bridge.getState();
 * console.log(`Health: ${state.player.health}, Enemies: ${state.environment.enemies.length}`);
 *
 * // Perform actions
 * await bridge.performAction("forward", 30);
 * await bridge.performAction("shoot");
 *
 * // Get natural language description
 * const description = await bridge.describeState();
 * console.log(description);
 * // "E1M1. Wounded (45%), 20% armor, wielding Shotgun (12 shells). 3 enemies nearby..."
 *
 * // Listen for events
 * bridge.on("low_health", (event) => {
 *   console.log(event.message); // "Health is low at 23%"
 *   // Trigger Twilio call here!
 * });
 *
 * bridge.startEventPolling();
 * ```
 */
export { DoomBridge, createDoomBridge } from "./bridge.js";
export type { DoomBridgeConfig } from "./bridge.js";
export { DoomApiClient, DoomApiError } from "./api-client.js";
export type { DoomApiClientConfig } from "./api-client.js";
export type { Position, MapObject, MapObjectFlags, Player, PlayerWeapons, PlayerAmmo, PlayerKeyCards, World, Door, DoorKeyColor, PlayerAction, PlayerActionType, TurnAction, ObjectCategory, RelativeDirection, DistanceBucket, SemanticObject, EnvironmentDescription, DoomState, DoomEvent, DoomEventType, DoomEventHandler, } from "./types.js";
export { WEAPON_NAMES, WEAPON_AMMO_TYPES } from "./types.js";
export { categorizeObject, isEnemy, isPickup, isAlive, getThreatLevel, computeRelativeDirection, computeDistanceBucket, computeDistance, createSemanticObject, getFriendlyName, describeObject, describeObjectGroup, describeEnvironment, describeWeapon, describePlayerStatus, generateStatusUpdate, } from "./semantics.js";
export { OPENAI_REALTIME_TOOLS, handleToolCall, DOOMGUY_SYSTEM_PROMPT, DOOMGUY_VOICE_CONFIG, } from "./openai-tools.js";
export type { OpenAIRealtimeTool, ToolCallResult } from "./openai-tools.js";
//# sourceMappingURL=index.d.ts.map