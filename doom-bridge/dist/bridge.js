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
import { DoomApiClient } from "./api-client.js";
import { describeEnvironment, describePlayerStatus, generateStatusUpdate, describeWeapon, generateAudioCues, describeAudioCues, computeDistance, computeDistanceBucket, computeRelativeDirection, } from "./semantics.js";
const DEFAULT_CONFIG = {
    host: "localhost",
    port: 6666,
    pollInterval: 500,
    objectDistance: 2048,
    doorDistance: 1024,
    enableEventPolling: true,
};
// ============================================================================
// Doom Bridge Class
// ============================================================================
export class DoomBridge {
    client;
    config;
    // State tracking for event detection
    lastPlayer = null;
    lastWorld = null;
    pollTimer = null;
    eventHandlers = new Map();
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.client = new DoomApiClient({
            host: this.config.host,
            port: this.config.port,
        });
    }
    // ==========================================================================
    // Connection Management
    // ==========================================================================
    /**
     * Check if the Doom API is reachable.
     */
    async isConnected() {
        return this.client.isConnected();
    }
    /**
     * Start polling for events (health changes, level transitions, etc.)
     */
    startEventPolling() {
        if (this.pollTimer)
            return;
        this.pollTimer = setInterval(async () => {
            try {
                await this.checkForEvents();
            }
            catch (error) {
                // Ignore polling errors (server might be restarting)
            }
        }, this.config.pollInterval);
    }
    /**
     * Stop event polling.
     */
    stopEventPolling() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }
    // ==========================================================================
    // State Observation
    // ==========================================================================
    /**
     * Get the complete game state (player, world, objects, doors, environment).
     */
    async getState() {
        const [player, world, objects, doors] = await Promise.all([
            this.client.getPlayer(),
            this.client.getWorld(),
            this.client.getObjects(this.config.objectDistance),
            this.client.getDoors(this.config.doorDistance),
        ]);
        const environment = describeEnvironment(player, objects, doors);
        return {
            player,
            world,
            nearbyObjects: objects,
            doors,
            environment,
        };
    }
    /**
     * Get just the player state.
     */
    async getPlayer() {
        return this.client.getPlayer();
    }
    /**
     * Get just the world state.
     */
    async getWorld() {
        return this.client.getWorld();
    }
    /**
     * Get nearby objects.
     */
    async getObjects(distance) {
        return this.client.getObjects(distance ?? this.config.objectDistance);
    }
    /**
     * Get nearby doors.
     */
    async getDoors(distance) {
        return this.client.getDoors(distance ?? this.config.doorDistance);
    }
    /**
     * Get a concise observation for the AI agent.
     * Returns a structured object suitable for injection into model context.
     */
    async getObservation() {
        const state = await this.getState();
        const weaponName = describeWeapon(state.player).split(" (")[0];
        const keys = [];
        if (state.player.keyCards.blue)
            keys.push("blue");
        if (state.player.keyCards.red)
            keys.push("red");
        if (state.player.keyCards.yellow)
            keys.push("yellow");
        const nearestEnemy = state.environment.enemies[0];
        const nearestHealth = state.environment.pickups.find((p) => p.category === "health");
        return {
            player: {
                health: state.player.health,
                armor: state.player.armor,
                weapon: weaponName,
                ammo: { ...state.player.ammo },
                keys,
                position: {
                    x: Math.round(state.player.position.x),
                    y: Math.round(state.player.position.y),
                    angle: state.player.angle,
                },
                kills: state.player.kills,
                items: state.player.items,
                secrets: state.player.secrets,
            },
            world: {
                episode: state.world.episode,
                map: state.world.map,
                mapName: `E${state.world.episode}M${state.world.map}`,
            },
            environment: {
                enemyCount: state.environment.enemies.length,
                nearestEnemy: nearestEnemy
                    ? `${nearestEnemy.type} (${nearestEnemy.direction}, ${nearestEnemy.distanceBucket})`
                    : null,
                nearestHealth: nearestHealth
                    ? `${nearestHealth.type} (${nearestHealth.direction})`
                    : null,
                summary: state.environment.summary,
            },
        };
    }
    /**
     * Get a natural language description of the current state.
     * Suitable for voice synthesis.
     */
    async describeState() {
        const state = await this.getState();
        return generateStatusUpdate(state.player, state.nearbyObjects, state.doors, state.world);
    }
    /**
     * Get just the player's status as a spoken sentence.
     */
    async describePlayer() {
        const player = await this.client.getPlayer();
        return describePlayerStatus(player);
    }
    /**
     * Get just the environment description.
     */
    async describeEnvironment() {
        const [player, objects, doors] = await Promise.all([
            this.client.getPlayer(),
            this.client.getObjects(this.config.objectDistance),
            this.client.getDoors(this.config.doorDistance),
        ]);
        return describeEnvironment(player, objects, doors);
    }
    // ==========================================================================
    // Action Execution
    // ==========================================================================
    /**
     * Execute a player action.
     * @param type Action type (forward, backward, shoot, use, etc.)
     * @param amount Optional amount (distance, angle, or weapon number)
     */
    async performAction(type, amount) {
        try {
            await this.client.performAction({ type, amount });
            return {
                success: true,
                message: this.describeAction(type, amount),
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                message: `Action failed: ${message}`,
            };
        }
    }
    /**
     * Turn to face a specific angle.
     * @param angle Absolute angle 0-359 (0=east, 90=north, 180=west, 270=south)
     */
    async turnTo(angle) {
        try {
            await this.client.turn(angle);
            return {
                success: true,
                message: `Turning to face ${angle} degrees`,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                message: `Turn failed: ${message}`,
            };
        }
    }
    /**
     * Execute a sequence of actions with delays.
     */
    async performSequence(actions) {
        const results = [];
        for (const action of actions) {
            const result = await this.performAction(action.type, action.amount);
            results.push(result.message);
            if (!result.success) {
                return {
                    success: false,
                    message: `Sequence failed at: ${result.message}`,
                };
            }
            if (action.delayMs) {
                await this.delay(action.delayMs);
            }
        }
        return {
            success: true,
            message: results.join("; "),
        };
    }
    describeAction(type, amount) {
        switch (type) {
            case "forward":
                return amount ? `Moving forward ${amount} units` : "Moving forward";
            case "backward":
                return amount ? `Moving backward ${amount} units` : "Moving backward";
            case "strafe-left":
                return "Strafing left";
            case "strafe-right":
                return "Strafing right";
            case "turn-left":
                return amount ? `Turning left ${amount} degrees` : "Turning left";
            case "turn-right":
                return amount ? `Turning right ${amount} degrees` : "Turning right";
            case "shoot":
                return "Firing weapon";
            case "use":
                return "Using/activating";
            case "switch-weapon":
                return amount ? `Switching to weapon ${amount}` : "Switching weapon";
            default:
                return `Performing ${type}`;
        }
    }
    // ==========================================================================
    // Physics Queries
    // ==========================================================================
    /**
     * Check if we can see a specific object.
     */
    async canSee(objectId) {
        const player = await this.client.getPlayer();
        return this.client.checkLineOfSight(player.id, objectId);
    }
    /**
     * Check if we can move to a position.
     */
    async canMoveTo(x, y) {
        const player = await this.client.getPlayer();
        return this.client.testMove(player.id, x, y);
    }
    // ==========================================================================
    // Raycast / Wall Detection
    // ==========================================================================
    /**
     * Cast a ray from the player's position in a specific direction to find wall distance.
     * Uses movetest to probe incrementally.
     * @param angle Optional angle to cast ray (defaults to player's facing angle)
     * @param maxDistance Maximum distance to probe (default 1024)
     * @param stepSize Step size for probing (default 64)
     */
    async raycast(angle, maxDistance = 1024, stepSize = 64) {
        const player = await this.client.getPlayer();
        const castAngle = angle ?? player.angle;
        // Convert angle to radians
        const rad = (castAngle * Math.PI) / 180;
        let distance = 0;
        let blocked = false;
        // Probe in steps until we hit something or reach max distance
        while (distance < maxDistance) {
            distance += stepSize;
            const probeX = player.position.x + Math.cos(rad) * distance;
            const probeY = player.position.y + Math.sin(rad) * distance;
            const canMove = await this.client.testMove(player.id, probeX, probeY);
            if (!canMove) {
                blocked = true;
                break;
            }
        }
        const distanceBucket = computeDistanceBucket(distance);
        // Generate description
        let description;
        if (!blocked) {
            description = "Open space ahead, no walls in range";
        }
        else if (distance <= 64) {
            description = "Wall right in front of you!";
        }
        else if (distance <= 128) {
            description = "Wall very close ahead";
        }
        else if (distance <= 256) {
            description = "Wall a few steps ahead";
        }
        else if (distance <= 512) {
            description = "Wall visible ahead";
        }
        else {
            description = "Wall in the distance";
        }
        return {
            distance,
            distanceBucket,
            blocked,
            description,
        };
    }
    /**
     * Get wall distances in all cardinal directions relative to player facing.
     */
    async getSurroundings() {
        const player = await this.client.getPlayer();
        const baseAngle = player.angle;
        // Cast rays in 4 directions
        const [ahead, right, behind, left] = await Promise.all([
            this.raycast(baseAngle, 1024, 64),
            this.raycast((baseAngle + 270) % 360, 1024, 64), // Right is -90 degrees
            this.raycast((baseAngle + 180) % 360, 1024, 64),
            this.raycast((baseAngle + 90) % 360, 1024, 64),
        ]);
        // Generate summary
        const parts = [];
        if (ahead.blocked && ahead.distance <= 256) {
            parts.push(`wall ${ahead.distanceBucket} ahead`);
        }
        if (left.blocked && left.distance <= 256) {
            parts.push(`wall ${left.distanceBucket} to left`);
        }
        if (right.blocked && right.distance <= 256) {
            parts.push(`wall ${right.distanceBucket} to right`);
        }
        if (behind.blocked && behind.distance <= 256) {
            parts.push(`wall ${behind.distanceBucket} behind`);
        }
        const summary = parts.length > 0
            ? `Walls: ${parts.join(", ")}`
            : "Open area, no close walls";
        return {
            ahead: { distance: ahead.distance, description: ahead.description },
            behind: { distance: behind.distance, description: behind.description },
            left: { distance: left.distance, description: left.description },
            right: { distance: right.distance, description: right.description },
            summary,
        };
    }
    // ==========================================================================
    // Turn Toward Object
    // ==========================================================================
    /**
     * Calculate the angle from player to an object.
     */
    async getAngleToObject(objectId) {
        const [player, object] = await Promise.all([
            this.client.getPlayer(),
            this.client.getObject(objectId),
        ]);
        const dx = object.position.x - player.position.x;
        const dy = object.position.y - player.position.y;
        // Calculate absolute angle to object
        const angleToObject = (Math.atan2(dy, dx) * 180) / Math.PI;
        const normalizedAngle = (angleToObject + 360) % 360;
        // Calculate direction relative to player
        const direction = computeRelativeDirection(player.position.x, player.position.y, player.angle, object.position.x, object.position.y);
        const distance = computeDistance(player.position.x, player.position.y, object.position.x, object.position.y);
        return {
            angle: Math.round(normalizedAngle),
            direction,
            distance: Math.round(distance),
        };
    }
    /**
     * Turn to face a specific object by ID.
     */
    async turnToward(objectId) {
        try {
            const angleInfo = await this.getAngleToObject(objectId);
            await this.client.turn(angleInfo.angle);
            return {
                success: true,
                message: `Turning to face object ${objectId} (${angleInfo.direction}, ${computeDistanceBucket(angleInfo.distance)})`,
                targetAngle: angleInfo.angle,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                message: `Failed to turn toward object: ${message}`,
                targetAngle: 0,
            };
        }
    }
    // ==========================================================================
    // Audio Cues
    // ==========================================================================
    /**
     * Get simulated audio cues based on nearby enemies.
     */
    async getAudioCues() {
        const [player, objects] = await Promise.all([
            this.client.getPlayer(),
            this.client.getObjects(this.config.objectDistance),
        ]);
        return generateAudioCues(player, objects);
    }
    /**
     * Get a natural language description of what the player "hears".
     */
    async describeAudio() {
        const [player, objects] = await Promise.all([
            this.client.getPlayer(),
            this.client.getObjects(this.config.objectDistance),
        ]);
        return describeAudioCues(player, objects);
    }
    // ==========================================================================
    // HUD Messages
    // ==========================================================================
    /**
     * Display a message on the player's HUD.
     */
    async showMessage(message) {
        await this.client.sendMessage(message);
    }
    // ==========================================================================
    // Event System
    // ==========================================================================
    /**
     * Register an event handler.
     */
    on(eventType, handler) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        this.eventHandlers.get(eventType).push(handler);
    }
    /**
     * Remove an event handler.
     */
    off(eventType, handler) {
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index !== -1)
                handlers.splice(index, 1);
        }
    }
    /**
     * Emit an event to all registered handlers.
     */
    async emit(event) {
        const handlers = this.eventHandlers.get(event.type) ?? [];
        for (const handler of handlers) {
            try {
                await handler(event);
            }
            catch (error) {
                console.error(`Event handler error for ${event.type}:`, error);
            }
        }
    }
    /**
     * Check for state changes and emit events.
     */
    async checkForEvents() {
        const [player, world] = await Promise.all([
            this.client.getPlayer(),
            this.client.getWorld(),
        ]);
        const now = Date.now();
        // First poll - initialize state
        if (!this.lastPlayer || !this.lastWorld) {
            this.lastPlayer = player;
            this.lastWorld = world;
            return;
        }
        // Check for health changes
        if (player.health < this.lastPlayer.health) {
            if (player.health <= 0) {
                await this.emit({
                    type: "player_died",
                    timestamp: now,
                    data: { lastHealth: this.lastPlayer.health },
                    message: "I'm dead! Game over...",
                });
            }
            else if (player.health < 15) {
                await this.emit({
                    type: "critical_health",
                    timestamp: now,
                    data: { health: player.health },
                    message: `Critical! Only ${player.health} health left!`,
                });
            }
            else if (player.health < 25 && this.lastPlayer.health >= 25) {
                await this.emit({
                    type: "low_health",
                    timestamp: now,
                    data: { health: player.health },
                    message: `Health is low at ${player.health}%`,
                });
            }
        }
        if (player.health >= 50 && this.lastPlayer.health < 50) {
            await this.emit({
                type: "health_recovered",
                timestamp: now,
                data: { health: player.health },
                message: `Health recovered to ${player.health}%`,
            });
        }
        // Check for armor depletion
        if (player.armor === 0 && this.lastPlayer.armor > 0) {
            await this.emit({
                type: "armor_depleted",
                timestamp: now,
                data: {},
                message: "Armor is gone!",
            });
        }
        // Check for level change
        if (world.map !== this.lastWorld.map || world.episode !== this.lastWorld.episode) {
            await this.emit({
                type: "level_started",
                timestamp: now,
                data: { episode: world.episode, map: world.map },
                message: `Entering E${world.episode}M${world.map}`,
            });
        }
        // Check for secrets
        if (player.secrets > this.lastPlayer.secrets) {
            await this.emit({
                type: "secret_found",
                timestamp: now,
                data: { totalSecrets: player.secrets },
                message: `Found a secret! Total: ${player.secrets}`,
            });
        }
        // Check for new keys
        const newKeys = [];
        if (player.keyCards.blue && !this.lastPlayer.keyCards.blue)
            newKeys.push("blue");
        if (player.keyCards.red && !this.lastPlayer.keyCards.red)
            newKeys.push("red");
        if (player.keyCards.yellow && !this.lastPlayer.keyCards.yellow)
            newKeys.push("yellow");
        for (const key of newKeys) {
            await this.emit({
                type: "key_acquired",
                timestamp: now,
                data: { keyColor: key },
                message: `Got the ${key} key!`,
            });
        }
        // Check for new weapons
        const weaponMap = [
            ["Chainsaw", "chainsaw"],
            ["Shotgun", "shotgun"],
            ["Chaingun", "chaingun"],
            ["Rocket Launcher", "rocket launcher"],
            ["Plasma Rifle", "plasma rifle"],
            ["BFG?", "BFG 9000"],
        ];
        for (const [key, name] of weaponMap) {
            if (player.weapons[key] && !this.lastPlayer.weapons[key]) {
                await this.emit({
                    type: "weapon_acquired",
                    timestamp: now,
                    data: { weapon: name },
                    message: `Picked up the ${name}!`,
                });
            }
        }
        // Check for ammo depletion on current weapon
        const ammoType = this.getAmmoTypeForWeapon(player.weapon);
        if (ammoType) {
            const currentAmmo = player.ammo[ammoType];
            const lastAmmo = this.lastPlayer.ammo[ammoType];
            if (currentAmmo === 0 && lastAmmo > 0) {
                await this.emit({
                    type: "ammo_depleted",
                    timestamp: now,
                    data: { ammoType },
                    message: `Out of ${ammoType.toLowerCase()}!`,
                });
            }
            else if (currentAmmo < 10 && lastAmmo >= 10) {
                await this.emit({
                    type: "ammo_low",
                    timestamp: now,
                    data: { ammoType, count: currentAmmo },
                    message: `Low on ${ammoType.toLowerCase()} - only ${currentAmmo} left`,
                });
            }
        }
        // Update state
        this.lastPlayer = player;
        this.lastWorld = world;
    }
    getAmmoTypeForWeapon(weapon) {
        const map = {
            0: null, // Fists
            1: "Bullets", // Pistol
            2: "Shells", // Shotgun
            3: "Bullets", // Chaingun
            4: "Rockets", // Rocket Launcher
            5: "Cells", // Plasma Rifle
            6: "Cells", // BFG
            7: null, // Chainsaw
            8: "Shells", // Super Shotgun
        };
        return map[weapon] ?? null;
    }
    // ==========================================================================
    // Utility
    // ==========================================================================
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Clean up resources.
     */
    destroy() {
        this.stopEventPolling();
        this.eventHandlers.clear();
    }
}
// ============================================================================
// Factory Function
// ============================================================================
export function createDoomBridge(config) {
    return new DoomBridge(config);
}
//# sourceMappingURL=bridge.js.map