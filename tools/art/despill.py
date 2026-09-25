import sys
import numpy as np
from PIL import Image
# Magenta despill for keyed arena pieces / sheets (run locally after the saver).
# Pixels that are still magenta go transparent; magenta-tinted fringe (the key
# bleeding into the ink outline) is pulled to the ink colour. Re-quantizes to PNG-8.
# usage: despill.py <png> [<png> ...]
INK = np.array([43, 38, 32], dtype=np.uint8)
for path in sys.argv[1:]:
    im = Image.open(path).convert('RGBA'); a = np.array(im).astype(int)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    mag = np.minimum(r, b) - g                     # how magenta a pixel is
    solid = (al > 0) & (mag > 70) & (r > 120)      # still-keyed pixels -> clear
    fringe = (al > 0) & ~solid & (mag > 28)         # purple-tinted outline -> ink
    out = a.copy()
    out[solid, 3] = 0
    out[fringe, :3] = INK
    q = Image.fromarray(out.astype(np.uint8)).quantize(colors=64, method=Image.Quantize.FASTOCTREE)
    q.save(path, 'PNG', optimize=True)
    print(path, 'cleared', int(solid.sum()), 'inked', int(fringe.sum()), Image.open(path).size)
