#!/usr/bin/env python3
"""Builds the one-page web version of the game (for publishing as an Artifact, which wraps the page in its own skeleton): index.html with
every script from js/ put inline, the fonts' stylesheet link and the page's style and markup kept. The pictures and the sounds stay
files next to the page (art/ without art/source, and audio/), listed by --list.
  python3 tools/build_web.py out/index.html         the page, without the <html>/<head>/<body> wrapper (what the Artifact tool wants)
  python3 tools/build_web.py out/index.html --wrap  the same inside a plain document (to open it from a folder with art/ and audio/ beside it)
  python3 tools/build_web.py --list                 the files the page needs, one per line"""
import os, re, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

def files():
    out = []
    for top in ('art', 'audio'):
        for d, ds, fs in os.walk(os.path.join(ROOT, top)):
            ds[:] = [x for x in ds if not (top == 'art' and os.path.relpath(os.path.join(d, x), os.path.join(ROOT, 'art')) == 'source')]
            out += [os.path.relpath(os.path.join(d, f), ROOT).replace(os.sep, '/') for f in fs]
    return sorted(out)

def page(wrap):
    s = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    head = re.search(r'<head>(.*?)</head>', s, re.S).group(1); body = re.search(r'<body>(.*?)</body>', s, re.S).group(1)
    style = re.search(r'<style>.*?</style>', head, re.S).group(0)
    fonts = re.search(r'<link href="https://fonts\.googleapis\.com[^>]*>', head).group(0)
    markup = re.sub(r'<script src="[^"]+"></script>\s*', '', body).strip()
    scripts = []
    for src in re.findall(r'<script src="([^"]+)"></script>', body):
        code = open(os.path.join(ROOT, src), encoding='utf-8').read()
        assert '</script' not in code.lower(), src + ' contains a closing script tag'
        scripts.append('<script>\n' + code.rstrip() + '\n</script>')
    inner = '<title>أرض الغسق</title>\n' + fonts + '\n' + style + '\n' + markup + '\n' + '\n'.join(scripts) + '\n'
    return ('<!doctype html><html lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>\n' + inner + '</body></html>\n') if wrap else inner

if __name__ == '__main__':
    if '--list' in sys.argv: print('\n'.join(files()))
    else:
        out = sys.argv[1]; os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
        open(out, 'w', encoding='utf-8').write(page('--wrap' in sys.argv))
        print(out, os.path.getsize(out), 'bytes,', len(files()), 'files beside it')
