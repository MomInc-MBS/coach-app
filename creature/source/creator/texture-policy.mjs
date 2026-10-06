// The only textures available before opening packs. Keep these IDs shared by the
// registry and reward pool so future catalog additions default to pack access.
export const FREE_TEXTURE_IDS=Object.freeze([
 'clay', 'martial-arts-canvas-gi', 'arms-rope', 'yoga-cork', 'glutes-peach',
]);
// Former choices remain understood by old recipes but cannot be picked, awarded,
// previewed, or saved again. Clay is their closest safe material fallback.
// R25 (Ian's notebook): Original MYR5, Jelly and Bubble Glass leave the catalogue. Saved looks and
// owned grants move to their kept twin; Original MYR5 has none, so it takes the free starter (Clay).
export const TEXTURE_REPLACEMENTS=Object.freeze({'legacy-0':'clay','legacy-21':'opal-jelly','bubble-glass':'glitter-resin'});
export const RETIRED_TEXTURE_IDS=Object.freeze(['flat', 'legacy-22',...Object.keys(TEXTURE_REPLACEMENTS)]);
/** The kept twin of a removed texture (grants and saves follow it); any other id is returned as is. */
export const replacementTextureId=id=>Object.hasOwn(TEXTURE_REPLACEMENTS,id)?TEXTURE_REPLACEMENTS[id]:id;
export const normalizeTextureId=id=>{const kept=replacementTextureId(id);return RETIRED_TEXTURE_IDS.includes(kept)?'clay':kept;};
export const normalizeStyleId=id=>id===22?0:id;
