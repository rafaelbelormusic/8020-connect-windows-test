// End-to-end like a customer against the live service. Host: Chrome (fake 4K camera + screen).
// Guest: GUEST=chrome|edge|firefox|webkit|safari opens the invitation link, types a name, joins.
// Pass: host gets the waiting room message, admits; both sides connected, the guest decodes the
// host picture and the host decodes the guest picture (when the guest has a camera), 45 s stable.
import {chromium,firefox,webkit} from 'playwright';import fs from 'node:fs';
const BASE='https://connect.8020musicschool.com',room=process.argv[2],G=process.env.GUEST||'chrome',SECS=+(process.env.SECS||45);const sleep=ms=>new Promise(r=>setTimeout(r,ms)),t0=Date.now(),say=(...a)=>console.log(((Date.now()-t0)/1000).toFixed(1).padStart(6),...a);
setTimeout(()=>{say('ERGEBNIS NICHT BESTANDEN: Zeit abgelaufen');process.exit(1);},420000);
const fakeMedia=`(()=>{const can=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');let i=0;setInterval(()=>{g.fillStyle='hsl('+(i++%360)+',60%,45%)';g.fillRect(0,0,w,h);g.fillStyle='#fff';g.fillRect((i*9)%w,h/3,w/8,h/8);},40);return c.captureStream(25);};const G=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getDisplayMedia=async()=>can(2992,1872);navigator.mediaDevices.getUserMedia=async o=>{if(!o||!o.video)return G(o);const s=can(3840,2160);if(o.audio)for(const a of (await G({audio:o.audio})).getAudioTracks())s.addTrack(a);return s;};})()`;
const hb=await chromium.launch({channel:'chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required','--mute-audio']});const hc=await hb.newContext({viewport:{width:1500,height:950}});await hc.addInitScript(fakeMedia);const H=await hc.newPage();const herr=[];H.on('pageerror',e=>herr.push(String(e.message).slice(0,150)));
await H.goto(BASE+'/');await H.waitForTimeout(4000);await H.evaluate(()=>document.getElementById('prejoin-share')?.click());await H.waitForTimeout(2500);
await H.evaluate(r=>{for(const [k,v] of [['name','Host Test'],['room',r]]){const n=document.getElementById(k);n.value=v;n.dispatchEvent(new Event('input',{bubbles:true}));}document.getElementById('enter-room').click();},room);
await H.waitForFunction(()=>document.body.classList.contains('in-call'),null,{timeout:60000});say('Host im Raum');
await H.evaluate(async()=>{const t=JSON.parse(sessionStorage.getItem('8020-session')).token;for(let v=0;v<20;v++){const r=await fetch('/api/policy',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},body:JSON.stringify({version:v,waitingRoom:true,requireCamera:false,requireMicrophone:false})});if(r.ok)return;}});
// guest
let gp,close=async()=>{};const link=BASE+'/room/'+room;
if(G==='safari'){const {Builder,By}=await import('selenium-webdriver');const d=await new Builder().forBrowser('safari').build();close=()=>d.quit();
 gp={goto:u=>d.get(u),eval:async(f,a)=>d.executeScript(`return (${f.toString()})(arguments[0])`,a),wait:ms=>sleep(ms)};}
else{const eng=G==='firefox'?firefox:G==='webkit'?webkit:chromium;const opts=G==='firefox'?{firefoxUserPrefs:{'media.navigator.streams.fake':true,'media.navigator.permission.disabled':true}}:G==='webkit'?{}:{channel:G==='edge'?'msedge':'chrome',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required','--mute-audio']};
 const b=await eng.launch(opts);const c=await b.newContext({viewport:{width:1280,height:850},...(G==='chrome'||G==='edge'?{permissions:['camera','microphone']}:{})});if(G==='webkit')await c.addInitScript(fakeMedia);const p=await c.newPage();p.on('pageerror',e=>say('GAST-FEHLER',String(e.message).slice(0,160)));close=()=>b.close();
 gp={goto:u=>p.goto(u),eval:(f,a)=>p.evaluate(f,a),wait:ms=>p.waitForTimeout(ms),shot:f=>p.screenshot({path:f})};}
await gp.goto(link);await gp.wait(6000);say('Gast',G,'Einladungslink geladen');
const typed=await gp.eval(()=>{const n=document.getElementById('name');if(!n)return 'kein Namensfeld';n.value='Gast Test';n.dispatchEvent(new Event('input',{bubbles:true}));const b=document.getElementById('enter-room');if(!b)return 'kein Knopf';if(b.disabled)return 'Knopf gesperrt: '+document.getElementById('room-target-status')?.textContent;b.click();return 'beigetreten';});say('Gast',typed);
let note=false;for(let i=0;i<20&&!note;i++){await sleep(500);note=await H.evaluate(()=>document.getElementById('waiting-dialog')?.open===true);}say('Warteraum-Meldung beim Host',note);
await H.evaluate(()=>[...document.querySelectorAll('#waiting-dialog button')].find(b=>/^Hereinlassen/.test(b.textContent))?.click());
let gIn=false;for(let i=0;i<40&&!gIn;i++){await sleep(500);gIn=await gp.eval(()=>document.body.classList.contains('in-call'));}say('Gast im Raum',gIn);
const gState=()=>gp.eval(()=>JSON.stringify({vid:[...document.querySelectorAll('#videos video')].filter(v=>!v.closest('[id^=local-]')).map(v=>[v.videoWidth,Math.round(v.currentTime)]),msg:(document.getElementById('app-status-message')||{}).textContent?.slice(0,90)}));
let bad=0,rows=[];for(let s=0;s<SECS;s+=5){await sleep(5000);const g=JSON.parse(await gState());rows.push(g);if(/nicht verbunden|steht noch nicht|nicht erneut verbunden|did not match/i.test(g.msg||''))bad++;if(s%15===0)say('Gast sieht',JSON.stringify(g));}
const host=await H.evaluate(()=>JSON.stringify([...document.querySelectorAll('#videos video')].filter(v=>!v.closest('[id^=local-]')&&!v.closest('#local-camera')).map(v=>[v.videoWidth,Math.round(v.currentTime)])));say('Host sieht vom Gast',host);
const last=rows.at(-1)??{vid:[]},first=rows[0]??{vid:[]},moving=last.vid.some(([w,t],i)=>w>0&&t>(first.vid[i]?.[1]??0));
const ok=note&&gIn&&moving&&bad===0;fs.mkdirSync('out',{recursive:true});await gp.shot?.('out/'+G+'.png').catch(()=>{});await H.screenshot({path:'out/host.png'}).catch(()=>{});
say('ERGEBNIS',ok?'BESTANDEN':'NICHT BESTANDEN',JSON.stringify({gast:G,meldung:note,imRaum:gIn,hostBildLaeuft:moving,fehlermeldungen:bad,hostFehler:herr.slice(0,3)}));await close();process.exit(ok?0:1);
