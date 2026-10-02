#!/usr/bin/env python3
"""Builds the recorded sound effects and ambience from CC0 packs (see CREDITS.md).

Needs a checkout of https://github.com/sparklinlabs/superpowers-asset-packs (CC0 1.0, Pixel-boy / Sparklin Labs)
Usage: python3 build_sfx.py /path/to/superpowers-asset-packs [output dir]     (needs ffmpeg and numpy)

Each effect is trimmed of silence, peak-normalised and encoded as a small mono MP3. sfx.json lists, per
game event, its variations and the playback-rate range the game randomises over. The ambience loop is
cross-faded so that its end flows into its start.
"""
import json
import os
import subprocess
import sys
import tempfile
import wave

import numpy as np

SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', '..', 'audio', 'sfx')
RATE = 32000

MF, PH, WF, NJ = 'medieval-fantasy/sounds', 'prehistoric-platformer/sound', 'western-fps-2d/sounds', 'ninja-adventure/sounds'
# event -> (source files, playback rate range, gain, keep the synthesised sound underneath)
EVENTS = {
    'slash':     ([f'{MF}/woosh-1.wav', f'{MF}/woosh-2.wav', f'{WF}/woosh-1.ogg', f'{WF}/woosh-2.ogg', f'{WF}/woosh-3.ogg'], (0.92, 1.1), 0.8, False),
    'hit':       ([f'{PH}/hit-1.wav', f'{PH}/hit-2.wav', f'{WF}/impact-1.ogg'], (0.9, 1.1), 0.9, False),
    'bossHit':   ([f'{PH}/hit-1.wav', f'{PH}/hit-2.wav', f'{WF}/impact-1.ogg'], (0.7, 0.85), 1.0, False),
    'enemyDie':  ([f'{MF}/monster-1.wav', f'{MF}/monster-2.wav', f'{PH}/dinosaur-5.wav'], (0.8, 1.0), 0.9, True),
    'roar':      ([f'{PH}/dinosaur-1.wav', f'{PH}/dinosaur-3.wav', f'{PH}/dinosaur-4.wav'], (0.55, 0.7), 1.0, True),
    'bossDie':   ([f'{WF}/explosion-1.ogg', f'{WF}/explosion-2.ogg', f'{WF}/explosion-3.ogg'], (0.5, 0.65), 1.0, True),
    'slam':      ([f'{WF}/explosion-2.ogg', f'{WF}/explosion-3.ogg'], (0.75, 0.9), 0.9, True),
    'break':     ([f'{PH}/wood-1.wav', f'{PH}/wood-2.wav', f'{PH}/wood-3.wav', f'{PH}/wood-4.wav', f'{PH}/wood-5.wav'], (0.7, 0.85), 0.9, True),
    'geo':       ([f'{NJ}/gold-1.ogg'], (0.95, 1.1), 0.7, False),
    'ability':   ([f'{NJ}/power-up.ogg'], (1.0, 1.0), 0.8, True),
    'heal':      ([f'{NJ}/power-up-2.ogg'], (1.0, 1.0), 0.7, True),
    'bench':     ([f'{NJ}/secret-1.wav'], (1.0, 1.0), 0.8, True),
}
AMBIENCE = {'forest': f'{MF}/forest-ambience.wav'}


def load(path):
    """Decode to mono float samples at RATE."""
    with tempfile.NamedTemporaryFile(suffix='.wav') as t:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(SRC, path), '-ac', '1', '-ar', str(RATE), t.name], check=True)
        with wave.open(t.name) as w:
            return np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float64) / 32768


def trim(x, thr=0.01):
    idx = np.where(np.abs(x) > thr * max(1e-9, np.abs(x).max()))[0]
    return x[idx[0]:idx[-1] + 1] if len(idx) else x


def encode(x, path):
    pcm = np.clip(np.round(x * 32767), -32768, 32767).astype('<i2')
    with tempfile.NamedTemporaryFile(suffix='.wav') as t:
        with wave.open(t.name, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(pcm.tobytes())
        subprocess.run(['lame', '--quiet', '-V', '4', t.name, path], check=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    meta = {'events': {}, 'ambience': {}}
    seen = {}
    for ev, (files, rate, gain, layer) in EVENTS.items():
        names = []
        for f in files:
            base = os.path.splitext(f.replace('/', '_'))[0].replace('-', '_')
            if base not in seen:
                x = trim(load(f))
                x = x / max(1e-9, np.abs(x).max()) * 0.89
                f10 = int(0.004 * RATE)
                x[:f10] *= np.linspace(0, 1, f10); x[-f10 * 3:] *= np.linspace(1, 0, f10 * 3)       # no clicks
                encode(x, os.path.join(OUT, base + '.mp3')); seen[base] = len(x) / RATE
            names.append(base)
        meta['events'][ev] = {'files': names, 'rate': list(rate), 'gain': gain, 'layer': layer}
    for name, f in AMBIENCE.items():
        x = load(f)
        F = int(1.5 * RATE)
        w = np.sin(np.linspace(0, np.pi / 2, F)) ** 2
        r = x[:len(x) - F].copy()
        r[:F] = r[:F] * w + x[len(x) - F:] * (1 - w)                    # the tail dissolves into the head
        r = r / max(1e-9, np.abs(r).max()) * 0.8
        encode(r, os.path.join(OUT, 'amb_' + name + '.mp3'))
        meta['ambience'][name] = {'file': 'amb_' + name, 'loop': round(len(r) / RATE, 4), 'gain': 0.5}
    with open(os.path.join(OUT, 'sfx.json'), 'w') as fh:
        json.dump(meta, fh, indent=1)
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(len(seen), 'effects +', len(AMBIENCE), 'ambience,', total // 1024, 'KB')


if __name__ == '__main__':
    main()
