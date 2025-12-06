/**
 * Doom Bridge - REST API Client
 *
 * Low-level client for interacting with restful-doom's HTTP API.
 * Handles all HTTP communication and JSON parsing.
 */
export class DoomApiClient {
    baseUrl;
    timeout;
    constructor(config) {
        this.baseUrl = `http://${config.host}:${config.port}`;
        this.timeout = config.timeout ?? 5000;
    }
    // ==========================================================================
    // HTTP Helpers
    // ==========================================================================
    async request(method, path, body) {
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
                throw new DoomApiError(`HTTP ${response.status}: ${response.statusText}`, response.status, text);
            }
            const contentType = response.headers.get("content-type");
            if (contentType?.includes("application/json")) {
                return (await response.json());
            }
            // Some endpoints return no content (204) or non-JSON
            return {};
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    async get(path) {
        return this.request("GET", path);
    }
    async post(path, body) {
        return this.request("POST", path, body);
    }
    async patch(path, body) {
        return this.request("PATCH", path, body);
    }
    async delete(path) {
        return this.request("DELETE", path);
    }
    // ==========================================================================
    // Player Endpoints
    // ==========================================================================
    /**
     * Get the console player's current state.
     * Returns health, armor, position, weapons, ammo, keycards, etc.
     */
    async getPlayer() {
        return this.get("/api/player");
    }
    /**
     * Update player properties (health, armor, ammo, weapons, cheats).
     * Note: This is a restricted endpoint (single-player only).
     */
    async patchPlayer(updates) {
        return this.patch("/api/player", updates);
    }
    /**
     * Kill the console player.
     * Note: This is a restricted endpoint (single-player only).
     */
    async deletePlayer() {
        await this.delete("/api/player");
    }
    /**
     * Execute a player action (move, shoot, use, etc.).
     */
    async performAction(action) {
        await this.post("/api/player/actions", action);
    }
    /**
     * Turn the player to an absolute angle (0-359 degrees).
     * The engine will pick the fastest rotation direction.
     */
    async turn(targetAngle) {
        const action = { target_angle: targetAngle };
        await this.post("/api/player/turn", action);
    }
    /**
     * Get all players in a multiplayer game.
     */
    async getPlayers() {
        return this.get("/api/players");
    }
    /**
     * Get a specific player by object ID.
     */
    async getPlayerById(id) {
        return this.get(`/api/players/${id}`);
    }
    /**
     * Send a HUD message to the console player.
     */
    async sendMessage(message) {
        const body = { message };
        await this.post("/api/message", body);
    }
    // ==========================================================================
    // World Endpoints
    // ==========================================================================
    /**
     * Get the current world state (episode, map, skill, wad, lights).
     */
    async getWorld() {
        return this.get("/api/world");
    }
    /**
     * Change the world state (episode, map, skill, lights).
     * Note: This is a restricted endpoint (single-player only).
     */
    async patchWorld(updates) {
        return this.patch("/api/world", updates);
    }
    /**
     * Capture a screenshot. Returns the path to the saved PCX file.
     */
    async getScreenshot() {
        return this.get("/api/world/screenshot");
    }
    // ==========================================================================
    // Object Endpoints
    // ==========================================================================
    /**
     * Get all map objects, optionally filtered by distance from player.
     * @param distance Maximum distance from player (in Doom units)
     */
    async getObjects(distance) {
        const path = distance
            ? `/api/world/objects?distance=${distance}`
            : "/api/world/objects";
        return this.get(path);
    }
    /**
     * Get a specific map object by ID.
     */
    async getObject(id) {
        return this.get(`/api/world/objects/${id}`);
    }
    /**
     * Spawn a new map object.
     * Note: This is a restricted endpoint (single-player only).
     */
    async spawnObject(params) {
        return this.post("/api/world/objects", params);
    }
    /**
     * Update a map object's properties.
     * Note: This is a restricted endpoint (single-player only).
     */
    async patchObject(id, updates) {
        return this.patch(`/api/world/objects/${id}`, updates);
    }
    /**
     * Delete a map object.
     * Note: This is a restricted endpoint (single-player only).
     */
    async deleteObject(id) {
        await this.delete(`/api/world/objects/${id}`);
    }
    // ==========================================================================
    // Door Endpoints
    // ==========================================================================
    /**
     * Get all doors, optionally filtered by distance from player.
     * @param distance Maximum distance from player (in Doom units)
     */
    async getDoors(distance) {
        const path = distance
            ? `/api/world/doors?distance=${distance}`
            : "/api/world/doors";
        return this.get(path);
    }
    /**
     * Get a specific door by ID.
     */
    async getDoor(id) {
        return this.get(`/api/world/doors/${id}`);
    }
    /**
     * Open or close a door.
     * Note: This is a restricted endpoint (single-player only).
     */
    async setDoorState(id, state) {
        return this.patch(`/api/world/doors/${id}`, { state });
    }
    // ==========================================================================
    // Physics/Utility Endpoints
    // ==========================================================================
    /**
     * Check if two objects have line of sight to each other.
     */
    async checkLineOfSight(id1, id2) {
        const result = await this.get(`/api/world/los/${id1}/${id2}`);
        return result.canSee;
    }
    /**
     * Test if an object can move to a specific position.
     */
    async testMove(objectId, x, y) {
        const result = await this.get(`/api/world/movetest?id=${objectId}&x=${x}&y=${y}`);
        return result.traversable;
    }
    // ==========================================================================
    // Health Check
    // ==========================================================================
    /**
     * Check if the Doom API server is reachable.
     */
    async isConnected() {
        try {
            await this.getWorld();
            return true;
        }
        catch {
            return false;
        }
    }
}
// ==========================================================================
// Error Types
// ==========================================================================
export class DoomApiError extends Error {
    statusCode;
    responseBody;
    constructor(message, statusCode, responseBody) {
        super(message);
        this.statusCode = statusCode;
        this.responseBody = responseBody;
        this.name = "DoomApiError";
    }
    get isRestricted() {
        return this.statusCode === 403;
    }
    get isNotFound() {
        return this.statusCode === 404;
    }
}
//# sourceMappingURL=api-client.js.map