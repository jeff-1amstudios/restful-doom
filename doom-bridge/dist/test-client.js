#!/usr/bin/env npx tsx
/**
 * Doom Bridge - Test Client
 *
 * Interactive test script to verify the bridge is working.
 * Run with: npx tsx src/test-client.ts
 *
 * Make sure restful-doom is running:
 *   src/restful-doom -iwad doom1.wad -apiport 6666
 */
import { createDoomBridge } from "./bridge.js";
import { generateStatusUpdate } from "./semantics.js";
async function main() {
    const host = process.env.DOOM_HOST ?? "localhost";
    const port = parseInt(process.env.DOOM_PORT ?? "6666", 10);
    console.log(`\n🎮 Doom Bridge Test Client`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Connecting to restful-doom at ${host}:${port}...\n`);
    const bridge = createDoomBridge({ host, port });
    // Check connection
    const connected = await bridge.isConnected();
    if (!connected) {
        console.error("❌ Cannot connect to restful-doom!");
        console.error("   Make sure the game is running with -apiport flag.\n");
        process.exit(1);
    }
    console.log("✅ Connected to restful-doom\n");
    // Get full state
    console.log("📊 GAME STATE");
    console.log("─────────────");
    const state = await bridge.getState();
    console.log(`\n🗺  World: E${state.world.episode}M${state.world.map} (${state.world.wad})`);
    console.log(`   Skill: ${state.world.skill}`);
    console.log(`\n👤 Player:`);
    console.log(`   Health: ${state.player.health}%`);
    console.log(`   Armor: ${state.player.armor}%`);
    console.log(`   Position: (${Math.round(state.player.position.x)}, ${Math.round(state.player.position.y)})`);
    console.log(`   Facing: ${state.player.angle}°`);
    console.log(`\n🔫 Weapons:`);
    console.log(`   Current: Weapon #${state.player.weapon}`);
    const ownedWeapons = Object.entries(state.player.weapons)
        .filter(([, owned]) => owned)
        .map(([name]) => name);
    console.log(`   Owned: ${ownedWeapons.join(", ")}`);
    console.log(`\n💊 Ammo:`);
    console.log(`   Bullets: ${state.player.ammo.Bullets}`);
    console.log(`   Shells: ${state.player.ammo.Shells}`);
    console.log(`   Rockets: ${state.player.ammo.Rockets}`);
    console.log(`   Cells: ${state.player.ammo.Cells}`);
    console.log(`\n🔑 Keys:`);
    const keys = [];
    if (state.player.keyCards.blue)
        keys.push("Blue");
    if (state.player.keyCards.red)
        keys.push("Red");
    if (state.player.keyCards.yellow)
        keys.push("Yellow");
    console.log(`   ${keys.length > 0 ? keys.join(", ") : "None"}`);
    console.log(`\n📈 Stats:`);
    console.log(`   Kills: ${state.player.kills}`);
    console.log(`   Items: ${state.player.items}`);
    console.log(`   Secrets: ${state.player.secrets}`);
    // Environment
    console.log(`\n🌍 ENVIRONMENT`);
    console.log(`──────────────`);
    console.log(`   Objects nearby: ${state.nearbyObjects.length}`);
    console.log(`   Doors nearby: ${state.doors.length}`);
    const env = state.environment;
    console.log(`\n   Enemies: ${env.enemies.length}`);
    if (env.enemies.length > 0) {
        for (const enemy of env.enemies.slice(0, 5)) {
            console.log(`   - ${enemy.type} (${enemy.direction}, ${enemy.distanceBucket}, HP: ${enemy.health})`);
        }
        if (env.enemies.length > 5) {
            console.log(`   ... and ${env.enemies.length - 5} more`);
        }
    }
    if (env.threats.length > 0) {
        console.log(`\n   ⚠️  Threats:`);
        for (const threat of env.threats) {
            console.log(`   - ${threat}`);
        }
    }
    if (env.nearbyItems.length > 0) {
        console.log(`\n   📦 Nearby items:`);
        for (const item of env.nearbyItems) {
            console.log(`   - ${item}`);
        }
    }
    // Natural language description
    console.log(`\n🎤 SPOKEN STATUS (for voice agent)`);
    console.log(`───────────────────────────────────`);
    const spokenStatus = generateStatusUpdate(state.player, state.nearbyObjects, state.doors, state.world);
    console.log(`\n"${spokenStatus}"\n`);
    // Observation format
    console.log(`\n📋 OBSERVATION (for AI context)`);
    console.log(`────────────────────────────────`);
    const observation = await bridge.getObservation();
    console.log(JSON.stringify(observation, null, 2));
    // Test event system
    console.log(`\n🔔 EVENT SYSTEM TEST`);
    console.log(`────────────────────`);
    console.log(`   Starting event polling...`);
    let eventCount = 0;
    bridge.on("low_health", (event) => {
        eventCount++;
        console.log(`   📢 Event: ${event.type} - "${event.message}"`);
    });
    bridge.on("secret_found", (event) => {
        eventCount++;
        console.log(`   📢 Event: ${event.type} - "${event.message}"`);
    });
    bridge.on("key_acquired", (event) => {
        eventCount++;
        console.log(`   📢 Event: ${event.type} - "${event.message}"`);
    });
    bridge.startEventPolling();
    console.log(`   Polling active. Play the game to trigger events.`);
    console.log(`   Press Ctrl+C to stop.\n`);
    // Keep running until interrupted
    await new Promise(() => { });
}
main().catch(console.error);
//# sourceMappingURL=test-client.js.map