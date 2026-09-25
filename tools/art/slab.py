import sys, io, base64, hashlib
import numpy as np
from PIL import Image
# Arena piece (<id>-slab.png): key out the magenta, crop, scale to W px wide, PNG-8 with 1-bit alpha,
# print as META + sha-checked base64 lines (same transport as sheet.py / backdrop.py).
# usage: slab.py <src.png> <name> <part> <linesPerPart> [width=512]
src, name, part, L = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]); W = int(sys.argv[5]) if len(sys.argv) > 5 else 512
im = Image.open(src).convert('RGB'); a = np.array(im).astype(int)
edge = np.concatenate([a[:3].reshape(-1,3), a[-3:].reshape(-1,3), a[:,:3].reshape(-1,3), a[:,-3:].reshape(-1,3)])
key = np.median(edge, axis=0); d = np.sqrt(((a - key) ** 2).sum(-1)); mask = d > 60
ys, xs = np.where(mask); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
rgba = np.dstack([a.astype(np.uint8), (mask * 255).astype(np.uint8)])[y0:y1, x0:x1]
fr = Image.fromarray(rgba); h = round(fr.height * W / fr.width)
fr = fr.resize((W, h), Image.LANCZOS)
al = np.array(fr)[:, :, 3]; rgb = Image.fromarray(np.array(fr)[:, :, :3])
q = rgb.quantize(colors=48, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
out = np.array(q); out[:, :, 3] = np.where(al > 127, 255, 0).astype(np.uint8)
o = Image.fromarray(out).quantize(colors=64, method=Image.Quantize.FASTOCTREE)
b = io.BytesIO(); o.save(b, 'PNG', optimize=True); data = b.getvalue()
b64 = base64.b64encode(data).decode(); n = (len(b64) + 399) // 400
print('META', name, len(data), hashlib.sha256(data).hexdigest(), 'lines', n, 'part', part, 'size', W, h)
for i in range(part * L, min(n, (part + 1) * L)):
    chunk = b64[i*400:(i+1)*400]; print('L%03d %s %s' % (i, hashlib.sha1(chunk.encode()).hexdigest()[:6], chunk))
