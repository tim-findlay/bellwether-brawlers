import sys, json, re, base64, hashlib, os
from PIL import Image
# usage: save_sheet.py <metaName> <char> <anim> — pulls "META <metaName> <size> <sha> [...]" + L-lines from the transcript
meta_name, ch, anim = sys.argv[1:4]
import glob
path = os.environ.get('BB_TRANSCRIPT') or max(glob.glob(os.path.expanduser('~/.claude/projects/*/*.jsonl')), key=os.path.getmtime)
found = None
for line in open(path):
    if f'META {meta_name} ' not in line: continue
    try: o = json.loads(line)
    except Exception: continue
    def walk(x):
        if isinstance(x, dict):
            for v in x.values(): yield from walk(v)
        elif isinstance(x, list):
            for v in x: yield from walk(v)
        elif isinstance(x, str) and f'META {meta_name} ' in x: yield x
    for s in walk(o):
        try: s = json.loads(s).get('stdout', s)
        except Exception: pass
        for b in re.split(r'(?m)^(?=META )', s):
            m = re.match(rf'META {meta_name} (\d+) ([0-9a-f]{{64}})', b)
            if m: found = (int(m.group(1)), m.group(2), b)
size, sha, block = found
parts = {}
for ln in block.split('\n'):
    mm = re.match(r'^L(\d+) ([0-9a-f]{6}) (\S+)\s*$', ln)
    if mm and hashlib.sha1(mm.group(3).encode()).hexdigest()[:6] == mm.group(2): parts[int(mm.group(1))] = mm.group(3)
n = max(parts) + 1
missing = [i for i in range(n) if i not in parts]
if missing: print('MISSING', meta_name, missing); sys.exit(1)
data = base64.b64decode(''.join(parts[i] for i in range(n)))
if hashlib.sha256(data).hexdigest() != sha or len(data) != size: print('HASH MISMATCH', meta_name); sys.exit(1)
os.makedirs(f'assets/sprites/{ch}', exist_ok=True)
open(f'assets/sprites/{ch}/{anim}.png', 'wb').write(data)
print('saved', ch, anim, Image.open(f'assets/sprites/{ch}/{anim}.png').size, size)
