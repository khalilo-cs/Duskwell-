# The app icon and the store pictures, made from the title banner (the cover) alone.
#   python3 tools/paint/make_icon.py [outdir]
# Adaptive icon (432x432 layers, every launcher shows only the middle 288 of them): ic_bg.png is the cover laid across the square with
# the whole title inside that middle part, and ic_fg.png is an empty layer (the adaptive icon format wants one).
# The store icon (512) is the same square; the feature picture (1024x500) is the cover cut to that shape.
import os, sys
import numpy as np
from PIL import Image, ImageFilter

root = os.path.join(os.path.dirname(__file__), '..', '..')
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, '..', 'duskwell-android')
banner = Image.open(os.path.join(root, 'art/source/title_hd/title_banner.png')).convert('RGB')
W, H = banner.size

def square(size, wide=1.5):
    # the banner scaled to `wide` times the square's width and cut to the middle: its own top and bottom rows, stretched and blurred,
    # fill the sky above and the mist below, and the band's edges are feathered into them
    sw = int(size * wide); sh = int(H * sw / W)
    base = banner.resize((sw, sh), Image.LANCZOS); bx = (sw - size) // 2
    band = base.crop((bx, 0, bx + size, sh))
    topc = band.crop((0, 0, size, 6)).resize((size, size), Image.BILINEAR).filter(ImageFilter.GaussianBlur(size * 0.03))
    botc = band.crop((0, sh - 6, size, sh)).resize((size, size), Image.BILINEAR).filter(ImageFilter.GaussianBlur(size * 0.03))
    ta, ba = np.asarray(topc).astype(float), np.asarray(botc).astype(float)
    yy = np.linspace(0, 1, size)[:, None, None]
    fill = (ta * (1 - yy) + ba * yy) * (0.75 - 0.35 * np.abs(yy - 0.5) * 2) * 0.9      # sky colour above, mist colour below, darker at the edges
    im = Image.fromarray(fill.clip(0, 255).astype('uint8'))
    m = np.ones((sh, size)); f = max(8, int(sh * 0.14)); ramp = np.linspace(0, 1, f)
    m[:f, :] *= ramp[:, None]; m[-f:, :] *= ramp[::-1][:, None]
    im.paste(band, (0, (size - sh) // 2), Image.fromarray((m * 255).astype('uint8')))
    return im

def save(im, rel):
    p = os.path.join(out, rel); os.makedirs(os.path.dirname(p), exist_ok=True); im.save(p); print(rel, im.size)

res = 'app/src/main/res/drawable-nodpi/'
save(square(432), res + 'ic_bg.png')
save(Image.new('RGBA', (432, 432), (0, 0, 0, 0)), res + 'ic_fg.png')
save(square(512).convert('RGBA'), 'store/icon-512.png')
fw = banner.resize((1024, int(H * 1024 / W)), Image.LANCZOS)
top = (fw.size[1] - 500) // 2
save(fw.crop((0, top, 1024, top + 500)), 'store/feature-1024x500.png')
