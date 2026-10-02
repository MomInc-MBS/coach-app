# R19 log (author of each change)
- L1 unlocked-first lists: NVIDIA Kimi K3 (card L1; first combined card L12 returned empty, split into L1/L2). Applied unchanged.
- L2 remove body-part chips: NVIDIA Kimi K3 (card L2). index.html chip div/heading + slider attrs: Claude (trivial HTML).
- L3 zoom full-body -> head+eyes: NVIDIA Kimi K3 (card L3). Claude tuned head padding 1.2 -> 1.45 (head cone was cropped at max zoom).
- J Grimoire CRT button: local gpt-oss-20b (card J); Claude replaced its flat background with a radial bulged-glass + inset shadow and a real vignette/highlight ::after (model left them out).
- K2 standalone aura: local gpt-oss-20b (card K2), applied unchanged.
- K rimMask fullscreen: see below.
- Tests: tests/r19-customizer.browser.test.mjs written by Claude; r18-customizer and customizer-editor tests updated by Claude for the new slider range / no chips.
