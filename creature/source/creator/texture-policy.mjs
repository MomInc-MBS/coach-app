// The only textures available before opening packs. Keep these IDs shared by the
// registry and reward pool so future catalog additions default to pack access.
export const FREE_TEXTURE_IDS=Object.freeze([
 'clay', 'martial-arts-canvas-gi', 'arms-rope', 'yoga-cork', 'glutes-peach',
]);
// Former choices remain understood by old recipes but cannot be picked, awarded,
// previewed, or saved again. Clay is their closest safe material fallback.
export const RETIRED_TEXTURE_IDS=Object.freeze(['flat', 'legacy-22']);
export const normalizeTextureId=id=>RETIRED_TEXTURE_IDS.includes(id)?'clay':id;
export const normalizeStyleId=id=>id===22?0:id;
