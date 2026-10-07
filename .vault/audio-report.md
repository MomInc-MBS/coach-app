# Music loop report

Tempo/bars come from onset-grid fits plus level drops (see scripts/music-loops.py). Seam pct = share of the 7 interior bar lines whose spectral jump is SMALLER than the wrap (the wrap is a bar line, so a bar-line-sized jump is expected: under ~70 = as smooth as a normal bar line, 100 = rougher than every one). Nobody could listen: judge by ear with `.vault/audio-check/*-x3.wav`.

| song | bpm | bars | loop s | source start s | tail folded s | seam pct | mel jump (seam / typical) | rms jump 5ms dB | m4a bytes | decode len - frames | note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| hey-man-idk | 105.25 | 8 | 18.243 | 0.61 | 0.06 | 71.4 | 0.596 / 0.34 | 0.62 | 260040 | 0 | music begins 0.6 s; level drops at 19.0 s |
| guarded-gate | 120.0 | 8 | 16.0 | 0.02 | 0.06 | 0.0 | 0.521 / 1.352 | 1.1 | 228716 | 0 | 120 bpm grid fits cleanly for 8 bars (16 s); music keeps playing after bar 8 |
| daemon-time | 90.16 | 8 | 21.296 | 0.64 | 0.06 | 0.0 | 0.307 / 0.688 | 1.44 | 310247 | 0 | grid phase 0.6 s, ~91 bpm throughout the body |
| sick-with-science | 140.5 | 8 | 13.665 | 0.02 | 0.21 | 71.4 | 0.713 / 0.624 | 0.61 | 194523 | 0 | drop at 13.7 s |
| laboratory-violence | 120.0 | 8 | 16.0 | 0.01 | 0.51 | 100.0 | 2.105 / 0.619 | 3.08 | 229213 | 0 | drop at 15.98 s = 8 bars at 120 |
| main-theme-one | 120.0 | 8 | 16.0 | 2.02 | 0.06 | 28.6 | 0.893 / 1.064 | 6.29 | 240960 | 0 | 2 s count-in clicks then music; self-similar at +16 s |
