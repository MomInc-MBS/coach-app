"""Offline tool: cut Ian's six songs into seamless 8-bar loops -> audio/music/*.m4a + manifest.json + report.
Run: python scripts/music-loops.py   (needs numpy, scipy, ffmpeg; sources in .vault/music-src)
Method: tempo/bar grid from beat analysis (hand-checked start s0, bpm0 per song), then a small search around (start, length)
for the quietest seam (log-mel jump across the wrap, ranked against every interior point), with the reverb tail folded onto the head.
Encodes AAC-LC .m4a (iOS-safe) and verifies the decode length."""
import numpy as np, scipy.io.wavfile as wav, subprocess, json, os, sys, pathlib
from scipy.signal import stft
ROOT = pathlib.Path(__file__).resolve().parent.parent
FF = os.environ.get('FFMPEG', r'C:/Users/ianmy/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0-full_build/bin/ffmpeg')
SR = 44100
# name: (start s0 [s], bpm0, tempo tolerance, note). 8 bars of 4/4 = 32 beats.
SONGS = {
 'hey-man-idk': (0.62, 104.3, .012, 'music begins 0.6 s; level drops at 19.0 s'),
 'guarded-gate': (0.04, 120.0, .0, '120 bpm grid fits cleanly for 8 bars (16 s); music keeps playing after bar 8'),
 'daemon-time': (0.62, 90.7, .012, 'grid phase 0.6 s, ~91 bpm throughout the body'),
 'sick-with-science': (0.04, 140.5, .012, 'drop at 13.7 s'),
 'laboratory-violence': (0.0, 120.0, .0, 'drop at 15.98 s = 8 bars at 120'),
 'main-theme-one': (2.0, 120.0, .0, '2 s count-in clicks then music; self-similar at +16 s'),
}
def decode(path):
    p = subprocess.run([FF, '-v', 'error', '-i', str(path), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True)
    return np.frombuffer(p.stdout, np.float32).reshape(-1, 2).copy()
def mel(x, n=1024):
    f, t, S = stft(x.mean(1), SR, nperseg=n, noverlap=n - 256, boundary=None, padded=False)
    e = np.geomspace(60, 9000, 33); M = np.abs(S)
    return np.log1p(np.array([M[(f >= a) & (f < b)].sum(0) for a, b in zip(e[:-1], e[1:])]) * 20)
def rms_db(x): return 20 * np.log10(np.sqrt((x.astype(np.float64) ** 2).mean()) + 1e-9)
def fold(x, s, L):
    """loop = x[s:s+L] with the decaying tail x[s+L:s+L+T] added onto its head."""
    body = x[s:s + L].copy(); tail = x[s + L:]
    ref = np.sqrt((body.mean(1) ** 2).mean()); T = 0
    if len(tail):
        env = np.sqrt(np.convolve(tail.mean(1) ** 2, np.ones(441) / 441, 'same'))
        below = np.where(env < ref * .08)[0]
        T = int(below[0]) if len(below) else len(tail)
    T = int(min(T, 3 * SR, len(tail), L // 3))
    if len(tail) > 4410 and (np.sqrt((tail[:4410].mean(1) ** 2).mean()) > ref * .6 or T > int(1.5 * SR)):
        # the music keeps playing past bar 8 (no decaying tail): continue the waveform and crossfade into the head
        k = min(int(.06 * SR), len(tail)); t = np.linspace(0, np.pi / 2, k, dtype=np.float32)[:, None]
        body[:k] = body[:k] * np.sin(t) + tail[:k] * np.cos(t); return body, k
    if T > 0:
        w = np.ones(T, np.float32); k = min(T, int(.25 * SR)) if T < 2 * SR else int(.6 * SR)
        w[-k:] = np.cos(np.linspace(0, np.pi / 2, k)) ** 2
        body[:T] += tail[:T] * w[:, None]
    return body, T
def seam_stats(y):
    """Jump across the wrap vs the same measure at every interior hop. Lower percentile = smoother seam."""
    z = np.concatenate([y, y]); n = len(y); h = 256; W = 4
    M = mel(z)
    def jump(c):
        i = c // h; a = M[:, i - W - 3:i - 3].mean(1); b = M[:, i + 1:i + 1 + W].mean(1); return np.linalg.norm(a - b)
    cuts = np.array([int(round(n * k / 32)) for k in range(4, 32, 4)])  # the 7 interior bar lines (the wrap is a bar line too)
    inner = np.array([jump(c) for c in cuts]); seam = jump(n)
    pct = float((inner < seam).mean() * 100)
    k = int(.005 * SR); rj = abs(rms_db(y[-k:]) - rms_db(y[:k]))
    step = float(np.abs(y[0] - y[-1]).max()); typ = float(np.abs(np.diff(y, axis=0)).mean() * 6)
    return {'melJumpPercentile': round(pct, 1), 'melJump': round(float(seam), 3), 'barLineMedianJump': round(float(np.median(inner)), 3), 'rmsJump5msDb': round(float(rj), 2), 'sampleStep': round(step, 4), 'typicalStep6x': round(typ, 4)}
def search(x, s0, bpm0, tol):
    L0 = 32 * 60 / bpm0; best = None
    for ds in np.arange(-0.02, 0.0201, 0.01):
        for dl in (np.linspace(-tol, tol, 9) if tol else [0]):
            s = int(round((s0 + ds) * SR)); L = int(round(L0 * (1 + dl) * SR))
            if s < 0 or s + L > len(x): continue
            y, T = fold(x, s, L); st = seam_stats(y)
            cost = st['melJumpPercentile'] + st['rmsJump5msDb'] * 4 + abs(dl) * 1500 + abs(ds) * 200
            if best is None or cost < best[0]: best = (cost, s, L, T, st, 32 * 60 * SR / L)
    return best
def main():
    only = set(sys.argv[1:]); out = ROOT / 'audio' / 'music'; out.mkdir(parents=True, exist_ok=True)
    chk = ROOT / '.vault' / 'audio-check'; chk.mkdir(parents=True, exist_ok=True); (ROOT / '.vault' / 'tmp').mkdir(exist_ok=True)
    manifest = {'version': 1, 'sampleRate': SR, 'bars': 8, 'tracks': {}}; rows = []
    for name, (s0, bpm0, tol, note) in SONGS.items():
        if only and name not in only: continue
        x = decode(ROOT / '.vault' / 'music-src' / f'{name}.mp3')
        cost, s, L, T, st, bpm = search(x, s0, bpm0, tol)
        y, _ = fold(x, s, L)
        peak = np.abs(y).max(); rms = np.sqrt((y ** 2).mean()); g = min(.10 / rms, .89 / peak); y = (y * g).astype(np.float32)
        tmp = ROOT / '.vault' / 'tmp' / f'{name}.loop.wav'; wav.write(tmp, SR, (np.clip(y, -1, 1) * 32767).astype(np.int16))
        m4a = out / f'{name}.m4a'
        subprocess.run([FF, '-v', 'error', '-y', '-i', str(tmp), '-c:a', 'aac', '-b:a', '112k', '-movflags', '+faststart', str(m4a)], check=True)
        d = subprocess.run([FF, '-v', 'error', '-i', str(m4a), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
        dec = np.frombuffer(d, np.float32).reshape(-1, 2); frames = len(y)
        three = np.concatenate([dec[:frames] if len(dec) >= frames else y] * 3)
        wav.write(chk / f'{name}-x3.wav', SR, (np.clip(three, -1, 1) * 32767).astype(np.int16))
        manifest['tracks'][name] = {'url': f'/audio/music/{name}.m4a', 'bpm': round(bpm, 2), 'bars': 8, 'beats': 32, 'frames': frames, 'loopStart': 0, 'loopEnd': round(frames / SR, 6), 'duration': round(frames / SR, 6), 'sourceStart': round(s / SR, 4), 'tailFolded': round(T / SR, 3), 'bytes': m4a.stat().st_size, 'decodedFrames': int(len(dec))}
        rows.append((name, round(bpm, 2), round(frames / SR, 3), round(s / SR, 3), round(T / SR, 2), st, m4a.stat().st_size, int(len(dec)) - frames, note))
        print(rows[-1], flush=True)
    if not only:
        (out / 'manifest.json').write_text(json.dumps(manifest, indent=1))
        r = ['# Music loop report', '', 'Tempo/bars come from onset-grid fits plus level drops (see scripts/music-loops.py). Seam pct = share of the 7 interior bar lines whose spectral jump is SMALLER than the wrap (the wrap is a bar line, so a bar-line-sized jump is expected: under ~70 = as smooth as a normal bar line, 100 = rougher than every one). Nobody could listen: judge by ear with `.vault/audio-check/*-x3.wav`.', '',
             '| song | bpm | bars | loop s | source start s | tail folded s | seam pct | mel jump (seam / typical) | rms jump 5ms dB | m4a bytes | decode len - frames | note |', '|---|---|---|---|---|---|---|---|---|---|---|---|']
        for n, b, d, s, t, st, by, dl, note in rows:
            r.append(f"| {n} | {b} | 8 | {d} | {s} | {t} | {st['melJumpPercentile']} | {st['melJump']} / {st['barLineMedianJump']} | {st['rmsJump5msDb']} | {by} | {dl} | {note} |")
        (ROOT / '.vault' / 'audio-report.md').write_text('\n'.join(r) + '\n')
main()
