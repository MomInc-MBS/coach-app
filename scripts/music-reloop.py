"""Direct seam search for songs whose tempo grid is unreliable (hey-man-idk, guarded-gate).
For each start s the 0.2 s of audio around s (pre 0.1 s + post 0.1 s) is cross-correlated with the whole song: a peak at lag L means
the music at s+L looks (waveform-wise, so beat phase included) like the music at s, i.e. x[s+L] can follow x[s+L-1]... Loop = x[s:s+L]
with a 40 ms equal-power crossfade of the continuation x[s+L:s+L+k] into the head. Usage: python scripts/music-reloop.py name [lo hi]"""
import sys, numpy as np, scipy.io.wavfile as wav, subprocess, json, pathlib
from scipy.signal import fftconvolve
sys.argv_save = sys.argv; src = open(pathlib.Path(__file__).with_name('music-loops.py'), encoding='utf-8').read().replace("\nmain()\n", "\n")
ns = {'__file__': str(pathlib.Path(__file__).with_name('music-loops.py'))}; exec(src, ns)
SR = 44100; ROOT = ns['ROOT']; FF = ns['FF']
def search(x, s_lo, s_hi, L_lo, L_hi, pre=.1, post=.1):
    m = x.mean(1).astype(np.float64); n = len(m); res = []
    csq = np.concatenate([[0], np.cumsum(m ** 2)])
    for s in np.arange(s_lo, s_hi, .005):
        a = int(s * SR); lo, hi = a - int(pre * SR), a + int(post * SR)
        if lo < 0: continue
        t = m[lo:hi]; te = (t ** 2).sum()
        c = fftconvolve(m, t[::-1], 'valid')            # c[i] = sum m[i:i+len]*t
        i = np.arange(len(c)); en = csq[i + len(t)] - csq[i]
        ncc = c / np.sqrt(en * te + 1e-12)
        for L in range(int(L_lo * SR), min(int(L_hi * SR), len(c) - 1 - a + lo)):
            pass
        idx = np.arange(lo + int(L_lo * SR), min(lo + int(L_hi * SR), len(ncc)))
        if len(idx) == 0: continue
        j = idx[np.argmax(ncc[idx])]; res.append((float(ncc[j]), s, (j - lo) / SR))
    res.sort(reverse=True); return res
def build(x, s, L, k=int(.04 * SR)):
    a = int(round(s * SR)); n = int(round(L * SR)); body = x[a:a + n].copy(); tail = x[a + n:a + n + k]
    k = len(tail); t = np.linspace(0, np.pi / 2, k, dtype=np.float32)[:, None]
    body[:k] = body[:k] * np.sin(t) + tail * np.cos(t); return body
CUTS = {'hey-man-idk': (0.585, 10.1893, '8 bars at ~188.4 bpm; flux-pattern repeat found by direct search (the old 105 bpm grid was wrong)'),
        'guarded-gate': (0.075, 15.8284, 'direct waveform seam search near 8 bars; music continues past the loop, so the head is crossfaded with the continuation')}
def main():
    name = sys.argv[1]; s, L, note = CUTS[name]; scripts = ns
    x = scripts['decode'](ROOT / '.vault' / 'music-src' / f'{name}.mp3')
    y = build(x, s, L); st = scripts['seam_stats'](y)
    peak = np.abs(y).max(); rms = np.sqrt((y ** 2).mean()); y = (y * min(.10 / rms, .89 / peak)).astype(np.float32)
    tmp = ROOT / '.vault' / 'tmp' / f'{name}.loop.wav'; wav.write(tmp, SR, (np.clip(y, -1, 1) * 32767).astype(np.int16))
    m4a = ROOT / 'audio' / 'music' / f'{name}.m4a'
    subprocess.run([FF, '-v', 'error', '-y', '-i', str(tmp), '-c:a', 'aac', '-b:a', '112k', '-movflags', '+faststart', str(m4a)], check=True)
    dec = np.frombuffer(subprocess.run([FF, '-v', 'error', '-i', str(m4a), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True, check=True).stdout, np.float32).reshape(-1, 2)
    frames = len(y); three = np.concatenate([dec[:frames]] * 3)
    chk = ROOT / '.vault' / 'audio-check'; w3 = chk / f'{name}-x3.wav'; wav.write(w3, SR, (np.clip(three, -1, 1) * 32767).astype(np.int16))
    mp = ROOT / 'audio' / 'music' / 'manifest.json'; man = json.loads(mp.read_text())
    man['tracks'][name].update({'bpm': round(32 * 60 / L, 2), 'frames': frames, 'loopEnd': round(frames / SR, 6), 'duration': round(frames / SR, 6), 'sourceStart': round(s, 4), 'tailFolded': 0.04, 'bytes': m4a.stat().st_size, 'decodedFrames': int(len(dec))})
    mp.write_text(json.dumps(man, indent=1))
    print(name, 'bpm', round(32 * 60 / L, 2), 'loop', round(L, 4), 'bytes', m4a.stat().st_size, 'dec-frames', len(dec) - frames, st)
main()
