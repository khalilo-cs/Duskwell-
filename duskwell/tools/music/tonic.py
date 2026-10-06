#!/usr/bin/env python3
"""Finds the bass note each rendered piece rests on and writes it into music.json as 'tonic' (a pitch class, 0 = C ... 11 = B).
The game tunes the thumps of its combat pulse to it. The bass pitch class that carries most energy between 30 and 150 Hz is a pedal or a
root in these pieces, so it is a good enough tonic for a drum that only sweeps down from an octave above it.
  python3 tools/music/tonic.py [music dir]        needs numpy, scipy and ffmpeg"""
import json
import os
import subprocess
import sys

import numpy as np
from scipy.signal import stft

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 22050
# the pieces written in one key, C minor, whose tonic is known (the chords move through Ab, Bb and G, so the bass alone can mislead)
KNOWN = {'legend': 0, 'adventure': 0, 'abyss': 0, 'boss_abyss': 0, 'boss_march': 0}


def tonic_of(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    f, _, z = stft(x, SR, nperseg=16384, noverlap=12288)
    power = (np.abs(z) ** 2).sum(axis=1)
    chroma = np.zeros(12)
    for i, fr in enumerate(f):
        if 30 <= fr <= 150:
            chroma[int(round(12 * np.log2(fr / 440.0) + 69)) % 12] += power[i]
    return int(np.argmax(chroma))


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', 'audio', 'music')
    path = os.path.join(out, 'music.json')
    meta = json.load(open(path))
    for name in sorted(meta):
        meta[name]['tonic'] = KNOWN.get(name, tonic_of(os.path.join(out, name + '.mp3')))
        print('%-10s tonic %2d' % (name, meta[name]['tonic']))
    with open(path, 'w') as f:
        json.dump(dict(sorted(meta.items())), f, indent=1)


if __name__ == '__main__':
    main()
