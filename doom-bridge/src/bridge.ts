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

import { DoomApiClient, DoomApiError } from "./api-client.js";
import {
  describeEnvironment,
  describePlayerStatus,
  generateStatusUpdate,
  describeWeapon,
} from "./semantics.js";
import type {
  Player,
  World,
  MapObject,
  Door,
  DoomState,
  EnvironmentDescription,
  PlayerActionType,
  DoomEvent,
  DoomEventHandler,
  DoomEventType,
} from "./types.js";

// ============================================================================
// Configuration
// ============================================================================

export interface DoomBridgeConfig {
  host?: string;
  port?: number;
  pollInterval?: number;      // ms between state polls (for event detection)
  objectDistance?: number;    // Max distance for object queries (Doom units)
  doorDistance?: number;      // Max distance for door queries
  enableEventPolling?: boolean;
}

const DEFAULT_CONFIG: Required<DoomBridgeConfig> = {
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
  private client: DoomApiClient;
  private config: Required<DoomBridgeConfig>;

  // State tracking for event detection
  private lastPlayer: Player | null = null;
  private lastWorld: World | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private eventHandlers: Map<DoomEventType, DoomEventHandler[]> = new Map();

  constructor(config: DoomBridgeConfig = {}) {
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
  async isConnected(): Promise<boolean> {
    return this.client.isConnected();
  }

  /**
   * Start polling for events (health changes, level transitions, etc.)
   */
  startEventPolling(): void {
    if (this.pollTimer) return;

    this.pollTimer = setInterval(async () => {
      try {
        await this.checkForEvents();
      } catch (error) {
        // Ignore polling errors (server might be restarting)
      }
    }, this.config.pollInterval);
  }

  /**
   * Stop event polling.
   */
  stopEventPolling(): void {
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
  async getState(): Promise<DoomState> {
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
  async getPlayer(): Promise<Player> {
    return this.client.getPlayer();
  }

  /**
   * Get just the world state.
   */
  async getWorld(): Promise<World> {
    return this.client.getWorld();
  }

  /**
   * Get nearby objects.
   */
  async getObjects(distance?: number): Promise<MapObject[]> {
    return this.client.getObjects(distance ?? this.config.objectDistance);
  }

  /**
   * Get nearby doors.
   */
  async getDoors(distance?: number): Promise<Door[]> {
    return this.client.getDoors(distance ?? this.config.doorDistance);
  }

  /**
   * Get a concise observation for the AI agent.
   * Returns a structured object suitable for injection into model context.
   */
  async getObservation(): Promise<{
    player: {
      health: number;
      armor: number;
      weapon: string;
      ammo: Record<string, number>;
      keys: string[];
      position: { x: number; y: number; angle: number };
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
  }> {
    const state = await this.getState();

    const weaponName = describeWeapon(state.player).split(" (")[0];
    const keys: string[] = [];
    if (state.player.keyCards.blue) keys.push("blue");
    if (state.player.keyCards.red) keys.push("red");
    if (state.player.keyCards.yellow) keys.push("yellow");

    const nearestEnemy = state.environment.enemies[0];
    const nearestHealth = state.environment.pickups.find(
      (p) => p.category === "health"
    );

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
  async describeState(): Promise<string> {
    const state = await this.getState();
    return generateStatusUpdate(
      state.player,
      state.nearbyObjects,
      state.doors,
      state.world
    );
  }

  /**
   * Get just the player's status as a spoken sentence.
   */
  async describePlayer(): Promise<string> {
    const player = await this.client.getPlayer();
    return describePlayerStatus(player);
  }

  /**
   * Get just the environment description.
   */
  async describeEnvironment(): Promise<EnvironmentDescription> {
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
  async performAction(
    type: PlayerActionType,
    amount?: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.client.performAction({ type, amount });
      return {
        success: true,
        message: this.describeAction(type, amount),
      };
    } catch (error) {
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
  async turnTo(angle: number): Promise<{ success: boolean; message: string }> {
    try {
      await this.client.turn(angle);
      return {
        success: true,
        message: `Turning to face ${angle} degrees`,
      };
    } catch (error) {
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
  async performSequence(
    actions: Array<{ type: PlayerActionType; amount?: number; delayMs?: number }>
  ): Promise<{ success: boolean; message: string }> {
    const results: string[] = [];

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

  private describeAction(type: PlayerActionType, amount?: number): string {
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
  async canSee(objectId: number): Promise<boolean> {
    const player = await this.client.getPlayer();
    return this.client.checkLineOfSight(player.id, objectId);
  }

  /**
   * Check if we can move to a position.
   */
  async canMoveTo(x: number, y: number): Promise<boolean> {
    const player = await this.client.getPlayer();
    return this.client.testMove(player.id, x, y);
  }

  // ==========================================================================
  // HUD Messages
  // ==========================================================================

  /**
   * Display a message on the player's HUD.
   */
  async showMessage(message: string): Promise<void> {
    await this.client.sendMessage(message);
  }

  // ==========================================================================
  // Event System
  // ==========================================================================

  /**
   * Register an event handler.
   */
  on(eventType: DoomEventType, handler: DoomEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Remove an event handler.
   */
  off(eventType: DoomEventType, handler: DoomEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) handlers.splice(index, 1);
    }
  }

  /**
   * Emit an event to all registered handlers.
   */
  private async emit(event: DoomEvent): Promise<void> {
    const handlers = this.eventHandlers.get(event.type) ?? [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`Event handler error for ${event.type}:`, error);
      }
    }
  }

  /**
   * Check for state changes and emit events.
   */
  private async checkForEvents(): Promise<void> {
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
      } else if (player.health < 15) {
        await this.emit({
          type: "critical_health",
          timestamp: now,
          data: { health: player.health },
          message: `Critical! Only ${player.health} health left!`,
        });
      } else if (player.health < 25 && this.lastPlayer.health >= 25) {
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
    const newKeys: string[] = [];
    if (player.keyCards.blue && !this.lastPlayer.keyCards.blue) newKeys.push("blue");
    if (player.keyCards.red && !this.lastPlayer.keyCards.red) newKeys.push("red");
    if (player.keyCards.yellow && !this.lastPlayer.keyCards.yellow) newKeys.push("yellow");

    for (const key of newKeys) {
      await this.emit({
        type: "key_acquired",
        timestamp: now,
        data: { keyColor: key },
        message: `Got the ${key} key!`,
      });
    }

    // Check for new weapons
    const weaponMap: [keyof typeof player.weapons, string][] = [
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
      } else if (currentAmmo < 10 && lastAmmo >= 10) {
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

  private getAmmoTypeForWeapon(
    weapon: number
  ): "Bullets" | "Shells" | "Rockets" | "Cells" | null {
    const map: Record<number, "Bullets" | "Shells" | "Rockets" | "Cells" | null> = {
      0: null,         // Fists
      1: "Bullets",    // Pistol
      2: "Shells",     // Shotgun
      3: "Bullets",    // Chaingun
      4: "Rockets",    // Rocket Launcher
      5: "Cells",      // Plasma Rifle
      6: "Cells",      // BFG
      7: null,         // Chainsaw
      8: "Shells",     // Super Shotgun
    };
    return map[weapon] ?? null;
  }

  // ==========================================================================
  // Utility
  // ==========================================================================

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up resources.
   */
  destroy(): void {
    this.stopEventPolling();
    this.eventHandlers.clear();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createDoomBridge(config?: DoomBridgeConfig): DoomBridge {
  return new DoomBridge(config);
}
