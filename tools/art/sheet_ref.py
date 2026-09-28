# Sprite strip -> sheet, for strips whose frames overlap in x (lunges) and for any strip that must
# share the fighters' one pixel scale: frames are split by connected components (pure numpy — the
# Higgsfield sandbox has no scipy), and the scale is fixed by one reference frame's height (the
# standing frame -> the fighter's idle height, 60-61 px). Prints META + L-lines like sheet.py.
# usage: sheet_ref.py <strip.png> <frames> <cell> <refFrame> <refHeightPx> <colors> <metaName>
import sys,io,base64,hashlib
import numpy as np
from PIL import Image
p,n,cell,ref,refH,colors,meta=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]),int(sys.argv[4]),float(sys.argv[5]),int(sys.argv[6]),sys.argv[7]
a=np.array(Image.open(p).convert('RGB')).astype(int);H,W=a.shape[:2]
edge=np.concatenate([a[:3].reshape(-1,3),a[-3:].reshape(-1,3),a[:,:3].reshape(-1,3),a[:,-3:].reshape(-1,3)]);key=np.median(edge,0)
mask=np.sqrt(((a-key)**2).sum(-1))>70
k=3;m=mask[:H//k*k,:W//k*k].reshape(H//k,k,W//k,k).any(3).any(1)   # coarse mask for labelling
lab=np.where(m,np.arange(m.size).reshape(m.shape)+1,0)
while True:
    L=lab.copy()
    for s in [(1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)]:
        L=np.maximum(L,np.roll(lab,s,(0,1)))
    L=L*m
    if (L==lab).all():break
    lab=L
ids,cnt=np.unique(lab[lab>0],return_counts=True)
order=np.argsort(-cnt);big=[ids[i] for i in order[:n]]
cx={}
for i in ids:
    ys,xs=np.where(lab==i);cx[i]=(xs.mean(),xs.min(),xs.max(),ys.min(),ys.max(),len(xs))
big.sort(key=lambda i:cx[i][0])
groups={b:[b] for b in big}
for i in ids:
    if i in groups:continue
    if cx[i][5]<6:continue                                   # specks
    b=min(big,key=lambda b:abs(cx[b][0]-cx[i][0]));groups[b].append(i)
fr=[]
for b in big:
    sel=np.isin(lab,groups[b]);ys,xs=np.where(sel)
    x0,x1,y0,y1=xs.min()*k,(xs.max()+1)*k,ys.min()*k,(ys.max()+1)*k
    fm=np.zeros_like(mask);fm[:sel.shape[0]*k,:sel.shape[1]*k]=np.repeat(np.repeat(sel,k,0),k,1);fm&=mask
    yy,xx=np.where(fm[y0:y1,x0:x1]);fr.append((x0+xx.min(),y0+yy.min(),x0+xx.max()+1,y0+yy.max()+1,fm))
hs=[f[3]-f[1] for f in fr];ws=[f[2]-f[0] for f in fr]
sc=min(refH/hs[ref],cell*0.98/max(hs),cell*0.98/max(ws))
sh=Image.new('RGBA',(cell*n,cell),(0,0,0,0))
for i,(x0,y0,x1,y1,fm) in enumerate(fr):
    rgba=np.dstack([a[y0:y1,x0:x1].astype(np.uint8),(fm[y0:y1,x0:x1]*255).astype(np.uint8)])
    f=Image.fromarray(rgba);w,h=f.size;nw,nh=max(1,round(w*sc)),max(1,round(h*sc));f=f.resize((nw,nh),Image.NEAREST)
    sh.paste(f,(i*cell+(cell-nw)//2,cell-nh),f)
q=sh.quantize(colors=colors,method=Image.Quantize.FASTOCTREE);b=io.BytesIO();q.save(b,'PNG',optimize=True);d=b.getvalue()
print('META',meta,len(d),hashlib.sha256(d).hexdigest(),hs,ws,len(ids),round(sc*hs[ref],1),'bound' if sc<refH/hs[ref]-1e-9 else 'ok')
e=base64.b64encode(d).decode()
for i in range(0,len(e),400):c=e[i:i+400];print('L%02d %s %s'%(i//400,hashlib.sha1(c.encode()).hexdigest()[:6],c))
