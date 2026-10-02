# R18 Lane A2: Full-scene pixel layout (waterfall + character + coach)

## Task
Redesign the meditation scene layout as a full-viewport pixel art composition:
1. Waterfall fills the dialog (background in meditation-far layer)
2. Character (Gala) sits on rock in bottom sixth
3. Four-legged coach is dark silhouette behind the waterfall
4. Adjust water opacity (~0.75) so coach shows through gently
5. Remove breathing ring (.breathing-ring/.breathing-orbit)
6. Move breath counter lower on screen
7. All within a pixel-art aesthetic with image-rendering:pixelated

## Reference art
- File: assets-inbox/r18/waterfall-reference.png
- Copy to: pod/worlds/meditation-waterfall.png (or similar served path)
- Use CSS `image-rendering:pixelated` for upscaling

## Files to modify
1. meditation.mjs - remove breathing ring/orbit elements, adjust layout
2. meditation.css - new full-viewport layout, waterfall background, positioning
3. Possibly breathing.mjs - if orbit/counter positioning touches breathing controls

## Design notes
- Scene starts grayscale (filter on base layer)
- Character positioned: left ~25%, bottom ~44%, height ~20vh (from existing CSS)
- Coach silhouette: behind waterfall at ~82% opacity, grayscale filter
- Waterfall: meditation-far layer, becomes new background
- Counter: move from orbit center to lower position (e.g., below character or bottom area)
- Remove .breathing-ring (.breathing-orbit) entirely - these were concentric circles

## Specific changes

### meditation.mjs
- Remove or comment out the `.breathing-ring` creation code (line ~19: `const orbit=...`)
- Adjust any references to breathing-orbit that affect layout
- Keep breathing-ring-stop button (pause control) but reposition it

### meditation.css
Remove or hide:
- `.breathing-ring` animation and styling
- `.breathing-orbit` positioning and layout
- All `.meditation-panel .breathing-ring` rules (width, height, transform)

New rules needed:
- Waterfall background image in meditation-far with image-rendering:pixelated
- Character positioning on the rock (should already exist, verify it's correct)
- Coach silhouette opacity adjustment (~0.75)
- Counter (data-breath-count) repositioned lower (bottom area or fixed position)
- Water layer opacity reduced so coach shows through

### meditation.css - Full scene composition
The final layout should show:
1. Waterfall (far layer) - full scene
2. Coach silhouette (mid layer) - semi-transparent behind water
3. Character (near layer) - on rock, bottom-right area
4. Counter/UI controls - lower portion of screen
5. Speech bubbles - over/near character

## Expected result
- Full-viewport pixel scene with waterfall theme
- Character and coach visible and positioned correctly
- No breathing ring circle animation
- All UI readable and positioned for mobile (375×812 target)
- Grayscale until complete breath cycle (color reveal handled in A3)

## Return format
For each file and change, return:
```
FILE: path/to/file.mjs
LINE: n
<entire replacement line (or DELETE if removing)>
```

For CSS: can provide individual rule blocks to replace/remove.

## Tests
- Syntax validation: `node -c meditation.mjs breathing.mjs`
- Visual inspection: pane check at 375×812 for layout accuracy
- No JavaScript errors in console
