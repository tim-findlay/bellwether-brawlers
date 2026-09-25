import sys, io, base64, hashlib
# Sprite strip -> sheet: key out the magenta, split N frames, scale to a 64px cell, PNG-8, print META + lines.
# usage: sheet.py <strip.png> <frames> 64 <heightFrac 0.95|0.98> 24 <metaName>
import numpy as np
from PIL import Image
path, n, cell, hf, colors = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), float(sys.argv[4]), int(sys.argv[5])
im = Image.open(path).convert('RGB'); a = np.array(im).astype(int); H, W = a.shape[:2]
edge = np.concatenate([a[:3].reshape(-1,3), a[-3:].reshape(-1,3), a[:,:3].reshape(-1,3), a[:,-3:].reshape(-1,3)])
key = np.median(edge, axis=0)
d = np.sqrt(((a - key) ** 2).sum(-1)); mask = d > 70
cols = mask.any(0)
runs = []; start = None
for x, c in enumerate(cols):
    if c and start is None: start = x
    if not c and start is not None: runs.append([start, x]); start = None
if start is not None: runs.append([start, W])
merged = [list(r) for r in runs if r[1] - r[0] > 6]
while len(merged) > n:
    gaps = [merged[i + 1][0] - merged[i][1] for i in range(len(merged) - 1)]
    i = gaps.index(min(gaps)); merged[i][1] = merged[i + 1][1]; del merged[i + 1]
if len(merged) != n:
    x0, x1 = merged[0][0], merged[-1][1]
    step = (x1 - x0) / n; merged = [[int(x0 + i * step), int(x0 + (i + 1) * step)] for i in range(n)]
    print('WARN equal-split', len(runs), file=sys.stderr)
def runs_of(v):
    out = []; st = None
    for i, c in enumerate(v):
        if c and st is None: st = i
        if not c and st is not None: out.append([st, i]); st = None
    if st is not None: out.append([st, len(v)])
    return out
def biggest(v, weights, gap=10):
    rs = runs_of(v); m = []
    for r in rs:
        if m and r[0] - m[-1][1] <= gap: m[-1][1] = r[1]
        else: m.append(list(r))
    return max(m, key=lambda r: weights[r[0]:r[1]].sum())
frames = []
for x0, x1 in merged:
    sub = mask[:, x0:x1]
    xa, xb = biggest(sub.any(0), sub.sum(0))
    sub2 = sub[:, xa:xb]
    ya, yb = biggest(sub2.any(1), sub2.sum(1))
    sub3 = sub2[ya:yb]; xs = np.where(sub3.any(0))[0]
    frames.append((x0 + xa + xs.min(), ya, x0 + xa + xs.max() + 1, yb))
hmax = max(f[3] - f[1] for f in frames)
s = (cell * hf) / hmax
rgba = np.dstack([a.astype(np.uint8), (mask * 255).astype(np.uint8)])
sheet = Image.new('RGBA', (cell * n, cell), (0, 0, 0, 0))
for i, (x0, y0, x1, y1) in enumerate(frames):
    fr = Image.fromarray(rgba[y0:y1, x0:x1]); w, h = fr.size
    nw, nh = max(1, round(w * s)), max(1, round(h * s))
    fr = fr.resize((nw, nh), Image.NEAREST)
    sheet.paste(fr, (i * cell + (cell - nw) // 2, cell - nh), fr)
q = sheet.quantize(colors=colors, method=Image.Quantize.FASTOCTREE)
b = io.BytesIO(); q.save(b, 'PNG', optimize=True); data = b.getvalue()
print('META', sys.argv[6], len(data), hashlib.sha256(data).hexdigest(), [int(f[3]-f[1]) for f in frames])
b64 = base64.b64encode(data).decode()
for i in range(0, len(b64), 400):
    chunk = b64[i:i+400]; print('L%02d %s %s' % (i // 400, hashlib.sha1(chunk.encode()).hexdigest()[:6], chunk))