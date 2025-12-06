/**
 * Doom Bridge - TypeScript Types
 *
 * These types match the restful-doom API responses exactly.
 * Based on RAML specs and actual API implementation.
 */
// ============================================================================
// Weapon Metadata
// ============================================================================
export const WEAPON_NAMES = {
    0: "Fists",
    1: "Pistol",
    2: "Shotgun",
    3: "Chaingun",
    4: "Rocket Launcher",
    5: "Plasma Rifle",
    6: "BFG 9000",
    7: "Chainsaw",
    8: "Super Shotgun" // Doom 2
};
export const WEAPON_AMMO_TYPES = {
    0: null, // Fists - no ammo
    1: "Bullets", // Pistol
    2: "Shells", // Shotgun
    3: "Bullets", // Chaingun
    4: "Rockets", // Rocket Launcher
    5: "Cells", // Plasma Rifle
    6: "Cells", // BFG 9000
    7: null, // Chainsaw - no ammo
    8: "Shells" // Super Shotgun
};
//# sourceMappingURL=types.js.map