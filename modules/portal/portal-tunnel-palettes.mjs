/**
 * Material-specific wormhole palette presets.
 * Pure ES module. No storage, DOM, or external dependencies.
 */

export { RAW_PALETTE_DATA as PALETTES };
const RAW_PALETTE_DATA = {
  wood: [
    { id: 'oak', label: 'Oak', colors: ['#D2B48C', '#C19A6B', '#A67B5B', '#8B5A2B'], core: '#8B5A2B' },
    { id: 'cherry', label: 'Cherry', colors: ['#DEB887', '#CD853F', '#B22222', '#8B0000'], core: '#8B0000' },
    { id: 'walnut', label: 'Walnut', colors: ['#5C4033', '#4A3020', '#3B2415', '#2C1810'], core: '#2C1810' },
    { id: 'maple', label: 'Maple', colors: ['#F4A460', '#E69550', '#D88640', '#C97730'], core: '#C97730' }
  ],
  ice: [
    { id: 'clear_crystal', label: 'Clear Crystal', colors: ['#E0F7FA', '#B2EBF2', '#80DEEA', '#4DD0E1'], core: '#4DD0E1' },
    { id: 'amethyst', label: 'Amethyst', colors: ['#E1BEE7', '#CE93D8', '#BA68C8', '#9C27B0'], core: '#9C27B0' },
    { id: 'ruby', label: 'Ruby', colors: ['#FFCDD2', '#EF9A9A', '#E57373', '#D32F2F'], core: '#D32F2F' },
    { id: 'emerald', label: 'Emerald', colors: ['#C8E6C9', '#A5D6A7', '#81C784', '#4CAF50'], core: '#4CAF50' },
    { id: 'sapphire', label: 'Sapphire', colors: ['#BBDEFB', '#90CAF9', '#64B5F6', '#2196F3'], core: '#2196F3' }
  ],
  cogs: [
    { id: 'steel', label: 'Steel', colors: ['#CFD8DC', '#B0BEC5', '#90A4AE', '#78909C'], core: '#78909C' },
    { id: 'iron', label: 'Iron', colors: ['#757575', '#616161', '#484848', '#303030'], core: '#303030' },
    { id: 'copper', label: 'Copper', colors: ['#FFCC80', '#FFB74D', '#FFA726', '#FB8C00'], core: '#FB8C00' },
    { id: 'bronze', label: 'Bronze', colors: ['#D7CCC8', '#BCAAA4', '#A1887F', '#8D6E63'], core: '#8D6E63' },
    { id: 'silver', label: 'Silver', colors: ['#ECEFF1', '#CFD8DC', '#B0BEC5', '#90A4AE'], core: '#90A4AE' },
    { id: 'gold', label: 'Gold', colors: ['#FFF9C4', '#FFF59D', '#FFF176', '#FFEE58'], core: '#FFEE58' }
  ],
  grass: [
    { id: 'meadow', label: 'Meadow Greens', colors: ['#70A64D', '#326B3D', '#F3D66B', '#F09BB8'], core: '#7AC85B' },
    { id: 'wildflowers', label: 'Wildflowers', colors: ['#6E9F45', '#28593A', '#E87AAE', '#9B72D2'], core: '#72BF55' },
    { id: 'daisies', label: 'Daisies', colors: ['#76A84D', '#315F3A', '#FFFDF2', '#F4D64E'], core: '#80C75B' }
  ],
  jelly: [
    { id: 'candy', label: 'Candy', colors: ['#F48FB1', '#CE93D8', '#90CAF9', '#80CBC4'], core: '#CE93D8' },
    { id: 'neon', label: 'Neon', colors: ['#E040FB', '#D500F9', '#AA00FF', '#6200EA'], core: '#6200EA' },
    { id: 'cosmic', label: 'Cosmic', colors: ['#7E57C2', '#5E35B1', '#4527A0', '#311B92'], core: '#311B92' },
    { id: 'fruit', label: 'Fruit', colors: ['#FFAB91', '#FF8A65', '#FF7043', '#F4511E'], core: '#F4511E' }
  ],
  pond: [
    { id: 'brackish', label: 'Brackish', colors: ['#0E3B3A', '#2E6B5C', '#7FB8A0', '#4F7A2E'], core: '#5FD3B8' },
    { id: 'koi', label: 'Koi', colors: ['#0B2E33', '#1F5C66', '#FF8A3D', '#3F6F2A'], core: '#FFB067' },
    { id: 'lotus', label: 'Lotus', colors: ['#12313A', '#3B6E73', '#FFC2D9', '#4D7B33'], core: '#FFD3E4' },
    { id: 'moonlit', label: 'Moonlit', colors: ['#071A2B', '#1D4766', '#9CC9E0', '#2F5A4A'], core: '#CFE8F5' }
  ]
};

// Helper to check if a string is a valid 6-digit hex color
function isValidHexColor(color) {
  return typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color);
}

// Helper to validate a palette entry
function isValidPaletteEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  if (!entry.id || typeof entry.id !== 'string') return false;
  if (!entry.label || typeof entry.label !== 'string') return false;
  if (!Array.isArray(entry.colors) || entry.colors.length < 3 || entry.colors.length > 6) return false;
  if (!entry.colors.every(isValidHexColor)) return false;
  if (!isValidHexColor(entry.core)) return false;
  return true;
}

// Helper to deep clone a palette entry defensively
function clonePaletteEntry(entry) {
  return {
    id: entry.id,
    label: entry.label,
    colors: [...entry.colors],
    core: entry.core
  };
}

// Helper to get all valid presets for a category
function getValidPresets(category) {
  const presets = RAW_PALETTE_DATA[category];
  if (!Array.isArray(presets)) return [];
  return presets.filter(isValidPaletteEntry).map(clonePaletteEntry);
}

// Helper to find the first valid preset in a category
function getFirstValidPreset(category) {
  const presets = getValidPresets(category);
  return presets.length > 0 ? presets[0] : null;
}

/**
 * Get a specific palette for a board ID and preset ID.
 * @param {string} boardId - The board identifier.
 * @param {string} presetId - The preset identifier.
 * @returns {object|null} - A defensive copy of the palette object, or null.
 */
export function paletteFor(boardId, presetId) {
  // Check for null/undefined boardId
  if (boardId == null) return null;

  // Check for prototype property access (e.g., __proto__, constructor, toString)
  if (Object.prototype.hasOwnProperty.call(Object, boardId) || boardId in Object.prototype) {
    return null;
  }

  // Check if boardId is a direct property of RAW_PALETTE_DATA
  if (!Object.prototype.hasOwnProperty.call(RAW_PALETTE_DATA, boardId)) {
    return null;
  }

  const presets = RAW_PALETTE_DATA[boardId];
  if (!Array.isArray(presets)) return null;

  // If presetId is provided, find the matching preset
  if (presetId != null && typeof presetId === 'string') {
    const found = presets.find(p => p.id === presetId);
    if (found && isValidPaletteEntry(found)) {
      return clonePaletteEntry(found);
    }
  }

  // Return the first valid preset as default
  return getFirstValidPreset(boardId);
}

/**
 * Get all available palette options for a board ID.
 * @param {string} boardId - The board identifier.
 * @returns {Array} - An array of defensive copies of palette objects.
 */
export function paletteOptions(boardId) {
  // Check for null/undefined boardId
  if (boardId == null) return [];

  // Check for prototype property access
  if (Object.prototype.hasOwnProperty.call(Object, boardId) || boardId in Object.prototype) {
    return [];
  }

  // Check if boardId is a direct property of RAW_PALETTE_DATA
  if (!Object.prototype.hasOwnProperty.call(RAW_PALETTE_DATA, boardId)) {
    return [];
  }

  return getValidPresets(boardId);
}
