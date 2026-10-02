# Minimal Aseprite reader used by build_sprites.py (RGBA, indexed and grayscale; raw, linked and zlib cels; tags).
# Minimal Aseprite (.ase/.aseprite) reader: layers, cels (raw/zlib), palette, tags -> PNG frames.
import struct, zlib, sys, os
from PIL import Image

def read(path):
    d = open(path, 'rb').read()
    size, magic, nframes, W, H, depth, flags, speed = struct.unpack_from('<IHHHHHIH', d, 0)
    assert magic == 0xA5E0, hex(magic)
    transp = d[28]
    pos = 128
    layers, palette, tags, frames = [], {}, [], []
    for fi in range(nframes):
        fsize, fmagic, oldchunks, dur = struct.unpack_from('<IHHH', d, pos)
        newchunks = struct.unpack_from('<I', d, pos + 12)[0]
        n = newchunks or oldchunks
        p = pos + 16
        cels = []
        for _ in range(n):
            csize, ctype = struct.unpack_from('<IH', d, p)
            body = d[p + 6:p + csize]
            if ctype == 0x2004:
                lflags, ltype, child, _, _, blend, opacity = struct.unpack_from('<HHHHHHB', body, 0)
                nl = struct.unpack_from('<H', body, 16)[0]
                layers.append({'name': body[18:18 + nl].decode('utf8', 'replace'), 'visible': lflags & 1, 'opacity': opacity})
            elif ctype == 0x2005:
                li, x, y, op, ct = struct.unpack_from('<HhhBH', body, 0)
                rest = body[16:]
                if ct in (0, 2):
                    w, h = struct.unpack_from('<HH', rest, 0)
                    px = rest[4:] if ct == 0 else zlib.decompress(rest[4:])
                    cels.append({'layer': li, 'x': x, 'y': y, 'op': op, 'w': w, 'h': h, 'px': px})
                elif ct == 1:
                    cels.append({'layer': li, 'link': struct.unpack_from('<H', rest, 0)[0], 'x': x, 'y': y, 'op': op})
            elif ctype == 0x2019:
                psize, first, last = struct.unpack_from('<III', body, 0)
                q = 20
                for i in range(first, last + 1):
                    eflags, r, g, b, a = struct.unpack_from('<HBBBB', body, q); q += 6
                    if eflags & 1:
                        nn = struct.unpack_from('<H', body, q)[0]; q += 2 + nn
                    palette[i] = (r, g, b, a)
            elif ctype == 0x0004 and not palette:
                pass
            elif ctype == 0x2018:
                nt = struct.unpack_from('<H', body, 0)[0]; q = 10
                for _ in range(nt):
                    f0, f1, direction = struct.unpack_from('<HHB', body, q); q += 17
                    nn = struct.unpack_from('<H', body, q)[0]
                    tags.append({'from': f0, 'to': f1, 'dir': direction, 'name': body[q + 2:q + 2 + nn].decode('utf8', 'replace')}); q += 2 + nn
            p += csize
        frames.append({'dur': dur, 'cels': cels})
        pos += fsize
    return {'w': W, 'h': H, 'depth': depth, 'transp': transp, 'layers': layers, 'palette': palette, 'tags': tags, 'frames': frames}

def render(a, fi):
    img = Image.new('RGBA', (a['w'], a['h']), (0, 0, 0, 0))
    for c in a['frames'][fi]['cels']:
        if 'link' in c: c = next(x for x in a['frames'][c['link']]['cels'] if x['layer'] == c['layer'])
        L = a['layers'][c['layer']]
        if not L['visible']: continue
        bpp = a['depth'] // 8
        if a['depth'] == 32: cel = Image.frombytes('RGBA', (c['w'], c['h']), c['px'])
        elif a['depth'] == 8:
            cel = Image.new('RGBA', (c['w'], c['h']))
            cel.putdata([(0, 0, 0, 0) if i == a['transp'] else a['palette'].get(i, (0, 0, 0, 255)) for i in c['px']])
        else:
            raw = c['px']; cel = Image.new('RGBA', (c['w'], c['h']))
            cel.putdata([(raw[i], raw[i], raw[i], raw[i + 1]) for i in range(0, len(raw), 2)])
        img.alpha_composite(cel, (max(0, c['x']), max(0, c['y'])) if c['x'] >= 0 and c['y'] >= 0 else (0, 0))
    return img

if __name__ == "__main__" and False:
    for path in sys.argv[1:]:
        a = read(path)
        print(path, a['w'], 'x', a['h'], 'depth', a['depth'], 'frames', len(a['frames']), 'layers', [l['name'] for l in a['layers']], 'tags', [(t['name'], t['from'], t['to']) for t in a['tags']], 'durations', [f['dur'] for f in a['frames']])
        out = os.path.splitext(path)[0]
        strip = Image.new('RGBA', (a['w'] * len(a['frames']), a['h']))
        for i in range(len(a['frames'])):
            strip.paste(render(a, i), (i * a['w'], 0))
        strip.save(out + '_strip.png')
