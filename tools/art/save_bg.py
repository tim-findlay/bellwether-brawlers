import sys, json, re, base64, hashlib, os
from PIL import Image
# usage: save_bg.py <name>  -> scans the transcript for "META <name> <size> <sha> lines N part P" blocks, assembles, verifies, writes assets/stages/<name>.png
name = sys.argv[1]
import glob
path = os.environ.get('BB_TRANSCRIPT') or max(glob.glob(os.path.expanduser('~/.claude/projects/*/*.jsonl')), key=os.path.getmtime)
parts = {}; meta = None
for line in open(path):
    if f'META {name} ' not in line: continue
    try: o = json.loads(line)
    except Exception: continue
    def walk(x):
        if isinstance(x, dict):
            for v in x.values(): yield from walk(v)
        elif isinstance(x, list):
            for v in x: yield from walk(v)
        elif isinstance(x, str) and f'META {name} ' in x: yield x
    for s in walk(o):
        try: s = json.loads(s).get('stdout', s)
        except Exception: pass
        m = re.search(rf'META {name} (\d+) ([0-9a-f]{{64}}) lines (\d+)', s)
        if not m: continue
        meta = (int(m.group(1)), m.group(2), int(m.group(3)))
        for ln in s.split('\n'):
            mm = re.match(r'^L(\d{3}) ([0-9a-f]{6}) (\S+)\s*$', ln)
            if not mm: continue
            i, h, data = int(mm.group(1)), mm.group(2), mm.group(3)
            if hashlib.sha1(data.encode()).hexdigest()[:6] == h: parts[i] = data
size, sha, n = meta
missing = [i for i in range(n) if i not in parts]
if missing: print('MISSING', name, missing); sys.exit(1)
data = base64.b64decode(''.join(parts[i] for i in range(n)))
h = hashlib.sha256(data).hexdigest()
if h != sha or len(data) != size: print('HASH MISMATCH', name, h, len(data)); sys.exit(1)
os.makedirs('assets/stages', exist_ok=True)
open(f'assets/stages/{name}.png', 'wb').write(data)
print('saved', name, Image.open(f'assets/stages/{name}.png').size, size)
