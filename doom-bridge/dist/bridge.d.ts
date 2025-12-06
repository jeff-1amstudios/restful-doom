/**
 * Doom Bridge - Main Bridge Class
 *
 * High-level interface for AI agents to interact with Doom.
 * Provides:
 * - State observation (getState, getObservation)
 * - Action execution (performAction)
 * - Event monitoring (health changes, level transitions)
 * - Natural language descriptions
 */
import { type AudioCue } from "./semantics.js";
import type { Player, World, MapObject, Door, DoomState, EnvironmentDescription, PlayerActionType, DoomEventHandler, DoomEventType } from "./types.js";
export interface DoomBridgeConfig {
    host?: string;
    port?: number;
    pollInterval?: number;
    objectDistance?: number;
    doorDistance?: number;
    enableEventPolling?: boolean;
}
export declare class DoomBridge {
    private client;
    private config;
    private lastPlayer;
    private lastWorld;
    private pollTimer;
    private eventHandlers;
    constructor(config?: DoomBridgeConfig);
    /**
     * Check if the Doom API is reachable.
     */
    isConnected(): Promise<boolean>;
    /**
     * Start polling for events (health changes, level transitions, etc.)
     */
    startEventPolling(): void;
    /**
     * Stop event polling.
     */
    stopEventPolling(): void;
    /**
     * Get the complete game state (player, world, objects, doors, environment).
     */
    getState(): Promise<DoomState>;
    /**
     * Get just the player state.
     */
    getPlayer(): Promise<Player>;
    /**
     * Get just the world state.
     */
    getWorld(): Promise<World>;
    /**
     * Get nearby objects.
     */
    getObjects(distance?: number): Promise<MapObject[]>;
    /**
     * Get nearby doors.
     */
    getDoors(distance?: number): Promise<Door[]>;
    /**
     * Get a concise observation for the AI agent.
     * Returns a structured object suitable for injection into model context.
     */
    getObservation(): Promise<{
        player: {
            health: number;
            armor: number;
            weapon: string;
            ammo: Record<string, number>;
            keys: string[];
            position: {
                x: number;
                y: number;
                angle: number;
            };
            kills: number;
            items: number;
            secrets: number;
        };
        world: {
            episode: number;
            map: number;
            mapName: string;
        };
        environment: {
            enemyCount: number;
            nearestEnemy: string | null;
            nearestHealth: string | null;
            summary: string;
        };
    }>;
    /**
     * Get a natural language description of the current state.
     * Suitable for voice synthesis.
     */
    describeState(): Promise<string>;
    /**
     * Get just the player's status as a spoken sentence.
     */
    describePlayer(): Promise<string>;
    /**
     * Get just the environment description.
     */
    describeEnvironment(): Promise<EnvironmentDescription>;
    /**
     * Execute a player action.
     * @param type Action type (forward, backward, shoot, use, etc.)
     * @param amount Optional amount (distance, angle, or weapon number)
     */
    performAction(type: PlayerActionType, amount?: number): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Turn to face a specific angle.
     * @param angle Absolute angle 0-359 (0=east, 90=north, 180=west, 270=south)
     */
    turnTo(angle: number): Promise<{
        success: boolean;
        message: string;
    }>;
    /**
     * Execute a sequence of actions with delays.
     */
    performSequence(actions: Array<{
        type: PlayerActionType;
        amount?: number;
        delayMs?: number;
    }>): Promise<{
        success: boolean;
        message: string;
    }>;
    private describeAction;
    /**
     * Check if we can see a specific object.
     */
    canSee(objectId: number): Promise<boolean>;
    /**
     * Check if we can move to a position.
     */
    canMoveTo(x: number, y: number): Promise<boolean>;
    /**
     * Cast a ray from the player's position in a specific direction to find wall distance.
     * Uses movetest to probe incrementally.
     * @param angle Optional angle to cast ray (defaults to player's facing angle)
     * @param maxDistance Maximum distance to probe (default 1024)
     * @param stepSize Step size for probing (default 64)
     */
    raycast(angle?: number, maxDistance?: number, stepSize?: number): Promise<{
        distance: number;
        distanceBucket: string;
        blocked: boolean;
        description: string;
    }>;
    /**
     * Get wall distances in all cardinal directions relative to player facing.
     */
    getSurroundings(): Promise<{
        ahead: {
            distance: number;
            description: string;
        };
        behind: {
            distance: number;
            description: string;
        };
        left: {
            distance: number;
            description: string;
        };
        right: {
            distance: number;
            description: string;
        };
        summary: string;
    }>;
    /**
     * Calculate the angle from player to an object.
     */
    getAngleToObject(objectId: number): Promise<{
        angle: number;
        direction: string;
        distance: number;
    }>;
    /**
     * Turn to face a specific object by ID.
     */
    turnToward(objectId: number): Promise<{
        success: boolean;
        message: string;
        targetAngle: number;
    }>;
    /**
     * Get simulated audio cues based on nearby enemies.
     */
    getAudioCues(): Promise<AudioCue[]>;
    /**
     * Get a natural language description of what the player "hears".
     */
    describeAudio(): Promise<string>;
    /**
     * Display a message on the player's HUD.
     */
    showMessage(message: string): Promise<void>;
    /**
     * Register an event handler.
     */
    on(eventType: DoomEventType, handler: DoomEventHandler): void;
    /**
     * Remove an event handler.
     */
    off(eventType: DoomEventType, handler: DoomEventHandler): void;
    /**
     * Emit an event to all registered handlers.
     */
    private emit;
    /**
     * Check for state changes and emit events.
     */
    private checkForEvents;
    private getAmmoTypeForWeapon;
    private delay;
    /**
     * Clean up resources.
     */
    destroy(): void;
}
export declare function createDoomBridge(config?: DoomBridgeConfig): DoomBridge;
//# sourceMappingURL=bridge.d.ts.map