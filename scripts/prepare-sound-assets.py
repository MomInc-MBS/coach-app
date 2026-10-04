"""Rebuild the CC0 sound pack from the attributed masters in plan/assets-inbox/audio.

Requires Python 3 and ffmpeg/ffprobe. The two original generated waveforms are CC0.
All paths and edit recipes are retained in audio/sfx/manifest.json for reproducibility.
"""
import hashlib
import html
import json
import math
import pathlib
import random
import struct
import subprocess
import wave

ROOT = pathlib.Path(__file__).resolve().parents[1]
MASTERS = ROOT / 'plan/assets-inbox/audio'
OUT = ROOT / 'audio/sfx'
OUT.mkdir(parents=True, exist_ok=True)
SOURCES = {
    'interface': ('Kenney', 'https://kenney.nl/assets/interface-sounds'),
    'impact': ('Kenney', 'https://kenney.nl/assets/impact-sounds'),
    'mechanical': ('qubodup', 'https://opengameart.org/content/7-mechanical-clicks-and-buzzes'),
    'ice': ('bart', 'https://opengameart.org/content/ice-spells'),
    'jelly': ('Independent.nu', 'https://opengameart.org/content/8-wet-squish-slurp-impacts'),
    'water': ('ezwa', 'https://opengameart.org/content/6-short-water-splashes'),
    'waves': ('transitking', 'https://opengameart.org/content/water-waves'),
    'grass': ('qubodup', 'https://opengameart.org/content/20-rustles-dry-leaves'),
    'cloth': ('Iochi Glaucus', 'https://opengameart.org/content/fabric-rustling'),
    'wind': ('Luke.RUSTLTD', 'https://opengameart.org/content/wind1'),
    'hum': ('LEGIT Audio', 'https://opengameart.org/content/the-shop'),
    'portal': ('Ogrebane', 'https://opengameart.org/content/teleport-spell'),
    'original': ('MOM Inc.', '/source.json'),
}


def generated(name, duration, sample):
    path = MASTERS / (name + '.wav')
    with wave.open(str(path), 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(24000)
        frames = bytearray()
        for n in range(int(duration * 24000)):
            t = n / 24000
            envelope = min(1, t / .012, (duration - t) / .04)
            frames.extend(struct.pack('<h', int(max(-1, min(1, sample(t) * envelope)) * 24000)))
        f.writeframes(frames)


rng = random.Random(21)
generated('dialup-original', 1.8, lambda t:
          .19 * math.sin(2 * math.pi * (350 if t < .35 else 1050 if t < .7 else 2100) * t)
          + .1 * math.sin(2 * math.pi * (440 if t < .35 else 1650) * t)
          + (rng.uniform(-.05, .05) if t > .7 else 0))
generated('crt-original', .12, lambda t:
          rng.uniform(-.2, .2) * math.exp(-t * 55)
          + .08 * math.sin(2 * math.pi * 180 * t) * math.exp(-t * 40))

# cue, filename, source/master, provenance key, maximum duration, extra filter, seek
EDITS = [
    ('mechanical', 'mechanical-click-1', 'mechanical/mechanical/mechanical_button-01.flac', 'mechanical', .4, '', 0),
    ('mechanical', 'mechanical-click-2', 'mechanical/mechanical/mechanical_clicks-05.flac', 'mechanical', .42, '', 0),
    ('switch', 'metal-switch-1', 'kenney-interface/Audio/switch_001.ogg', 'interface', .4, '', 0),
    ('switch', 'metal-switch-2', 'kenney-interface/Audio/toggle_001.ogg', 'interface', .4, '', 0),
    ('ice', 'ice-crack-1', 'ice/ice.wav', 'ice', .85, '', 0),
    ('ice', 'ice-crack-2', 'ice/coldsnap.wav', 'ice', .85, '', .1),
    ('jelly', 'jelly-squish-1', 'squish/impsplat/impactsplat07.mp3.flac', 'jelly', .55, '', 0),
    ('jelly', 'jelly-squish-2', 'squish/impsplat/impactsplat08.mp3.flac', 'jelly', .66, '', 0),
    ('water', 'water-splash-1', 'splash/ezwa-water_splash/water_splash-02.flac', 'water', .42, '', 0),
    ('water', 'water-splash-2', 'splash/ezwa-water_splash/water_splash-03.flac', 'water', .72, '', 0),
    ('water-slosh', 'water-slosh', 'water-slosh.flac', 'waves', 2.5, 'lowpass=f=2500,', 0),
    ('grass', 'grass-rustle-1', 'leaves/rustle/rustle01.flac', 'grass', .7, 'lowpass=f=4000,', 0),
    ('grass', 'grass-rustle-2', 'leaves/rustle/rustle02.flac', 'grass', .7, 'lowpass=f=4000,', 0),
    ('grass-tinkle', 'grass-tinkle', 'kenney-interface/Audio/glass_001.ogg', 'interface', .6, '', 0),
    ('quilt', 'cloth-rustle-1', 'cloth.ogg', 'cloth', .65, 'lowpass=f=4000,', .5),
    ('quilt', 'cloth-rustle-2', 'cloth.ogg', 'cloth', .65, 'lowpass=f=4000,', 2),
    ('wood', 'wood-tap-1', 'kenney-impact/Audio/impactWood_light_000.ogg', 'impact', .45, '', 0),
    ('wood', 'wood-tap-2', 'kenney-impact/Audio/impactWood_light_001.ogg', 'impact', .45, '', 0),
    ('wood-scrape', 'wood-scrape', 'wood/wood_impact/crack01.mp3.flac', 'wood', .65, 'lowpass=f=3000,', 0),
    ('cogs', 'cogs-ratchet-1', 'kenney-impact/Audio/impactMetal_light_000.ogg', 'impact', .4, '', 0),
    ('cogs', 'cogs-ratchet-2', 'kenney-impact/Audio/impactMetal_light_001.ogg', 'impact', .4, '', 0),
    ('crt', 'crt-tap', 'crt-original.wav', 'original', .12, '', 0),
    ('transit', 'portal-transit', 'teleport.wav', 'portal', 2, '', 0),
    ('dialup', 'dialup', 'dialup-original.wav', 'original', 1.8, '', 0),
    ('pod-hum', 'pod-hum', 'shop/TheShopCollection_convenience_store_drinks_fridge_drone.wav', 'hum', 12, 'highpass=f=50,lowpass=f=1100,', 1),
    ('breeze', 'gentle-breeze', 'wind.wav', 'wind', 12, 'lowpass=f=2300,', 2),
]
SOURCES['wood'] = ('Independent.nu', 'https://opengameart.org/content/35-wooden-crackshitsdestructions')
manifest = {'version': 1, 'license': 'CC0-1.0', 'cues': {}, 'assets': [], 'sources': []}
for cue, name, master, provenance, duration, filter_prefix, seek in EDITS:
    source = MASTERS / master
    target = OUT / (name + '.mp3')
    # Normalize masters once; category/interaction gains are controlled by the mixer.
    filters = filter_prefix + 'loudnorm=I=-22:TP=-3:LRA=7'
    if duration >= 5:
        filters += f',afade=t=in:st=0:d=0.5,afade=t=out:st={duration-.5}:d=0.5'
    else:
        filters += ',afade=t=in:st=0:d=0.004'
        filters += f',afade=t=out:st={max(0,duration-.035)}:d=0.035'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', str(seek),
                    '-i', str(source), '-t', str(duration), '-af', filters, '-ar', '24000',
                    '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '64k', str(target)], check=True)
    url = '/audio/sfx/' + target.name
    manifest['cues'].setdefault(cue, []).append(url)
    manifest['assets'].append({'url': url, 'source': provenance, 'master': master,
                              'seek': seek, 'maxSeconds': duration, 'filters': filters,
                              'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                              'masterSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                              'bytes': target.stat().st_size})
manifest['cues']['dial'] = manifest['cues']['mechanical']
manifest['cues']['lever'] = manifest['cues']['switch']
for key, (author, url) in SOURCES.items():
    if any(a['source'] == key for a in manifest['assets']):
        manifest['sources'].append({'id': key, 'author': author, 'url': url, 'license': 'CC0-1.0'})
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
items = ''.join(f'<li>{html.escape(s["author"])} — <a href="{html.escape(s["url"])}">{html.escape(s["id"])}</a> (CC0)</li>' for s in manifest['sources'])
(OUT / 'credits.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Sound credits</title>'
    '<style>body{font:18px system-ui;max-width:48rem;margin:3rem auto;padding:1rem;background:#101821;color:#e9f0f7}a{color:#9ee4ff}li{margin:1rem 0}</style>'
    '<h1>Sound credits</h1><p>Every sound effect in this pack is released under '
    '<a href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 1.0</a>. '
    'Material recordings were edited into short cues; wind, teleport, dial-up and CRT effects include sound design. '
    'Coach voices are local variants of the existing eSpeak NG generated clips. '
    'The app code remains under its existing AGPL license.</p><ul>' + items + '</ul>'
    '<p><a href="manifest.json">Asset provenance and checksums</a> · <a href="/source.json">App source</a> · <a href="/pose">Back to Coach</a></p></html>', encoding='utf-8')
print(f'Prepared {len(manifest["assets"])} CC0 clips, {sum(a["bytes"] for a in manifest["assets"]):,} bytes.')
