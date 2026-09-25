import sys
import numpy as np
from PIL import Image
# Per-cell clean-up for a sprite sheet: keeps the biggest connected blob in each
# cell (plus anything within `pad` px of it) and clears stray fragments that a
# neighbouring frame spilled across the cell boundary. Re-quantizes to PNG-8.
# usage: declutter.py <sheet.png> <cell=64> [pad=2]
path = sys.argv[1]; cell = int(sys.argv[2]) if len(sys.argv) > 2 else 64; pad = int(sys.argv[3]) if len(sys.argv) > 3 else 2
im = Image.open(path).convert('RGBA'); a = np.array(im); al = a[..., 3] > 0
H, W = al.shape; cleared = 0
def label(mask):
    lab = np.zeros(mask.shape, int); n = 0
    for y, x in zip(*np.where(mask)):
        if lab[y, x]: continue
        n += 1; stack = [(y, x)]; lab[y, x] = n
        while stack:
            cy, cx = stack.pop()
            for ny, nx in ((cy-1,cx),(cy+1,cx),(cy,cx-1),(cy,cx+1)):
                if 0 <= ny < mask.shape[0] and 0 <= nx < mask.shape[1] and mask[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = n; stack.append((ny, nx))
    return lab, n
for c in range(W // cell):
    sub = al[:, c*cell:(c+1)*cell]; lab, n = label(sub)
    if n < 2: continue
    sizes = [(lab == i).sum() for i in range(1, n + 1)]; big = 1 + int(np.argmax(sizes))
    keep = lab == big
    ys, xs = np.where(keep); y0, y1, x0, x1 = ys.min()-pad, ys.max()+pad, xs.min()-pad, xs.max()+pad
    for i in range(1, n + 1):
        if i == big: continue
        yy, xx = np.where(lab == i)
        if yy.min() >= y0 and yy.max() <= y1 and xx.min() >= x0 and xx.max() <= x1: continue   # inside the body box (an eye, a gap)
        a[:, c*cell:(c+1)*cell][lab == i] = 0; cleared += int((lab == i).sum())
Image.fromarray(a).quantize(colors=24, method=Image.Quantize.FASTOCTREE).save(path, 'PNG', optimize=True)
print(path, 'cleared', cleared, 'px')
