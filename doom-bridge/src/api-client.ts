/**
 * Doom Bridge - REST API Client
 *
 * Low-level client for interacting with restful-doom's HTTP API.
 * Handles all HTTP communication and JSON parsing.
 */

import type {
  Player,
  World,
  MapObject,
  Door,
  PlayerAction,
  TurnAction,
  LineOfSightResult,
  MoveTestResult,
  HudMessage,
} from "./types.js";

export interface DoomApiClientConfig {
  host: string;
  port: number;
  timeout?: number;
}

export class DoomApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: DoomApiClientConfig) {
    this.baseUrl = `http://${config.host}:${config.port}`;
    this.timeout = config.timeout ?? 5000;
  }

  // ==========================================================================
  // HTTP Helpers
  // ==========================================================================

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new DoomApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          text
        );
      }

      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        return (await response.json()) as T;
      }

      // Some endpoints return no content (204) or non-JSON
      return {} as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  private async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  private async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  private async delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }

  // ==========================================================================
  // Player Endpoints
  // ==========================================================================

  /**
   * Get the console player's current state.
   * Returns health, armor, position, weapons, ammo, keycards, etc.
   */
  async getPlayer(): Promise<Player> {
    return this.get<Player>("/api/player");
  }

  /**
   * Update player properties (health, armor, ammo, weapons, cheats).
   * Note: This is a restricted endpoint (single-player only).
   */
  async patchPlayer(updates: Partial<{
    health: number;
    armor: number;
    armortype: number;
    ammo: number;      // Ammo type index (0-3)
    amount: number;    // Ammo amount to set
    weapon: string;    // Weapon name to give
    cheat: string;     // "god" or "noclip"
  }>): Promise<Player> {
    return this.patch<Player>("/api/player", updates);
  }

  /**
   * Kill the console player.
   * Note: This is a restricted endpoint (single-player only).
   */
  async deletePlayer(): Promise<void> {
    await this.delete<void>("/api/player");
  }

  /**
   * Execute a player action (move, shoot, use, etc.).
   */
  async performAction(action: PlayerAction): Promise<void> {
    await this.post<void>("/api/player/actions", action);
  }

  /**
   * Turn the player to an absolute angle (0-359 degrees).
   * The engine will pick the fastest rotation direction.
   */
  async turn(targetAngle: number): Promise<void> {
    const action: TurnAction = { target_angle: targetAngle };
    await this.post<void>("/api/player/turn", action);
  }

  /**
   * Get all players in a multiplayer game.
   */
  async getPlayers(): Promise<Player[]> {
    return this.get<Player[]>("/api/players");
  }

  /**
   * Get a specific player by object ID.
   */
  async getPlayerById(id: number): Promise<Player> {
    return this.get<Player>(`/api/players/${id}`);
  }

  /**
   * Send a HUD message to the console player.
   */
  async sendMessage(message: string): Promise<void> {
    const body: HudMessage = { message };
    await this.post<void>("/api/message", body);
  }

  // ==========================================================================
  // World Endpoints
  // ==========================================================================

  /**
   * Get the current world state (episode, map, skill, wad, lights).
   */
  async getWorld(): Promise<World> {
    return this.get<World>("/api/world");
  }

  /**
   * Change the world state (episode, map, skill, lights).
   * Note: This is a restricted endpoint (single-player only).
   */
  async patchWorld(updates: Partial<{
    episode: number;
    map: number;
    skill: number;    // 1-5 (baby, easy, medium, hard, nightmare)
    lights: "on" | "off";
  }>): Promise<World> {
    return this.patch<World>("/api/world", updates);
  }

  /**
   * Capture a screenshot. Returns the path to the saved PCX file.
   */
  async getScreenshot(): Promise<{ path: string }> {
    return this.get<{ path: string }>("/api/world/screenshot");
  }

  // ==========================================================================
  // Object Endpoints
  // ==========================================================================

  /**
   * Get all map objects, optionally filtered by distance from player.
   * @param distance Maximum distance from player (in Doom units)
   */
  async getObjects(distance?: number): Promise<MapObject[]> {
    const path = distance
      ? `/api/world/objects?distance=${distance}`
      : "/api/world/objects";
    return this.get<MapObject[]>(path);
  }

  /**
   * Get a specific map object by ID.
   */
  async getObject(id: number): Promise<MapObject> {
    return this.get<MapObject>(`/api/world/objects/${id}`);
  }

  /**
   * Spawn a new map object.
   * Note: This is a restricted endpoint (single-player only).
   */
  async spawnObject(params: {
    type: string;
    x: number;
    y: number;
    angle?: number;
  }): Promise<MapObject> {
    return this.post<MapObject>("/api/world/objects", params);
  }

  /**
   * Update a map object's properties.
   * Note: This is a restricted endpoint (single-player only).
   */
  async patchObject(id: number, updates: Partial<{
    x: number;
    y: number;
    z: number;
    angle: number;
    health: number;
    flags: Record<string, boolean>;
  }>): Promise<MapObject> {
    return this.patch<MapObject>(`/api/world/objects/${id}`, updates);
  }

  /**
   * Delete a map object.
   * Note: This is a restricted endpoint (single-player only).
   */
  async deleteObject(id: number): Promise<void> {
    await this.delete<void>(`/api/world/objects/${id}`);
  }

  // ==========================================================================
  // Door Endpoints
  // ==========================================================================

  /**
   * Get all doors, optionally filtered by distance from player.
   * @param distance Maximum distance from player (in Doom units)
   */
  async getDoors(distance?: number): Promise<Door[]> {
    const path = distance
      ? `/api/world/doors?distance=${distance}`
      : "/api/world/doors";
    return this.get<Door[]>(path);
  }

  /**
   * Get a specific door by ID.
   */
  async getDoor(id: number): Promise<Door> {
    return this.get<Door>(`/api/world/doors/${id}`);
  }

  /**
   * Open or close a door.
   * Note: This is a restricted endpoint (single-player only).
   */
  async setDoorState(id: number, state: "open" | "closed"): Promise<Door> {
    return this.patch<Door>(`/api/world/doors/${id}`, { state });
  }

  // ==========================================================================
  // Physics/Utility Endpoints
  // ==========================================================================

  /**
   * Check if two objects have line of sight to each other.
   */
  async checkLineOfSight(id1: number, id2: number): Promise<boolean> {
    const result = await this.get<LineOfSightResult>(
      `/api/world/los/${id1}/${id2}`
    );
    return result.canSee;
  }

  /**
   * Test if an object can move to a specific position.
   */
  async testMove(objectId: number, x: number, y: number): Promise<boolean> {
    const result = await this.get<MoveTestResult>(
      `/api/world/movetest?id=${objectId}&x=${x}&y=${y}`
    );
    return result.traversable;
  }

  // ==========================================================================
  // Health Check
  // ==========================================================================

  /**
   * Check if the Doom API server is reachable.
   */
  async isConnected(): Promise<boolean> {
    try {
      await this.getWorld();
      return true;
    } catch {
      return false;
    }
  }
}

// ==========================================================================
// Error Types
// ==========================================================================

export class DoomApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody?: string
  ) {
    super(message);
    this.name = "DoomApiError";
  }

  get isRestricted(): boolean {
    return this.statusCode === 403;
  }

  get isNotFound(): boolean {
    return this.statusCode === 404;
  }
}
