/**
 * Doom Bridge - REST API Client
 *
 * Low-level client for interacting with restful-doom's HTTP API.
 * Handles all HTTP communication and JSON parsing.
 */
import type { Player, World, MapObject, Door, PlayerAction } from "./types.js";
export interface DoomApiClientConfig {
    host: string;
    port: number;
    timeout?: number;
}
export declare class DoomApiClient {
    private baseUrl;
    private timeout;
    constructor(config: DoomApiClientConfig);
    private request;
    private get;
    private post;
    private patch;
    private delete;
    /**
     * Get the console player's current state.
     * Returns health, armor, position, weapons, ammo, keycards, etc.
     */
    getPlayer(): Promise<Player>;
    /**
     * Update player properties (health, armor, ammo, weapons, cheats).
     * Note: This is a restricted endpoint (single-player only).
     */
    patchPlayer(updates: Partial<{
        health: number;
        armor: number;
        armortype: number;
        ammo: number;
        amount: number;
        weapon: string;
        cheat: string;
    }>): Promise<Player>;
    /**
     * Kill the console player.
     * Note: This is a restricted endpoint (single-player only).
     */
    deletePlayer(): Promise<void>;
    /**
     * Execute a player action (move, shoot, use, etc.).
     */
    performAction(action: PlayerAction): Promise<void>;
    /**
     * Turn the player to an absolute angle (0-359 degrees).
     * The engine will pick the fastest rotation direction.
     */
    turn(targetAngle: number): Promise<void>;
    /**
     * Get all players in a multiplayer game.
     */
    getPlayers(): Promise<Player[]>;
    /**
     * Get a specific player by object ID.
     */
    getPlayerById(id: number): Promise<Player>;
    /**
     * Send a HUD message to the console player.
     */
    sendMessage(message: string): Promise<void>;
    /**
     * Get the current world state (episode, map, skill, wad, lights).
     */
    getWorld(): Promise<World>;
    /**
     * Change the world state (episode, map, skill, lights).
     * Note: This is a restricted endpoint (single-player only).
     */
    patchWorld(updates: Partial<{
        episode: number;
        map: number;
        skill: number;
        lights: "on" | "off";
    }>): Promise<World>;
    /**
     * Capture a screenshot. Returns the path to the saved PCX file.
     */
    getScreenshot(): Promise<{
        path: string;
    }>;
    /**
     * Get all map objects, optionally filtered by distance from player.
     * @param distance Maximum distance from player (in Doom units)
     */
    getObjects(distance?: number): Promise<MapObject[]>;
    /**
     * Get a specific map object by ID.
     */
    getObject(id: number): Promise<MapObject>;
    /**
     * Spawn a new map object.
     * Note: This is a restricted endpoint (single-player only).
     */
    spawnObject(params: {
        type: string;
        x: number;
        y: number;
        angle?: number;
    }): Promise<MapObject>;
    /**
     * Update a map object's properties.
     * Note: This is a restricted endpoint (single-player only).
     */
    patchObject(id: number, updates: Partial<{
        x: number;
        y: number;
        z: number;
        angle: number;
        health: number;
        flags: Record<string, boolean>;
    }>): Promise<MapObject>;
    /**
     * Delete a map object.
     * Note: This is a restricted endpoint (single-player only).
     */
    deleteObject(id: number): Promise<void>;
    /**
     * Get all doors, optionally filtered by distance from player.
     * @param distance Maximum distance from player (in Doom units)
     */
    getDoors(distance?: number): Promise<Door[]>;
    /**
     * Get a specific door by ID.
     */
    getDoor(id: number): Promise<Door>;
    /**
     * Open or close a door.
     * Note: This is a restricted endpoint (single-player only).
     */
    setDoorState(id: number, state: "open" | "closed"): Promise<Door>;
    /**
     * Check if two objects have line of sight to each other.
     */
    checkLineOfSight(id1: number, id2: number): Promise<boolean>;
    /**
     * Test if an object can move to a specific position.
     */
    testMove(objectId: number, x: number, y: number): Promise<boolean>;
    /**
     * Check if the Doom API server is reachable.
     */
    isConnected(): Promise<boolean>;
}
export declare class DoomApiError extends Error {
    statusCode: number;
    responseBody?: string | undefined;
    constructor(message: string, statusCode: number, responseBody?: string | undefined);
    get isRestricted(): boolean;
    get isNotFound(): boolean;
}
//# sourceMappingURL=api-client.d.ts.map