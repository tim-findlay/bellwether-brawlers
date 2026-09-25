import sys, io, base64, hashlib
# Backdrop: resize to 480x270, 32-colour PNG-8, print META + sha-checked base64 lines.
# usage: backdrop.py <src.png> <name> <part> <linesPerPart>  (run parts 0,1,2... in separate calls)
from PIL import Image
# usage: bg.py <src.png> <name> <part> <linesPerPart>  -> META once + lines [part*L, (part+1)*L)
src, name, part, L = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
im = Image.open(src).convert('RGB').resize((480, 270), Image.LANCZOS)
q = im.quantize(colors=32, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
b = io.BytesIO(); q.save(b, 'PNG', optimize=True); data = b.getvalue()
b64 = base64.b64encode(data).decode()
n = (len(b64) + 399) // 400
print('META', name, len(data), hashlib.sha256(data).hexdigest(), 'lines', n, 'part', part)
for i in range(part * L, min(n, (part + 1) * L)):
    chunk = b64[i*400:(i+1)*400]; print('L%03d %s %s' % (i, hashlib.sha1(chunk.encode()).hexdigest()[:6], chunk))
