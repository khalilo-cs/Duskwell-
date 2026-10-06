#!/usr/bin/env python3
"""Renders the MIDI files from compose.py into looping MP3s for the game.

needs: python3 + mido + numpy, fluidsynth, sox, lame and the FluidR3 GM SoundFont (MIT licence)
    apt-get install fluidsynth fluid-soundfont-gm sox lame && pip install mido numpy
usage: python3 render.py [output dir] [piece ...]   (default dir: ../../audio/music; default: every piece)

The MIDI holds the loop twice. After the mastering chain we keep the second pass, which opens
with the first pass's reverb tail, and crossfade its last 60 ms with the end of the first pass:
the clip then ends on exactly the samples that led into its own start, so the loop has no click.
"""
import json
import os
import subprocess
import sys
import tempfile
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SF2 = os.environ.get('SF2', '/usr/share/sounds/sf2/FluidR3_GM.sf2')
RATE = 44100
FADE = int(0.06 * RATE)
TARGET_RMS_DB = -17.5            # playback gain brings every piece to this average loudness


def run(*cmd):
    subprocess.run(cmd, check=True)


def render(name, loop_sec, work, out):
    mid, raw, f32 = (os.path.join(work, name + ext) for ext in ('.mid', '.raw.wav', '.f32'))
    run('fluidsynth', '-ni', '-q', '-g', '0.5', '-r', str(RATE), '-o', 'audio.file.format=float',
        '-o', 'synth.reverb.active=1', '-o', 'synth.reverb.room-size=0.7', '-o', 'synth.reverb.level=0.55',
        '-o', 'synth.chorus.active=0', '-F', raw, SF2, mid)
    # hall reverb, a little air taken off the top, gentle compression
    run('sox', '-V1', raw, '-t', 'f32', '-c', '2', '-r', str(RATE), f32,
        'highpass', '28', 'reverb', '38', '55', '85', '100', '12', 'equalizer', '3200', '1.2q', '-1.5',
        'compand', '0.02,0.25', '6:-60,-60,-24,-20,-8,-10,0,-6', '-4', '-90', '0.05')
    x = np.fromfile(f32, dtype=np.float32).reshape(-1, 2).astype(np.float64)
    n = int(round(loop_sec * RATE))
    clip = x[n:2 * n].copy()
    w = np.linspace(0.0, 1.0, FADE)[:, None]
    w = 0.5 - 0.5 * np.cos(np.pi * w)                                    # equal-gain raised cosine
    clip[n - FADE:] = clip[n - FADE:] * (1 - w) + x[n - FADE:n] * w
    clip *= 10 ** (-1.2 / 20) / max(1e-9, np.abs(clip).max())          # peak at -1.2 dBFS
    rms_db = 20 * np.log10(np.sqrt(np.mean(clip ** 2)) + 1e-12)
    pcm = np.clip(np.round(clip * 32767), -32768, 32767).astype('<i2')
    wav = os.path.join(work, name + '.wav')
    with wave.open(wav, 'wb') as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(pcm.tobytes())
    mp3 = os.path.join(out, name + '.mp3')
    run('lame', '--quiet', '-V', '5', '--noreplaygain', wav, mp3)
    gain = min(1.0, 10 ** ((TARGET_RMS_DB - rms_db) / 20))
    print('%-10s %6.1f s  rms %5.1f dB  gain %.2f  %4d KB' % (name, loop_sec, rms_db, gain, os.path.getsize(mp3) // 1024))
    return {'loop': round(n / RATE, 4), 'gain': round(gain, 3)}


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', 'audio', 'music')
    os.makedirs(out, exist_ok=True)
    with tempfile.TemporaryDirectory() as work:
        run(sys.executable, os.path.join(HERE, 'compose.py'), work)
        loops = json.load(open(os.path.join(work, 'loops.json')))
        beats = json.load(open(os.path.join(work, 'beats.json')))
        args = sys.argv[2:]
        meta_only = '--meta' in args                    # only refresh the tempo of every piece in music.json, render nothing
        only = set(a for a in args if not a.startswith('--'))
        meta_path = os.path.join(out, 'music.json')
        meta = json.load(open(meta_path)) if (only or meta_only) and os.path.exists(meta_path) else {}
        for name, sec in sorted(loops.items()):
            if meta_only:
                if name in meta:
                    meta[name].update(beats[name])
            elif not only or name in only:
                meta[name] = render(name, sec, work, out)
                meta[name].update(beats[name])
        meta = dict(sorted(meta.items()))
    with open(meta_path, 'w') as f:
        json.dump(meta, f, indent=1)


if __name__ == '__main__':
    main()
