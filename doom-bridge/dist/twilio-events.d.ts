/**
 * Doom Bridge - Twilio Event Handlers
 *
 * Example integration for "fourth wall" interactions:
 * - Doomguy calls you when health is critical
 * - Doomguy texts you level completion stats
 * - Doomguy calls when he finds a secret
 *
 * This is a template - you'll need to add your Twilio credentials
 * and integrate with your voice agent stack.
 *
 * @example
 * ```typescript
 * import { createDoomBridge } from "./bridge.js";
 * import { setupTwilioEvents, TwilioConfig } from "./twilio-events.js";
 *
 * const bridge = createDoomBridge();
 *
 * const twilioConfig: TwilioConfig = {
 *   accountSid: process.env.TWILIO_ACCOUNT_SID!,
 *   authToken: process.env.TWILIO_AUTH_TOKEN!,
 *   fromNumber: process.env.TWILIO_FROM_NUMBER!,
 *   toNumber: process.env.USER_PHONE_NUMBER!,
 *   voiceWebhookUrl: "https://your-server.com/twilio/voice",
 * };
 *
 * setupTwilioEvents(bridge, twilioConfig);
 * bridge.startEventPolling();
 * ```
 */
import type { DoomBridge } from "./bridge.js";
import type { DoomEvent } from "./types.js";
export interface TwilioConfig {
    accountSid: string;
    authToken: string;
    fromNumber: string;
    toNumber: string;
    voiceWebhookUrl: string;
    smsEnabled?: boolean;
    callEnabled?: boolean;
}
export interface TwilioEventConfig {
    callEvents?: Array<"critical_health" | "player_died" | "secret_found">;
    smsEvents?: Array<"level_started" | "key_acquired" | "weapon_acquired">;
    callCooldownMs?: number;
    formatCallMessage?: (event: DoomEvent) => string;
    formatSmsMessage?: (event: DoomEvent) => string;
}
/**
 * Set up Twilio event handlers on a DoomBridge instance.
 */
export declare function setupTwilioEvents(bridge: DoomBridge, twilioConfig: TwilioConfig, eventConfig?: TwilioEventConfig): void;
/**
 * Generate TwiML for a Doomguy voice call.
 * Use this in your voice webhook endpoint.
 *
 * @example Express endpoint:
 * ```typescript
 * app.post("/twilio/voice", (req, res) => {
 *   const { event, message } = req.query;
 *   const twiml = generateDoomguyTwiml(event as string, message as string);
 *   res.type("text/xml").send(twiml);
 * });
 * ```
 */
export declare function generateDoomguyTwiml(eventType: string, message: string, options?: {
    connectToAgent?: boolean;
    agentStreamUrl?: string;
}): string;
/**
 * Format a level completion SMS.
 */
export declare function formatLevelCompleteSms(episode: number, map: number, kills: number, items: number, secrets: number): string;
/**
 * Format a periodic status SMS.
 */
export declare function formatStatusSms(health: number, armor: number, kills: number, episode: number, map: number): string;
//# sourceMappingURL=twilio-events.d.ts.map