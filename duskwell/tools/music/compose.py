#!/usr/bin/env python3
"""Duskwell soundtrack, written as code.

Every piece is an original composition: hand-written melodies over chord progressions, with
accompaniment patterns (arpeggios, pads, ostinatos, percussion) built from the chords.
This script writes Standard MIDI files plus loop lengths; render.sh turns them into audio
with FluidSynth, the FluidR3 GM SoundFont (MIT licence, sampled instruments) and SoX reverb.

Each MIDI holds the loop twice: render.sh keeps the second pass, whose opening already
carries the reverb tail of the first pass, so the audio loops without a seam.
"""
import json
import os
import random
import sys

import mido

NAMES = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'Fb': 4, 'E#': 5, 'F': 5, 'F#': 6, 'Gb': 6,
         'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11}
QUALITY = {'': [0, 4, 7], 'm': [0, 3, 7], 'dim': [0, 3, 6], '7': [0, 4, 7, 10], 'm7': [0, 3, 7, 10],
           'maj7': [0, 4, 7, 11], 'm7b5': [0, 3, 6, 10], 'sus2': [0, 2, 7], 'sus4': [0, 5, 7],
           'add9': [0, 4, 7, 14], 'madd9': [0, 3, 7, 14], 'm6': [0, 3, 7, 9], 'mb6': [0, 3, 8]}

# General MIDI programs (0-based)
PIANO, CELESTA, GLOCK, MUSICBOX, VIBES, ORGAN = 0, 8, 9, 10, 11, 19
VIOLIN, VIOLA, CELLO, CONTRABASS, TREMOLO, PIZZ, HARP, TIMPANI = 40, 41, 42, 43, 44, 45, 46, 47
STRINGS, SLOW_STRINGS, CHOIR, OOHS = 48, 49, 52, 53
TRUMPET, TROMBONE, HORN, BRASS = 56, 57, 60, 61
OBOE, ENGLISH_HORN, BASSOON, CLARINET, FLUTE = 68, 69, 70, 71, 73
AGOGO, WOODBLOCK, TAIKO, REVERSE_CYMBAL = 113, 115, 116, 119


def pitch(s):
    """'D4' -> 62, 'Bb3' -> 58."""
    i = 2 if len(s) > 2 and s[1] in '#b' else 1
    return 12 * (int(s[i:]) + 1) + NAMES[s[:i]]


def parse_chord(sym):
    """'Dm' -> (root pitch class, intervals, bass pitch class). Supports slash chords like 'C/E'."""
    bass = None
    if '/' in sym:
        sym, b = sym.split('/')
        bass = NAMES[b]
    i = 2 if len(sym) > 1 and sym[1] in '#b' else 1
    root = NAMES[sym[:i]]
    return root, QUALITY[sym[i:]], (root if bass is None else bass)


def tones(sym, low, count):
    """Chord tones from 'low' upward, cycling through octaves: an arpeggio vocabulary."""
    root, iv, _ = parse_chord(sym)
    pcs = sorted({(root + x) % 12 for x in iv})
    out, p = [], low
    while len(out) < count:
        if p % 12 in pcs:
            out.append(p)
        p += 1
    return out


def bass_note(sym, low):
    _, _, b = parse_chord(sym)
    p = low
    while p % 12 != b:
        p += 1
    return p


class Song:
    def __init__(self, name, bpm, beats_per_bar=4, seed=1):
        self.name, self.bpm, self.bpb = name, bpm, beats_per_bar
        self.tracks = {}
        self.rng = random.Random(seed)
        self.length_beats = 0

    def track(self, name, program, vol=100, pan=64, reverb=70, chorus=0):
        ch = len(self.tracks)
        if ch >= 9:
            ch += 1                       # channel 10 is reserved for GM drums
        self.tracks[name] = dict(program=program, ch=ch, vol=vol, pan=pan, reverb=reverb, chorus=chorus, notes=[])

    def note(self, tr, start, dur, p, vel, human=True):
        if human:
            vel += self.rng.randint(-5, 5)
            start += self.rng.uniform(-0.012, 0.012) if start > 0 else 0
        self.tracks[tr]['notes'].append((max(0.0, start), max(0.05, dur), int(p), int(max(1, min(127, vel)))))
        self.length_beats = max(self.length_beats, start + dur)

    # ---- patterns -------------------------------------------------------------
    def bar(self, b):
        return b * self.bpb

    def melody(self, tr, bar, text, vel=84, shift=0, legato=1.0):
        """Tokens 'D5:1.5' (note:beats) and 'r:1' (rest)."""
        t = self.bar(bar)
        for tok in text.split():
            n, d = tok.split(':')
            d = float(d)
            if n != 'r':
                self.note(tr, t, d * legato, pitch(n) + shift, vel)
            t += d
        return t

    def pad(self, tr, bar, sym, bars=1, low=52, count=4, vel=56):
        for p in tones(sym, low, count):
            self.note(tr, self.bar(bar), self.bar(bars) - 0.05, p, vel, human=False)

    def arp(self, tr, bar, sym, pattern, step=0.5, low=55, vel=62, bars=1, dur=None, accent=8):
        notes = tones(sym, low, max(pattern) + 1)
        t, end, i = self.bar(bar), self.bar(bar + bars), 0
        while t < end - 1e-6:
            v = vel + (accent if (t - self.bar(bar)) % self.bpb == 0 else 0)
            self.note(tr, t, dur or step * 1.6, notes[pattern[i % len(pattern)]], v)
            t += step
            i += 1

    def bass(self, tr, bar, sym, low=36, rhythm=((0, 4),), vel=70):
        p = bass_note(sym, low)
        for off, d in rhythm:
            self.note(tr, self.bar(bar) + off, d, p, vel)

    def hits(self, tr, bar, p, beats, dur=0.4, vel=90, bars=1):
        for k in range(bars):
            for b in beats:
                self.note(tr, self.bar(bar + k) + b, dur, p, vel)

    # ---- output ---------------------------------------------------------------
    def save(self, path, loop_bars):
        loop = self.bar(loop_bars)
        tpb = 480
        mid = mido.MidiFile(ticks_per_beat=tpb)
        meta = mido.MidiTrack()
        meta.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(self.bpm), time=0))
        meta.append(mido.MetaMessage('time_signature', numerator=self.bpb, denominator=4, time=0))
        meta.append(mido.MetaMessage('end_of_track', time=int((2 * loop + 8) * tpb)))
        mid.tracks.append(meta)
        for name, t in self.tracks.items():
            tr = mido.MidiTrack()
            ch = t['ch']
            tr.append(mido.MetaMessage('track_name', name=name, time=0))
            tr.append(mido.Message('program_change', channel=ch, program=t['program'], time=0))
            for cc, val in ((7, t['vol']), (10, t['pan']), (91, t['reverb']), (93, t['chorus'])):
                tr.append(mido.Message('control_change', channel=ch, control=cc, value=val, time=0))
            ev = []
            for rep in range(2):                                  # two passes of the loop
                for s, d, p, v in t['notes']:
                    s2 = s + rep * loop
                    ev.append((int(s2 * tpb), 1, p, v))
                    ev.append((int((s2 + d) * tpb), 0, p, 0))
            ev.sort(key=lambda e: (e[0], e[1]))
            now = 0
            for tick, on, p, v in ev:
                msg = 'note_on' if on else 'note_off'
                tr.append(mido.Message(msg, channel=ch, note=p, velocity=v, time=tick - now))
                now = tick
            mid.tracks.append(tr)
        mid.save(path)
        return loop * 60.0 / self.bpm


# =============================================================================== pieces

def title():
    s = Song('title', 66, seed=11)
    s.track('piano', PIANO, vol=110, pan=60, reverb=80)
    s.track('strings', SLOW_STRINGS, vol=78, pan=70, reverb=90)
    s.track('cello', CELLO, vol=96, pan=50, reverb=80)
    s.track('violin', VIOLIN, vol=88, pan=76, reverb=85)
    s.track('choir', CHOIR, vol=60, pan=64, reverb=100)
    s.track('bass', CONTRABASS, vol=80, pan=58, reverb=60)
    A = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Gm', 'Bb', 'A']
    B = ['Gm', 'Dm', 'Bb', 'F', 'Gm', 'Dm', 'Eb', 'A']
    A2 = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Gm', 'A7', 'Dm']
    prog = A + B + A2
    for b, c in enumerate(prog):
        s.arp('piano', b, c, [0, 2, 3, 4, 3, 2, 1, 2], step=0.5, low=50, vel=52)
        s.bass('piano', b, c, low=38, rhythm=((0, 3.8),), vel=60)
        if b >= 8:
            s.pad('strings', b, c, low=55, count=4, vel=50)
            s.bass('bass', b, c, low=33, vel=58)
        if b >= 16:
            s.pad('choir', b, c, low=60, count=3, vel=44)
    s.melody('piano', 0, 'D5:1.5 E5:0.5 F5:1 A5:1  G5:1.5 F5:0.5 D5:2  C5:1.5 D5:0.5 F5:1 C5:1  E5:3 r:1 '
                         'D5:1.5 E5:0.5 F5:1 A5:1  Bb5:1.5 A5:0.5 G5:1 D5:1  F5:1 D5:1 F5:1 G5:1  A5:2 E5:1 C#5:1', vel=78)
    s.melody('cello', 8, 'G3:2 Bb3:1 A3:1  F3:2 A3:1 D4:1  D4:1.5 C4:0.5 Bb3:2  A3:3 C4:1 '
                         'D4:2 Bb3:1 G3:1  A3:1.5 F3:0.5 D3:2  Eb3:1 G3:1 Bb3:1 Eb4:1  C#4:2 E4:1 A3:1', vel=84)
    s.melody('violin', 16, 'D5:1.5 E5:0.5 F5:1 A5:1  G5:1.5 F5:0.5 D5:2  C5:1.5 D5:0.5 F5:1 C5:1  E5:3 r:1 '
                           'D5:1.5 E5:0.5 F5:1 A5:1  Bb5:1.5 A5:0.5 G5:1 D5:1  E5:1 C#5:1 E5:1 G5:1  F5:2 D5:2', vel=80)
    return s, len(prog)


def hushvale():
    s = Song('hushvale', 80, beats_per_bar=3, seed=12)
    s.track('box', MUSICBOX, vol=96, pan=70, reverb=90)
    s.track('harp', HARP, vol=96, pan=56, reverb=80)
    s.track('strings', SLOW_STRINGS, vol=64, pan=64, reverb=95)
    s.track('flute', FLUTE, vol=82, pan=74, reverb=85)
    s.track('celesta', CELESTA, vol=70, pan=40, reverb=90)
    prog = ['Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'E', 'F', 'G', 'C', 'Am', 'Dm', 'Am', 'E', 'Am'] * 2
    for b, c in enumerate(prog):
        s.bass('harp', b, c, low=40, rhythm=((0, 1),), vel=66)
        for beat in (1, 2):
            for p in tones(c, 55, 3):
                s.note('harp', s.bar(b) + beat, 0.9, p, 44)
        if b >= 4:
            s.pad('strings', b, c, low=53, count=3, vel=42)
    mel = ('E5:2 A5:1  C6:2 A5:1  G5:1.5 E5:0.5 G5:1  D5:3  E5:1 A5:1 B5:1  C6:1 B5:1 A5:1  F5:1.5 E5:0.5 D5:1  E5:2 G#5:1 '
           'A5:2 C6:1  B5:2 D6:1  E6:1.5 D6:0.5 C6:1  A5:3  F5:1 A5:1 D6:1  C6:1.5 B5:0.5 A5:1  G#5:1 B5:1 E6:1  A5:3')
    s.melody('box', 0, mel, vel=76)
    s.melody('flute', 16, mel, vel=70, shift=-12)
    s.melody('celesta', 16, 'r:3 ' * 3 + 'D6:3 ' + 'r:3 ' * 3 + 'B5:3 ' + 'r:3 ' * 3 + 'A5:3 ' + 'r:3 ' * 3 + 'E6:3', vel=56)
    return s, len(prog)


def crossroads():
    s = Song('crossroads', 72, seed=13)
    s.track('pizz', PIZZ, vol=90, pan=44, reverb=70)
    s.track('cello', CELLO, vol=100, pan=58, reverb=80)
    s.track('piano', PIANO, vol=96, pan=72, reverb=85)
    s.track('strings', SLOW_STRINGS, vol=66, pan=64, reverb=95)
    s.track('bass', CONTRABASS, vol=84, pan=60, reverb=60)
    s.track('celesta', CELESTA, vol=60, pan=84, reverb=95)
    half = ['Dm', 'Dm/C', 'Bb', 'A', 'Dm', 'Gm', 'Bb', 'A', 'Gm', 'Dm', 'Eb', 'Bb', 'Gm', 'Dm', 'Em7b5', 'A']
    prog = half * 2
    for b, c in enumerate(prog):
        s.arp('pizz', b, c, [0, 2, 1, 2], step=1, low=50, vel=60, dur=0.5)
        s.bass('bass', b, c, low=31, rhythm=((0, 2), (2, 2)), vel=62)
        if b >= 8:
            s.pad('strings', b, c, low=53, count=4, vel=44)
        if b % 4 == 3:
            s.note('celesta', s.bar(b) + 3, 1, tones(c, 74, 1)[0], 50)
    cel = ('A3:3 F3:1  E3:2 D3:2  F3:1.5 G3:0.5 A3:1 Bb3:1  A3:3 r:1  D4:2 C4:1 A3:1  Bb3:2 A3:1 G3:1  F3:1 G3:1 A3:1 D4:1  C#4:3 r:1 '
           'D4:2 Bb3:2  A3:2 F3:2  G3:1.5 F3:0.5 Eb3:2  D3:3 F3:1  G3:2 Bb3:1 D4:1  F4:2 E4:1 D4:1  E4:1 D4:1 Bb3:1 G3:1  A3:3 r:1')
    s.melody('cello', 0, cel, vel=82)
    s.melody('piano', 16, cel, vel=70, shift=24)
    return s, len(prog)


def spore():
    s = Song('spore', 100, seed=14)
    s.track('pizz', PIZZ, vol=96, pan=52, reverb=60)
    s.track('bassoon', BASSOON, vol=100, pan=60, reverb=70)
    s.track('clarinet', CLARINET, vol=88, pan=76, reverb=75)
    s.track('glock', GLOCK, vol=62, pan=84, reverb=85)
    s.track('strings', STRINGS, vol=60, pan=64, reverb=85)
    s.track('bass', CONTRABASS, vol=80, pan=56, reverb=50)
    half = ['Em', 'C', 'Am', 'B7', 'Em', 'C', 'D', 'B7', 'Am', 'Em', 'C', 'B7', 'Am', 'Em', 'F#m7b5', 'B7']
    prog = half * 2
    for b, c in enumerate(prog):
        s.arp('pizz', b, c, [0, 2, 1, 2], step=0.5, low=52, vel=58, dur=0.3)
        s.bass('bass', b, c, low=28, rhythm=((0, 0.8), (2, 0.8)), vel=66)
        s.pad('strings', b, c, low=55, count=3, vel=34)
        if b % 2 == 1:
            s.note('glock', s.bar(b) + 3.5, 0.5, tones(c, 84, 1)[0], 48)
    mel = ('E3:0.5 G3:0.5 B3:1 A3:0.5 G3:0.5 F#3:1  E3:1 G3:1 C4:2  A3:0.5 C4:0.5 E4:1 D4:0.5 C4:0.5 B3:1  A3:1 F#3:1 D#3:2 '
           'E3:0.5 G3:0.5 B3:1 E4:1 D4:1  C4:1 B3:1 G3:2  F#3:1 A3:1 D4:1 C4:1  B3:2 D#4:2 '
           'C4:1.5 B3:0.5 A3:2  B3:1.5 A3:0.5 G3:2  E3:0.5 G3:0.5 C4:1 E4:2  D#4:1 B3:1 A3:1 F#3:1 '
           'A3:0.5 B3:0.5 C4:1 E4:1 C4:1  B3:2 G3:2  A3:1 C4:1 E4:1 F#3:1  D#3:2 B2:2')
    s.melody('bassoon', 0, mel, vel=80, legato=0.85)
    s.melody('clarinet', 16, mel, vel=74, shift=12, legato=0.9)
    return s, len(prog)


def moss():
    s = Song('moss', 84, seed=15)
    s.track('harp', HARP, vol=100, pan=50, reverb=80)
    s.track('flute', FLUTE, vol=96, pan=72, reverb=85)
    s.track('strings', SLOW_STRINGS, vol=72, pan=64, reverb=95)
    s.track('oohs', OOHS, vol=60, pan=64, reverb=100)
    s.track('horn', HORN, vol=72, pan=40, reverb=90)
    s.track('bass', CONTRABASS, vol=70, pan=60, reverb=60)
    half = ['F', 'C/E', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C', 'Dm', 'Am', 'Bb', 'F', 'Gm', 'C', 'Bb', 'C']
    prog = half * 2
    for b, c in enumerate(prog):
        s.arp('harp', b, c, [0, 1, 2, 3, 4, 3, 2, 1], step=0.25, low=53, vel=50, dur=0.6, accent=10)
        s.bass('bass', b, c, low=29, vel=56)
        s.pad('strings', b, c, low=57, count=3, vel=42)
        if b >= 16:
            s.pad('oohs', b, c, low=60, count=3, vel=40)
    mel = ('C5:1 F5:1 A5:2  G5:1.5 E5:0.5 C5:2  D5:1 F5:1 A5:1 G5:1  F5:3 D5:1  C5:1 F5:1 A5:1 C6:1  Bb5:1.5 A5:0.5 G5:2  F5:1 D5:1 Bb4:1 D5:1  E5:3 r:1 '
           'F5:2 A5:2  E5:2 C5:2  D5:1 F5:1 Bb5:2  A5:3 G5:1  Bb5:2 G5:1 D5:1  E5:2 G5:1 C6:1  D6:1.5 C6:0.5 Bb5:1 F5:1  G5:1 F5:1 E5:2')
    s.melody('flute', 0, mel, vel=78)
    s.melody('horn', 16, 'A3:4 G3:4 F3:4 F3:4 A3:4 G3:4 F3:4 E3:4 F3:4 E3:4 D3:4 C3:4 D3:4 E3:4 D3:4 E3:4', vel=58)
    s.melody('flute', 16, mel, vel=74)
    return s, len(prog)


def aqueduct():
    s = Song('aqueduct', 70, seed=16)
    s.track('celesta', CELESTA, vol=84, pan=40, reverb=95)
    s.track('vibes', VIBES, vol=74, pan=82, reverb=95)
    s.track('ehorn', ENGLISH_HORN, vol=96, pan=60, reverb=85)
    s.track('strings', SLOW_STRINGS, vol=70, pan=64, reverb=100)
    s.track('harp', HARP, vol=72, pan=54, reverb=85)
    s.track('bass', CONTRABASS, vol=74, pan=60, reverb=60)
    half = ['Cm', 'Ab', 'Eb', 'Bb', 'Cm', 'Fm', 'Ab', 'G', 'Fm', 'Cm', 'Ab', 'Eb', 'Fm', 'Ab', 'Dm7b5', 'G']
    prog = half * 2
    for b, c in enumerate(prog):
        s.arp('celesta', b, c, [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 3, 2, 1], step=0.25, low=67, vel=42, dur=0.5, accent=6)
        s.pad('strings', b, c, low=53, count=4, vel=44)
        s.bass('bass', b, c, low=31, vel=58)
        s.note('vibes', s.bar(b), 3.5, tones(c, 64, 3)[1], 46)
        if b % 2 == 0:
            s.arp('harp', b, c, [0, 1, 2, 3], step=0.25, low=55, vel=46, bars=0.25, dur=1.5)
    mel = ('G4:2 Eb4:1 C4:1  C5:2 Ab4:2  Bb4:1.5 G4:0.5 Eb4:2  D4:2 F4:1 Bb4:1  C5:1 Bb4:1 G4:2  Ab4:2 F4:1 C5:1  Eb5:1.5 C5:0.5 Ab4:2  B4:2 D5:1 G4:1 '
           'F4:1 Ab4:1 C5:2  Eb5:2 G4:2  Ab4:1 C5:1 Eb5:1 D5:1  Eb5:3 Bb4:1  Ab4:2 F4:2  C5:1.5 Bb4:0.5 Ab4:2  D4:1 F4:1 Ab4:1 C5:1  B4:2 G4:2')
    s.melody('ehorn', 0, mel, vel=80)
    s.melody('ehorn', 16, mel, vel=76, shift=12)
    return s, len(prog)


def crystal():
    s = Song('crystal', 104, seed=17)
    s.track('glock', GLOCK, vol=80, pan=36, reverb=90)
    s.track('celesta', CELESTA, vol=74, pan=88, reverb=95)
    s.track('violin', VIOLIN, vol=96, pan=66, reverb=85)
    s.track('choir', CHOIR, vol=66, pan=64, reverb=100)
    s.track('strings', STRINGS, vol=70, pan=60, reverb=90)
    s.track('timpani', TIMPANI, vol=80, pan=64, reverb=70)
    s.track('bass', CONTRABASS, vol=74, pan=58, reverb=55)
    half = ['Em', 'C', 'G', 'D', 'Em', 'Am', 'C', 'B', 'C', 'G', 'D', 'Em', 'C', 'G', 'Am', 'B']
    prog = half * 2
    for b, c in enumerate(prog):
        s.arp('glock', b, c, [0, 2, 1, 2, 0, 2, 1, 3], step=0.5, low=76, vel=46, dur=0.5)
        s.pad('choir', b, c, low=57, count=3, vel=42)
        s.arp('strings', b, c, [0, 1, 2, 1], step=1, low=48, vel=46, dur=0.9)
        s.bass('bass', b, c, low=28, rhythm=((0, 1.5), (2, 1.5)), vel=60)
        if b % 4 == 3:
            s.note('timpani', s.bar(b) + 2, 1.8, bass_note(c, 40), 70)
        if b >= 16 and b % 2 == 0:
            s.arp('celesta', b, c, [0, 1, 2, 3, 2, 1, 0, 1], step=0.25, low=72, vel=40, bars=0.5, dur=0.4)
    mel = ('B4:1 E5:1 G5:1 F#5:1  E5:2 G5:1 C6:1  B5:1.5 A5:0.5 G5:1 D5:1  F#5:3 A5:1  G5:1 F#5:1 E5:1 B4:1  C5:1 E5:1 A5:2  G5:1 E5:1 C5:1 E5:1  D#5:2 F#5:2 '
           'G5:2 E5:2  D5:1 G5:1 B5:2  A5:1.5 F#5:0.5 D5:2  E5:3 G5:1  C6:2 B5:1 G5:1  B5:2 D6:2  C6:1 B5:1 A5:1 E5:1  D#5:2 B4:2')
    s.melody('violin', 0, mel, vel=78)
    s.melody('violin', 16, mel, vel=82)
    return s, len(prog)


def webbed():
    s = Song('webbed', 58, seed=18)
    s.track('tremolo', TREMOLO, vol=78, pan=60, reverb=90)
    s.track('cello', CELLO, vol=100, pan=52, reverb=85)
    s.track('bass', CONTRABASS, vol=90, pan=62, reverb=70)
    s.track('harp', HARP, vol=70, pan=78, reverb=95)
    s.track('piano', PIANO, vol=70, pan=40, reverb=95)
    s.track('swell', REVERSE_CYMBAL, vol=46, pan=64, reverb=100)
    prog = ['Bm', 'Bmb6', 'Em', 'F#7', 'Bm', 'G', 'Em', 'F#', 'G', 'Bm', 'Em', 'C#m7b5', 'Bm', 'G', 'C', 'F#7']
    for b, c in enumerate(prog):
        s.pad('tremolo', b, c, low=45, count=3, vel=44)
        s.bass('bass', b, c, low=23, rhythm=((0, 1), (1.5, 0.5), (2, 2)), vel=62)
        if b % 2 == 1:
            s.note('harp', s.bar(b) + 1.5, 2, tones(c, 66, 2)[1], 40)
            s.note('harp', s.bar(b) + 1.5, 2, tones(c, 66, 2)[1] + 1, 26)    # a minor second rubbing against it
        if b % 4 == 0:
            s.note('piano', s.bar(b), 4, bass_note(c, 26), 48)
            s.note('piano', s.bar(b), 4, bass_note(c, 26) + 1, 30)
        if b % 8 == 7:
            s.note('swell', s.bar(b) + 1, 3, 60, 60)
    s.melody('cello', 0, 'F#3:3 G3:1  F#3:2 D3:2  E3:1.5 G3:0.5 B3:2  A#3:2 C#4:1 E4:1  D4:3 C#4:1  B3:2 G3:2  G3:1 B3:1 E4:1 D4:1  C#4:3 r:1 '
                         'D4:2 B3:2  F#3:3 r:1  G3:1.5 F#3:0.5 E3:2  G3:2 E3:1 C#3:1  B2:2 D3:2  D3:1.5 E3:0.5 B2:2  C3:2 E3:1 G3:1  A#2:2 F#2:2', vel=80)
    return s, len(prog)


def throne():
    s = Song('throne', 56, seed=19)
    s.track('organ', ORGAN, vol=62, pan=64, reverb=100)
    s.track('choir', CHOIR, vol=78, pan=64, reverb=100)
    s.track('strings', SLOW_STRINGS, vol=76, pan=58, reverb=100)
    s.track('horn', HORN, vol=96, pan=70, reverb=90)
    s.track('harp', HARP, vol=70, pan=40, reverb=90)
    s.track('timpani', TIMPANI, vol=84, pan=64, reverb=80)
    s.track('bass', CONTRABASS, vol=82, pan=60, reverb=70)
    prog = ['Cm', 'Ab', 'Fm', 'G', 'Cm', 'Eb', 'Ab', 'G', 'Ab', 'Eb', 'Fm', 'Cm', 'Db', 'Ab', 'Fm6', 'G']
    for b, c in enumerate(prog):
        s.pad('organ', b, c, low=48, count=4, vel=40)
        s.pad('choir', b, c, low=55, count=3, vel=50 if b >= 8 else 38)
        s.pad('strings', b, c, low=60, count=3, vel=46)
        s.bass('bass', b, c, low=24, vel=60)
        s.arp('harp', b, c, [0, 1, 2, 3, 4, 5], step=0.5, low=55, vel=38, bars=0.75, dur=2)
        if b % 4 == 3:
            for k in range(8):
                s.note('timpani', s.bar(b) + 2 + k * 0.25, 0.3, bass_note(c, 36), 40 + k * 6)
    s.melody('horn', 0, 'C4:2 Eb4:1 G4:1  Ab4:3 G4:1  F4:2 Ab4:1 C5:1  B4:3 r:1  C5:2 Bb4:1 G4:1  Bb4:2 G4:1 Eb4:1  C5:1.5 Bb4:0.5 Ab4:2  G4:3 r:1 '
                        'Eb5:2 C5:2  Bb4:2 G4:2  Ab4:1.5 G4:0.5 F4:2  G4:3 Eb4:1  F4:2 Ab4:1 Db5:1  C5:2 Eb5:2  D5:1 C5:1 Ab4:1 F4:1  G4:2 B3:2', vel=82)
    return s, len(prog)


def boss():
    s = Song('boss', 144, seed=20)
    s.track('strings', STRINGS, vol=100, pan=56, reverb=60)
    s.track('low', CELLO, vol=96, pan=60, reverb=50)
    s.track('brass', BRASS, vol=96, pan=70, reverb=70)
    s.track('horn', HORN, vol=100, pan=46, reverb=75)
    s.track('choir', CHOIR, vol=80, pan=64, reverb=90)
    s.track('timpani', TIMPANI, vol=100, pan=64, reverb=60)
    s.track('taiko', TAIKO, vol=100, pan=64, reverb=60)
    A = ['Dm', 'Dm', 'Bb', 'Bb', 'Gm', 'Gm', 'A', 'A']
    B = ['Gm', 'Eb', 'Bb', 'A', 'Gm', 'Eb', 'Gm', 'A']
    prog = A + A + B + B
    for b, c in enumerate(prog):
        s.arp('strings', b, c, [0, 1, 2, 1, 0, 2, 1, 2], step=0.5, low=57, vel=70, dur=0.35, accent=14)
        s.bass('low', b, c, low=38, rhythm=tuple((k * 0.5, 0.4) for k in range(8)), vel=66)
        s.hits('timpani', b, bass_note(c, 38), (0, 2), dur=0.6, vel=92)
        if b % 2 == 0:
            for p in tones(c, 55, 3):
                s.note('brass', s.bar(b), 0.5, p, 92)
                s.note('brass', s.bar(b) + 1.5, 0.5, p, 80)
        if b >= 16:
            s.hits('taiko', b, 50, (0.5, 1.5, 2.5, 3, 3.5), dur=0.3, vel=78)
            s.pad('choir', b, c, low=57, count=3, vel=62)
    s.melody('horn', 8, 'D4:1.5 F4:0.5 A4:2  G4:1 F4:1 E4:2  F4:1.5 D4:0.5 Bb3:2  C4:1 D4:1 F4:2  G4:1.5 Bb4:0.5 D5:2  C5:1 Bb4:1 A4:1 G4:1  A4:2 C#5:2  E5:4', vel=96)
    s.melody('horn', 16, 'G4:4  G4:2 Bb4:2  F4:4  E4:2 C#5:2  D5:4  Eb5:2 Bb4:2  Bb4:2 D5:2  C#5:4', vel=92)
    s.melody('brass', 24, 'G4:4  G4:2 Bb4:2  F4:4  E4:2 C#5:2  D5:4  Eb5:2 Bb4:2  Bb4:2 D5:2  C#5:4', vel=88, shift=12)
    return s, len(prog)


def king():
    s = Song('king', 132, seed=21)
    s.track('organ', ORGAN, vol=74, pan=64, reverb=95)
    s.track('choir', CHOIR, vol=92, pan=64, reverb=95)
    s.track('strings', STRINGS, vol=96, pan=56, reverb=70)
    s.track('brass', BRASS, vol=96, pan=72, reverb=75)
    s.track('trumpet', TRUMPET, vol=86, pan=40, reverb=80)
    s.track('timpani', TIMPANI, vol=104, pan=64, reverb=60)
    s.track('taiko', TAIKO, vol=96, pan=64, reverb=60)
    s.track('bass', CONTRABASS, vol=90, pan=60, reverb=50)
    A = ['Cm', 'Ab', 'Fm', 'G', 'Cm', 'Ab', 'Db', 'G']
    B = ['Fm', 'Cm', 'Ab', 'Eb', 'Fm', 'Ab', 'Db', 'G']
    prog = A + A + B + B
    for b, c in enumerate(prog):
        s.pad('organ', b, c, low=48, count=4, vel=48)
        s.arp('strings', b, c, [0, 2, 1, 2, 3, 2, 1, 2], step=0.5, low=55, vel=68, dur=0.35, accent=12)
        s.bass('bass', b, c, low=24, rhythm=tuple((k * 0.5, 0.4) for k in range(8)), vel=62)
        s.hits('timpani', b, bass_note(c, 36), (0, 1.5, 2), dur=0.5, vel=90)
        if b >= 8:
            s.hits('taiko', b, 50, (0, 0.75, 2, 2.75, 3.5), dur=0.3, vel=74)
        for p in tones(c, 60, 3):
            s.note('choir', s.bar(b), 3.9, p, 58 if b < 16 else 70)
    mel_a = 'C5:2 Eb5:2  C5:2 Ab4:2  F4:2 Ab4:1 C5:1  B4:4  G5:2 Eb5:2  Eb5:2 C5:2  Db5:2 F5:2  D5:2 B4:2'
    mel_b = 'Ab4:2 C5:2  G4:2 Eb5:2  C5:4  Bb4:2 G4:2  F5:2 Ab4:2  Eb5:4  F5:2 Db5:2  D5:2 B4:2'
    s.melody('brass', 8, mel_a, vel=94)
    s.melody('brass', 16, mel_b, vel=94)
    s.melody('trumpet', 24, mel_b, vel=90)
    return s, len(prog)


def foundry():
    """The Rustworks: a clockwork ostinato in G minor, woodblock ticks, an anvil on the off-bar
    and a brooding horn tune that the bassoon answers."""
    s = Song('foundry', 96, seed=22)
    s.track('low', CELLO, vol=100, pan=56, reverb=55)
    s.track('bass', CONTRABASS, vol=90, pan=60, reverb=45)
    s.track('tick', WOODBLOCK, vol=72, pan=82, reverb=40)
    s.track('anvil', AGOGO, vol=58, pan=40, reverb=75)
    s.track('celesta', CELESTA, vol=62, pan=86, reverb=85)
    s.track('horn', HORN, vol=94, pan=48, reverb=80)
    s.track('bassoon', BASSOON, vol=88, pan=68, reverb=70)
    s.track('strings', SLOW_STRINGS, vol=60, pan=64, reverb=90)
    s.track('timpani', TIMPANI, vol=92, pan=64, reverb=60)
    A = ['Gm', 'Gm', 'Eb', 'D', 'Gm', 'Cm', 'Ab', 'D7']
    B = ['Cm', 'Gm', 'Ab', 'Eb', 'Cm', 'Gm', 'Eb', 'D7']
    prog = A + A + B + A
    for b, c in enumerate(prog):
        root = bass_note(c, 43)
        for k in range(8):                                    # the machine: staccato eighths, octave kicks
            s.note('low', s.bar(b) + k * 0.5, 0.26, root + (12 if k in (3, 7) else 0), 80 if k in (0, 3, 6) else 56)
        s.bass('bass', b, c, low=31, rhythm=((0, 0.4), (1.5, 0.4), (3, 0.4)), vel=70)
        s.hits('tick', b, 76, (0.5, 1.5, 2.5, 3.5), dur=0.1, vel=58)
        if b % 2 == 1:
            s.note('anvil', s.bar(b) + 3, 0.4, 72, 60)
        if b % 2 == 0:
            s.note('timpani', s.bar(b), 1.2, bass_note(c, 38), 84)
        if b >= 8:
            s.pad('strings', b, c, low=55, count=3, vel=40)
        if b >= 16:
            s.arp('celesta', b, c, [0, 1, 2, 1, 3, 2, 1, 2], step=0.25, low=79, vel=34, bars=0.5, dur=0.2)
    mel_a = ('G3:1.5 A3:0.5 Bb3:1 D4:1  C4:1.5 Bb3:0.5 A3:2  G3:1 Bb3:1 Eb4:1 D4:1  D4:3 r:1 '
             'G4:1.5 F4:0.5 Eb4:1 D4:1  C4:1 Eb4:1 G4:2  F4:1 Eb4:1 C4:1 Eb4:1  D4:3 F#3:1')
    mel_b = ('Eb4:2 D4:1 C4:1  Bb3:2 G3:2  C4:1 Eb4:1 Ab4:2  G4:3 Eb4:1  '
             'F4:2 Eb4:1 C4:1  D4:2 Bb3:2  G3:1 Bb3:1 Eb4:1 G4:1  F#4:3 r:1')
    s.melody('bassoon', 0, mel_a, vel=80, shift=-12, legato=0.9)
    s.melody('horn', 8, mel_a, vel=88)
    s.melody('bassoon', 16, mel_b, vel=82, legato=0.9)
    s.melody('horn', 16, mel_b, vel=70, shift=-12)
    s.melody('horn', 24, mel_a, vel=92)
    return s, len(prog)


def frost():
    """Rimecrest: a glacier under an aurora. F sharp minor, slow; glass-bright arpeggios over
    long string chords, a flute that sings above them and a horn that takes the tune low at the end."""
    s = Song('frost', 62, seed=23)
    s.track('glock', GLOCK, vol=74, pan=34, reverb=100)
    s.track('celesta', CELESTA, vol=70, pan=90, reverb=100)
    s.track('strings', SLOW_STRINGS, vol=74, pan=60, reverb=100)
    s.track('choir', CHOIR, vol=62, pan=64, reverb=100)
    s.track('harp', HARP, vol=80, pan=48, reverb=90)
    s.track('flute', FLUTE, vol=92, pan=70, reverb=95)
    s.track('horn', HORN, vol=84, pan=54, reverb=95)
    s.track('timpani', TIMPANI, vol=70, pan=64, reverb=85)
    s.track('bass', CONTRABASS, vol=70, pan=60, reverb=70)
    A = ['F#m', 'D', 'A', 'E', 'F#m', 'Bm', 'D', 'C#']
    B = ['D', 'A', 'Bm', 'F#m', 'D', 'E', 'Bm', 'C#']
    prog = A + B + A
    for b, c in enumerate(prog):
        s.arp('glock', b, c, [0, 2, 1, 3, 2, 1, 0, 1], step=0.5, low=79, vel=38, dur=0.6)
        s.arp('celesta', b, c, [0, 1, 2, 3], step=1, low=67, vel=40, dur=1.4)
        s.pad('strings', b, c, low=53, count=4, vel=44)
        s.bass('bass', b, c, low=26, rhythm=((0, 3.9),), vel=54)
        if b >= 8:
            s.pad('choir', b, c, low=57, count=3, vel=38)
            s.arp('harp', b, c, [0, 1, 2, 3, 4, 3, 2, 1], step=0.5, low=55, vel=40, dur=1.0)
        if b % 4 == 0:
            s.note('timpani', s.bar(b), 2.6, bass_note(c, 38), 52)
    mel_a = ('A5:2 C#6:1 B5:1  A5:3 F#5:1  E5:1.5 A5:0.5 C#6:2  B5:3 G#5:1  '
             'A5:2 F#5:1 A5:1  B5:1.5 D6:0.5 C#6:1 B5:1  A5:2 F#5:2  G#5:3 F5:1')
    mel_b = ('F#5:2 A5:1 D6:1  C#6:3 E6:1  D6:2 B5:1 F#5:1  A5:3 C#6:1  '
             'B5:2 A5:1 F#5:1  G#5:2 B5:1 E6:1  D6:1.5 C#6:0.5 B5:2  C#6:3 r:1')
    s.melody('flute', 0, mel_a, vel=76)
    s.melody('flute', 8, mel_b, vel=80)
    s.melody('horn', 16, mel_a, vel=78, shift=-12)
    s.melody('flute', 16, mel_a, vel=62, legato=0.95)
    return s, len(prog)


def ember():
    """Cinderdeep: basalt and lava. C sharp minor at a walking pace: a dotted cello ostinato, taiko
    and timpani under it, brass stabs, and a horn tune that the bassoon answers a bar later."""
    s = Song('ember', 92, seed=24)
    s.track('low', CELLO, vol=100, pan=56, reverb=55)
    s.track('bass', CONTRABASS, vol=94, pan=60, reverb=45)
    s.track('timpani', TIMPANI, vol=96, pan=64, reverb=60)
    s.track('taiko', TAIKO, vol=88, pan=64, reverb=60)
    s.track('brass', BRASS, vol=88, pan=72, reverb=70)
    s.track('horn', HORN, vol=96, pan=46, reverb=80)
    s.track('bassoon', BASSOON, vol=86, pan=70, reverb=70)
    s.track('strings', STRINGS, vol=64, pan=60, reverb=85)
    s.track('choir', CHOIR, vol=60, pan=64, reverb=95)
    A = ['C#m', 'C#m', 'A', 'B', 'C#m', 'F#m', 'A', 'G#7']
    B = ['F#m', 'C#m', 'A', 'E', 'F#m', 'C#m', 'B', 'G#7']
    prog = A + A + B + A
    for b, c in enumerate(prog):
        root = bass_note(c, 37)
        for k, off in enumerate((0, 0.75, 1.5, 2, 2.75, 3.5)):          # the dotted ostinato
            s.note('low', s.bar(b) + off, 0.5, root + (12 if k in (2, 5) else 0), 82 if k in (0, 3) else 60)
        s.bass('bass', b, c, low=25, rhythm=((0, 0.8), (2, 0.8)), vel=70)
        s.hits('timpani', b, bass_note(c, 38), (0, 2), dur=0.7, vel=86)
        if b >= 4:
            s.hits('taiko', b, 50, (1, 3), dur=0.3, vel=66)
        if b >= 8 and b % 2 == 0:
            for p in tones(c, 53, 3):
                s.note('brass', s.bar(b), 0.6, p, 84)
        if b >= 8:
            s.pad('strings', b, c, low=56, count=3, vel=40)
        if b >= 16:
            s.pad('choir', b, c, low=56, count=3, vel=44)
    mel_a = ('C#4:1.5 E4:0.5 G#4:2  F#4:1 E4:1 C#4:2  A3:1 C#4:1 E4:2  D#4:1.5 F#4:0.5 B4:2  '
             'G#4:1.5 E4:0.5 C#4:2  A4:1 F#4:1 C#5:2  B4:1.5 A4:0.5 E4:2  D#4:2 F#4:1 G#4:1')
    mel_b = ('A4:2 C#5:1 F#5:1  E5:1.5 C#5:0.5 G#4:2  A4:1 C#5:1 E5:2  G#5:2 E5:2  '
             'F#5:1.5 E5:0.5 C#5:2  G#4:1 C#5:1 E5:2  D#5:2 F#5:1 B4:1  D#5:3 r:1')
    s.melody('horn', 4, mel_a, vel=90)
    s.melody('bassoon', 5, mel_a, vel=62, shift=-12, legato=0.9)
    s.melody('horn', 16, mel_b, vel=94)
    s.melody('brass', 24, mel_a, vel=84, shift=12)
    return s, len(prog)


def storm():
    """Stormcrest: peaks under a thunderstorm. F minor at a driving pace: tremolo strings and a cello pulse under
    gusting flute runs, timpani like thunder, a horn tune that the trumpet takes up the second time."""
    s = Song('storm', 126, seed=25)
    s.track('strings', STRINGS, vol=84, pan=58, reverb=70)
    s.track('low', CELLO, vol=96, pan=54, reverb=55)
    s.track('bass', CONTRABASS, vol=88, pan=60, reverb=45)
    s.track('timpani', TIMPANI, vol=100, pan=64, reverb=65)
    s.track('taiko', TAIKO, vol=84, pan=64, reverb=60)
    s.track('brass', BRASS, vol=86, pan=72, reverb=70)
    s.track('flute', FLUTE, vol=66, pan=80, reverb=85)
    s.track('horn', HORN, vol=96, pan=46, reverb=80)
    s.track('trumpet', TRUMPET, vol=84, pan=40, reverb=80)
    s.track('choir', CHOIR, vol=62, pan=64, reverb=95)
    A = ['Fm', 'Db', 'Ab', 'Eb', 'Fm', 'Bbm', 'Db', 'C']
    B = ['Db', 'Ab', 'Bbm', 'Fm', 'Db', 'Eb', 'Bbm', 'C']
    prog = A + A + B + A
    for b, c in enumerate(prog):
        s.arp('strings', b, c, [0, 1, 2, 1, 0, 2, 1, 2], step=0.5, low=53, vel=62, dur=0.35, accent=12)
        s.bass('low', b, c, low=36, rhythm=tuple((k * 0.5, 0.4) for k in range(8)), vel=64)
        s.bass('bass', b, c, low=24, rhythm=((0, 1.8), (2, 1.8)), vel=70)
        s.hits('timpani', b, bass_note(c, 36), (0, 1.5, 2), dur=0.5, vel=84)
        if b >= 4:
            s.hits('taiko', b, 50, (1, 3), dur=0.3, vel=64)
        if b >= 8 and b % 2 == 0:
            for p in tones(c, 53, 3):
                s.note('brass', s.bar(b), 0.55, p, 82)
        if b >= 8 and b % 2 == 1:
            s.arp('flute', b, c, [0, 1, 2, 3, 4, 5, 4, 3], step=0.25, low=72, vel=44, dur=0.3)
        if b >= 16:
            s.pad('choir', b, c, low=53, count=3, vel=40)
    mel_a = ('F4:1.5 Ab4:0.5 C5:2  Db5:1.5 C5:0.5 Ab4:2  Eb5:2 C5:1 Ab4:1  G4:1.5 Bb4:0.5 Eb5:2  '
             'F5:1.5 Eb5:0.5 C5:2  Db5:1 F5:1 Bb4:2  Ab4:1 Db5:1 F5:2  E5:2 G4:1 C5:1')
    mel_b = ('F5:2 Ab5:2  Eb5:1.5 C5:0.5 Ab4:2  Db5:1 F5:1 Bb5:2  Ab5:2 F5:1 C5:1  '
             'F5:1.5 Db5:0.5 Ab4:2  G5:2 Bb5:1 Eb5:1  F5:1 Db5:1 Bb4:2  G4:1 E5:1 G5:2')
    s.melody('horn', 8, mel_a, vel=90)
    s.melody('trumpet', 16, mel_b, vel=88)
    s.melody('horn', 24, mel_a, vel=94)
    s.melody('trumpet', 24, mel_a, vel=70, shift=12)
    return s, len(prog)


def mirror():
    """The Mirror Vault: black glass and quicksilver. B flat minor, slow and glassy: celesta and glockenspiel
    arpeggios that seem to answer themselves, tremolo strings and a cello line, a choir far behind."""
    s = Song('mirror', 68, seed=26)
    s.track('celesta', CELESTA, vol=82, pan=36, reverb=100)
    s.track('glock', GLOCK, vol=66, pan=92, reverb=100)
    s.track('vibes', VIBES, vol=62, pan=60, reverb=95)
    s.track('piano', PIANO, vol=76, pan=48, reverb=90)
    s.track('tremolo', TREMOLO, vol=70, pan=64, reverb=95)
    s.track('cello', CELLO, vol=92, pan=56, reverb=85)
    s.track('violin', VIOLIN, vol=84, pan=72, reverb=90)
    s.track('choir', CHOIR, vol=58, pan=64, reverb=100)
    s.track('bass', CONTRABASS, vol=78, pan=60, reverb=60)
    s.track('swell', REVERSE_CYMBAL, vol=44, pan=64, reverb=100)
    A = ['Bbm', 'Gb', 'Db', 'Ab', 'Bbm', 'Ebm', 'Gb', 'F']
    B = ['Gb', 'Db', 'Ebm', 'Bbm', 'Gb', 'Ab', 'Ebm', 'F']
    prog = A + B + A
    for b, c in enumerate(prog):
        s.arp('celesta', b, c, [0, 2, 1, 3, 2, 4, 3, 5], step=0.5, low=70, vel=40, dur=0.7)
        s.arp('glock', b, c, [3, 1, 2, 0], step=1, low=79, vel=36, dur=1.2)
        s.note('piano', s.bar(b), 3.6, bass_note(c, 33), 54)
        s.note('piano', s.bar(b) + 2, 1.8, bass_note(c, 45), 42)
        s.pad('tremolo', b, c, low=51, count=3, vel=40)
        s.bass('bass', b, c, low=22, rhythm=((0, 3.9),), vel=56)
        if b >= 8:
            s.pad('choir', b, c, low=58, count=3, vel=38)
            s.note('vibes', s.bar(b), 3.5, tones(c, 66, 3)[1], 44)
        if b % 8 == 7:
            s.note('swell', s.bar(b) + 1, 3, 60, 58)
    mel_a = ('Bb4:2 Db5:1 F5:1  Gb5:3 Db5:1  F5:1.5 Ab5:0.5 Db6:2  C6:3 Eb6:1  '
             'Db6:2 Bb5:1 F5:1  Gb5:1.5 Bb5:0.5 Eb6:2  Db6:2 Bb5:2  A5:3 C6:1')
    mel_b = ('Gb5:2 Bb5:1 Db6:1  F6:3 Db6:1  Gb5:1.5 Bb5:0.5 Eb6:2  F6:2 Db6:1 Bb5:1  '
             'Db6:2 Gb6:2  Eb6:1.5 C6:0.5 Ab5:2  Bb5:1.5 Gb5:0.5 Eb5:2  A5:2 C6:2')
    s.melody('violin', 0, mel_a, vel=74, shift=-12)
    s.melody('cello', 8, mel_b, vel=80, shift=-24)
    s.melody('violin', 8, mel_b, vel=70, shift=-12)
    s.melody('celesta', 16, mel_a, vel=60)
    s.melody('cello', 16, mel_a, vel=76, shift=-24)
    return s, len(prog)



def overture():
    """The title overture: a full orchestra in D minor. A call of horns over a timpani roll, the theme in the strings
    with the harp underneath, a second theme that climbs with the choir, a tutti where the brass takes the tune
    and the timpani and taiko drive, and a quiet coda in the flute that ends on the dominant so that it loops."""
    s = Song('overture', 72, seed=41)
    s.track('strings', STRINGS, vol=88, pan=60, reverb=85)
    s.track('violin', VIOLIN, vol=92, pan=74, reverb=85)
    s.track('cello', CELLO, vol=96, pan=50, reverb=75)
    s.track('bass', CONTRABASS, vol=86, pan=58, reverb=55)
    s.track('harp', HARP, vol=84, pan=44, reverb=90)
    s.track('horn', HORN, vol=98, pan=40, reverb=85)
    s.track('brass', BRASS, vol=92, pan=76, reverb=80)
    s.track('timpani', TIMPANI, vol=104, pan=64, reverb=65)
    s.track('taiko', TAIKO, vol=84, pan=64, reverb=60)
    s.track('choir', CHOIR, vol=82, pan=64, reverb=100)
    s.track('flute', FLUTE, vol=80, pan=82, reverb=90)
    s.track('glock', GLOCK, vol=60, pan=90, reverb=95)
    intro = ['Dm', 'Dm', 'Bb', 'A']
    A = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Gm', 'Bb', 'A']
    B = ['Gm', 'Dm', 'Bb', 'F', 'Gm', 'Dm', 'Eb', 'A']
    C = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Gm', 'A7', 'Dm']
    coda = ['Gm', 'Dm', 'Bb', 'A']
    prog = intro + A + B + C + coda                       # 32 bars
    for b, c in enumerate(prog):
        sec = 'intro' if b < 4 else 'A' if b < 12 else 'B' if b < 20 else 'C' if b < 28 else 'coda'
        s.bass('bass', b, c, low=26, rhythm=((0, 3.9),), vel=64 if sec != 'C' else 78)
        if sec == 'intro':
            s.hits('timpani', b, 38, (0, 1, 2, 3), dur=0.9, vel=46 + 12 * b)
            s.pad('strings', b, c, low=50, count=3, vel=34 + 8 * b)
        else:
            s.pad('strings', b, c, low=50, count=4, vel=56 if sec != 'C' else 74)
        if sec in ('A', 'B', 'coda'):
            s.arp('harp', b, c, [0, 2, 1, 3, 2, 4, 3, 2], step=0.5, low=50, vel=52, dur=1.2)
        if sec == 'A':
            s.bass('cello', b, c, low=38, rhythm=((0, 2), (2, 2)), vel=70)
        if sec in ('B', 'C'):
            s.pad('choir', b, c, low=57, count=3, vel=52 if sec == 'B' else 70)
            s.bass('cello', b, c, low=38, rhythm=tuple((k, 0.9) for k in range(4)), vel=72)
        if sec == 'B':
            s.hits('timpani', b, bass_note(c, 36), (0, 2), dur=0.7, vel=72)
            s.arp('glock', b, c, [4, 2, 3, 1], step=1, low=79, vel=44, dur=1.3)
        if sec == 'C':
            s.arp('strings', b, c, [0, 2, 1, 2, 3, 2, 1, 2], step=0.5, low=55, vel=70, dur=0.35, accent=14)
            s.hits('timpani', b, bass_note(c, 36), (0, 1.5, 2, 3), dur=0.5, vel=96)
            s.hits('taiko', b, 50, (1, 3), dur=0.3, vel=80)
            for p in tones(c, 53, 3):
                s.note('brass', s.bar(b), 1.8, p, 80)
    # intro: the horns call across the roll
    s.melody('horn', 0, 'D4:2 A4:2  D5:4  Bb4:2 F5:2  E5:3 r:1', vel=86)
    th_a = ('D5:2 F5:1 A5:1  G5:1.5 F5:0.5 D5:2  C5:1 F5:1 A5:2  G5:1.5 E5:0.5 C5:2  '
            'D5:1 F5:1 A5:1 D6:1  Bb5:2 A5:1 G5:1  F5:1.5 G5:0.5 Bb5:1 D6:1  C#6:2 A5:1 E5:1')
    th_b = ('G5:1 Bb5:1 D6:2  A5:1 D6:1 F6:2  D6:1.5 C6:0.5 Bb5:2  A5:1 C6:1 F6:2  '
            'G6:2 F6:1 D6:1  F6:1.5 E6:0.5 D6:2  Eb6:1 G6:1 Bb6:2  A6:2 G6:1 E6:1')
    th_c = ('D5:2 F5:1 A5:1  G5:1.5 F5:0.5 D5:2  C5:1 F5:1 A5:2  G5:1.5 E5:0.5 C5:2  '
            'D5:1 F5:1 A5:1 D6:1  Bb5:2 A5:1 G5:1  E5:1 G5:1 A5:1 C#6:1  D6:4')
    s.melody('violin', 4, th_a, vel=82)
    s.melody('horn', 4, th_a, vel=58, shift=-12)
    s.melody('violin', 12, th_b, vel=88)
    s.melody('flute', 12, th_b, vel=58, shift=12)
    s.melody('horn', 20, th_c, vel=96, shift=0)
    s.melody('brass', 20, th_c, vel=84, shift=12)
    s.melody('violin', 20, th_c, vel=84, shift=12)
    s.melody('flute', 28, 'D6:2 C6:1 A5:1  F5:3 r:1  G5:2 A5:2  E5:3 r:1', vel=68)
    return s, len(prog)


def ossuary():
    """The Ossuary: a catacomb in G sharp minor. An organ drone and a choir far back, a low cello line that
    the bassoon answers, pizzicato like bones tapping, a tolling bell and a slow heartbeat of timpani."""
    s = Song('ossuary', 58, seed=42)
    s.track('organ', ORGAN, vol=70, pan=64, reverb=100)
    s.track('choir', CHOIR, vol=78, pan=64, reverb=100)
    s.track('cello', CELLO, vol=100, pan=48, reverb=85)
    s.track('bassoon', BASSOON, vol=84, pan=76, reverb=80)
    s.track('pizz', PIZZ, vol=80, pan=36, reverb=80)
    s.track('harp', HARP, vol=70, pan=90, reverb=90)
    s.track('bell', GLOCK, vol=64, pan=60, reverb=100)
    s.track('timpani', TIMPANI, vol=76, pan=64, reverb=80)
    s.track('bass', CONTRABASS, vol=88, pan=58, reverb=50)
    A = ['G#m', 'E', 'C#m', 'D#', 'G#m', 'F#', 'E', 'D#7']
    B = ['C#m', 'G#m', 'E', 'B', 'C#m', 'G#m', 'D#', 'D#7']
    prog = A + B + A                                                  # 24 bars
    for b, c in enumerate(prog):
        s.pad('organ', b, c, low=44, count=4, vel=46)
        s.bass('bass', b, c, low=23, rhythm=((0, 3.9),), vel=64)
        s.hits('timpani', b, bass_note(c, 35), (0, 2), dur=0.9, vel=52)
        s.arp('pizz', b, c, [0, 2, 1, 3, 2, 3, 1, 2], step=0.5, low=55, vel=44, dur=0.25, accent=10)
        if b % 2 == 0:
            s.note('bell', s.bar(b), 3.5, tones(c, 80, 1)[0], 46)
        if b >= 8:
            s.pad('choir', b, c, low=56, count=3, vel=44)
            s.arp('harp', b, c, [0, 2, 4, 2, 1, 3, 5, 3], step=0.5, low=52, vel=42, dur=1.2)
    mel_a = ('G#3:2 B3:1 D#4:1  E4:3 D#4:1  C#4:2 E4:1 G#4:1  F#4:3 B3:1  '
             'G#3:2 F#3:1 D#3:1  E3:2 G#3:1 B3:1  E4:2 B3:1 G#3:1  F#3:2 A#3:1 C#4:1')
    mel_b = ('C#4:1 E4:1 G#4:2  G#4:2 D#4:2  E4:1 G#4:1 B4:2  D#5:1.5 C#5:0.5 B4:2  '
             'C#5:2 E5:2  D#5:2 B4:2  A#4:1 D#5:1 F#5:2  F#5:2 D#5:1 A#4:1')
    s.melody('cello', 0, mel_a, vel=84)
    s.melody('bassoon', 8, mel_a, vel=62, shift=12)
    s.melody('cello', 8, mel_b, vel=88, shift=-12)
    s.melody('bassoon', 8, mel_b, vel=64)
    s.melody('cello', 16, mel_a, vel=88)
    s.melody('choir', 16, mel_a, vel=50, shift=12)
    return s, len(prog)


def lunar():
    """The Lunar Observatory: a stately waltz in E minor. Harp and celesta turn like the rings of an orrery, a flute
    sings the tune over strings, the horn answers in the second strain and the choir joins for the last."""
    s = Song('lunar', 78, beats_per_bar=3, seed=43)
    s.track('harp', HARP, vol=92, pan=44, reverb=92)
    s.track('celesta', CELESTA, vol=74, pan=84, reverb=100)
    s.track('strings', SLOW_STRINGS, vol=76, pan=60, reverb=90)
    s.track('flute', FLUTE, vol=90, pan=72, reverb=90)
    s.track('horn', HORN, vol=88, pan=44, reverb=85)
    s.track('violin', VIOLIN, vol=80, pan=76, reverb=88)
    s.track('cello', CELLO, vol=90, pan=52, reverb=70)
    s.track('timpani', TIMPANI, vol=76, pan=64, reverb=75)
    s.track('choir', CHOIR, vol=70, pan=64, reverb=100)
    s.track('bass', CONTRABASS, vol=80, pan=58, reverb=50)
    A = ['Em', 'C', 'G', 'D', 'Em', 'Am', 'B7', 'Em']
    B = ['C', 'G', 'D', 'Bm', 'C', 'Am', 'B7', 'E']
    C = ['G', 'D', 'Em', 'C', 'Am', 'D', 'B7', 'Em']
    prog = A + B + A + B + C                                           # 40 bars
    for b, c in enumerate(prog):
        sec = 'A' if b < 8 else 'B' if b < 16 else 'A' if b < 24 else 'B' if b < 32 else 'C'
        s.arp('harp', b, c, [0, 2, 4], step=1, low=48, vel=64, dur=1.8)
        s.pad('strings', b, c, low=52, count=4, vel=46 if sec != 'C' else 60)
        s.bass('bass', b, c, low=28, rhythm=((0, 2.8),), vel=60)
        s.hits('timpani', b, bass_note(c, 36), (0,), dur=0.6, vel=50 if sec != 'C' else 72)
        if b % 2 == 1 or sec == 'C':
            s.arp('celesta', b, c, [3, 2, 4], step=0.5, low=72, vel=40, dur=0.7, bars=1)
        if sec in ('B', 'C'):
            s.bass('cello', b, c, low=40, rhythm=((0, 1.4), (1.5, 1.4)), vel=66)
        if b >= 24:
            s.pad('choir', b, c, low=59, count=3, vel=40 if b < 32 else 56)
    mel_a = ('E5:1.5 G5:0.5 B5:1  C6:1.5 B5:0.5 G5:1  G5:1 B5:1 D6:1  F#6:2 D6:1  '
             'E6:1.5 D6:0.5 B5:1  C6:1 E6:1 A5:1  D#6:1 F#6:1 B5:1  E6:3')
    mel_b = ('G5:1 C6:1 E6:1  D6:1.5 B5:0.5 G5:1  A5:1 D6:1 F#6:1  D6:1.5 B5:0.5 F#5:1  '
             'E6:1 G6:1 E6:1  C6:1.5 A5:0.5 E5:1  D#5:1 F#5:1 A5:1  B5:3')
    mel_c = ('G5:1 B5:1 D6:1  F#6:1.5 D6:0.5 A5:1  G6:2 E6:1  E6:1.5 C6:0.5 G5:1  '
             'A5:1 C6:1 E6:1  F#6:1 A6:1 D6:1  D#6:1 F#6:1 B6:1  E6:3')
    s.melody('flute', 0, mel_a, vel=84)
    s.melody('flute', 8, mel_b, vel=86)
    s.melody('violin', 16, mel_a, vel=76)
    s.melody('flute', 16, mel_a, vel=60, shift=12)
    s.melody('horn', 24, mel_b, vel=86, shift=-12)
    s.melody('violin', 24, mel_b, vel=80)
    s.melody('flute', 32, mel_c, vel=92, shift=12)
    s.melody('horn', 32, mel_c, vel=92, shift=-12)
    s.melody('violin', 32, mel_c, vel=84)
    return s, len(prog)


def boss_bone():
    """The battle of the Ossuary (the Bonewright and the Marrow Tyrant): C sharp minor at a driving 148. A staccato
    ostinato in the strings, organ and low brass, timpani and taiko on every drive, trumpets on the tune."""
    s = Song('boss_bone', 148, seed=44)
    s.track('organ', ORGAN, vol=84, pan=64, reverb=90)
    s.track('strings', STRINGS, vol=96, pan=56, reverb=65)
    s.track('low', CELLO, vol=100, pan=48, reverb=50)
    s.track('bass', CONTRABASS, vol=92, pan=60, reverb=45)
    s.track('trombone', TROMBONE, vol=90, pan=40, reverb=70)
    s.track('trumpet', TRUMPET, vol=92, pan=78, reverb=75)
    s.track('timpani', TIMPANI, vol=108, pan=64, reverb=55)
    s.track('taiko', TAIKO, vol=100, pan=64, reverb=55)
    s.track('choir', CHOIR, vol=86, pan=64, reverb=95)
    s.track('bell', GLOCK, vol=56, pan=90, reverb=90)
    A = ['C#m', 'A', 'E', 'B', 'C#m', 'A', 'F#m', 'G#7']
    B = ['A', 'E', 'F#m', 'C#m', 'A', 'E', 'B', 'B']
    prog = A + A + B + A
    for b, c in enumerate(prog):
        s.pad('organ', b, c, low=48, count=4, vel=56)
        s.arp('strings', b, c, [0, 2, 1, 2, 0, 2, 3, 2], step=0.5, low=49, vel=70, dur=0.3, accent=14)
        s.bass('low', b, c, low=25, rhythm=tuple((k * 0.5, 0.4) for k in range(8)), vel=70)
        s.bass('bass', b, c, low=25, rhythm=((0, 1.9), (2, 1.9)), vel=76)
        s.hits('timpani', b, bass_note(c, 37), (0, 1.5, 2, 3.5), dur=0.5, vel=100)
        s.hits('taiko', b, 50, (0, 0.75, 2, 2.75, 3.5), dur=0.3, vel=78)
        for p in tones(c, 60, 3):
            s.note('choir', s.bar(b), 3.9, p, 66 if b < 16 else 78)
        if b % 4 == 0:
            s.note('bell', s.bar(b), 3, tones(c, 80, 1)[0], 50)
        if b >= 8:
            for p in tones(c, 55, 3):
                s.note('trombone', s.bar(b), 0.9, p, 84)
                s.note('trombone', s.bar(b) + 2, 0.9, p, 80)
    mel_a = ('C#5:0.5 E5:0.5 G#5:1 C#6:2  B5:1 A5:1 E5:2  G#5:1 B5:1 E6:2  D#6:1.5 C#6:0.5 B5:2  '
             'C#6:1 E6:1 G#6:2  F#6:1.5 E6:0.5 C#6:2  A5:1 C#6:1 F#6:2  G#6:2 F#6:1 D#6:1')
    mel_b = ('A5:2 C#6:1 E6:1  E6:1.5 G#5:0.5 B5:2  F#5:1 A5:1 C#6:2  E6:2 G#6:2  '
             'A6:1.5 G#6:0.5 E6:2  G#6:1 B6:1 G#6:2  F#6:2 D#6:1 B5:1  B5:1 D#6:1 F#6:2')
    s.melody('trumpet', 8, mel_a, vel=90)
    s.melody('trumpet', 16, mel_b, vel=92)
    s.melody('trumpet', 24, mel_a, vel=96)
    s.melody('strings', 24, mel_a, vel=76, shift=-12)
    return s, len(prog)


def boss_moon():
    """The battle of the Observatory (the Stargazer and the Eclipse Regent): B minor at 156. Harp and strings in
    running sixteenths like a machine of rings, choir and brass above, a trumpet tune that soars."""
    s = Song('boss_moon', 156, seed=45)
    s.track('strings', STRINGS, vol=96, pan=58, reverb=70)
    s.track('violin', VIOLIN, vol=88, pan=76, reverb=70)
    s.track('low', CELLO, vol=100, pan=48, reverb=50)
    s.track('bass', CONTRABASS, vol=90, pan=60, reverb=45)
    s.track('harp', HARP, vol=92, pan=40, reverb=80)
    s.track('celesta', CELESTA, vol=70, pan=86, reverb=95)
    s.track('horn', HORN, vol=90, pan=44, reverb=75)
    s.track('trumpet', TRUMPET, vol=94, pan=76, reverb=78)
    s.track('timpani', TIMPANI, vol=104, pan=64, reverb=55)
    s.track('taiko', TAIKO, vol=92, pan=64, reverb=55)
    s.track('choir', CHOIR, vol=90, pan=64, reverb=98)
    A = ['Bm', 'G', 'D', 'A', 'Bm', 'G', 'Em', 'F#7']
    B = ['G', 'D', 'Em', 'Bm', 'G', 'D', 'F#7', 'F#7']
    prog = A + A + B + A
    for b, c in enumerate(prog):
        s.arp('strings', b, c, [0, 1, 2, 3, 2, 1, 2, 3], step=0.25, low=50, vel=60, dur=0.22, accent=12)
        s.arp('harp', b, c, [0, 2, 4, 5, 4, 2, 4, 5], step=0.5, low=50, vel=62, dur=0.6)
        s.bass('low', b, c, low=35, rhythm=tuple((k * 0.5, 0.4) for k in range(8)), vel=68)
        s.bass('bass', b, c, low=23, rhythm=((0, 1.9), (2, 1.9)), vel=74)
        s.hits('timpani', b, bass_note(c, 35), (0, 1.5, 2), dur=0.5, vel=96)
        s.hits('taiko', b, 50, (1, 3, 3.5), dur=0.3, vel=76)
        for p in tones(c, 59, 3):
            s.note('choir', s.bar(b), 3.9, p, 62 if b < 16 else 78)
        if b % 2 == 1:
            s.arp('celesta', b, c, [4, 5, 6, 5], step=0.5, low=72, vel=42, dur=0.5)
        if b >= 8:
            for p in tones(c, 52, 3):
                s.note('horn', s.bar(b), 1.8, p, 78)
                s.note('horn', s.bar(b) + 2, 1.8, p, 74)
    mel_a = ('B5:1 D6:1 F#6:2  G6:1.5 F#6:0.5 D6:2  A5:1 D6:1 F#6:2  E6:1.5 C#6:0.5 A5:2  '
             'D6:1 F#6:1 B6:2  A6:1.5 G6:0.5 D6:2  E6:1 G6:1 B6:2  A#6:1 C#7:1 F#6:2')
    mel_b = ('G5:2 B5:1 D6:1  F#6:2 A6:2  G6:1.5 F#6:0.5 E6:2  D6:2 B5:2  '
             'B5:1 D6:1 G6:2  F#6:2 E6:1 D6:1  C#6:1 E6:1 A#5:2  F#5:1 A#5:1 C#6:2')
    s.melody('trumpet', 8, mel_a, vel=90)
    s.melody('violin', 8, mel_a, vel=70)
    s.melody('trumpet', 16, mel_b, vel=94)
    s.melody('violin', 16, mel_b, vel=72, shift=12)
    s.melody('trumpet', 24, mel_a, vel=98)
    s.melody('violin', 24, mel_a, vel=76, shift=12)
    return s, len(prog)


def ending():
    """The ending: D major, unhurried and warm. The overture's theme comes back in the horn, the strings and the
    choir, now in the major; the harp and flute close it."""
    s = Song('ending', 66, seed=46)
    s.track('strings', STRINGS, vol=86, pan=60, reverb=88)
    s.track('violin', VIOLIN, vol=86, pan=74, reverb=88)
    s.track('cello', CELLO, vol=92, pan=50, reverb=75)
    s.track('bass', CONTRABASS, vol=80, pan=58, reverb=55)
    s.track('harp', HARP, vol=88, pan=44, reverb=92)
    s.track('horn', HORN, vol=96, pan=40, reverb=88)
    s.track('trumpet', TRUMPET, vol=80, pan=76, reverb=85)
    s.track('flute', FLUTE, vol=82, pan=84, reverb=92)
    s.track('timpani', TIMPANI, vol=92, pan=64, reverb=70)
    s.track('choir', CHOIR, vol=88, pan=64, reverb=100)
    A = ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A']
    B = ['Bm', 'F#m', 'G', 'D', 'Em', 'A', 'D', 'D']
    prog = A + B + A
    for b, c in enumerate(prog):
        s.pad('strings', b, c, low=50, count=4, vel=54 if b < 16 else 70)
        s.arp('harp', b, c, [0, 2, 1, 3, 2, 4, 3, 2], step=0.5, low=50, vel=54, dur=1.3)
        s.bass('cello', b, c, low=38, rhythm=((0, 2), (2, 2)), vel=70)
        s.bass('bass', b, c, low=26, rhythm=((0, 3.9),), vel=64)
        if b >= 8:
            s.pad('choir', b, c, low=57, count=3, vel=50 if b < 16 else 72)
            s.hits('timpani', b, bass_note(c, 38), (0, 2), dur=0.8, vel=74)
    th_a = 'D5:2 F#5:1 A5:1  G5:1.5 F#5:0.5 E5:2  D5:1 F#5:1 B5:2  A5:1.5 G5:0.5 D5:2  D5:1 F#5:1 A5:1 D6:1  C#6:2 A5:2  B5:1.5 A5:0.5 G5:2  E5:1 G5:1 C#6:2'
    th_b = 'D6:2 B5:1 F#5:1  C#6:1.5 A5:0.5 F#5:2  D6:1 B5:1 G5:2  F#5:2 A5:2  G5:1 B5:1 E6:2  E6:2 C#6:1 A5:1  D6:1 F#6:1 A6:2  D6:4'
    s.melody('horn', 0, th_a, vel=86)
    s.melody('violin', 8, th_b, vel=84)
    s.melody('horn', 8, th_b, vel=76, shift=-12)
    s.melody('violin', 16, th_a, vel=90, shift=12)
    s.melody('horn', 16, th_a, vel=92)
    s.melody('flute', 16, th_a, vel=62, shift=12)
    return s, len(prog)


PIECES = [overture, hushvale, crossroads, spore, moss, aqueduct, crystal, webbed, throne, foundry, frost, ember, storm, mirror, ossuary, lunar, boss, boss_bone, boss_moon, king, ending]

if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else 'build'
    os.makedirs(out, exist_ok=True)
    loops = {}
    for fn in PIECES:
        song, bars = fn()
        seconds = song.save(os.path.join(out, song.name + '.mid'), bars)
        loops[song.name] = round(seconds, 4)
        print('%-10s %3d bars  %5.1f s  %d tracks' % (song.name, bars, seconds, len(song.tracks)))
    with open(os.path.join(out, 'loops.json'), 'w') as f:
        json.dump(loops, f, indent=1)
