# Lane G2b: replace FREE_COLOURS with 15 spanning colours

Reply ONLY with SEARCH/REPLACE blocks in this format (exact existing lines in SEARCH):
FILE: path
<<<<<<< SEARCH
<exact existing lines>
=======
<new lines>
>>>>>>> REPLACE

## Edit 1: battle-pass-rewards.mjs lines 136-146 (current)
```
// R18 G2: the 15 free colours are the top hexes by count (scripts/colour-census.mjs); everything else
// is pack-only. Pool = every palette + every non-free single colour of the registry.
export const FREE_COLOURS=Object.freeze([
 '#111111', // 2 (Static Pop + Caution Tape Couture)
 '#ffffff', // 2 (Static Pop + Caution Tape Couture)
 '#8b8f9a','#4a4d55','#e7e9ee', // count 1 each, ties in first-appearance order: Slate
 '#b7a68e','#7a6b57','#ddcdb3', // 1 each: Warm Clay
 '#a23b4a','#4f1620','#f2a3ae', // 1 each: Ruby
 '#2d5aa0','#122a4d','#a9c9f5', // 1 each: Sapphire
 '#4c7a3f', // 1: Moss primary
]);
```
Replace with: a comment saying these 15 span the hue range, each the nearest (Lab) hex already in the census of palettes.json + SIMPLE_COLORS + LEGACY_COLORS (everything else pack-only), then the array, one hex per line, each with a trailing comment naming the target hue, in this order and with these exact lowercase hexes:
black #060409, white #ffffff, grey #7f7d78, red #ff3b30, orange #ff8a2a, yellow #ffd100, green #2bd97c, teal #008c8c, blue #2454d6, purple #6a2bd9, pink #f59ec4, brown #7a5530, tan #c4a77d, navy #0b1a45, mint #9fe2bf.
Keep `export const FREE_COLOURS=Object.freeze([` ... `]);` shape.

## Edit 2: tests/r18-unlocks.test.mjs lines 37-45 (current)
```
test('the 15 free colours are the top 15 hexes by count',()=>{
 assert.deepEqual([...FREE_COLOURS],['#111111','#ffffff','#8b8f9a','#4a4d55','#e7e9ee','#b7a68e','#7a6b57','#ddcdb3','#a23b4a','#4f1620','#f2a3ae','#2d5aa0','#122a4d','#a9c9f5','#4c7a3f']);
 const n=new Map(),add=h=>n.set(h.toLowerCase(),(n.get(h.toLowerCase())||0)+1);
 for(const c of COLORS)[c.primary,c.secondary,c.accent].forEach(add);
 for(const p of PALETTES)p.colors.forEach(add);
 const top=[...n].sort((a,b)=>b[1]-a[1]).slice(0,15);
 assert.deepEqual(top.map(([h])=>h),[...FREE_COLOURS]);
 for(const h of FREE_COLOURS){assert.equal(isLocked(h),false,h);assert.ok(colorTriad(h));}
 assert.equal(isLocked('#0a0a0a'),true);
});
```
Replace with a test named 'the 15 free colours span the hue range and each already exists in the census' that: asserts deepEqual of [...FREE_COLOURS] to the 15-hex list above (same order); builds the census Set of lowercase hexes from COLORS (primary/secondary/accent) and PALETTES colours and asserts every FREE_COLOURS hex is in it, and that the 15 are distinct; keeps the `for(const h of FREE_COLOURS){isLocked false; colorTriad ok}` loop; keeps `assert.equal(isLocked('#0a0a0a'),true);`.
