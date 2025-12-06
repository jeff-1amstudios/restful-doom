#!/usr/bin/env node
/**
 * Doom Bridge - MCP Server
 *
 * Model Context Protocol server that exposes Doom Bridge functionality as tools.
 * Run with: node dist/mcp-server.js
 *
 * Tools exposed:
 * - doom_get_state: Get complete game state
 * - doom_get_observation: Get concise observation for AI context
 * - doom_describe_environment: Get natural language environment description
 * - doom_perform_action: Execute a player action
 * - doom_turn_to: Turn to face a specific angle
 * - doom_turn_toward: Turn to face a specific object by ID
 * - doom_can_see: Check line of sight to an object
 * - doom_show_message: Display a HUD message
 * - doom_get_audio_cues: Get simulated audio cues from nearby enemies
 * - doom_raycast: Cast ray to detect wall distance
 * - doom_get_surroundings: Get wall distances in all directions
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

import { DoomBridge, createDoomBridge } from "./bridge.js";
import type { PlayerActionType } from "./types.js";

// ============================================================================
// Tool Definitions
// ============================================================================

const TOOLS: Tool[] = [
  {
    name: "doom_get_state",
    description:
      "Get the complete game state including player stats (health, armor, ammo, weapons, keys), " +
      "world info (episode, map), nearby objects (enemies, pickups), and doors. " +
      "Use this to understand your current situation before making decisions.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "doom_get_observation",
    description:
      "Get a concise observation suitable for AI context. Returns player status, " +
      "location, enemy count, nearest threats and pickups. Lighter than doom_get_state.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "doom_describe_environment",
    description:
      "Get a natural language description of the current environment. " +
      "Returns threats, nearby items, doors, and a human-readable summary. " +
      "Good for generating voice narration.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "doom_perform_action",
    description:
      "Execute a player action in the game. Available actions: " +
      "forward (move forward), backward (move back), " +
      "strafe-left (sidestep left), strafe-right (sidestep right), " +
      "turn-left (rotate left), turn-right (rotate right), " +
      "shoot (fire current weapon), use (activate switches/doors), " +
      "switch-weapon (change weapon, use amount 1-8 for specific weapon).",
    inputSchema: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          enum: [
            "forward",
            "backward",
            "strafe-left",
            "strafe-right",
            "turn-left",
            "turn-right",
            "shoot",
            "use",
            "switch-weapon",
          ],
          description: "The action to perform",
        },
        amount: {
          type: "number",
          description:
            "Optional amount: movement distance (1-50), turn degrees, or weapon number (1-8)",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "doom_turn_to",
    description:
      "Turn to face a specific absolute angle. " +
      "0=East, 90=North, 180=West, 270=South. " +
      "The game will automatically choose the fastest rotation direction.",
    inputSchema: {
      type: "object" as const,
      properties: {
        angle: {
          type: "number",
          minimum: 0,
          maximum: 359,
          description: "Target angle in degrees (0-359)",
        },
      },
      required: ["angle"],
    },
  },
  {
    name: "doom_turn_toward",
    description:
      "Turn to face a specific object by its ID. " +
      "Automatically calculates the angle to the object and turns to face it. " +
      "Useful for targeting enemies or navigating toward pickups.",
    inputSchema: {
      type: "object" as const,
      properties: {
        objectId: {
          type: "number",
          description: "The ID of the object to turn toward",
        },
      },
      required: ["objectId"],
    },
  },
  {
    name: "doom_can_see",
    description:
      "Check if you have line of sight to a specific object by ID. " +
      "Returns true if there's a clear line of sight, false if blocked by walls.",
    inputSchema: {
      type: "object" as const,
      properties: {
        objectId: {
          type: "number",
          description: "The ID of the object to check line of sight to",
        },
      },
      required: ["objectId"],
    },
  },
  {
    name: "doom_show_message",
    description:
      "Display a message on the player's HUD (heads-up display). " +
      "The message will appear briefly at the top of the screen.",
    inputSchema: {
      type: "object" as const,
      properties: {
        message: {
          type: "string",
          maxLength: 80,
          description: "The message to display",
        },
      },
      required: ["message"],
    },
  },
  {
    name: "doom_get_audio_cues",
    description:
      "Get simulated audio cues based on nearby enemies. " +
      "Returns what the player would 'hear' - enemy sounds, movement, attacks. " +
      "Each cue includes description, direction, distance, and urgency level. " +
      "Great for spatial awareness when enemies are behind you or out of sight.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "doom_raycast",
    description:
      "Cast a ray to detect wall distance in a specific direction. " +
      "Useful for understanding the room layout and avoiding walls. " +
      "Returns distance to wall, bucket (very close/close/near/far), and description.",
    inputSchema: {
      type: "object" as const,
      properties: {
        angle: {
          type: "number",
          minimum: 0,
          maximum: 359,
          description:
            "Direction to cast ray in degrees (0-359). If not specified, uses player's facing direction. " +
            "0=East, 90=North, 180=West, 270=South.",
        },
      },
      required: [],
    },
  },
  {
    name: "doom_get_surroundings",
    description:
      "Get wall distances in all four cardinal directions relative to player facing. " +
      "Returns distances ahead, behind, left, and right plus a summary. " +
      "Useful for understanding the room layout and navigating tight spaces.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// ============================================================================
// Server Implementation
// ============================================================================

async function main() {
  // Parse environment config
  const host = process.env.DOOM_HOST ?? "localhost";
  const port = parseInt(process.env.DOOM_PORT ?? "6666", 10);

  console.error(`[doom-bridge] Connecting to restful-doom at ${host}:${port}`);

  const bridge = createDoomBridge({ host, port });

  // Check connection
  const connected = await bridge.isConnected();
  if (!connected) {
    console.error(
      "[doom-bridge] WARNING: Cannot connect to restful-doom. " +
        "Make sure the game is running with -apiport flag."
    );
  } else {
    console.error("[doom-bridge] Connected to restful-doom successfully");
  }

  // Create MCP server
  const server = new Server(
    {
      name: "doom-bridge",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "doom_get_state": {
          const state = await bridge.getState();
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(state, null, 2),
              },
            ],
          };
        }

        case "doom_get_observation": {
          const observation = await bridge.getObservation();
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(observation, null, 2),
              },
            ],
          };
        }

        case "doom_describe_environment": {
          const env = await bridge.describeEnvironment();
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    summary: env.summary,
                    threats: env.threats,
                    nearbyItems: env.nearbyItems,
                    enemyCount: env.enemies.length,
                    doorCount: env.doors.length,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "doom_perform_action": {
          const action = args?.action as PlayerActionType;
          const amount = args?.amount as number | undefined;

          if (!action) {
            return {
              content: [
                { type: "text" as const, text: "Error: action is required" },
              ],
              isError: true,
            };
          }

          const result = await bridge.performAction(action, amount);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result),
              },
            ],
            isError: !result.success,
          };
        }

        case "doom_turn_to": {
          const angle = args?.angle as number;

          if (angle === undefined || angle < 0 || angle > 359) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "Error: angle must be between 0 and 359",
                },
              ],
              isError: true,
            };
          }

          const result = await bridge.turnTo(angle);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result),
              },
            ],
            isError: !result.success,
          };
        }

        case "doom_can_see": {
          const objectId = args?.objectId as number;

          if (objectId === undefined) {
            return {
              content: [
                { type: "text" as const, text: "Error: objectId is required" },
              ],
              isError: true,
            };
          }

          const canSee = await bridge.canSee(objectId);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ canSee, objectId }),
              },
            ],
          };
        }

        case "doom_show_message": {
          const message = args?.message as string;

          if (!message) {
            return {
              content: [
                { type: "text" as const, text: "Error: message is required" },
              ],
              isError: true,
            };
          }

          await bridge.showMessage(message);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ success: true, message }),
              },
            ],
          };
        }

        case "doom_turn_toward": {
          const objectId = args?.objectId as number;

          if (objectId === undefined) {
            return {
              content: [
                { type: "text" as const, text: "Error: objectId is required" },
              ],
              isError: true,
            };
          }

          const result = await bridge.turnToward(objectId);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result),
              },
            ],
            isError: !result.success,
          };
        }

        case "doom_get_audio_cues": {
          const cues = await bridge.getAudioCues();
          const summary = await bridge.describeAudio();
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    cues,
                    summary,
                    cueCount: cues.length,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "doom_raycast": {
          const angle = args?.angle as number | undefined;

          const result = await bridge.raycast(angle);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "doom_get_surroundings": {
          const surroundings = await bridge.getSurroundings();
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(surroundings, null, 2),
              },
            ],
          };
        }

        default:
          return {
            content: [
              { type: "text" as const, text: `Unknown tool: ${name}` },
            ],
            isError: true,
          };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[doom-bridge] MCP server running");

  // Handle shutdown
  process.on("SIGINT", () => {
    console.error("[doom-bridge] Shutting down...");
    bridge.destroy();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("[doom-bridge] Fatal error:", error);
  process.exit(1);
});
