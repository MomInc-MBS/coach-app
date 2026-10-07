# Music loop report

Tempo/bars come from onset-grid fits plus level drops (see scripts/music-loops.py). Seam pct = share of the 7 interior bar lines whose spectral jump is SMALLER than the wrap (the wrap is a bar line, so a bar-line-sized jump is expected: under ~70 = as smooth as a normal bar line, 100 = rougher than every one). Nobody could listen: judge by ear with `.vault/audio-check/*-x3.wav`.

| song | bpm | bars | loop s | source start s | tail folded s | seam pct | mel jump (seam / typical) | rms jump 5ms dB | m4a bytes | decode len - frames | note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| hey-man-idk | 188.43 | 8 | 10.189 | 0.585 | 0.04 xfade | 71.4 | 0.332 / 0.272 | 0.28 | 145363 | 0 | RECUT 7 Oct after Ian heard a jump: direct seam search (onset-pattern repeat, ncc 0.63 at 10.19 s; 5.1 s and 15.2 s are its 4/12-bar multiples), not a tempo grid |
| guarded-gate | 121.3 | 8 | 15.828 | 0.075 | 0.04 xfade | 0.0 | 1.097 / 1.621 | 1.79 | 226826 | 0 | RECUT 7 Oct after Ian heard a small bump: direct waveform seam search near 16 s (seam jump smaller than every bar line); the music keeps playing past the loop, so the head is crossfaded with the continuation. Other repeat candidates (4.0, 8.0, 12.0 s) matched worse or are shorter |
| daemon-time | 90.16 | 8 | 21.296 | 0.64 | 0.06 | 0.0 | 0.307 / 0.688 | 1.44 | 310247 | 0 | grid phase 0.6 s, ~91 bpm throughout the body |
| sick-with-science | 140.5 | 8 | 13.665 | 0.02 | 0.21 | 71.4 | 0.713 / 0.624 | 0.61 | 194523 | 0 | drop at 13.7 s |
| laboratory-violence | 120.0 | 8 | 16.0 | 0.01 | 0.51 | 100.0 | 2.105 / 0.619 | 3.08 | 229213 | 0 | drop at 15.98 s = 8 bars at 120 |
| main-theme-one | 120.0 | 8 | 16.0 | 2.02 | 0.06 | 28.6 | 0.893 / 1.064 | 6.29 | 240960 | 0 | 2 s count-in clicks then music; self-similar at +16 s |
