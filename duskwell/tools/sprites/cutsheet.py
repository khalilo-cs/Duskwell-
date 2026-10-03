import numpy as np, cv2, os, json, sys
from scipy import ndimage as ndi
def segment(sub, tol=22, minhole=200):
    f=sub.astype(np.float32)
    hsv=cv2.cvtColor(sub,cv2.COLOR_BGR2HSV)
    blur=cv2.GaussianBlur(f,(0,0),1.2); sd=np.sqrt(np.maximum(cv2.GaussianBlur((f-blur)**2,(0,0),2).mean(axis=2),0))
    cand=(hsv[...,1]<34)&(hsv[...,2]>110)&(hsv[...,2]<230)&(sd<5.5)
    cand=ndi.binary_opening(cand,iterations=2)
    M=cand.astype(np.float32)
    num=cv2.GaussianBlur(f*M[...,None],(0,0),22); den=cv2.GaussianBlur(M,(0,0),22)[...,None]
    bg=num/np.maximum(den,1e-3)
    dist=np.linalg.norm(f-bg,axis=2)
    near=dist<tol
    lab,k=ndi.label(near); sizes=ndi.sum(near,lab,range(1,k+1))
    edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    big={i+1 for i,v in enumerate(sizes) if v>=100}
    fg=~np.isin(lab,list(edge|big))
    fg=ndi.binary_opening(fg,iterations=1)
    holes=ndi.binary_fill_holes(fg)&~fg; hl,hn=ndi.label(holes)
    for i,v in enumerate(ndi.sum(holes,hl,range(1,hn+1)),1):
        if v<minhole: fg|=hl==i
    return fg
def cut_boxes(sub, boxes, outdir, tol=22, seeds=None):
    seeds = seeds or {}
    fg=segment(sub,tol); pl,pn=ndi.label(fg)
    alpha=cv2.GaussianBlur(fg.astype(np.float32),(0,0),0.7); alpha=np.clip((alpha-0.25)/0.5,0,1)
    rgba=np.dstack([sub,(alpha*255).astype(np.uint8)]); os.makedirs(outdir,exist_ok=True); out={}
    for n,(x0,y0,x1,y1) in boxes.items():
        m=pl[y0:y1,x0:x1]; ids,cnt=np.unique(m[m>0],return_counts=True)
        if len(ids)==0: print('none',n); continue
        keep=[i for i,c in zip(ids,cnt) if c>0.08*cnt.max()]
        if n in seeds:                                                     # only the piece that holds this point (neighbours inside the box are dropped)
            sx,sy=seeds[n]; sid=pl[sy,sx]; keep=[sid] if sid>0 else keep
        mask=np.isin(m,keep); cr=rgba[y0:y1,x0:x1].copy(); cr[...,3]=np.where(mask,cr[...,3],0)
        ys,xs=np.where(cr[...,3]>12); cr=cr[ys.min():ys.max()+1,xs.min():xs.max()+1]
        cv2.imwrite(os.path.join(outdir,n+'.png'),cr); out[n]=[int(x0+xs.min()),int(y0+ys.min()),int(cr.shape[1]),int(cr.shape[0])]
    return out
