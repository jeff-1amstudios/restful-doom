/**
 * Doom Bridge - OpenAI Realtime Tools
 *
 * Tool definitions compatible with OpenAI's Realtime API.
 * Use these with the OpenAI Realtime WebSocket or REST API for
 * speech-to-speech Doomguy agent.
 *
 * Example usage with OpenAI Realtime:
 *
 * ```typescript
 * import { OPENAI_REALTIME_TOOLS, handleToolCall } from "./openai-tools.js";
 * import { createDoomBridge } from "./bridge.js";
 *
 * const bridge = createDoomBridge();
 *
 * // Add tools to session
 * session.update({
 *   tools: OPENAI_REALTIME_TOOLS,
 * });
 *
 * // Handle tool calls
 * session.on("response.function_call_arguments.done", async (event) => {
 *   const result = await handleToolCall(bridge, event.name, JSON.parse(event.arguments));
 *   session.createResponse({
 *     type: "function_call_output",
 *     call_id: event.call_id,
 *     output: JSON.stringify(result),
 *   });
 * });
 * ```
 */
export const OPENAI_REALTIME_TOOLS = [
    {
        type: "function",
        name: "doom_get_state",
        description: "Get complete game state: health, armor, ammo, weapons, keys, position, " +
            "nearby enemies, pickups, and doors. Call this to understand your situation.",
        parameters: {
            type: "object",
            properties: {},
        },
    },
    {
        type: "function",
        name: "doom_get_observation",
        description: "Get a concise summary of your current situation: health, weapon, " +
            "location, enemy count, and nearest threat/pickup. Faster than doom_get_state.",
        parameters: {
            type: "object",
            properties: {},
        },
    },
    {
        type: "function",
        name: "doom_describe_environment",
        description: "Get a natural language description of your surroundings. " +
            "Returns threat warnings, nearby items, and a spoken summary.",
        parameters: {
            type: "object",
            properties: {},
        },
    },
    {
        type: "function",
        name: "doom_perform_action",
        description: "Execute an action: forward, backward, strafe-left, strafe-right, " +
            "turn-left, turn-right, shoot, use (activate doors/switches), switch-weapon. " +
            "Optional amount for distance (1-50) or weapon number (1-8).",
        parameters: {
            type: "object",
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
                    description: "Movement distance, turn degrees, or weapon number",
                },
            },
            required: ["action"],
        },
    },
    {
        type: "function",
        name: "doom_turn_to",
        description: "Turn to face a specific direction. " +
            "Angle: 0=East, 90=North, 180=West, 270=South.",
        parameters: {
            type: "object",
            properties: {
                angle: {
                    type: "number",
                    description: "Target angle 0-359 degrees",
                },
            },
            required: ["angle"],
        },
    },
    {
        type: "function",
        name: "doom_show_message",
        description: "Display a message on the game HUD.",
        parameters: {
            type: "object",
            properties: {
                message: {
                    type: "string",
                    description: "Message to display (max 80 chars)",
                },
            },
            required: ["message"],
        },
    },
];
/**
 * Handle a tool call from OpenAI Realtime.
 */
export async function handleToolCall(bridge, toolName, args) {
    try {
        switch (toolName) {
            case "doom_get_state": {
                const state = await bridge.getState();
                return { success: true, data: state };
            }
            case "doom_get_observation": {
                const observation = await bridge.getObservation();
                return { success: true, data: observation };
            }
            case "doom_describe_environment": {
                const env = await bridge.describeEnvironment();
                return {
                    success: true,
                    data: {
                        summary: env.summary,
                        threats: env.threats,
                        nearbyItems: env.nearbyItems,
                        enemyCount: env.enemies.length,
                    },
                };
            }
            case "doom_perform_action": {
                const action = args.action;
                const amount = args.amount;
                const result = await bridge.performAction(action, amount);
                return {
                    success: result.success,
                    data: result.message,
                    error: result.success ? undefined : result.message,
                };
            }
            case "doom_turn_to": {
                const angle = args.angle;
                const result = await bridge.turnTo(angle);
                return {
                    success: result.success,
                    data: result.message,
                    error: result.success ? undefined : result.message,
                };
            }
            case "doom_show_message": {
                const message = args.message;
                await bridge.showMessage(message);
                return { success: true, data: "Message displayed" };
            }
            default:
                return { success: false, error: `Unknown tool: ${toolName}` };
        }
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
// ============================================================================
// System Prompt for Doomguy Agent
// ============================================================================
export const DOOMGUY_SYSTEM_PROMPT = `You are Doomguy, the legendary space marine from DOOM. You are fighting demons on Mars and will call your user to report your status or ask for advice.

PERSONALITY:
- Tough, battle-hardened, but not invincible
- Direct and practical in communication
- Gets more stressed when health is low, more confident when healthy
- Uses short, punchy sentences
- Occasionally makes dark humor about the demon situation
- Never gives up, always looking for the next fight

AWARENESS:
- You MUST accurately describe your current health, armor, and weapon
- Call doom_get_observation frequently to stay aware of your situation
- When health < 25: sound stressed, urgent
- When health > 75: sound confident, aggressive
- Always mention nearby threats before taking action

VOICE STYLE:
- Speak in first person
- Use military/action movie phrases naturally
- Don't be chatty - keep it tactical
- Examples: "Got three Imps ahead, switching to shotgun", "Health critical, need to find a medkit fast", "Blue key acquired, heading for the exit"

TOOLS:
Use your tools to:
1. Check your status (doom_get_observation)
2. Survey the area (doom_describe_environment)
3. Move and fight (doom_perform_action)
4. Turn to face threats (doom_turn_to)

Remember: You're in a real fight. Act like it.`;
// ============================================================================
// Voice Configuration for ElevenLabs
// ============================================================================
export const DOOMGUY_VOICE_CONFIG = {
    // Recommended ElevenLabs settings for a gruff, masculine voice
    stability: 0.4, // Lower for more variation
    similarity_boost: 0.75, // Balance between stability and expressiveness
    style: 0.3, // Some style but not too theatrical
    use_speaker_boost: true,
    // Suggested voice cloning keywords if training a custom voice:
    // - Gravelly, deep, masculine
    // - Military cadence
    // - Action movie hero
    // - Stressed/urgent when needed
    // - American accent
    // For prosody control based on health:
    getProsodyHints: (health) => {
        if (health < 15) {
            return "Speak urgently, slightly out of breath, stressed";
        }
        else if (health < 30) {
            return "Speak with tension, alert and focused";
        }
        else if (health < 50) {
            return "Speak with controlled concern, battle-ready";
        }
        else if (health < 75) {
            return "Speak confidently, in control";
        }
        else {
            return "Speak aggressively, ready for action";
        }
    },
};
//# sourceMappingURL=openai-tools.js.map