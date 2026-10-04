"""64-bit coach sprites for the War Room Gala creator.
Usage: python tools/pixel_coaches.py [--skip-render]
Blender (headless) renders each coach into tmp/pixel-coaches; this script downsamples, quantises to a
grey ramp, adds a 1px outline + eyes, and packs pod/gala-coaches/{bodies,pets}.png (grey + alpha),
{bodies,pets}-mask.png (region id in grey: 0 outline, 64 body, 128 head, 192 eyes) and manifest.json.
Optional tools/pixel_coaches_tune.json: {slug: {"gamma": 1.0, "eyes": true, "headRect": [x0, y0, x1, y1]}} per-sprite tuning.
Needs Pillow + numpy."""
import json, os, re, subprocess, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLENDER = os.environ.get('BLENDER', r'C:\Program Files\Blender Foundation\Blender 4.5\blender.exe')
WORK = os.path.join(ROOT, 'tmp', 'pixel-coaches')
OUT = os.path.join(ROOT, 'pod', 'gala-coaches')
SS = 8
SIZE = {'body': (64, 96), 'pet': (48, 36)}
SHEET = {'body': 'bodies', 'pet': 'pets'}
COLS = {'body': 8, 'pet': 5}
RAMP = [78, 128, 184, 238]  # grey levels; the app multiplies these into the region colour
tune = os.path.join(ROOT, 'tools', 'pixel_coaches_tune.json')
OVERRIDE = json.load(open(tune)) if os.path.exists(tune) else {}


def jobs():
    src = open(os.path.join(ROOT, 'creature/source/creator/roster.ts'), encoding='utf8').read()
    roster = json.loads(re.search(r'=(\[.*\]);', src, re.S).group(1))
    design = open(os.path.join(ROOT, 'creature/source/creator/design.ts'), encoding='utf8').read()
    rejected = set(re.findall(r"'(roster/[^']+)'", design.split('REJECTED_BODY_IDS')[1].split(']);')[0]))
    items = [{'id': 'myr5', 'family': 'MYR5', 'file': 'myr5.glb'}]
    for r in roster:
        if r['id'] not in rejected:
            items.append({'id': r['id'], 'family': r['group'], 'file': r['id'] + '.glb'})
    for i in items:
        i['kind'] = 'pet' if i['family'] == 'Four-legged' else 'body'
        i['slug'] = i['id'].replace('/', '_')
        i['glb'] = os.path.join(ROOT, 'creature', 'models', i['file'])
    return items


def render(items, kind=None):
    os.makedirs(WORK, exist_ok=True)
    jf = os.path.join(WORK, 'jobs.json')
    json.dump([i for i in items if kind in (None, i['kind'])], open(jf, 'w'))
    subprocess.run([BLENDER, '-b', '-P', os.path.join(ROOT, 'tools', 'pixel_coaches_render.py'), '--', jf, WORK],
                   check=True, stdout=subprocess.DEVNULL)


def down(a, w, h):  # block-average SSxSS
    return a.reshape(h, SS, w, SS, -1).mean(axis=(1, 3))


def sprite(it):
    w, h = SIZE[it['kind']]
    d = os.path.join(WORK, it['slug'])
    meta = json.load(open(os.path.join(d, 'meta.json')))
    sh = down(np.asarray(Image.open(os.path.join(d, 'shade.png')).convert('RGBA'), dtype=float), w, h)
    mk = down(np.asarray(Image.open(os.path.join(d, 'mask.png')).convert('RGBA'), dtype=float), w, h)
    a = sh[..., 3] / 255 >= .5
    lum = np.clip(sh[..., 0] / np.maximum(sh[..., 3] / 255, 1e-3), 0, 255)  # workbench output is premultiplied
    lo, hi = np.percentile(lum[a], 4), np.percentile(lum[a], 96)
    tn = OVERRIDE.get(it['slug'], {})
    t = np.clip((lum - lo) / max(hi - lo, 1), 0, .999) ** tn.get('gamma', 1.0)
    grey = np.where(a, np.array(RAMP)[(t * 4).astype(int)], 0)
    reg = np.where(a, np.where(mk[..., 1] > mk[..., 0], 128, 64), 0)
    if 'headRect' in tn:  # head tag only inside this px rect (e.g. Flyer wings live in the head mesh)
        x0, y0, x1, y1 = tn['headRect']
        yy, xx = np.mgrid[0:h, 0:w]
        reg = np.where((reg == 128) & ~((xx >= x0) & (xx <= x1) & (yy >= y0) & (yy <= y1)), 64, reg)
    pet = it['kind'] == 'pet'
    if meta['uv'] and tn.get('eyes', True):
        ex, ey = int(meta['uv'][0] * w), int(meta['uv'][1] * h)
        hy, hx = np.where(reg == 128)
        spread = 3 if not len(hx) else max(2, int((hx.max() - hx.min() + 1) * .2))
        size = 1 if pet else 2
        for dx in ([0] if pet else [-spread, spread]):
            for yy in range(ey, ey + size):
                for xx in range(ex + dx, ex + dx + size):
                    if 0 <= xx < w and 0 <= yy < h and a[yy, xx]:
                        grey[yy, xx] = 255
                        reg[yy, xx] = 192
    # 1px outline: transparent 4-neighbours of the silhouette become ink (grey 0, region 0, opaque)
    p = np.pad(a, 1)
    edge = (p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]) & ~a
    return grey.astype(np.uint8), reg.astype(np.uint8), ((a | edge) * 255).astype(np.uint8)


def contact(kind):
    cs = os.path.join(ROOT, '.frames', 'r21-pixel')
    os.makedirs(cs, exist_ok=True)
    g = np.asarray(Image.open(os.path.join(OUT, SHEET[kind] + '.png')), float)
    m = np.asarray(Image.open(os.path.join(OUT, SHEET[kind] + '-mask.png')))[..., 0]
    tint = {64: (150, 120, 200), 128: (230, 150, 90), 192: (60, 230, 240)}
    rgb = np.zeros(g.shape[:2] + (3,))
    for k, c in tint.items():
        rgb[m == k] = np.array(c) * (g[..., 0][m == k, None] / 200)
    rgb[m == 192] = tint[192]
    rgb[(m == 0) & (g[..., 1] > 0)] = (24, 20, 40)
    img = Image.fromarray(np.dstack([rgb, g[..., 1]]).clip(0, 255).astype(np.uint8), 'RGBA')
    img = img.resize((img.width * 4, img.height * 4), Image.NEAREST)
    bg = Image.new('RGBA', img.size, (70, 70, 80, 255))
    bg.alpha_composite(img)
    bg.convert('RGB').save(os.path.join(cs, f'contact-{SHEET[kind]}-4x.png'))


def main():
    items = jobs()
    if '--skip-render' not in sys.argv:
        render(items, sys.argv[sys.argv.index('--kind') + 1] if '--kind' in sys.argv else None)
    manifest = {'version': 1, 'ramp': RAMP, 'regions': {'outline': 0, 'body': 64, 'head': 128, 'eyes': 192},
                'sheets': {}, 'sprites': []}
    os.makedirs(OUT, exist_ok=True)
    for kind in ('body', 'pet'):
        its = [i for i in items if i['kind'] == kind]
        w, h = SIZE[kind]
        c = COLS[kind]
        rows = -(-len(its) // c)
        G = np.zeros((rows * h, c * w, 2), np.uint8)
        M = np.zeros_like(G)
        for n, it in enumerate(its):
            g, r, al = sprite(it)
            x, y = n % c * w, n // c * h
            G[y:y + h, x:x + w] = np.stack([g, al], -1)
            M[y:y + h, x:x + w] = np.stack([r, al], -1)
            manifest['sprites'].append({'id': it['id'], 'family': it['family'], 'kind': kind, 'sheet': SHEET[kind],
                                        'frame': [x, y, w, h], 'unlock': it['id']})
        Image.fromarray(G, 'LA').save(os.path.join(OUT, SHEET[kind] + '.png'), optimize=True)
        Image.fromarray(M, 'LA').save(os.path.join(OUT, SHEET[kind] + '-mask.png'), optimize=True)
        manifest['sheets'][SHEET[kind]] = {'image': SHEET[kind] + '.png', 'mask': SHEET[kind] + '-mask.png', 'frame': [w, h]}
        contact(kind)
    json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), separators=(',', ':'))
    print(len(manifest['sprites']), 'sprites;', sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT)), 'bytes')


if __name__ == '__main__':
    main()
