# Per phase: fold one-second clicks, list peaks, count missing seconds and silences.
import sys,numpy as np
f,cap0,T0,PH,n,name=sys.argv[1],float(sys.argv[2]),float(sys.argv[3]),int(sys.argv[4]),int(sys.argv[5]),sys.argv[6]
R=48000;x=np.memmap(f,dtype=np.int16,mode='r').reshape(-1,2);print(name,'Sekunden',round(len(x)/R))
for k in range(n):
    a=int(((T0-cap0)/1000+k*PH+PH*.55)*R);b=int(((T0-cap0)/1000+k*PH+PH*.97)*R)
    if a<0 or b>len(x): print(k,'ausserhalb');continue
    y=x[a:b].astype(float).mean(1)/32768;m=len(y)//R;hp=np.diff(y[:m*R],prepend=0).reshape(m,R);e=(hp.reshape(m,1000,48)**2).mean(2);med=np.median(e,0);top=med.max()
    if top<1e-9: print(k,'host' if k%2==0 else 'guest','KEIN KLICK');continue
    db=10*np.log10(med/top+1e-12);pk=[]
    for q in np.argsort(-db):
        if db[q]<-30: break
        if all(min(abs(q-p),1000-abs(q-p))>6 for p,_ in pk): pk.append((int(q),round(float(db[q]),1)))
    first=pk[0][0];rel=sorted((((p-first+500)%1000)-500,d) for p,d in pk)
    near=[np.roll(s,500-first)[480:521].max() for s in e];miss=int(sum(v<top*.02 for v in near))
    # whole phase including the change: longest time without any click
    u=x[int(((T0-cap0)/1000+k*PH)*R):b].astype(float).mean(1)/32768;g=(np.diff(u,prepend=0)[:len(u)//480*480].reshape(-1,480)**2).mean(1);hit=np.where(g>g.max()*.02)[0];gap=round(float(np.diff(hit).max()/100),2) if len(hit)>1 else -1
    print(k,'host' if k%2==0 else 'guest','Spitzen',rel[:6],'fehlend',miss,'von',m,'groesste Luecke s',gap)
