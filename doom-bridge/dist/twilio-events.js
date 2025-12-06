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
const DEFAULT_EVENT_CONFIG = {
    callEvents: ["critical_health", "player_died"],
    smsEvents: ["level_started", "key_acquired"],
    callCooldownMs: 60000, // 1 minute
    formatCallMessage: (event) => event.message,
    formatSmsMessage: (event) => `[DOOM] ${event.message}`,
};
/**
 * Create a Twilio client.
 * In production, use the actual Twilio SDK:
 *
 * ```typescript
 * import Twilio from "twilio";
 * const client = Twilio(accountSid, authToken);
 * ```
 */
function createTwilioClient(config) {
    // Placeholder implementation - replace with actual Twilio SDK
    console.log("[twilio] Creating client (placeholder mode)");
    return {
        calls: {
            async create(params) {
                console.log(`[twilio] Would call ${params.to} from ${params.from}`);
                console.log(`[twilio] Voice webhook: ${params.url}`);
                return { sid: `PLACEHOLDER_CALL_${Date.now()}` };
            },
        },
        messages: {
            async create(params) {
                console.log(`[twilio] Would SMS ${params.to}: ${params.body}`);
                return { sid: `PLACEHOLDER_SMS_${Date.now()}` };
            },
        },
    };
}
// ============================================================================
// Event Handler Setup
// ============================================================================
/**
 * Set up Twilio event handlers on a DoomBridge instance.
 */
export function setupTwilioEvents(bridge, twilioConfig, eventConfig = {}) {
    const config = { ...DEFAULT_EVENT_CONFIG, ...eventConfig };
    const client = createTwilioClient(twilioConfig);
    let lastCallTime = 0;
    // Helper to make a call
    async function makeCall(event) {
        if (!twilioConfig.callEnabled)
            return;
        const now = Date.now();
        if (now - lastCallTime < config.callCooldownMs) {
            console.log("[twilio] Call cooldown active, skipping");
            return;
        }
        try {
            const result = await client.calls.create({
                from: twilioConfig.fromNumber,
                to: twilioConfig.toNumber,
                url: `${twilioConfig.voiceWebhookUrl}?event=${event.type}&message=${encodeURIComponent(event.message)}`,
            });
            console.log(`[twilio] Call initiated: ${result.sid}`);
            lastCallTime = now;
        }
        catch (error) {
            console.error("[twilio] Call failed:", error);
        }
    }
    // Helper to send SMS
    async function sendSms(event) {
        if (!twilioConfig.smsEnabled)
            return;
        try {
            const body = config.formatSmsMessage(event);
            const result = await client.messages.create({
                from: twilioConfig.fromNumber,
                to: twilioConfig.toNumber,
                body,
            });
            console.log(`[twilio] SMS sent: ${result.sid}`);
        }
        catch (error) {
            console.error("[twilio] SMS failed:", error);
        }
    }
    // Register call event handlers
    for (const eventType of config.callEvents) {
        bridge.on(eventType, async (event) => {
            console.log(`[twilio] Call event triggered: ${eventType}`);
            await makeCall(event);
        });
    }
    // Register SMS event handlers
    for (const eventType of config.smsEvents) {
        bridge.on(eventType, async (event) => {
            console.log(`[twilio] SMS event triggered: ${eventType}`);
            await sendSms(event);
        });
    }
    console.log("[twilio] Event handlers registered");
    console.log(`[twilio] Call events: ${config.callEvents.join(", ")}`);
    console.log(`[twilio] SMS events: ${config.smsEvents.join(", ")}`);
}
// ============================================================================
// Voice Webhook Response Generators
// ============================================================================
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
export function generateDoomguyTwiml(eventType, message, options = {}) {
    // Simple TwiML - you'd typically connect this to your voice agent
    if (options.connectToAgent && options.agentStreamUrl) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man">${escapeXml(message)}</Say>
  <Connect>
    <Stream url="${escapeXml(options.agentStreamUrl)}">
      <Parameter name="event" value="${escapeXml(eventType)}" />
    </Stream>
  </Connect>
</Response>`;
    }
    // Simple announcement without agent
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="man">This is Doomguy. ${escapeXml(message)}</Say>
  <Pause length="1"/>
  <Say voice="man">Gotta go. Demons to kill.</Say>
</Response>`;
}
function escapeXml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}
// ============================================================================
// Stat Report Formatters
// ============================================================================
/**
 * Format a level completion SMS.
 */
export function formatLevelCompleteSms(episode, map, kills, items, secrets) {
    return (`[DOOM] E${episode}M${map} COMPLETE\n` +
        `Kills: ${kills} | Items: ${items} | Secrets: ${secrets}`);
}
/**
 * Format a periodic status SMS.
 */
export function formatStatusSms(health, armor, kills, episode, map) {
    const status = health > 75 ? "💪" : health > 50 ? "👍" : health > 25 ? "😰" : "💀";
    return (`[DOOM] Status: ${status}\n` +
        `E${episode}M${map} | HP:${health} ARM:${armor} | Kills:${kills}`);
}
//# sourceMappingURL=twilio-events.js.map