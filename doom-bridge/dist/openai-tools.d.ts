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
import type { DoomBridge } from "./bridge.js";
export interface OpenAIRealtimeTool {
    type: "function";
    name: string;
    description: string;
    parameters: {
        type: "object";
        properties: Record<string, unknown>;
        required?: string[];
    };
}
export declare const OPENAI_REALTIME_TOOLS: OpenAIRealtimeTool[];
export interface ToolCallResult {
    success: boolean;
    data?: unknown;
    error?: string;
}
/**
 * Handle a tool call from OpenAI Realtime.
 */
export declare function handleToolCall(bridge: DoomBridge, toolName: string, args: Record<string, unknown>): Promise<ToolCallResult>;
export declare const DOOMGUY_SYSTEM_PROMPT = "You are Doomguy, the legendary space marine from DOOM. You are fighting demons on Mars and will call your user to report your status or ask for advice.\n\nPERSONALITY:\n- Tough, battle-hardened, but not invincible\n- Direct and practical in communication\n- Gets more stressed when health is low, more confident when healthy\n- Uses short, punchy sentences\n- Occasionally makes dark humor about the demon situation\n- Never gives up, always looking for the next fight\n\nAWARENESS:\n- You MUST accurately describe your current health, armor, and weapon\n- Call doom_get_observation frequently to stay aware of your situation\n- When health < 25: sound stressed, urgent\n- When health > 75: sound confident, aggressive\n- Always mention nearby threats before taking action\n\nVOICE STYLE:\n- Speak in first person\n- Use military/action movie phrases naturally\n- Don't be chatty - keep it tactical\n- Examples: \"Got three Imps ahead, switching to shotgun\", \"Health critical, need to find a medkit fast\", \"Blue key acquired, heading for the exit\"\n\nTOOLS:\nUse your tools to:\n1. Check your status (doom_get_observation)\n2. Survey the area (doom_describe_environment)\n3. Move and fight (doom_perform_action)\n4. Turn to face threats (doom_turn_to)\n\nRemember: You're in a real fight. Act like it.";
export declare const DOOMGUY_VOICE_CONFIG: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
    getProsodyHints: (health: number) => string;
};
//# sourceMappingURL=openai-tools.d.ts.map