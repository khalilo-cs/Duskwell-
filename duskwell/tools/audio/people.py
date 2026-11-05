#!/usr/bin/env python3
"""The people speak, each in a voice of its own (espeak-ng Arabic, then pitched, slowed or roughened and given a room):
audio/voices/npc_<type>_<n>.mp3 (n=0 greeting, 1 farewell) and the hero's breaths and cries, audio/voices/hero_<what>.mp3.
The texts are listed in js/people_meta.js. needs espeak-ng, sox, lame"""
import json, os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..'); OUT = os.path.join(ROOT, 'audio', 'voices')
# type: (espeak variant, speed, pitch, sox effects), lines
PEOPLE = {
    'elder': ('ar+m7', 115, 30, ['pitch', '-300', 'reverb', '40'], [('أهلاً بك أيها الهائم... الطريق أمامك طويل.', 'Welcome, wanderer... the road ahead is long.'), ('اذهب بسلام، ولا تنسَ ضوءك.', 'Go in peace, and do not forget your light.')]),
    'merchant': ('ar+m3', 165, 70, ['pitch', '200', 'reverb', '20'], [('تعال، تعال! بضاعة لا مثيل لها!', 'Come, come! Goods like nowhere else!'), ('عُد متى شئت، يا صديقي!', 'Come back any time, my friend!')]),
    'smith': ('ar+m1', 120, 20, ['pitch', '-500', 'overdrive', '4', 'reverb', '30'], [('السلاح الجيد يحتاج ناراً صادقة.', 'A good blade needs an honest fire.'), ('اضرب بقوة، ولا تتردد.', 'Strike hard, and do not hesitate.')]),
    'outfitter': ('ar+f2', 150, 60, ['pitch', '150', 'reverb', '25'], [('عباءة جديدة؟ لديّ ما يناسبك تماماً.', 'A new cloak? I have just the one for you.'), ('اعتنِ بها، فقد خِطتها بيدي.', 'Take care of it, I sewed it by hand.')]),
    'wizard': ('ar+f4', 125, 50, ['pitch', '-100', 'chorus', '0.6', '0.8', '45', '0.4', '0.3', '2', '-t', 'echo', '0.8', '0.6', '160', '0.3', 'reverb', '60'], [('النجوم أخبرتني بقدومك.', 'The stars told me you would come.'), ('اذهب... فالقدر ينتظرك.', 'Go... fate is waiting for you.')]),
    'trader': ('ar+m2', 140, 45, ['pitch', '-150', 'reverb', '30'], [('الطرق خطرة يا رفيق، اشترِ ما يحميك.', 'The roads are dangerous, friend. Buy what keeps you safe.'), ('لعلّنا نلتقي في الطريق مجدداً.', 'Perhaps we meet again on the road.')]),
}
HERO = {'atk0': 'ها', 'atk1': 'هَه', 'atk2': 'يا', 'hurt0': 'آه', 'hurt1': 'أخ', 'jump': 'هُب', 'die': 'آآه', 'heal': 'هممم'}


def sh(*a): subprocess.run(a, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def make(name, variant, speed, pitch, text, fx):
    w = os.path.join(OUT, name + '.wav')
    sh('espeak-ng', '-v', variant, '-s', str(speed), '-p', str(pitch), '-w', w, text)
    t = w + '.f.wav'; sh('sox', w, t, *fx, 'norm', '-2'); os.replace(t, w)
    sh('lame', '--quiet', '-V', '6', w, w[:-4] + '.mp3'); os.remove(w)


def main():
    os.makedirs(OUT, exist_ok=True); meta = {}
    for k, (v, sp, pi, fx, lines) in PEOPLE.items():
        meta[k] = []
        for i, (ar, en) in enumerate(lines): make('npc_%s_%d' % (k, i), v, sp, pi, ar, fx); meta[k].append({'ar': ar, 'en': en})
    for k, txt in HERO.items():                                    # the hero: short, breathy, a young voice kept low
        make('hero_' + k, 'ar+m4', 200, 45, txt, ['pitch', '-200', 'tempo', '1.3', 'highpass', '120', 'reverb', '15', 'fade', '0', '0', '0.05'])
    open(os.path.join(ROOT, 'js', 'people_meta.js'), 'w').write("'use strict';\n// made by tools/audio/people.py: what the people say (audio/voices/npc_<type>_<n>.mp3) and the hero's cries (hero_<what>.mp3)\n"
        "const PEOPLE_LINES = " + json.dumps(meta, ensure_ascii=False) + ";\n")
    print('ok')


if __name__ == '__main__':
    main()
