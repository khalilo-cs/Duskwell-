#!/usr/bin/env python3
"""Voices of the creatures and the bosses, made here (nothing recorded, nothing borrowed):
  every creature gets its own voice built by synthesis from its kind of body (a growl, a chitter, a shriek, a clank, a chime,
  a gurgle, a hiss), its own pitch and roughness: three sounds each, audio/voices/<kind>_idle|hurt|die.mp3;
  every boss speaks: its lines (BOSS_LINES) are spoken by espeak-ng in Arabic and then made into the boss's own voice
  (pitched, doubled, roughened, given a hall), audio/voices/boss_<key>_<n>.mp3, listed with their text in js/voices_meta.js.
needs: numpy, sox, lame, espeak-ng"""
import json, os, subprocess, tempfile, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
OUT = os.path.join(ROOT, 'audio', 'voices'); R = 44100

# kind: (body, base pitch Hz, roughness 0..1, length factor)
KINDS = {
    'husk': ('growl', 110, 0.5, 1), 'crawler': ('chitter', 900, 0.4, 0.8), 'flyer': ('buzz', 220, 0.3, 0.9), 'hopper': ('croak', 160, 0.5, 0.9),
    'spitter': ('gurgle', 140, 0.6, 1), 'shard': ('chime', 880, 0.1, 0.9), 'sentinel': ('clank', 90, 0.3, 1), 'diver': ('shriek', 1300, 0.3, 0.8),
    'spider': ('chitter', 1300, 0.5, 0.7), 'shroom': ('puff', 300, 0.2, 0.9), 'jelly': ('gurgle', 420, 0.2, 0.9), 'warden': ('growl', 70, 0.7, 1.3),
    'ram': ('bellow', 95, 0.6, 1.1), 'mole': ('snuffle', 260, 0.4, 0.8), 'lavaworm': ('hiss', 180, 0.7, 1.1), 'imp': ('cackle', 520, 0.4, 0.8),
    'veil': ('wail', 600, 0.1, 1.3), 'roller': ('clank', 150, 0.4, 0.9), 'slime': ('gurgle', 220, 0.3, 0.8), 'chainman': ('growl', 80, 0.6, 1.2),
    'moth': ('buzz', 330, 0.2, 0.8), 'icicle': ('chime', 1400, 0.1, 0.7), 'heap': ('bellow', 70, 0.8, 1.2), 'skullbat': ('shriek', 1700, 0.4, 0.7),
    'censer': ('wail', 380, 0.4, 1.1), 'lensling': ('chime', 1100, 0.2, 0.8), 'orrery': ('clank', 300, 0.2, 1), 'lunarhare': ('squeak', 1500, 0.2, 0.6),
    'gloomhound': ('growl', 130, 0.6, 1), 'thornback': ('chitter', 700, 0.6, 0.9), 'cinderling': ('croak', 120, 0.7, 1), 'frostwisp': ('chime', 1250, 0.15, 0.8),
    'glasscrab': ('chitter', 1100, 0.3, 0.8), 'bonejackal': ('growl', 160, 0.7, 0.9), 'gearmite': ('clank', 420, 0.3, 0.7), 'stormkite': ('shriek', 1500, 0.3, 0.8),
}
# key: (voice pitch in cents, speed, extra effects), lines: intro, at half health, at its fall (Arabic text, English subtitle)
BOSSES = {
    'guardian': (-700, 120, 'deep'), 'weaver': (300, 150, 'whisper'), 'wraith': (500, 140, 'echo'), 'king': (-500, 115, 'deep'),
    'spore': (-200, 130, 'wet'), 'drowned': (-800, 110, 'wet'), 'brood': (200, 150, 'whisper'), 'queen': (400, 135, 'echo'),
    'colossus': (-900, 105, 'fire'), 'thunderhoof': (-600, 125, 'deep'), 'roc': (200, 160, 'echo'), 'duelist': (0, 160, 'echo'),
    'twin': (100, 155, 'echo'), 'bonewright': (-400, 125, 'deep'), 'marrow': (-900, 110, 'fire'), 'stargazer': (300, 130, 'echo'),
    'regent': (-300, 120, 'deep'),
}
BOSS_LINES = {
    'guardian': [('من يوقظ الحجر؟ عُد من حيث جئت.', 'Who wakes the stone? Go back the way you came.'), ('الحجر لا يُكسر بهذه السهولة.', 'Stone does not break so easily.'), ('سقط الحارس... فاعبر.', 'The guardian falls... pass, then.')],
    'weaver': [('دخلتَ شبكتي، ولن تخرج منها.', 'You walked into my web. You will not walk out.'), ('كل خيط تقطعه أنسج غيره.', 'Every thread you cut, I weave again.'), ('انقطع... آخر الخيوط.', 'The last thread... breaks.')],
    'wraith': [('البلّور يتذكّر كل من مات هنا.', 'The crystal remembers all who died here.'), ('انظر إلى انعكاسك... إنه يرتجف.', 'Look at your reflection... it trembles.'), ('أعدني... إلى الضوء.', 'Return me... to the light.')],
    'king': [('ركعتْ لي الممالك. وستركع أنت.', 'Kingdoms knelt before me. So will you.'), ('التاج أثقل من أن تنتزعه.', 'The crown is too heavy for you to take.'), ('العرش... فارغ من جديد.', 'The throne... is empty again.')],
    'spore': [('تنفّس عميقاً، يا صغيري.', 'Breathe deep, little one.'), ('أبنائي ينبتون من كل جرح.', 'My children grow from every wound.'), ('تتناثر البذور... ولا تموت.', 'The spores scatter... they never die.')],
    'drowned': [('الماء أخذ كل شيء. والآن يأخذك.', 'The water took everything. Now it takes you.'), ('اغرق معي.', 'Drown with me.'), ('أخيراً... أطفو.', 'At last... I float.')],
    'brood': [('لا تدُس على صغاري.', 'Do not tread on my young.'), ('اخرجوا يا أولادي، كلوا!', 'Come out, my children, feast!'), ('العشّ... صامت.', 'The nest... falls silent.')],
    'queen': [('في مملكتي يتجمّد كل شيء.', 'In my realm, everything freezes.'), ('سيتوقّف قلبك من البرد.', 'Your heart will stop from the cold.'), ('يذوب... الشتاء.', 'The winter... melts.')],
    'colossus': [('أنا الجمر الذي لا ينطفئ!', 'I am the ember that never dies!'), ('احترق!', 'Burn!'), ('رماد... كله رماد.', 'Ash... all of it ash.')],
    'thunderhoof': [('أسمع خطاك من بعيد، أيها الضئيل.', 'I hear your steps from afar, little one.'), ('الرعد لا يرحم!', 'The thunder shows no mercy!'), ('سكتت العاصفة.', 'The storm is quiet.')],
    'roc': [('السماء لي وحدي!', 'The sky is mine alone!'), ('سأحملك وأسقطك!', 'I will carry you up and let you fall!'), ('تتكسّر الأجنحة...', 'The wings... break.')],
    'duelist': [('ارفع سلاحك. لنرَ من الأسرع.', 'Raise your blade. Let us see who is faster.'), ('حركة جيدة... لكنها لا تكفي.', 'A fine move... but not enough.'), ('هُزمت... بشرف.', 'Beaten... with honour.')],
    'twin': [('أنا أنت... لكن بلا رحمة.', 'I am you... without mercy.'), ('كل ضربة منك أعرفها.', 'I know every blow you strike.'), ('ظلّك... يتلاشى.', 'Your shadow... fades.')],
    'bonewright': [('عظامك ستكون تحفتي القادمة.', 'Your bones will be my next masterpiece.'), ('أنحت... وأنحت!', 'I carve... and carve!'), ('انكسر الإزميل.', 'The chisel... breaks.')],
    'marrow': [('أنا ملك هذه المقبرة!', 'I am the lord of this ossuary!'), ('النخاع يناديني!', 'The marrow calls to me!'), ('عودوا... إلى التراب.', 'Return... to the dust.')],
    'stargazer': [('النجوم كتبت نهايتك.', 'The stars have written your end.'), ('انظر إلى السماء تسقط!', 'Watch the sky fall!'), ('انطفأت... النجوم.', 'The stars... go out.')],
    'regent': [('حين يغيب القمر، يحكم الظلام.', 'When the moon is gone, darkness rules.'), ('الكسوف قد بدأ!', 'The eclipse has begun!'), ('يعود... الضوء.', 'The light... returns.')],
}


def sh(*a): subprocess.run(a, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def save(sig, path):
    sig = np.clip(sig / (np.abs(sig).max() + 1e-9) * 0.9, -1, 1)
    tmp = path + '.wav'
    with wave.open(tmp, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(R); w.writeframes((sig * 32767).astype(np.int16).tobytes())
    sh('lame', '--quiet', '-V', '5', tmp, path); os.remove(tmp)


def env(n, a=0.02, r=0.3):
    t = np.linspace(0, 1, n); e = np.minimum(1, t / max(a, 1e-3)) * np.exp(-t / r); return e


def voice(body, f0, rough, dur, contour, rng):
    """one call of a creature: a source shaped by its body, its pitch moving along contour (start, end factors)"""
    n = int(R * dur); t = np.arange(n) / R
    f = f0 * np.interp(np.linspace(0, 1, n), [0, 0.3, 1], [contour[0], (contour[0] + contour[1]) / 2 * 1.05, contour[1]])
    f = f * (1 + 0.04 * np.sin(2 * np.pi * (5 + rng.random() * 4) * t))                 # a little vibrato
    ph = 2 * np.cumsum(np.pi * f / R)
    noise = rng.standard_normal(n)
    if body in ('growl', 'bellow', 'croak'):
        src = np.sign(np.sin(ph)) * 0.5 + np.sin(ph * 2) * 0.3 + np.sin(ph * 3) * 0.2
        am = 1 + rough * 0.8 * np.sign(np.sin(2 * np.pi * (28 if body == 'growl' else 18) * t))   # the rattle of the throat
        sig = src * am + noise * rough * 0.35
    elif body in ('chitter', 'squeak'):
        pulses = (np.sin(2 * np.pi * (34 if body == 'chitter' else 12) * t) > 0.6).astype(float)
        sig = np.sin(ph) * pulses + noise * 0.25 * pulses
    elif body in ('shriek', 'wail'):
        sig = np.sin(ph) + 0.5 * np.sin(ph * 2.01) + 0.25 * np.sin(ph * 3.02) + noise * rough * 0.2
    elif body == 'buzz':
        sig = np.sign(np.sin(ph)) * (1 + 0.5 * np.sin(2 * np.pi * 90 * t)) + noise * 0.1
    elif body == 'chime':
        sig = sum(np.sin(ph * k) * np.exp(-t * (2 + k * 1.5)) / k for k in (1, 2.76, 5.4, 8.9))
    elif body == 'clank':
        sig = sum(np.sin(ph * k) * np.exp(-t * (6 + k)) for k in (1, 1.47, 2.09, 3.3)) + noise * np.exp(-t * 30) * 0.8
    elif body in ('gurgle', 'puff'):
        bub = np.sin(2 * np.pi * (f * (1 + 0.6 * np.sin(2 * np.pi * 11 * t))) * t)
        sig = bub * (np.sin(2 * np.pi * 7 * t) > -0.2) + noise * (0.6 if body == 'puff' else 0.2)
    elif body in ('hiss', 'snuffle', 'cackle'):
        sig = noise * (1 if body == 'hiss' else (np.sin(2 * np.pi * (9 if body == 'snuffle' else 14) * t) > 0)) + np.sin(ph) * 0.5
    else:
        sig = np.sin(ph)
    return sig * env(n, 0.03, 0.35 if body not in ('chime', 'clank') else 0.6)


def sox_fx(path, *fx):
    tmp = path + '.fx.wav'; sh('sox', path, tmp, *fx); os.replace(tmp, path)


def creatures():
    made = {}
    for k, (body, f0, rough, L) in KINDS.items():
        rng = np.random.default_rng(abs(hash(k)) % (2 ** 32))
        for name, dur, cont in (('idle', 0.7, (1.0, 0.9)), ('hurt', 0.32, (1.5, 1.1)), ('die', 1.1, (1.2, 0.45))):
            sig = voice(body, f0 * (0.95 + 0.1 * rng.random()), rough, dur * L, cont, rng)
            p = os.path.join(OUT, '%s_%s.mp3' % (k, name)); w = p + '.wav'
            with wave.open(w, 'wb') as fw: fw.setnchannels(1); fw.setsampwidth(2); fw.setframerate(R); fw.writeframes((np.clip(sig / (np.abs(sig).max() + 1e-9) * 0.8, -1, 1) * 32767).astype(np.int16).tobytes())
            sox_fx(w, 'highpass', '60', 'lowpass', '7500', 'reverb', '30', '50', '60', 'norm', '-2')
            sh('lame', '--quiet', '-V', '6', w, p); os.remove(w)
        made[k] = 1
    return made


def bosses():
    meta = {}
    for key, lines in BOSS_LINES.items():
        cents, speed, style = BOSSES[key]; meta[key] = []
        for i, (ar, en) in enumerate(lines):
            w = os.path.join(OUT, 'boss_%s_%d.wav' % (key, i)); p = w[:-4] + '.mp3'
            sh('espeak-ng', '-v', 'ar', '-s', str(speed), '-p', '30', '-w', w, ar)
            fx = ['pitch', str(cents), 'tempo', '0.92']
            fx += {'deep': ['overdrive', '6', 'bass', '+8', 'reverb', '60', '50', '90'], 'whisper': ['highpass', '400', 'chorus', '0.6', '0.8', '40', '0.4', '0.3', '2', '-t', 'reverb', '50'],
                   'echo': ['echo', '0.8', '0.7', '120', '0.35', 'reverb', '70'], 'wet': ['phaser', '0.8', '0.74', '3', '0.4', '0.5', '-t', 'reverb', '60'],
                   'fire': ['overdrive', '14', 'bass', '+10', 'reverb', '50']}[style]
            fx += ['norm', '-1']
            sox_fx(w, *fx); sh('lame', '--quiet', '-V', '5', w, p); os.remove(w)
            meta[key].append({'ar': ar, 'en': en})
    return meta


def main():
    os.makedirs(OUT, exist_ok=True)
    c = creatures(); b = bosses()
    open(os.path.join(ROOT, 'js', 'voices_meta.js'), 'w').write("'use strict';\n// made by tools/audio/voices.py: the creatures with a voice of their own (audio/voices/<kind>_idle|hurt|die.mp3) and\n// the bosses' spoken lines (audio/voices/boss_<key>_<n>.mp3: 0 when it rises, 1 at half health, 2 at its fall)\n"
        "const VOICES = " + json.dumps({'creatures': sorted(c), 'bosses': b}, ensure_ascii=False) + ";\n")
    print(len(c), 'creatures,', len(b), 'bosses')


if __name__ == '__main__':
    main()
