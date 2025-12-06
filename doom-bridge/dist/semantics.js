/**
 * Doom Bridge - Semantic Helpers
 *
 * Provides higher-level understanding of game state:
 * - Object categorization (enemies, pickups, hazards)
 * - Relative direction computation
 * - Natural language descriptions
 * - Threat assessment
 */
// ============================================================================
// Object Type Classification
// ============================================================================
const ENEMY_TYPES = new Set([
    "FORMER HUMAN",
    "FORMER HUMAN SERGEANT",
    "HEAVY WEAPON DUDE",
    "IMP",
    "DEMON",
    "SPECTRE",
    "LOST SOUL",
    "CACODEMON",
    "HELL KNIGHT",
    "BARON OF HELL",
    "ARACHNOTRON",
    "PAIN ELEMENTAL",
    "REVENANT",
    "MANCUBUS",
    "ARCH-VILE",
    "SPIDER MASTERMIND",
    "CYBER-DEMON",
    "WOLFENSTEIN SS",
    "COMMANDER KEEN",
    "BOSS BRAIN",
    "BOSS SHOOTER",
]);
const WEAPON_TYPES = new Set([
    "CHAINSAW",
    "SHOTGUN",
    "DOUBLE-BARRELED SHOTGUN",
    "CHAINGUN",
    "ROCKET LAUNCHER",
    "PLASMA GUN",
    "BFG9000",
]);
const AMMO_TYPES = new Set([
    "AMMO CLIP",
    "SHOTGUN SHELLS",
    "ROCKET",
    "CELL CHARGE",
    "BOX OF AMMO",
    "BOX OF SHELLS",
    "BOX OF ROCKETS",
    "CELL CHARGE PACK",
    "BACKPACK",
]);
const HEALTH_TYPES = new Set([
    "STIMPAK",
    "MEDIKIT",
    "HEALTH POTION",
    "SOULSPHERE",
    "MEGASPHERE",
]);
const ARMOR_TYPES = new Set([
    "SPIRIT ARMOR",
    "GREEN ARMOR",
    "BLUE ARMOR",
    "MEGASPHERE",
]);
const POWERUP_TYPES = new Set([
    "INVULNERABILITY",
    "BERSERK",
    "INVISIBILITY",
    "RADIATION SUIT",
    "COMPUTER MAP",
    "LITE AMPLIFICATION GOGGLES",
    "SOULSPHERE",
    "MEGASPHERE",
]);
const KEY_TYPES = new Set([
    "BLUE KEYCARD",
    "BLUE SKULLKEY",
    "RED KEYCARD",
    "RED SKULLKEY",
    "YELLOW KEYCARD",
    "YELLOW SKULLKEY",
]);
const HAZARD_TYPES = new Set([
    "BARREL",
    "BURNING BARREL",
]);
// Enemy threat levels based on difficulty
const ENEMY_THREAT_LEVELS = {
    "FORMER HUMAN": "low",
    "FORMER HUMAN SERGEANT": "low",
    "IMP": "low",
    "DEMON": "medium",
    "SPECTRE": "medium",
    "LOST SOUL": "low",
    "CACODEMON": "medium",
    "HELL KNIGHT": "high",
    "BARON OF HELL": "high",
    "HEAVY WEAPON DUDE": "medium",
    "ARACHNOTRON": "high",
    "PAIN ELEMENTAL": "medium",
    "REVENANT": "high",
    "MANCUBUS": "high",
    "ARCH-VILE": "extreme",
    "SPIDER MASTERMIND": "extreme",
    "CYBER-DEMON": "extreme",
};
// ============================================================================
// Categorization Functions
// ============================================================================
export function categorizeObject(obj) {
    const type = obj.type.toUpperCase();
    if (type === "PLAYER")
        return "unknown"; // Skip players
    if (ENEMY_TYPES.has(type))
        return "enemy";
    if (WEAPON_TYPES.has(type))
        return "weapon";
    if (AMMO_TYPES.has(type))
        return "ammo";
    if (HEALTH_TYPES.has(type))
        return "health";
    if (ARMOR_TYPES.has(type))
        return "armor";
    if (POWERUP_TYPES.has(type))
        return "powerup";
    if (KEY_TYPES.has(type))
        return "key";
    if (HAZARD_TYPES.has(type))
        return "hazard";
    return "decoration";
}
export function isEnemy(obj) {
    return ENEMY_TYPES.has(obj.type.toUpperCase());
}
export function isPickup(obj) {
    const type = obj.type.toUpperCase();
    return (WEAPON_TYPES.has(type) ||
        AMMO_TYPES.has(type) ||
        HEALTH_TYPES.has(type) ||
        ARMOR_TYPES.has(type) ||
        POWERUP_TYPES.has(type) ||
        KEY_TYPES.has(type));
}
export function isAlive(obj) {
    // Check if object is alive (has health and is shootable)
    return obj.health > 0 && (obj.flags.MF_SHOOTABLE === true);
}
export function getThreatLevel(obj) {
    const type = obj.type.toUpperCase();
    return ENEMY_THREAT_LEVELS[type];
}
// ============================================================================
// Direction and Distance Computation
// ============================================================================
/**
 * Compute relative direction from player to an object.
 * Uses 8-point compass (ahead, ahead-left, left, etc.)
 */
export function computeRelativeDirection(playerX, playerY, playerAngle, objectX, objectY) {
    // Calculate angle from player to object
    const dx = objectX - playerX;
    const dy = objectY - playerY;
    const angleToObject = (Math.atan2(dy, dx) * 180) / Math.PI;
    // Normalize to 0-360
    const normalizedAngle = (angleToObject + 360) % 360;
    // Calculate relative angle (0 = directly ahead)
    let relativeAngle = normalizedAngle - playerAngle;
    if (relativeAngle < 0)
        relativeAngle += 360;
    if (relativeAngle > 180)
        relativeAngle -= 360;
    // Map to 8-point compass
    if (relativeAngle >= -22.5 && relativeAngle < 22.5)
        return "ahead";
    if (relativeAngle >= 22.5 && relativeAngle < 67.5)
        return "ahead-left";
    if (relativeAngle >= 67.5 && relativeAngle < 112.5)
        return "left";
    if (relativeAngle >= 112.5 && relativeAngle < 157.5)
        return "behind-left";
    if (relativeAngle >= 157.5 || relativeAngle < -157.5)
        return "behind";
    if (relativeAngle >= -157.5 && relativeAngle < -112.5)
        return "behind-right";
    if (relativeAngle >= -112.5 && relativeAngle < -67.5)
        return "right";
    if (relativeAngle >= -67.5 && relativeAngle < -22.5)
        return "ahead-right";
    return "ahead"; // Default fallback
}
/**
 * Convert distance in Doom units to a human-readable bucket.
 */
export function computeDistanceBucket(distance) {
    if (distance < 256)
        return "very close";
    if (distance < 512)
        return "close";
    if (distance < 1024)
        return "near";
    if (distance < 2048)
        return "far";
    return "very far";
}
/**
 * Compute distance between two positions.
 */
export function computeDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}
// ============================================================================
// Semantic Object Creation
// ============================================================================
/**
 * Enhance a MapObject with semantic information.
 */
export function createSemanticObject(obj, player) {
    const distance = obj.distance ?? computeDistance(player.position.x, player.position.y, obj.position.x, obj.position.y);
    return {
        ...obj,
        category: categorizeObject(obj),
        direction: computeRelativeDirection(player.position.x, player.position.y, player.angle, obj.position.x, obj.position.y),
        distanceBucket: computeDistanceBucket(distance),
        threat: isEnemy(obj) ? getThreatLevel(obj) : undefined,
    };
}
// ============================================================================
// Natural Language Descriptions
// ============================================================================
/**
 * Get a friendly name for an object type.
 */
export function getFriendlyName(type) {
    const mapping = {
        "FORMER HUMAN": "Zombie Soldier",
        "FORMER HUMAN SERGEANT": "Shotgun Zombie",
        "HEAVY WEAPON DUDE": "Chaingunner",
        "IMP": "Imp",
        "DEMON": "Pinky Demon",
        "SPECTRE": "Spectre",
        "LOST SOUL": "Lost Soul",
        "CACODEMON": "Cacodemon",
        "HELL KNIGHT": "Hell Knight",
        "BARON OF HELL": "Baron of Hell",
        "ARACHNOTRON": "Arachnotron",
        "PAIN ELEMENTAL": "Pain Elemental",
        "REVENANT": "Revenant",
        "MANCUBUS": "Mancubus",
        "ARCH-VILE": "Arch-vile",
        "SPIDER MASTERMIND": "Spider Mastermind",
        "CYBER-DEMON": "Cyberdemon",
        "STIMPAK": "Stimpak",
        "MEDIKIT": "Medikit",
        "HEALTH POTION": "Health Bonus",
        "SOULSPHERE": "Soulsphere",
        "MEGASPHERE": "Megasphere",
        "GREEN ARMOR": "Green Armor",
        "BLUE ARMOR": "Blue Armor",
        "SPIRIT ARMOR": "Armor Bonus",
        "AMMO CLIP": "Ammo Clip",
        "BOX OF AMMO": "Box of Bullets",
        "SHOTGUN SHELLS": "Shotgun Shells",
        "BOX OF SHELLS": "Box of Shells",
        "ROCKET": "Rocket",
        "BOX OF ROCKETS": "Box of Rockets",
        "CELL CHARGE": "Energy Cell",
        "CELL CHARGE PACK": "Energy Cell Pack",
        "BLUE KEYCARD": "Blue Keycard",
        "RED KEYCARD": "Red Keycard",
        "YELLOW KEYCARD": "Yellow Keycard",
        "BLUE SKULLKEY": "Blue Skull Key",
        "RED SKULLKEY": "Red Skull Key",
        "YELLOW SKULLKEY": "Yellow Skull Key",
        "CHAINSAW": "Chainsaw",
        "SHOTGUN": "Shotgun",
        "DOUBLE-BARRELED SHOTGUN": "Super Shotgun",
        "CHAINGUN": "Chaingun",
        "ROCKET LAUNCHER": "Rocket Launcher",
        "PLASMA GUN": "Plasma Rifle",
        "BFG9000": "BFG 9000",
        "BARREL": "Explosive Barrel",
        "BURNING BARREL": "Burning Barrel",
    };
    return mapping[type.toUpperCase()] ?? type;
}
/**
 * Describe a single object in natural language.
 */
export function describeObject(obj) {
    const name = getFriendlyName(obj.type);
    const distance = obj.distanceBucket;
    const direction = obj.direction.replace("-", " ");
    if (obj.category === "enemy" && isAlive(obj)) {
        const health = obj.health > 50 ? "healthy" : obj.health > 20 ? "wounded" : "badly hurt";
        return `${name} (${health}) ${direction}, ${distance}`;
    }
    return `${name} ${direction}, ${distance}`;
}
/**
 * Group objects by category and describe them.
 */
export function describeObjectGroup(objects, category) {
    // Only apply isAlive check for enemies - pickup items don't have health or MF_SHOOTABLE flag
    const filtered = objects.filter((o) => o.category === category && (category !== "enemy" || isAlive(o)));
    if (filtered.length === 0)
        return [];
    // Group by type and direction for conciseness
    const groups = new Map();
    for (const obj of filtered) {
        const key = `${obj.type}|${obj.direction}|${obj.distanceBucket}`;
        if (!groups.has(key))
            groups.set(key, []);
        groups.get(key).push(obj);
    }
    const descriptions = [];
    for (const [, objs] of groups) {
        const first = objs[0];
        const name = getFriendlyName(first.type);
        const count = objs.length;
        const direction = first.direction.replace("-", " ");
        const distance = first.distanceBucket;
        if (count === 1) {
            descriptions.push(`${name} ${direction} (${distance})`);
        }
        else {
            descriptions.push(`${count} ${name}s ${direction} (${distance})`);
        }
    }
    return descriptions;
}
// ============================================================================
// Full Environment Description
// ============================================================================
/**
 * Build a complete environment description from game state.
 */
export function describeEnvironment(player, objects, doors) {
    // Convert all objects to semantic objects
    const semanticObjects = objects
        .filter((o) => o.type !== "Player")
        .map((o) => createSemanticObject(o, player));
    // Categorize
    const enemies = semanticObjects.filter((o) => o.category === "enemy" && isAlive(o));
    const pickups = semanticObjects.filter((o) => isPickup(o));
    // Enhance doors with direction info
    const enhancedDoors = doors.map((door) => {
        // Use midpoint of door line for direction calculation
        const doorX = (door.line.v1.x + door.line.v2.x) / 2;
        const doorY = (door.line.v1.y + door.line.v2.y) / 2;
        const distance = door.distance ?? computeDistance(player.position.x, player.position.y, doorX, doorY);
        return {
            ...door,
            direction: computeRelativeDirection(player.position.x, player.position.y, player.angle, doorX, doorY),
            distanceBucket: computeDistanceBucket(distance),
        };
    });
    // Generate threat descriptions
    const threats = [];
    const threatCounts = { low: 0, medium: 0, high: 0, extreme: 0 };
    for (const enemy of enemies) {
        if (enemy.threat)
            threatCounts[enemy.threat]++;
    }
    if (threatCounts.extreme > 0) {
        threats.push(`DANGER: ${threatCounts.extreme} extreme threat(s) nearby!`);
    }
    if (threatCounts.high > 0) {
        threats.push(`Warning: ${threatCounts.high} high threat(s) detected`);
    }
    if (threatCounts.medium > 0) {
        threats.push(`${threatCounts.medium} medium threat(s) in area`);
    }
    if (threatCounts.low > 0) {
        threats.push(`${threatCounts.low} minor threat(s) present`);
    }
    // Generate pickup descriptions
    const nearbyItems = [];
    const healthItems = describeObjectGroup(semanticObjects, "health");
    const armorItems = describeObjectGroup(semanticObjects, "armor");
    const weaponItems = describeObjectGroup(semanticObjects, "weapon");
    const ammoItems = describeObjectGroup(semanticObjects, "ammo");
    const keyItems = describeObjectGroup(semanticObjects, "key");
    if (healthItems.length > 0)
        nearbyItems.push(`Health: ${healthItems.join(", ")}`);
    if (armorItems.length > 0)
        nearbyItems.push(`Armor: ${armorItems.join(", ")}`);
    if (weaponItems.length > 0)
        nearbyItems.push(`Weapons: ${weaponItems.join(", ")}`);
    if (ammoItems.length > 0)
        nearbyItems.push(`Ammo: ${ammoItems.join(", ")}`);
    if (keyItems.length > 0)
        nearbyItems.push(`Keys: ${keyItems.join(", ")}`);
    // Build summary
    const summaryParts = [];
    // Enemy summary
    if (enemies.length === 0) {
        summaryParts.push("No enemies in sight.");
    }
    else if (enemies.length === 1) {
        summaryParts.push(`1 enemy nearby: ${describeObject(enemies[0])}.`);
    }
    else {
        const enemyDescs = describeObjectGroup(semanticObjects, "enemy");
        summaryParts.push(`${enemies.length} enemies nearby: ${enemyDescs.join("; ")}.`);
    }
    // Pickup summary
    const urgentPickups = [];
    if (player.health < 50 && healthItems.length > 0) {
        urgentPickups.push(`health pickup ${healthItems[0]}`);
    }
    if (player.armor === 0 && armorItems.length > 0) {
        urgentPickups.push(`armor ${armorItems[0]}`);
    }
    if (urgentPickups.length > 0) {
        summaryParts.push(`Consider grabbing: ${urgentPickups.join(", ")}.`);
    }
    // Door summary
    const closedDoors = enhancedDoors.filter((d) => d.state === "closed");
    const lockedDoors = closedDoors.filter((d) => d.keyRequired !== "none");
    if (lockedDoors.length > 0) {
        const lockDescs = lockedDoors.map((d) => `${d.keyRequired} key door ${d.direction} (${d.distanceBucket})`);
        summaryParts.push(`Locked doors: ${lockDescs.join(", ")}.`);
    }
    return {
        enemies,
        threats,
        pickups,
        doors: enhancedDoors,
        nearbyItems,
        summary: summaryParts.join(" "),
    };
}
// ============================================================================
// Player State Descriptions
// ============================================================================
/**
 * Describe player's current weapon.
 */
export function describeWeapon(player) {
    const weaponNames = {
        0: "Fists",
        1: "Pistol",
        2: "Shotgun",
        3: "Chaingun",
        4: "Rocket Launcher",
        5: "Plasma Rifle",
        6: "BFG 9000",
        7: "Chainsaw",
        8: "Super Shotgun",
    };
    const weaponAmmo = {
        0: null,
        1: "Bullets",
        2: "Shells",
        3: "Bullets",
        4: "Rockets",
        5: "Cells",
        6: "Cells",
        7: null,
        8: "Shells",
    };
    const name = weaponNames[player.weapon] ?? "Unknown";
    const ammoType = weaponAmmo[player.weapon];
    if (ammoType === null) {
        return name; // No ammo needed
    }
    const ammoCount = player.ammo[ammoType];
    return `${name} (${ammoCount} ${ammoType.toLowerCase()})`;
}
/**
 * Describe player's overall status.
 */
export function describePlayerStatus(player) {
    const parts = [];
    // Health status
    if (player.health >= 100) {
        parts.push(`Full health (${player.health}%)`);
    }
    else if (player.health >= 75) {
        parts.push(`Healthy (${player.health}%)`);
    }
    else if (player.health >= 50) {
        parts.push(`Wounded (${player.health}%)`);
    }
    else if (player.health >= 25) {
        parts.push(`Badly hurt (${player.health}%)`);
    }
    else {
        parts.push(`Critical health (${player.health}%)!`);
    }
    // Armor
    if (player.armor > 0) {
        parts.push(`${player.armor}% armor`);
    }
    else {
        parts.push("no armor");
    }
    // Weapon
    parts.push(`wielding ${describeWeapon(player)}`);
    // Keys
    const keys = [];
    if (player.keyCards.blue)
        keys.push("blue");
    if (player.keyCards.red)
        keys.push("red");
    if (player.keyCards.yellow)
        keys.push("yellow");
    if (keys.length > 0) {
        parts.push(`${keys.join("/")} key${keys.length > 1 ? "s" : ""}`);
    }
    return parts.join(", ");
}
/**
 * Generate a complete status update for Doomguy to speak.
 */
export function generateStatusUpdate(player, objects, doors, world) {
    const status = describePlayerStatus(player);
    const env = describeEnvironment(player, objects, doors);
    const parts = [];
    // Location
    parts.push(`E${world.episode}M${world.map}.`);
    // Player status
    parts.push(status + ".");
    // Stats
    parts.push(`${player.kills} kills, ${player.items} items, ${player.secrets} secrets.`);
    // Environment
    parts.push(env.summary);
    return parts.join(" ");
}
//# sourceMappingURL=semantics.js.map