// Windows split view check (28.11.2026): open the in-app browser, split beside and below, drag a border,
// take real screenshots, restart the app and check whether the arrangement comes back (EXPECT_RESTORE=1).
import {spawn,execFileSync} from 'node:child_process';import fs from 'node:fs';import path from 'node:path';
const [exe]=process.argv.slice(2),here=import.meta.dirname,out=process.env.OUT??'out';fs.mkdirSync(out,{recursive:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms)),say=(...a)=>console.log('QA',new Date().toISOString().slice(11,19),...a);
const ps=(file,...a)=>{try{return execFileSync('powershell',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(here,file),...a],{encoding:'utf8',timeout:130000,maxBuffer:64e6}).trim();}catch(e){return'PSERR '+String(e.stdout??e.message).slice(0,300);}};
const shot=name=>{const b=ps('ui.ps1','-Shot');if(b.startsWith('PSERR'))return say('shot failed',b);fs.writeFileSync(path.join(out,name+'.jpg'),Buffer.from(b,'base64'));say('shot',name);};
let failed=0;const check=(ok,label,detail='')=>{say(ok?'OK  ':'FAIL',label,detail);if(!ok)failed++;};
const list=async()=>{try{return await(await fetch('http://127.0.0.1:9333/json/list')).json();}catch{return[];}};
async function connect(target){const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});let id=0;const pend=new Map();ws.onmessage=m=>{const d=JSON.parse(m.data);pend.get(d.id)?.(d.result);};
 const call=(method,params={})=>new Promise(r=>{pend.set(++id,r);ws.send(JSON.stringify({id,method,params}));});
 const ev=async e=>{const r=await call('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true,userGesture:true});return r?.result?.value??r?.exceptionDetails?.exception?.description;};
 return{call,ev,close:()=>ws.close()};}
async function find(test,label,ms=60000){const end=Date.now()+ms;for(;;){const t=(await list()).find(test);if(t)return t;if(Date.now()>end){say('targets',JSON.stringify((await list()).map(p=>[p.type,p.url.slice(0,100)])));throw Error('kein Ziel: '+label);}await wait(500);}}
let mainId='';const tabsOf=async()=>(await list()).filter(p=>p.type==='page'&&p.id!==mainId&&!/browser-tabs\.html|browser-divider\.html|devtools|^data:/.test(p.url));
async function widths(){const r=[];for(const t of await tabsOf()){try{const c=await connect(t);r.push({url:t.url.slice(0,60),w:await c.ev('innerWidth'),h:await c.ev('innerHeight'),vis:await c.ev('document.visibilityState')});if(/8020musicschool/.test(t.url)&&!r.diag){r.diag=1;await c.call('Runtime.enable');say('site',await c.ev("JSON.stringify({ua:navigator.userAgent.slice(0,140),text:document.body?.innerText.slice(0,160),title:document.title})"));}c.close();}catch{}}return r;}
async function start(run){
 const app=spawn(exe,['--remote-debugging-port=9333','--use-fake-device-for-media-stream'],{stdio:['ignore','pipe','pipe']});let n=0;for(const st of[app.stdout,app.stderr])st.on('data',d=>{if(n++<30)say('APP',String(d).trim().slice(0,200));});
 if(run===1)say('first-run folder dialog:',ps('ui.ps1','-Button','Cancel','-Wait','40'));
 const page0=await find(p=>p.type==='page'&&p.url.includes('connect.8020musicschool.com'),'Hauptseite',90000);mainId=page0.id;const main=await connect(page0);
 for(let i=0;i<60&&!await main.ev('!!window.connectDesktop?.sharedBrowserOpen');i++)await wait(1000);
 for(let i=0;i<20;i++){const r=await main.ev('window.connectDesktop.sharedBrowserOpen().then(v=>JSON.stringify(v)).catch(e=>"ERR "+e.message)');say('open',r);if(!String(r).startsWith('ERR'))break;await wait(3000);}
 const bar=await connect(await find(p=>p.url.includes('browser-tabs.html'),'Browserleiste'));await wait(6000);
 return{app,main,bar};
}
const timer=setTimeout(()=>{say('TIMEOUT');process.exit(1);},14*60000);
let s=await start(1);
say('ui',await s.bar.ev("JSON.stringify({x:!!document.getElementById('split-x'),y:!!document.getElementById('split-y'),w:innerWidth})"));
await s.bar.ev("document.getElementById('split-x').click()");await wait(5000);
say('nav',await s.bar.ev("window.browserTabs.action({kind:'navigate',url:'https://example.com/'}).then(()=>'ok').catch(e=>'ERR '+e.message)"));await wait(5000);
let w=await widths();say('after split beside',JSON.stringify(w));
const visible=w.filter(x=>x.vis==='visible');check(visible.length>=2,'zwei Bereiche sichtbar nebeneinander',JSON.stringify(visible));
{const bw=JSON.parse(await s.bar.ev('JSON.stringify(innerWidth)'));check(visible.length===2&&Math.abs(visible[0].w+6+visible[1].w-bw)<=2&&Math.abs(visible[0].w-visible[1].w)<=8,'beide halb so breit, zusammen Fensterbreite',visible.map(x=>x.w).join('+')+' vs '+bw);}
const dividers=(await list()).filter(p=>p.url.includes('browser-divider.html'));check(dividers.length===1,'ein ziehbarer Rand',String(dividers.length));
shot('1-nebeneinander');
// Drag the border 150 px to the right with real-looking mouse input on the divider.
{const left=visible.find(x=>x.url.includes('8020musicschool'))??visible[0],bar=await s.bar.ev('JSON.stringify({h:innerHeight,w:innerWidth,t:document.title})'),info=JSON.parse(bar);
 const title=ps('drag.ps1','-Title','Browser','-X',String(left.w+3),'-Y',String(info.h+200),'-DX','150');say('drag',title,'toolbar',bar);await wait(1500);
 w=await widths();const nowLeft=w.find(x=>x.url===left.url)?.w??0,others=w.filter(x=>x.vis==='visible'&&x.url!==left.url).map(x=>x.w);
 check(Math.abs(nowLeft-left.w-150)<=12,'echter Mauszug um 150 px verschiebt den Rand um ~150 px',left.w+' → '+nowLeft+' / rechts '+others.join(','));
 check(others.length===1&&Math.abs(nowLeft+6+others[0]-info.w)<=2,'Breiten + Rand = Fensterbreite',nowLeft+'+6+'+others[0]+' vs '+info.w);shot('2-gezogen');}
await s.bar.ev("document.getElementById('split-y').click()");await wait(5000);
w=await widths();say('after split below',JSON.stringify(w));check(w.filter(x=>x.vis==='visible').length>=3,'drei Bereiche (rechts geteilt untereinander)');
check((await list()).filter(p=>p.url.includes('browser-divider.html')).length===2,'zwei Ränder');shot('3-verschachtelt');
const sig=list=>JSON.stringify(list.map(x=>[x.url.replace(/[?#].*/,''),x.w,x.h]).sort());const layoutBefore=sig(w.filter(x=>!x.url.startsWith('file:')));
await wait(3000);
// Restart: does the arrangement come back?
s.app.kill();await wait(5000);try{execFileSync('taskkill',['/F','/IM','8020 Connect.exe'],{stdio:'ignore'});}catch{}await wait(3000);
s=await start(2);await wait(8000);
w=await widths();const layoutAfter=sig(w.filter(x=>!x.url.startsWith('file:')));say('after restart',JSON.stringify(w));shot('4-nach-neustart');
if(process.env.EXPECT_RESTORE==='1'){check(layoutAfter===layoutBefore,'Anordnung nach Neustart gleich',layoutBefore+' vs '+layoutAfter);}else say('restore (nicht verlangt)',layoutBefore===layoutAfter?'gleich':'anders',layoutBefore,layoutAfter);
s.app.kill();clearTimeout(timer);say('DONE',failed?'FAIL':'PASS',failed);process.exit(failed?1:0);
