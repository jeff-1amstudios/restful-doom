# Doom Bridge

Bridge service between [restful-doom](https://github.com/jeff-1amstudios/restful-doom) and AI agents. Turn Doomguy into a realtime voice agent that can play DOOM, narrate the action, and even call you when things get hairy.

## Overview

```
Doom Engine ⟷ REST API (restful-doom) ⟷ Doom Bridge ⟷ LLM + Voice ⟷ WebRTC/Phone
                   :6666                    :stdio         (your stack)
```

Doom Bridge provides:

- **MCP Server**: Tools for Model Context Protocol compatible agents
- **OpenAI Realtime Tools**: Definitions for OpenAI's speech-to-speech API
- **Semantic Understanding**: Natural language descriptions of game state
- **Event System**: Triggers for health changes, level transitions, secrets
- **Twilio Integration**: Template for "fourth wall" phone calls and texts

## Quick Start

### Prerequisites

1. Build and run restful-doom:
   ```bash
   cd /path/to/restful-doom
   ./configure-and-build.sh
   src/restful-doom -iwad doom1.wad -apiport 6666
   ```

2. Install doom-bridge:
   ```bash
   cd doom-bridge
   npm install
   npm run build
   ```

### Test the Connection

```bash
npm test
# or
DOOM_HOST=localhost DOOM_PORT=6666 npx tsx src/test-client.ts
```

### Run the MCP Server

```bash
npm run mcp
# or with custom port
DOOM_PORT=6666 node dist/mcp-server.js
```

### Configure Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "doom-bridge": {
      "command": "node",
      "args": ["/path/to/doom-bridge/dist/mcp-server.js"],
      "env": {
        "DOOM_HOST": "localhost",
        "DOOM_PORT": "6666"
      }
    }
  }
}
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `doom_get_state` | Complete game state (player, world, objects, doors, environment) |
| `doom_get_observation` | Concise summary for AI context |
| `doom_describe_environment` | Natural language environment description |
| `doom_perform_action` | Execute actions (forward, shoot, use, etc.) |
| `doom_turn_to` | Turn to absolute angle |
| `doom_can_see` | Check line of sight to object |
| `doom_show_message` | Display HUD message |

### Actions

```
forward, backward, strafe-left, strafe-right,
turn-left, turn-right, shoot, use, switch-weapon
```

## Programmatic Usage

```typescript
import { createDoomBridge } from "doom-bridge";

const bridge = createDoomBridge({ host: "localhost", port: 6666 });

// Get state
const state = await bridge.getState();
console.log(`Health: ${state.player.health}`);
console.log(`Enemies: ${state.environment.enemies.length}`);

// Perform actions
await bridge.performAction("forward", 30);
await bridge.performAction("shoot");

// Get spoken description
const description = await bridge.describeState();
// "E1M1. Wounded (45%), 20% armor, wielding Shotgun (12 shells)..."

// Listen for events
bridge.on("critical_health", (event) => {
  console.log(event.message); // "Critical! Only 12 health left!"
  // Trigger Twilio call here
});

bridge.startEventPolling();
```

## OpenAI Realtime Integration

```typescript
import { OPENAI_REALTIME_TOOLS, handleToolCall, DOOMGUY_SYSTEM_PROMPT } from "doom-bridge";
import { createDoomBridge } from "doom-bridge";

const bridge = createDoomBridge();

// Add tools to OpenAI Realtime session
session.update({
  instructions: DOOMGUY_SYSTEM_PROMPT,
  tools: OPENAI_REALTIME_TOOLS,
});

// Handle tool calls
session.on("response.function_call_arguments.done", async (event) => {
  const result = await handleToolCall(bridge, event.name, JSON.parse(event.arguments));
  session.createResponse({
    type: "function_call_output",
    call_id: event.call_id,
    output: JSON.stringify(result),
  });
});
```

## Event System

Register handlers for game events:

```typescript
bridge.on("low_health", (e) => console.log(e.message));
bridge.on("critical_health", (e) => triggerEmergencyCall());
bridge.on("player_died", (e) => sendCondolences());
bridge.on("level_started", (e) => announceLevel());
bridge.on("secret_found", (e) => celebrate());
bridge.on("key_acquired", (e) => noteProgress());
bridge.on("weapon_acquired", (e) => gloat());
bridge.on("ammo_low", (e) => warnPlayer());
bridge.on("ammo_depleted", (e) => panic());
bridge.on("armor_depleted", (e) => seekCover());

bridge.startEventPolling();
```

## Twilio Integration

Template for "fourth wall" interactions:

```typescript
import { setupTwilioEvents } from "doom-bridge/twilio-events";

setupTwilioEvents(bridge, {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  fromNumber: "+1555DOOMGUY",
  toNumber: "+1555YOURNUM",
  voiceWebhookUrl: "https://your-server.com/twilio/voice",
  callEnabled: true,
  smsEnabled: true,
}, {
  callEvents: ["critical_health", "player_died"],
  smsEvents: ["level_started", "key_acquired"],
});
```

## Data Structures

### Player State

```typescript
{
  health: 67,
  armor: 45,
  weapon: "Shotgun",
  ammo: { Bullets: 50, Shells: 24, Rockets: 0, Cells: 0 },
  keys: ["blue"],
  position: { x: 1344, y: -560, angle: 90 },
  kills: 14,
  items: 4,
  secrets: 1
}
```

### Environment Description

```typescript
{
  summary: "2 Imps ahead (near), 1 Pinky Demon to your right (far). Medkit behind you.",
  threats: ["Warning: 2 medium threats detected"],
  nearbyItems: ["Health: Stimpak behind (very close)"],
  enemyCount: 3,
  doorCount: 1
}
```

## Development

```bash
npm run dev      # Watch mode with tsx
npm run build    # Compile TypeScript
npm test         # Run test client
npm run mcp      # Start MCP server
```

## Architecture

```
src/
├── types.ts          # TypeScript types matching restful-doom API
├── api-client.ts     # Low-level REST client
├── semantics.ts      # Object categorization, direction, NL descriptions
├── bridge.ts         # Main DoomBridge class
├── mcp-server.ts     # MCP server entry point
├── openai-tools.ts   # OpenAI Realtime tool definitions + system prompt
├── twilio-events.ts  # Fourth-wall event handlers
├── test-client.ts    # Interactive test script
└── index.ts          # Public exports
```

## License

MIT - Same as restful-doom.

---

*"They are rage, brutal, without mercy. But you... you will be worse. Rip and tear, until it is done."*
