/* STILLWATER — cozy lake fishing. single-file canvas engine. */
(function(){
"use strict";
const A=window.ASSETS, META=window.META;
const cv=document.getElementById('game'), ctx=cv.getContext('2d',{alpha:false});
let W=0,H=0,DPR=1,TOPI=0,BOTI=0;
const clamp=(v,a,b)=>v<a?a:v>b?b:v, lerp=(a,b,t)=>a+(b-a)*t, smooth=t=>t*t*(3-2*t), TAU=Math.PI*2;
const rnd=(a=1,b=0)=>b+Math.random()*(a-b);
function mix(c1,c2,t){return[Math.round(lerp(c1[0],c2[0],t)),Math.round(lerp(c1[1],c2[1],t)),Math.round(lerp(c1[2],c2[2],t))];}
const rgb=c=>`rgb(${c[0]},${c[1]},${c[2]})`, rgba=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
function seeded(s){return function(){s=(s*1664525+1013904223)|0;return((s>>>8)&0xffffff)/0xffffff;};}
const SAVE={read(){try{return JSON.parse(localStorage.getItem('stillwater')||'{}');}catch(e){return{};}},write(o){try{localStorage.setItem('stillwater',JSON.stringify(o));}catch(e){}}};
const IMG={};
function loadAll(cb){const keys=Object.keys(A);let n=keys.length,done=0;if(!n)return cb();keys.forEach(k=>{const im=new Image();im.onload=im.onerror=()=>{if(++done===n)cb();};im.src=A[k];IMG[k]=im;});}

/* ---- character recolor (denim shirt -> outfit, via masks) ---- */
const CHAR_HSL={denim:null,rust:[0.033,0.62],forest:[0.388,0.45],plum:[0.833,0.42],mustard:[0.122,0.70],teal:[0.500,0.50]};
const CHAR_LABEL={denim:'River Blue',rust:'Rust Flannel',forest:'Pine Green',plum:'Plum',mustard:'Mustard',teal:'Teal'};
const playerCache={};
function rgbToHsv(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h/=6;if(h<0)h+=1;}return[h,mx===0?0:d/mx,mx];}
function hsvToRgb(h,s,v){const i=Math.floor(h*6),f=h*6-i,p=v*(1-s),q=v*(1-f*s),t=v*(1-(1-f)*s);let r,g,b;switch(i%6){case 0:r=v,g=t,b=p;break;case 1:r=q,g=v,b=p;break;case 2:r=p,g=v,b=t;break;case 3:r=p,g=q,b=v;break;case 4:r=t,g=p,b=v;break;default:r=v,g=p,b=q;}return[r*255,g*255,b*255];}
function buildCharacter(ch){
  if(playerCache[ch])return playerCache[ch];
  const spec=CHAR_HSL[ch],frames=[];
  for(let f=0;f<8;f++){
    const base=IMG['boat_'+f],mk=IMG['shirt_'+f],w=base.width,h=base.height;
    const c=document.createElement('canvas');c.width=w;c.height=h;const cx=c.getContext('2d');cx.drawImage(base,0,0);
    if(spec){
      const mc=document.createElement('canvas');mc.width=w;mc.height=h;const mcx=mc.getContext('2d');mcx.drawImage(mk,0,0,w,h);
      const md=mcx.getImageData(0,0,w,h).data, id=cx.getImageData(0,0,w,h), d=id.data, th=spec[0], ts=spec[1];
      for(let i=0;i<d.length;i+=4){ if(md[i]>110&&d[i+3]>30){ const hsv=rgbToHsv(d[i],d[i+1],d[i+2]); const ns=Math.min(1,ts*(0.6+0.8*hsv[1])+0.12); const o=hsvToRgb(th,ns,hsv[2]); d[i]=o[0];d[i+1]=o[1];d[i+2]=o[2]; } }
      cx.putImageData(id,0,0);
    }
    frames.push(c);
  }
  playerCache[ch]=frames; return frames;
}

/* ---- time of day ---- */
const SKY=[
 {h:0,top:[10,14,34],hz:[24,28,54],water:[12,20,40],light:[40,52,96],la:0.55,star:0.9},
 {h:5,top:[26,30,58],hz:[70,64,96],water:[26,38,64],light:[80,86,128],la:0.40,star:0.5},
 {h:6.6,top:[120,150,196],hz:[244,196,150],water:[120,150,170],light:[255,228,196],la:0.12,star:0.0},
 {h:9,top:[126,176,228],hz:[206,224,236],water:[120,162,176],light:[255,250,242],la:0.0,star:0},
 {h:13,top:[120,176,236],hz:[200,224,240],water:[116,168,184],light:[255,255,255],la:0.0,star:0},
 {h:16.5,top:[126,168,222],hz:[226,212,196],water:[120,160,176],light:[255,244,224],la:0.04,star:0},
 {h:18.4,top:[92,110,176],hz:[248,176,128],water:[98,120,150],light:[255,206,150],la:0.18,star:0},
 {h:19.7,top:[48,52,108],hz:[212,118,128],water:[58,64,108],light:[170,120,150],la:0.40,star:0.15},
 {h:21,top:[20,24,56],hz:[58,46,86],water:[26,34,62],light:[70,72,120],la:0.52,star:0.6},
 {h:24,top:[10,14,34],hz:[24,28,54],water:[12,20,40],light:[40,52,96],la:0.55,star:0.9}];
function skyAt(h){h=((h%24)+24)%24;let a=SKY[0],b=SKY[SKY.length-1];for(let i=0;i<SKY.length-1;i++){if(h>=SKY[i].h&&h<=SKY[i+1].h){a=SKY[i];b=SKY[i+1];break;}}const t=smooth(clamp((h-a.h)/Math.max(0.001,b.h-a.h),0,1));return{top:mix(a.top,b.top,t),hz:mix(a.hz,b.hz,t),water:mix(a.water,b.water,t),light:mix(a.light,b.light,t),la:lerp(a.la,b.la,t),star:lerp(a.star,b.star,t),h};}

/* ---- state ---- */
const S={scene:'load',mode:'cruise',splitT:0,t:18.4,dayLen:600,timeFlow:true,char:'denim',money:120,
 boatX:0,boatV:0,boatFacing:1,bob:0,driveDir:0,
 lureY:0,lureTargetY:0,lure:0,rodMax:0.82,lineMax:100,
 fishMode:'idle',hooked:null,tension:0,reelHold:false,struggle:0,struggleT:0,struggleDur:0,biteFlash:0,
 ownedLures:[0,1,3],rodLvl:1,lineLvl:1,boatLvl:1,journal:{},overlay:null,muted:false,catchInfo:null};
(function(){const s=SAVE.read();for(const k of['char','money','ownedLures','rodLvl','lineLvl','boatLvl','journal','muted','t'])if(s[k]!==undefined)S[k]=s[k];S.rodMax=0.55+0.12*S.rodLvl;S.lineMax=80+20*S.lineLvl;S.lure=(S.ownedLures&&S.ownedLures[0])||0;})();
function persist(){SAVE.write({char:S.char,money:S.money,ownedLures:S.ownedLures,rodLvl:S.rodLvl,lineLvl:S.lineLvl,boatLvl:S.boatLvl,journal:S.journal,muted:S.muted,t:S.t});}

const SPECIES=[
 {n:'Bluegill',i:0,band:[0.04,0.34],rar:1,val:8,fight:0.7,sp:[0,1,5],str:0.6},
 {n:'Yellow Perch',i:1,band:[0.06,0.36],rar:1,val:10,fight:0.7,sp:[0,1,3],str:0.6},
 {n:'Largemouth Bass',i:2,band:[0.22,0.58],rar:2,val:24,fight:1.0,sp:[3,4,8],str:1.0},
 {n:'Rainbow Trout',i:3,band:[0.20,0.55],rar:2,val:28,fight:1.0,sp:[4,5,6],str:1.0},
 {n:'Northern Pike',i:4,band:[0.42,0.78],rar:3,val:60,fight:1.5,sp:[4,6],str:1.4},
 {n:'Channel Catfish',i:5,band:[0.52,0.86],rar:3,val:72,fight:1.6,sp:[7,0],str:1.5,night:1},
 {n:'Lake Sturgeon',i:6,band:[0.80,0.99],rar:5,val:240,fight:2.4,sp:[7],str:2.2}];
const LURES=[
 {n:'Garden Worm',cost:0,depth:0.30},{n:'Red Bobber',cost:0,depth:0.22},{n:'Slip Float',cost:60,depth:0.45},
 {n:'Spinner',cost:0,depth:0.40},{n:'Crankbait',cost:90,depth:0.55},{n:'Trout Fly',cost:75,depth:0.30},
 {n:'Casting Spoon',cost:120,depth:0.62},{n:'Bottom Jig',cost:180,depth:0.95},{n:'Topwater Popper',cost:140,depth:0.18}];

/* ---- audio (procedural cozy synth) ---- */
const AU={ctx:null,master:null,amb:null,engGain:null,started:false};
function audioInit(){
  if(AU.started)return;AU.started=true;
  try{
    const C=window.AudioContext||window.webkitAudioContext;AU.ctx=new C();
    AU.master=AU.ctx.createGain();AU.master.gain.value=S.muted?0:0.85;AU.master.connect(AU.ctx.destination);
    const L=AU.ctx.sampleRate*2,buf=AU.ctx.createBuffer(1,L,AU.ctx.sampleRate),d=buf.getChannelData(0);let last=0;
    for(let i=0;i<L;i++){const wn=Math.random()*2-1;last=(last+0.02*wn)/1.02;d[i]=last*3;}
    const src=AU.ctx.createBufferSource();src.buffer=buf;src.loop=true;
    const lp=AU.ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=420;
    const g=AU.ctx.createGain();g.gain.value=0.09;src.connect(lp).connect(g).connect(AU.master);src.start();AU.amb=g;
    const eo=AU.ctx.createOscillator();eo.type='sawtooth';eo.frequency.value=58;
    const elp=AU.ctx.createBiquadFilter();elp.type='lowpass';elp.frequency.value=170;
    const eg=AU.ctx.createGain();eg.gain.value=0;eo.connect(elp).connect(eg).connect(AU.master);eo.start();AU.engGain=eg;
  }catch(e){}
}
function beep(freq,dur,type,vol,slide){if(!AU.ctx)return;type=type||'sine';vol=vol||0.2;slide=slide||0;const t=AU.ctx.currentTime,o=AU.ctx.createOscillator(),g=AU.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(40,freq+slide),t+dur);g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.012);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g).connect(AU.master);o.start(t);o.stop(t+dur+0.02);}
function noiseBurst(dur,vol,freq){if(!AU.ctx)return;const t=AU.ctx.currentTime,len=AU.ctx.sampleRate*dur,b=AU.ctx.createBuffer(1,len,AU.ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);const s=AU.ctx.createBufferSource();s.buffer=b;const f=AU.ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=freq;f.Q.value=0.8;const g=AU.ctx.createGain();g.gain.value=vol;s.connect(f).connect(g).connect(AU.master);s.start();}
const SFX={
 tap:()=>beep(520,0.05,'triangle',0.1),
 cast:()=>{noiseBurst(0.25,0.13,900);beep(300,0.18,'sine',0.07,-120);},
 reel:()=>beep(150+Math.random()*40,0.04,'square',0.04),
 bite:()=>{beep(660,0.08,'sine',0.15);setTimeout(()=>beep(880,0.1,'sine',0.13),70);},
 snap:()=>{noiseBurst(0.18,0.18,1200);beep(200,0.2,'sawtooth',0.1,-80);},
 catch:()=>{[523,659,784,1046].forEach((f,i)=>setTimeout(()=>beep(f,0.22,'triangle',0.15),i*90));},
 coin:()=>{beep(900,0.06,'square',0.1);setTimeout(()=>beep(1200,0.07,'square',0.1),60);},
 bird:()=>{const f=1400+Math.random()*900;beep(f,0.12,'sine',0.04,300);setTimeout(()=>beep(f+200,0.1,'sine',0.03,-200),120);}};
function setMuted(m){S.muted=m;if(AU.master)AU.master.gain.value=m?0:0.85;persist();}

/* ---- world scenery (seeded, wraps) ---- */
const WORLD=320*34;
let shoreItems=[],cloudItems=[],fishes=[],bubbles=[],uwProps=[],stars=null;
function buildWorld(){
  const R=seeded(20240131);shoreItems=[];
  const treeK=META.tree.map(t=>'tree_'+t[0]),shoreK=META.shore.map(t=>'shore_'+t[0]),lakeK=META.lake.map(t=>'lake_'+t[0]);
  let x=0;while(x<WORLD){const r=R();let key,layer,scale;
    if(r<0.46){key=treeK[Math.floor(R()*treeK.length)];layer=0.42;scale=rnd(1.1,0.7);}
    else if(r<0.78){key=shoreK[Math.floor(R()*shoreK.length)];layer=0.5;scale=rnd(0.9,0.55);}
    else{key=lakeK[Math.floor(R()*lakeK.length)];layer=0.62;scale=rnd(0.8,0.5);}
    shoreItems.push({x,key,layer,scale,flip:R()<0.5});x+=rnd(150,72);}
  cloudItems=[];for(let i=0;i<14;i++)cloudItems.push({x:R()*WORLD,y:rnd(0.30,0.02),key:'cloud_'+Math.floor(R()*7),s:rnd(1.0,0.45),spd:rnd(7,3),flip:R()<0.5,op:rnd(0.95,0.6)});
}
function waterY(){return H*lerp(0.60,0.40,S.splitT);}
function boatScreenY(){return waterY()+H*0.012+Math.sin(S.bob)*5;}
const BOAT_W=()=>Math.min(W*0.62,360);
function camX(){return S.boatX;}
function lurePos(){return{x:W*0.5+BOAT_W()*0.16,y:S.lureY};}

function weightedSpecies(){const night=S.t<6||S.t>19.5;let pool=[];SPECIES.forEach(s=>{let w=Math.max(1,6-s.rar);if(s.night&&night)w+=2;if(s.rar>=5)w=night?1.4:0.7;for(let k=0;k<Math.ceil(w*2);k++)pool.push(s);});return pool[Math.floor(Math.random()*pool.length)];}
function spawnFish(){const top=waterY()+4,h=H-waterY()-8;fishes=[];const count=10+Math.floor(rnd(5));for(let i=0;i<count;i++){const sp=weightedSpecies(),band=sp.band,depth=rnd(band[1],band[0]);fishes.push({sp,x:rnd(W,0),y:top+depth*h,depth,vx:(Math.random()<0.5?-1:1)*rnd(40,16),vy:0,ph:rnd(TAU),size:rnd(1.08,0.9),state:'wander',interest:0});}}
function buildUwProps(){const R=seeded(7777);uwProps=[];const keys=META.uw.map(t=>'uw_'+t[0]);for(let i=0;i<10;i++)uwProps.push({x:rnd(W,0),depth:rnd(0.98,0.55),key:keys[Math.floor(R()*keys.length)],s:rnd(0.9,0.5),flip:R()<0.5});}

function safeInsets(){try{const pr=document.getElementById('safeprobe');if(pr){TOPI=parseFloat(getComputedStyle(pr).paddingTop)||0;BOTI=parseFloat(getComputedStyle(pr).paddingBottom)||0;}}catch(e){}}
function resize(){DPR=Math.min(window.devicePixelRatio||1,2);W=window.innerWidth;H=window.innerHeight;safeInsets();cv.width=Math.floor(W*DPR);cv.height=Math.floor(H*DPR);cv.style.width=W+'px';cv.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=true;}
window.addEventListener('resize',resize);

/* ---- sky + celestial ---- */
function ensureStars(){if(stars)return;const R=seeded(99);stars=[];for(let i=0;i<90;i++)stars.push({x:R(),y:R()*0.55,s:R()*1.6+0.3,tw:R()*TAU});}
function drawSky(sky){
  const wy=waterY(),g=ctx.createLinearGradient(0,0,0,wy);
  g.addColorStop(0,rgb(sky.top));g.addColorStop(0.7,rgb(mix(sky.top,sky.hz,0.55)));g.addColorStop(1,rgb(sky.hz));
  ctx.fillStyle=g;ctx.fillRect(0,0,W,wy);
  if(sky.star>0.02){ensureStars();ctx.save();for(const st of stars){const a=sky.star*(0.5+0.5*Math.sin(performance.now()*0.001+st.tw));ctx.globalAlpha=clamp(a,0,1);ctx.fillStyle='#fff';ctx.fillRect(st.x*W,st.y*wy,st.s,st.s);}ctx.restore();}
  const h=sky.h,ang=clamp((h-6)/12,0,1),arcx=lerp(W*0.12,W*0.88,ang),arcy=wy*0.78-Math.sin(ang*Math.PI)*wy*0.62,day=h>6.4&&h<18.6;
  if(day){ctx.save();const sg=ctx.createRadialGradient(arcx,arcy,2,arcx,arcy,46);sg.addColorStop(0,'rgba(255,247,220,0.95)');sg.addColorStop(0.5,'rgba(255,228,170,0.5)');sg.addColorStop(1,'rgba(255,228,170,0)');ctx.fillStyle=sg;ctx.beginPath();ctx.arc(arcx,arcy,46,0,TAU);ctx.fill();ctx.fillStyle='rgba(255,250,235,0.96)';ctx.beginPath();ctx.arc(arcx,arcy,16,0,TAU);ctx.fill();ctx.restore();}
  else{const mx=W*0.28,my=wy*0.22;ctx.save();ctx.globalAlpha=0.22;ctx.fillStyle='rgba(230,236,250,1)';ctx.beginPath();ctx.arc(mx,my,22,0,TAU);ctx.fill();ctx.restore();ctx.save();ctx.fillStyle='rgba(230,236,250,0.95)';ctx.beginPath();ctx.arc(mx,my,15,0,TAU);ctx.fill();ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.arc(mx+7,my-4,14,0,TAU);ctx.fill();ctx.restore();}
}
function drawTiled(key,parY,baseY,scale,opacity){const im=IMG[key];if(!im)return;const dh=im.height*scale,dw=im.width*scale,off=-(camX()*parY)%dw;ctx.globalAlpha=opacity||1;for(let x=off-dw;x<W+dw;x+=dw)ctx.drawImage(im,x,baseY-dh,dw,dh);ctx.globalAlpha=1;}

function drawAbove(sky,dt){
  const wy=waterY();
  const mScale=Math.max((H*0.34)/META.bg.mountains[1],(W/META.bg.mountains[0])*0.9);
  drawTiled('mountains',0.16,wy+H*0.02,mScale,0.96);
  for(const c of cloudItems){c.x-=c.spd*dt;if(c.x<-400)c.x+=WORLD;}
  ctx.save();
  for(const c of cloudItems){const im=IMG[c.key];if(!im)continue;let sx=((c.x-camX()*0.06)%WORLD);if(sx<-300)sx+=WORLD;if(sx>WORLD-300)sx-=WORLD;const dw=im.width*c.s*0.9,dh=im.height*c.s*0.9,yy=c.y*wy;ctx.globalAlpha=c.op*clamp(1-sky.star*0.7,0.25,1);if(c.flip){ctx.save();ctx.translate(sx+dw,yy);ctx.scale(-1,1);ctx.drawImage(im,0,0,dw,dh);ctx.restore();}else ctx.drawImage(im,sx,yy,dw,dh);}
  ctx.restore();
  drawTiled('treeline',0.30,wy+2,Math.max((W/META.bg.treeline[0])*1.05,(H*0.20)/META.bg.treeline[1]),1);
  drawTiled('shoreline',0.46,wy+H*0.012,Math.max((W/META.bg.shoreline[0])*1.05,(H*0.13)/META.bg.shoreline[1]),1);
  for(const it of shoreItems){const im=IMG[it.key];if(!im)continue;let sx=it.x-camX()*it.layer;sx=((sx%WORLD)+WORLD)%WORLD;if(sx>W+220||sx<-220)continue;const bs=(it.layer>0.55?0.34:it.layer>0.45?0.46:0.62)*it.scale,dw=im.width*bs,dh=im.height*bs,baseY=wy+(it.layer-0.42)*H*0.10;ctx.save();if(it.flip){ctx.translate(sx+dw,baseY-dh);ctx.scale(-1,1);ctx.drawImage(im,0,0,dw,dh);}else ctx.drawImage(im,sx,baseY-dh,dw,dh);ctx.restore();}
}
function drawWaterSurface(sky){
  const wy=waterY(),g=ctx.createLinearGradient(0,wy,0,H);
  g.addColorStop(0,rgb(mix(sky.water,[255,255,255],0.18)));g.addColorStop(0.12,rgb(sky.water));g.addColorStop(1,rgb(mix(sky.water,[0,0,0],0.45)));
  ctx.fillStyle=g;ctx.fillRect(0,wy,W,H-wy);
  if(S.splitT<0.5){const im=IMG['reflection'];if(im){const sc=W/META.bg.reflection[0],dh=im.height*sc;ctx.globalAlpha=0.30*(1-S.splitT*2);const off=-(camX()*0.7)%(im.width*sc);for(let x=off-im.width*sc;x<W;x+=im.width*sc)ctx.drawImage(im,x,wy,im.width*sc,dh);ctx.globalAlpha=1;}}
  ctx.fillStyle='rgba(255,255,255,0.55)';ctx.fillRect(0,wy-1.5,W,2.5);
  const tn=performance.now()*0.001;ctx.save();ctx.strokeStyle=rgba(mix(sky.water,[255,255,255],0.5),0.16);ctx.lineWidth=1.4;
  for(let i=0;i<7;i++){const yy=wy+(H-wy)*(0.10+i*0.13),amp=6+i*2;ctx.beginPath();for(let x=0;x<=W;x+=14){const y=yy+Math.sin(x*0.02+tn*(1+i*0.2)+i)*amp*0.3;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}ctx.restore();
}
function drawUnderwater(sky,dt){
  if(S.splitT<=0.001)return;const wy=waterY(),ubh=H-wy;ctx.save();ctx.globalAlpha=clamp(S.splitT*1.3,0,1);
  const bg=IMG['uw_back'];if(bg)ctx.drawImage(bg,0,0,bg.width,bg.height,0,wy,W,ubh);
  const tint=mix(sky.water,[8,16,30],0.35),dayf=sky.h>6.4&&sky.h<18.6?1:0.3;
  ctx.fillStyle=rgba(tint,0.30+0.32*(1-dayf));ctx.fillRect(0,wy,W,ubh);
  if(dayf>0.8){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=0.05;for(let i=0;i<4;i++){const x=W*(0.2+i*0.2);ctx.fillStyle='rgba(255,250,220,1)';ctx.beginPath();ctx.moveTo(x-10,wy);ctx.lineTo(x+10,wy);ctx.lineTo(x+70,H);ctx.lineTo(x-50,H);ctx.closePath();ctx.fill();}ctx.restore();}
  const rb=IMG['uw_riverbed'];if(rb){const sc=W/META.bg.uw_riverbed[0],dh=rb.height*sc;ctx.globalAlpha=clamp(S.splitT,0,1);ctx.drawImage(rb,0,H-dh,W,dh);}
  const pl=IMG['uw_plants'];if(pl){const sc=W/META.bg.uw_plants[0],dh=pl.height*sc;ctx.globalAlpha=0.9*clamp(S.splitT,0,1);ctx.drawImage(pl,0,H-dh*0.92,W,dh);}
  for(const p of uwProps){const im=IMG[p.key];if(!im)continue;const y=lerp(wy,H,p.depth),dw=im.width*p.s,dh=im.height*p.s;ctx.globalAlpha=0.85*clamp(S.splitT,0,1);if(p.flip){ctx.save();ctx.translate(p.x+dw,y-dh);ctx.scale(-1,1);ctx.drawImage(im,0,0,dw,dh);ctx.restore();}else ctx.drawImage(im,p.x,y-dh,dw,dh);}
  ctx.globalAlpha=1;updateAndDrawFish(dt,wy);
  ctx.fillStyle='rgba(220,240,255,0.5)';for(const b of bubbles){b.y-=b.v*dt;b.x+=Math.sin(b.y*0.05)*0.3;ctx.globalAlpha=b.a*clamp(S.splitT,0,1);ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,TAU);ctx.fill();}
  bubbles=bubbles.filter(b=>b.y>wy-10);ctx.globalAlpha=1;ctx.restore();
  ctx.fillStyle='rgba(255,255,255,0.6)';ctx.fillRect(0,wy-1.5,W,2.5);
}
function updateAndDrawFish(dt,wy){
  const lp=lurePos(),fishing=S.mode==='fishing',ubTop=wy+4,ubH=H-wy-8;
  for(const f of fishes){
    f.ph+=dt*2.2;
    if(f.state==='wander'){f.x+=f.vx*dt;f.y+=Math.sin(f.ph)*6*dt;const b0=ubTop+f.sp.band[0]*ubH,b1=ubTop+f.sp.band[1]*ubH;if(f.y<b0)f.y+=12*dt;if(f.y>b1)f.y-=12*dt;if(f.x<-80){f.x=W+60;f.vx=-Math.abs(f.vx);}if(f.x>W+80){f.x=-60;f.vx=Math.abs(f.vx);}
      if(fishing&&S.fishMode==='idle'){const dx=lp.x-f.x,dy=lp.y-f.y,d=Math.hypot(dx,dy),likes=f.sp.sp.includes(S.lure),inB=(S.lureY>=b0-30&&S.lureY<=b1+40);if(d<155&&likes&&inB){f.interest+=dt*(0.6+(3-f.sp.rar)*0.12);if(f.interest>1)f.state='approach';}else f.interest=Math.max(0,f.interest-dt*0.5);}}
    else if(f.state==='approach'){const dx=lp.x-f.x,dy=lp.y-f.y,d=Math.hypot(dx,dy)||1;f.vx=lerp(f.vx,dx/d*70,0.06);f.y+=dy/d*55*dt;f.x+=f.vx*dt;f.facingDir=dx<0?-1:1;if(d<26&&S.fishMode==='idle')startBite(f);if(S.fishMode!=='idle'&&S.hooked!==f){f.state='wander';f.interest=0;}}
    else if(f.state==='hooked'){f.x=lerp(f.x,lp.x,0.2);f.y=lp.y;}
    else if(f.state==='flee'){f.x+=f.vx*dt*2;f.y+=20*dt;if(f.x<-120||f.x>W+120){f.state='wander';f.interest=0;}}
    drawFish(f);
  }
}
function drawFish(f){
  const im=IMG['fish_'+f.sp.i];if(!im)return;const w=META.fish[f.sp.i][0]*f.size*0.7,h=META.fish[f.sp.i][1]*f.size*0.7,dir=f.facingDir!==undefined?f.facingDir:(f.vx<0?-1:1);
  ctx.save();ctx.translate(f.x,f.y);if(dir>0)ctx.scale(-1,1);ctx.globalAlpha=clamp(S.splitT*1.2,0,1)*(f.state==='wander'?0.96:1);ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore();
  if(f.state==='approach'&&f.interest>0.2){ctx.save();ctx.globalAlpha=clamp(S.splitT,0,1)*0.55;ctx.fillStyle='#ffe9a8';ctx.font='14px sans-serif';ctx.textAlign='center';ctx.fillText('!',f.x,f.y-h/2-6);ctx.restore();}
  if(f.state==='hooked'&&S.struggle>0)drawStruggle(f.x,f.y-h/2-8);
}
function drawStruggle(x,y){ctx.save();const n=8,r=10+Math.sin(performance.now()*0.02)*4;ctx.strokeStyle='rgba(255,224,130,'+clamp(S.struggle,0,1)+')';ctx.lineWidth=2;for(let i=0;i<n;i++){const a=i/n*TAU+performance.now()*0.004;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*r*0.4,y+Math.sin(a)*r*0.4);ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);ctx.stroke();}ctx.restore();}

/* ---- fishing logic ---- */
function startFishing(){if(S.mode==='fishing')return;S.mode='fishing';S.fishMode='idle';S.boatV=0;S.driveDir=0;S.lureY=waterY()+30;S.lureTargetY=waterY()+(H-waterY())*LURES[S.lure].depth*S.rodMax;spawnFish();buildUwProps();SFX.cast();for(let i=0;i<10;i++)bubbles.push({x:lurePos().x+rnd(20,-20),y:waterY()+rnd(60,10),v:rnd(40,15),r:rnd(3,1),a:rnd(0.6,0.2)});}
function stopFishing(){S.mode='cruise';S.fishMode='idle';S.hooked=null;S.tension=0;S.struggle=0;fishes=[];}
function startBite(f){S.fishMode='bite';S.hooked=f;f.state='hooked';S.biteFlash=1;SFX.bite();S.tension=0;S.struggle=0;S.struggleT=rnd(2.4,1.2);setTimeout(()=>{if(S.fishMode==='bite')S.fishMode='fight';},650);}
function updateFight(dt){
  if(S.fishMode!=='fight'||!S.hooked)return;const f=S.hooked,sp=f.sp,wy=waterY(),surf=wy+22;
  S.struggleT-=dt;if(S.struggleT<=0&&S.struggle<=0){S.struggle=1;S.struggleDur=rnd(1.3,0.7)*(0.8+sp.str*0.3);}
  if(S.struggle>0){S.struggleDur-=dt;if(S.struggleDur<=0){S.struggle=0;S.struggleT=rnd(3.2,1.6);}}
  const reeling=S.reelHold,reelSpeed=46/(0.7+sp.fight*0.7),tensRate=reeling?(S.struggle>0?26*sp.str:10):-22;
  S.tension=clamp(S.tension+tensRate*dt*(100/S.lineMax),0,100);
  if(reeling){if(S.struggle>0)f.y+=14*dt;else f.y-=reelSpeed*dt;if(Math.random()<dt*8)SFX.reel();}else f.y+=(S.struggle>0?6:2)*dt;
  S.lureY=f.y;S.lureTargetY=f.y;
  if(S.tension>=100){SFX.snap();f.state='flee';f.vx=(Math.random()<0.5?-1:1)*120;S.hooked=null;S.fishMode='idle';S.struggle=0;toast('The line snapped!');return;}
  if(f.y<=surf)doCatch(f);
}
function doCatch(f){const sp=f.sp,sizeF=rnd(1.25,0.8)*f.size,lengthIn=Math.round((10+sp.rar*6)*sizeF*10)/10,weightLb=Math.round((0.4+sp.rar*1.4)*sizeF*sizeF*10)/10,value=Math.round(sp.val*sizeF);
  S.money+=value;S.fishMode='caught';S.struggle=0;S.tension=0;const j=S.journal[sp.i]||{count:0,best:0};j.count++;j.best=Math.max(j.best,lengthIn);S.journal[sp.i]=j;
  S.catchInfo={sp,lengthIn,weightLb,value,isNew:j.count===1,best:j.best};S.overlay='catch';f.state='hooked';SFX.catch();setTimeout(()=>SFX.coin(),500);persist();}
function cycleLure(d){const owned=S.ownedLures;let idx=owned.indexOf(S.lure);idx=(idx+d+owned.length)%owned.length;S.lure=owned[idx];S.lureTargetY=waterY()+(H-waterY())*LURES[S.lure].depth*S.rodMax;}

/* ---- line + boat ---- */
function drawLine(){
  if(S.mode!=='fishing')return;const bx=W*0.5+BOAT_W()*0.16,by=boatScreenY()-BOAT_W()*0.30,lp=lurePos();
  ctx.save();ctx.strokeStyle='rgba(255,255,255,0.85)';ctx.lineWidth=1.4;ctx.setLineDash([2,7]);ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(lp.x,lp.y);ctx.stroke();ctx.setLineDash([]);
  if(S.fishMode==='idle'||S.fishMode==='bite'){const im=IMG['lure_'+S.lure];if(im){const s=0.18,w=im.width*s,h=im.height*s;ctx.drawImage(im,lp.x-w/2,lp.y-h*0.2,w,h);}}
  ctx.restore();
}
let boatTilt=0;
function drawBoat(){
  const frames=buildCharacter(S.char);let fi=0;
  if(S.mode==='cruise')fi=Math.abs(S.boatV)>8?2:(Math.sin(S.bob*0.5)>0?0:1);
  else{if(S.fishMode==='idle'||S.fishMode==='bite')fi=3;else if(S.fishMode==='fight')fi=S.struggle>0?6:(S.reelHold?4:5);else if(S.fishMode==='caught')fi=7;}
  const im=frames[fi],bw=BOAT_W(),bh=bw*(im.height/im.width),bx=W*0.5,by=boatScreenY();
  boatTilt=lerp(boatTilt,clamp(S.boatV*0.0012,-0.06,0.06),0.1);
  ctx.save();ctx.translate(bx,by);ctx.rotate(boatTilt);if(S.mode==='cruise'&&S.boatFacing<0)ctx.scale(-1,1);ctx.drawImage(im,-bw/2,-bh*0.78,bw,bh);ctx.restore();
  if(S.mode==='cruise'&&Math.abs(S.boatV)>14){ctx.save();ctx.globalAlpha=0.4;ctx.strokeStyle='rgba(255,255,255,0.6)';ctx.lineWidth=2;const dir=S.boatFacing;for(let i=0;i<3;i++){const o=i*14+8;ctx.beginPath();ctx.arc(bx-dir*(bw*0.42+o),by+6+i*3,6+i*3,0.2,Math.PI-0.2);ctx.stroke();}ctx.restore();}
}
function drawAmbient(sky){
  if(sky.la>0.001){ctx.save();ctx.globalCompositeOperation='multiply';ctx.fillStyle=rgba(sky.light,sky.la);ctx.fillRect(0,0,W,waterY());ctx.restore();}
  if(sky.h>17&&sky.h<19.2){ctx.save();ctx.globalCompositeOperation='overlay';ctx.fillStyle='rgba(255,150,80,0.10)';ctx.fillRect(0,0,W,waterY());ctx.restore();}
}

/* ---- UI: buttons + helpers ---- */
const buttons=[];
function btn(x,y,w,h,on){const b={x,y,w,h,on};buttons.push(b);return b;}
function inBtn(b,px,py){return px>=b.x&&px<=b.x+b.w&&py>=b.y&&py<=b.y+b.h;}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function fmtTime(h){h=((h%24)+24)%24;let hr=Math.floor(h);const m=Math.floor((h-hr)*60),ap=hr<12?'AM':'PM';let hh=hr%12;if(hh===0)hh=12;return hh+':'+(m<10?'0'+m:m)+' '+ap;}
function coinIcon(x,y,r){ctx.save();ctx.fillStyle='#e9c34a';ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.fillStyle='#b8901f';ctx.beginPath();ctx.arc(x,y,r*0.62,0,TAU);ctx.fill();ctx.fillStyle='#f4dd84';ctx.font='700 '+r+'px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('S',x,y+0.5);ctx.restore();}
function chip(x,y,w,h,label){ctx.save();rr(x,y,w,h,12);ctx.fillStyle='rgba(10,23,48,0.7)';ctx.fill();ctx.strokeStyle='rgba(184,207,234,0.4)';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#cfe0f4';ctx.font='600 13px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,x+w/2,y+h/2);ctx.restore();}
let toastMsg=null,toastT=0;function toast(m){toastMsg=m;toastT=2.2;}

function buildButtons(){
  buttons.length=0;
  if(S.scene==='title'){btn(0,0,W,H,()=>{audioInit();S.scene='charsel';SFX.tap();});return;}
  if(S.scene==='charsel'){
    const chars=META.chars,cols=2,cw=Math.min(W*0.42,210),ch=92,gap=14,totalW=cols*cw+gap,sx=(W-totalW)/2,sy=H*0.30;
    chars.forEach((c,i)=>{const x=sx+(i%cols)*(cw+gap),y=sy+Math.floor(i/cols)*(ch+gap);btn(x,y,cw,ch,()=>{S.char=c;SFX.tap();});});
    btn((W-200)/2,H-120-BOTI,200,52,()=>{S.scene='play';S.mode='cruise';persist();SFX.tap();});return;
  }
  if(S.scene==='play'){
    if(S.overlay){buildOverlayButtons();return;}
    const pad=14,top=14+TOPI;
    btn(W-58-pad,top,58,40,()=>{S.overlay='menu';SFX.tap();});
    btn(pad,top,150,40,()=>{S.overlay='time';SFX.tap();});
    btn(W-58-pad,top+50,58,34,()=>{setMuted(!S.muted);SFX.tap();});
    if(S.mode==='cruise'){
      const by=H-96-BOTI,bs=84;
      btn(pad,by,bs,bs).hold='left';btn(W-pad-bs,by,bs,bs).hold='right';
      btn((W-160)/2,H-92-BOTI,160,56,()=>{startFishing();SFX.tap();});
      btn(pad,H-150-BOTI,110,40,()=>{S.overlay='shop';SFX.tap();});
      btn(W-pad-110,H-150-BOTI,110,40,()=>{S.overlay='journal';SFX.tap();});
    }else{
      if(S.fishMode==='idle'||S.fishMode==='bite'){
        btn((W-200)/2,H-96-BOTI,200,60).hold='reel';
        btn(W/2-90,H-150-BOTI,76,38,()=>{cycleLure(-1);SFX.tap();});
        btn(W/2+14,H-150-BOTI,76,38,()=>{cycleLure(1);SFX.tap();});
        btn(pad,H-96-BOTI,96,44,()=>{stopFishing();SFX.tap();});
      }else if(S.fishMode==='fight'){btn((W-220)/2,H-100-BOTI,220,64).hold='reel';}
    }
    return;
  }
}

/* ---- HUD + controls ---- */
function drawHUD(){
  const pad=14,top=14+TOPI;
  ctx.save();rr(pad,top,150,40,12);ctx.fillStyle='rgba(10,23,48,0.72)';ctx.fill();ctx.strokeStyle='rgba(184,207,234,0.4)';ctx.lineWidth=1;ctx.stroke();
  ctx.fillStyle='#eef4fb';ctx.font='600 15px system-ui';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(fmtTime(S.t),pad+34,top+21);
  ctx.strokeStyle='#b8cfea';ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(pad+18,top+20,8,0,TAU);ctx.stroke();ctx.beginPath();ctx.moveTo(pad+18,top+20);ctx.lineTo(pad+18,top+15);ctx.moveTo(pad+18,top+20);ctx.lineTo(pad+22,top+22);ctx.stroke();ctx.restore();
  const cw=120;ctx.save();rr(W/2-cw/2,top,cw,40,12);ctx.fillStyle='rgba(10,23,48,0.72)';ctx.fill();ctx.strokeStyle='rgba(184,207,234,0.4)';ctx.lineWidth=1;ctx.stroke();coinIcon(W/2-cw/2+22,top+20,11);ctx.fillStyle='#f4dd84';ctx.font='700 17px system-ui';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(S.money,W/2-cw/2+40,top+21);ctx.restore();
  ctx.save();rr(W-58-pad,top,58,40,12);ctx.fillStyle='rgba(10,23,48,0.72)';ctx.fill();ctx.strokeStyle='rgba(184,207,234,0.4)';ctx.stroke();ctx.strokeStyle='#eef4fb';ctx.lineWidth=2;for(let i=0;i<3;i++){const yy=top+13+i*7;ctx.beginPath();ctx.moveTo(W-58-pad+16,yy);ctx.lineTo(W-58-pad+42,yy);ctx.stroke();}ctx.restore();
  ctx.save();rr(W-58-pad,top+50,58,34,10);ctx.fillStyle='rgba(10,23,48,0.6)';ctx.fill();ctx.fillStyle='#b8cfea';ctx.font='600 12px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(S.muted?'MUTE':'SND',W-58-pad+29,top+67);ctx.restore();
  if(S.mode==='cruise')drawCruiseControls();else drawFishingControls();
}
function drawDpad(x,y,s,dir,active){ctx.save();rr(x,y,s,s,18);ctx.fillStyle=active?'rgba(31,105,255,0.9)':'rgba(10,23,48,0.6)';ctx.fill();ctx.strokeStyle='rgba(184,207,234,0.5)';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#eef4fb';ctx.beginPath();const cx=x+s/2,cy=y+s/2,a=16;if(dir==='left'){ctx.moveTo(cx+a*0.5,cy-a);ctx.lineTo(cx-a*0.7,cy);ctx.lineTo(cx+a*0.5,cy+a);}else{ctx.moveTo(cx-a*0.5,cy-a);ctx.lineTo(cx+a*0.7,cy);ctx.lineTo(cx-a*0.5,cy+a);}ctx.closePath();ctx.fill();ctx.restore();}
function drawCruiseControls(){
  const pad=14,by=H-96-BOTI,bs=84;drawDpad(pad,by,bs,'left',S.driveDir<0);drawDpad(W-pad-bs,by,bs,'right',S.driveDir>0);
  const cx=(W-160)/2;ctx.save();rr(cx,H-92-BOTI,160,56,16);const g=ctx.createLinearGradient(0,H-92-BOTI,0,H-36);g.addColorStop(0,'#2f7bff');g.addColorStop(1,'#1f4fcf');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='rgba(255,255,255,0.4)';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#fff';ctx.font='700 18px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('CAST LINE',cx+80,H-64);ctx.restore();
  chip(pad,H-150-BOTI,110,40,'BAIT SHOP');chip(W-pad-110,H-150-BOTI,110,40,'JOURNAL');
}
function drawFishingControls(){
  const pad=14;
  if(S.fishMode==='idle'||S.fishMode==='bite'){
    const lx=W/2-90,ly=H-150-BOTI;chip(lx,ly,76,38,'<  ');chip(W/2+14,ly,76,38,'  >');
    ctx.save();ctx.fillStyle='#cfe0f4';ctx.font='600 12px system-ui';ctx.textAlign='center';ctx.fillText(LURES[S.lure].n,W/2,ly-8);ctx.restore();
    drawDepthGauge();
    const rx=(W-200)/2;ctx.save();rr(rx,H-96-BOTI,200,60,16);const g=ctx.createLinearGradient(0,H-96-BOTI,0,H-36);g.addColorStop(0,'#2f7bff');g.addColorStop(1,'#1f4fcf');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='rgba(255,255,255,0.4)';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#fff';ctx.font='700 17px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(S.fishMode==='bite'?'FISH ON!':'HOLD TO REEL',rx+100,H-66);ctx.restore();
    chip(pad,H-96-BOTI,96,44,'ROW AWAY');
  }else if(S.fishMode==='fight'){
    drawTensionBar();const rx=(W-220)/2;ctx.save();rr(rx,H-100-BOTI,220,64,16);const danger=S.struggle>0,g=ctx.createLinearGradient(0,H-100-BOTI,0,H-36);if(danger){g.addColorStop(0,'#ff7043');g.addColorStop(1,'#cf3b1f');}else{g.addColorStop(0,'#2f7bff');g.addColorStop(1,'#1f4fcf');}ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='rgba(255,255,255,0.45)';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#fff';ctx.font='700 18px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(danger?'LET IT RUN!':'HOLD TO REEL',rx+110,H-68);ctx.restore();
  }
}
function drawDepthGauge(){const x=W-26,y0=waterY()+10,y1=H-160-BOTI,h=y1-y0,maxD=S.rodMax,lf=clamp((S.lureY-waterY())/(H-waterY()),0,1);ctx.save();ctx.fillStyle='rgba(10,23,48,0.5)';rr(x-6,y0,12,h,6);ctx.fill();const ly=y0+lf*h;ctx.fillStyle='#418fde';ctx.beginPath();ctx.arc(x,clamp(ly,y0,y1),5,0,TAU);ctx.fill();ctx.strokeStyle='rgba(255,120,80,0.6)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-7,y0+h*maxD);ctx.lineTo(x+7,y0+h*maxD);ctx.stroke();ctx.restore();}
function drawTensionBar(){const x=W-30,y0=H*0.16,h=H*0.34;ctx.save();rr(x-7,y0,14,h,7);ctx.fillStyle='rgba(10,23,48,0.6)';ctx.fill();const fh=h*(S.tension/100),col=S.tension>78?'#ff5436':S.tension>55?'#ffb13b':'#41d68f';rr(x-7,y0+h-fh,14,fh,7);ctx.fillStyle=col;ctx.fill();ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=1;rr(x-7,y0,14,h,7);ctx.stroke();ctx.fillStyle='#cfe0f4';ctx.font='600 10px system-ui';ctx.textAlign='center';ctx.translate(x-16,y0+h/2);ctx.rotate(-Math.PI/2);ctx.fillText('TENSION',0,0);ctx.restore();}

/* ---- screens ---- */
function drawTitle(){
  const sky=skyAt(18.3);drawSky(sky);drawAbove(sky,0);drawWaterSurface(sky);drawAmbient(sky);
  const frames=buildCharacter('denim'),im=frames[0],bw=Math.min(W*0.5,300),bh=bw*(im.height/im.width),x=W*0.5+Math.sin(performance.now()*0.0006)*W*0.05;
  ctx.drawImage(im,x-bw/2,waterY()+8-bh*0.78+Math.sin(performance.now()*0.001)*4,bw,bh);
  ctx.save();ctx.textAlign='center';ctx.shadowColor='rgba(0,0,0,0.55)';ctx.shadowBlur=18;ctx.fillStyle='#f0f5fb';ctx.font='800 52px Georgia,serif';ctx.fillText('STILLWATER',W/2,H*0.28);ctx.shadowBlur=0;
  ctx.fillStyle='rgba(240,245,251,0.85)';ctx.font='500 16px system-ui';ctx.fillText('a cozy evening on the lake',W/2,H*0.28+34);
  const a=0.5+0.5*Math.sin(performance.now()*0.003);ctx.globalAlpha=a;ctx.fillStyle='#fff';ctx.font='600 18px system-ui';ctx.fillText('tap to begin',W/2,H*0.74);ctx.globalAlpha=0.32;ctx.fillStyle='#dae1e8';ctx.font='600 12px system-ui';ctx.fillText('KLINEKRAFT',W/2,H-26);ctx.globalAlpha=1;ctx.restore();
}
function drawCharSel(){
  const sky=skyAt(16);drawSky(sky);drawAbove(sky,0);drawWaterSurface(sky);drawAmbient(sky);
  ctx.save();ctx.fillStyle='rgba(6,12,26,0.55)';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.fillStyle='#f0f5fb';ctx.font='800 30px Georgia,serif';ctx.fillText('Choose your angler',W/2,H*0.18);
  const chars=META.chars,cols=2,cw=Math.min(W*0.42,210),ch=92,gap=14,totalW=cols*cw+gap,sx=(W-totalW)/2,sy=H*0.30;
  chars.forEach((c,i)=>{const x=sx+(i%cols)*(cw+gap),y=sy+Math.floor(i/cols)*(ch+gap),sel=S.char===c;rr(x,y,cw,ch,14);ctx.fillStyle=sel?'rgba(31,105,255,0.25)':'rgba(10,23,48,0.6)';ctx.fill();ctx.strokeStyle=sel?'#3f8fff':'rgba(184,207,234,0.4)';ctx.lineWidth=sel?2.5:1.2;ctx.stroke();const fr=buildCharacter(c),im=fr[0],iw=cw*0.8,ih=iw*(im.height/im.width);ctx.drawImage(im,x+cw/2-iw/2,y+ch/2-ih/2-4,iw,ih);ctx.fillStyle='#dfe9f5';ctx.font='600 13px system-ui';ctx.fillText(CHAR_LABEL[c],x+cw/2,y+ch-12);});
  const bx=(W-200)/2,by=H-120-BOTI;rr(bx,by,200,52,16);const g=ctx.createLinearGradient(0,by,0,by+52);g.addColorStop(0,'#2f7bff');g.addColorStop(1,'#1f4fcf');ctx.fillStyle=g;ctx.fill();ctx.fillStyle='#fff';ctx.font='700 18px system-ui';ctx.fillText('SET SAIL',W/2,by+27);
  ctx.globalAlpha=0.3;ctx.font='600 12px system-ui';ctx.fillText('KLINEKRAFT',W/2,H-24);ctx.globalAlpha=1;ctx.restore();
}

/* ---- overlays ---- */
let timeSliderRect=null;
function buildOverlayButtons(){
  const ov=S.overlay,pad=18;btn(W-54-pad,60+TOPI,54,44,()=>{S.overlay=null;SFX.tap();});
  if(ov==='menu'){const items=['shop','char2','journal','time','mute'];items.forEach((it,i)=>{btn((W-240)/2,150+i*70,240,56,()=>{if(it==='mute')setMuted(!S.muted);else S.overlay=it;SFX.tap();});});}
  else if(ov==='shop'){LURES.forEach((l,i)=>{const col=i%3,row=Math.floor(i/3),cw=(W-pad*2-24)/3,ch=110,x=pad+col*(cw+12),y=150+row*(ch+12);btn(x,y,cw,ch,()=>buyOrSelect(i));});const uy=150+3*122+6,uw=(W-pad*2-12)/2;btn(pad,uy,uw,56,buyRod);btn(pad+uw+12,uy,uw,56,buyLine);}
  else if(ov==='char2'){const chars=META.chars,cols=2,cw=Math.min(W*0.42,210),ch=92,gap=14,totalW=cols*cw+gap,sx=(W-totalW)/2,sy=150;chars.forEach((c,i)=>{const x=sx+(i%cols)*(cw+gap),y=sy+Math.floor(i/cols)*(ch+gap);btn(x,y,cw,ch,()=>{S.char=c;persist();SFX.tap();});});}
  else if(ov==='time'){timeSliderRect={x:pad,y:H*0.5-30,w:W-pad*2,h:60};btn(pad,H*0.5-30,W-pad*2,60).slider='time';const presets=[['Dawn',6.6],['Noon',13],['Golden',18.2],['Night',22]];presets.forEach((p,i)=>{const cw=(W-pad*2-30)/4;btn(pad+i*(cw+10),H*0.5+50,cw,46,()=>{S.t=p[1];SFX.tap();});});btn((W-220)/2,H*0.5+130,220,46,()=>{S.timeFlow=!S.timeFlow;SFX.tap();});}
  else if(ov==='catch'){btn((W-200)/2,H-120-BOTI,200,56,()=>{S.overlay=null;S.fishMode='idle';S.hooked=null;SFX.tap();});}
}
function panel(title){ctx.save();ctx.fillStyle='rgba(4,9,20,0.80)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#f0f5fb';ctx.font='800 26px Georgia,serif';ctx.textAlign='center';ctx.fillText(title,W/2,84+TOPI);const pad=18;rr(W-54-pad,60+TOPI,54,44,12);ctx.fillStyle='rgba(31,105,255,0.85)';ctx.fill();ctx.fillStyle='#fff';ctx.font='700 16px system-ui';ctx.textBaseline='middle';ctx.fillText('X',W-54-pad+27,82+TOPI);ctx.restore();}
function drawOverlay(){const ov=S.overlay;if(ov==='menu')drawMenu();else if(ov==='shop')drawShop();else if(ov==='char2')drawCharOverlay();else if(ov==='time')drawTimeOverlay();else if(ov==='journal')drawJournal();else if(ov==='catch')drawCatch();}
function drawMenu(){panel('Paused');const labels=['Bait Shop','Change Angler','Fish Journal','Set Time of Day',S.muted?'Sound: Off':'Sound: On'];labels.forEach((t,i)=>{const x=(W-240)/2,y=150+i*70;ctx.save();rr(x,y,240,56,14);ctx.fillStyle='rgba(10,23,48,0.8)';ctx.fill();ctx.strokeStyle='rgba(184,207,234,0.4)';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#eef4fb';ctx.font='600 17px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t,x+120,y+28);ctx.restore();});}
function drawShop(){
  panel('Bait Shop');const pad=18;ctx.save();ctx.fillStyle='rgba(184,207,234,0.85)';ctx.font='italic 14px Georgia,serif';ctx.textAlign='center';ctx.fillText('"Pick yer poison, friend. The fish are bitin good today."',W/2,120);ctx.restore();
  LURES.forEach((l,i)=>{const col=i%3,row=Math.floor(i/3),cw=(W-pad*2-24)/3,ch=110,x=pad+col*(cw+12),y=150+row*(ch+12),owned=S.ownedLures.includes(i),sel=S.lure===i;ctx.save();rr(x,y,cw,ch,12);ctx.fillStyle=sel?'rgba(31,105,255,0.25)':'rgba(10,23,48,0.7)';ctx.fill();ctx.strokeStyle=sel?'#3f8fff':(owned?'rgba(120,220,150,0.5)':'rgba(184,207,234,0.35)');ctx.lineWidth=sel?2.4:1.2;ctx.stroke();const im=IMG['lure_'+i];if(im){const iw=cw*0.5,ih=iw*(im.height/im.width);ctx.drawImage(im,x+cw/2-iw/2,y+10,iw,Math.min(ih,ch*0.5));}ctx.fillStyle='#dfe9f5';ctx.font='600 11px system-ui';ctx.textAlign='center';ctx.fillText(l.n,x+cw/2,y+ch-26);ctx.font='700 12px system-ui';ctx.fillStyle=owned?'#8fe0a8':'#f4dd84';ctx.fillText(owned?(sel?'EQUIPPED':'OWNED'):(l.cost+' coins'),x+cw/2,y+ch-10);ctx.restore();});
  const uy=150+3*122+6,uw=(W-pad*2-12)/2;shopUpg(pad,uy,uw,56,'Rod  Lv'+S.rodLvl,S.rodLvl>=4?'MAX':(S.rodLvl*120+' coins'),'deeper casts');shopUpg(pad+uw+12,uy,uw,56,'Line  Lv'+S.lineLvl,S.lineLvl>=4?'MAX':(S.lineLvl*100+' coins'),'stronger line');
}
function shopUpg(x,y,w,h,t,c,sub){ctx.save();rr(x,y,w,h,12);ctx.fillStyle='rgba(10,23,48,0.8)';ctx.fill();ctx.strokeStyle='rgba(184,207,234,0.4)';ctx.lineWidth=1;ctx.stroke();ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle='#eef4fb';ctx.font='700 15px system-ui';ctx.fillText(t,x+14,y+24);ctx.fillStyle='#9fb6d0';ctx.font='500 11px system-ui';ctx.fillText(sub,x+14,y+42);ctx.textAlign='right';ctx.fillStyle='#f4dd84';ctx.font='700 13px system-ui';ctx.fillText(c,x+w-14,y+34);ctx.restore();}
function buyOrSelect(i){const l=LURES[i];if(S.ownedLures.includes(i)){S.lure=i;S.lureTargetY=waterY()+(H-waterY())*l.depth*S.rodMax;SFX.tap();}else if(S.money>=l.cost){S.money-=l.cost;S.ownedLures.push(i);S.lure=i;SFX.coin();persist();}else toast('Not enough coins');}
function buyRod(){const cost=S.rodLvl*120;if(S.rodLvl>=4){toast('Rod maxed');return;}if(S.money>=cost){S.money-=cost;S.rodLvl++;S.rodMax=0.55+0.12*S.rodLvl;SFX.coin();persist();}else toast('Need '+cost+' coins');}
function buyLine(){const cost=S.lineLvl*100;if(S.lineLvl>=4){toast('Line maxed');return;}if(S.money>=cost){S.money-=cost;S.lineLvl++;S.lineMax=80+20*S.lineLvl;SFX.coin();persist();}else toast('Need '+cost+' coins');}
function drawCharOverlay(){panel('Change Angler');const chars=META.chars,cols=2,cw=Math.min(W*0.42,210),ch=92,gap=14,totalW=cols*cw+gap,sx=(W-totalW)/2,sy=150;chars.forEach((c,i)=>{const x=sx+(i%cols)*(cw+gap),y=sy+Math.floor(i/cols)*(ch+gap),sel=S.char===c;ctx.save();rr(x,y,cw,ch,14);ctx.fillStyle=sel?'rgba(31,105,255,0.25)':'rgba(10,23,48,0.7)';ctx.fill();ctx.strokeStyle=sel?'#3f8fff':'rgba(184,207,234,0.4)';ctx.lineWidth=sel?2.4:1.2;ctx.stroke();const fr=buildCharacter(c),im=fr[0],iw=cw*0.8,ih=iw*(im.height/im.width);ctx.drawImage(im,x+cw/2-iw/2,y+ch/2-ih/2-4,iw,ih);ctx.fillStyle='#dfe9f5';ctx.font='600 12px system-ui';ctx.textAlign='center';ctx.fillText(CHAR_LABEL[c],x+cw/2,y+ch-10);ctx.restore();});}
function drawTimeOverlay(){
  panel('Set Time of Day');ctx.save();ctx.textAlign='center';ctx.fillStyle='#f0f5fb';ctx.font='700 36px system-ui';ctx.fillText(fmtTime(S.t),W/2,H*0.34);
  const pad=18,x=pad,y=H*0.5-30,w=W-pad*2,h=60;rr(x,y,w,h,16);ctx.fillStyle='rgba(10,23,48,0.7)';ctx.fill();ctx.strokeStyle='rgba(184,207,234,0.4)';ctx.lineWidth=1;ctx.stroke();
  const iw=w-24;for(let i=0;i<iw;i+=4){const hh=(i/iw)*24,sk=skyAt(hh);ctx.fillStyle=rgb(mix(sk.top,sk.hz,0.5));ctx.fillRect(x+12+i,y+12,4,h-24);}
  const hx=x+12+(S.t/24)*iw;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(hx,y+h/2,9,0,TAU);ctx.fill();ctx.strokeStyle='#1f4fcf';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#9fb6d0';ctx.font='500 12px system-ui';ctx.fillText('drag to scrub time',W/2,y+h+22);
  const presets=['Dawn','Noon','Golden','Night'];presets.forEach((p,i)=>{const cw=(W-pad*2-30)/4,bx=pad+i*(cw+10),by=H*0.5+50;rr(bx,by,cw,46,12);ctx.fillStyle='rgba(10,23,48,0.8)';ctx.fill();ctx.strokeStyle='rgba(184,207,234,0.4)';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#dfe9f5';ctx.font='600 13px system-ui';ctx.fillText(p,bx+cw/2,by+28);});
  const fx=(W-220)/2,fy=H*0.5+130;rr(fx,fy,220,46,12);ctx.fillStyle=S.timeFlow?'rgba(31,105,255,0.85)':'rgba(10,23,48,0.8)';ctx.fill();ctx.strokeStyle='rgba(184,207,234,0.4)';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#fff';ctx.font='600 14px system-ui';ctx.fillText(S.timeFlow?'Time flows: ON':'Time flows: OFF',W/2,fy+27);ctx.restore();
}
function drawJournal(){
  panel('Fish Journal');const pad=18,cols=1,rowH=70,sy=130;
  SPECIES.forEach((sp,i)=>{const y=sy+i*rowH,x=pad,w=W-pad*2,j=S.journal[sp.i],caught=j&&j.count>0;ctx.save();rr(x,y,w,rowH-10,12);ctx.fillStyle='rgba(10,23,48,0.7)';ctx.fill();ctx.strokeStyle='rgba(184,207,234,0.3)';ctx.lineWidth=1;ctx.stroke();
    const im=IMG['fish_'+sp.i];if(im){const ih=rowH-26,iw=ih*(im.width/im.height);ctx.save();if(!caught){ctx.globalAlpha=0.18;}ctx.drawImage(im,x+12,y+(rowH-10)/2-ih/2,Math.min(iw,w*0.42),ih);ctx.restore();}
    ctx.textAlign='right';ctx.textBaseline='middle';if(caught){ctx.fillStyle='#eef4fb';ctx.font='600 15px system-ui';ctx.fillText(sp.n,x+w-14,y+22);ctx.fillStyle='#9fb6d0';ctx.font='500 12px system-ui';ctx.fillText('caught '+j.count+'  •  best '+j.best+'"',x+w-14,y+42);}else{ctx.fillStyle='#5a6b82';ctx.font='600 15px system-ui';ctx.fillText('? ? ?',x+w-14,y+30);}
    const stars='★'.repeat(sp.rar)+'';ctx.fillStyle='#d9b94a';ctx.font='12px system-ui';ctx.fillText(stars,x+w-14,y+ (caught?58:48));ctx.restore();});
}
function drawCatch(){
  const ci=S.catchInfo;if(!ci)return;ctx.save();ctx.fillStyle='rgba(4,9,20,0.82)';ctx.fillRect(0,0,W,H);ctx.textAlign='center';
  ctx.fillStyle=ci.isNew?'#ffd98a':'#f0f5fb';ctx.font='800 24px Georgia,serif';ctx.fillText(ci.isNew?'NEW SPECIES!':'Nice catch!',W/2,H*0.24);
  const im=IMG['fish_'+ci.sp.i];if(im){const iw=Math.min(W*0.7,im.width*1.4),ih=iw*(im.height/im.width);ctx.drawImage(im,W/2-iw/2,H*0.30,iw,ih);}
  ctx.fillStyle='#eef4fb';ctx.font='700 22px system-ui';ctx.fillText(ci.sp.n,W/2,H*0.56);
  ctx.fillStyle='#9fb6d0';ctx.font='500 15px system-ui';ctx.fillText(ci.lengthIn+' in  •  '+ci.weightLb+' lb  •  '+'★'.repeat(ci.sp.rar),W/2,H*0.56+28);
  ctx.fillStyle='#f4dd84';ctx.font='700 20px system-ui';ctx.fillText('+ '+ci.value+' coins',W/2,H*0.56+62);
  const bx=(W-200)/2,by=H-120-BOTI;rr(bx,by,200,56,16);const g=ctx.createLinearGradient(0,by,0,by+56);g.addColorStop(0,'#2f7bff');g.addColorStop(1,'#1f4fcf');ctx.fillStyle=g;ctx.fill();ctx.fillStyle='#fff';ctx.font='700 18px system-ui';ctx.fillText('KEEP FISHING',W/2,by+29);ctx.restore();
}

/* ---- input ---- */
let pointer={down:false,x:0,y:0,id:null},heldBtn=null,dragDepth=false,dragTime=false;
function pos(e){const r=cv.getBoundingClientRect();const t=e.touches?e.touches[0]:e;return{x:t.clientX-r.left,y:t.clientY-r.top};}
function onDown(e){
  e.preventDefault();const p=pos(e);pointer.down=true;pointer.x=p.x;pointer.y=p.y;
  buildButtons();
  // hold buttons (drive/reel)
  for(const b of buttons){if(b.hold&&inBtn(b,p.x,p.y)){heldBtn=b.hold;applyHold(b.hold,true);return;}}
  // time slider drag
  if(S.overlay==='time'&&timeSliderRect&&inBtn(timeSliderRect,p.x,p.y)){dragTime=true;scrubTime(p.x);return;}
  // depth drag (tap/hold in water during fishing idle)
  if(S.scene==='play'&&S.mode==='fishing'&&(S.fishMode==='idle'||S.fishMode==='bite')&&p.y>waterY()){dragDepth=true;setDepth(p.y);return;}
  // tap buttons
  for(const b of buttons){if(!b.hold&&b.on&&inBtn(b,p.x,p.y)){b.on();return;}}
}
function onMove(e){if(!pointer.down)return;const p=pos(e);pointer.x=p.x;pointer.y=p.y;
  if(dragTime){scrubTime(p.x);return;}
  if(dragDepth){setDepth(p.y);return;}
}
function onUp(e){pointer.down=false;dragDepth=false;dragTime=false;if(heldBtn){applyHold(heldBtn,false);heldBtn=null;}}
function applyHold(kind,on){if(kind==='left')S.driveDir=on?-1:0;else if(kind==='right')S.driveDir=on?1:0;else if(kind==='reel')S.reelHold=on;}
function setDepth(py){const wy=waterY();const maxY=wy+(H-wy)*S.rodMax;S.lureTargetY=clamp(py,wy+10,maxY);}
function scrubTime(px){if(!timeSliderRect)return;const t=clamp((px-(timeSliderRect.x+12))/(timeSliderRect.w-24),0,1);S.t=t*24;}
cv.addEventListener('mousedown',onDown);window.addEventListener('mousemove',onMove);window.addEventListener('mouseup',onUp);
cv.addEventListener('touchstart',onDown,{passive:false});cv.addEventListener('touchmove',onMove,{passive:false});window.addEventListener('touchend',onUp);window.addEventListener('touchcancel',onUp);
window.addEventListener('keydown',e=>{if(S.scene!=='play')return;if(e.key==='ArrowLeft')S.driveDir=-1;if(e.key==='ArrowRight')S.driveDir=1;if(e.key===' '&&S.mode==='fishing')S.reelHold=true;});
window.addEventListener('keyup',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight')S.driveDir=0;if(e.key===' ')S.reelHold=false;});

/* ---- update ---- */
let birdT=6;
function update(dt){
  if(S.timeFlow&&S.scene==='play'&&!S.overlay)S.t=(S.t+dt*(24/S.dayLen))%24;
  S.bob+=dt*1.6;
  // boat physics (cruise)
  if(S.mode==='cruise'){
    const accel=420,maxV=260*(1+0.12*(S.boatLvl-1));
    if(S.driveDir!==0){S.boatV+=S.driveDir*accel*dt;S.boatFacing=S.driveDir;}
    else S.boatV*=Math.pow(0.0009,dt);
    S.boatV=clamp(S.boatV,-maxV,maxV);S.boatX+=S.boatV*dt;
    if(AU.engGain)AU.engGain.gain.value=clamp(Math.abs(S.boatV)/maxV*0.08,0,0.08);
  }else if(AU.engGain)AU.engGain.gain.value=0;
  // split transition
  const targetSplit=S.mode==='fishing'?1:0;S.splitT=lerp(S.splitT,targetSplit,clamp(dt*4,0,1));
  // lure easing (idle)
  if(S.mode==='fishing'&&(S.fishMode==='idle'||S.fishMode==='bite'))S.lureY=lerp(S.lureY,S.lureTargetY,clamp(dt*3,0,1));
  if(S.fishMode==='fight')updateFight(dt);
  if(S.biteFlash>0)S.biteFlash=Math.max(0,S.biteFlash-dt*2);
  // ambient birds occasionally in daytime
  if(S.scene==='play'&&!S.muted){birdT-=dt;if(birdT<=0){birdT=rnd(22,9);const day=S.t>6&&S.t<20;if(day&&Math.random()<0.6)SFX.bird();}}
  if(toastT>0)toastT-=dt;
}

/* ---- render ---- */
function render(dt){
  if(S.scene==='load'){ctx.fillStyle='#0a1730';ctx.fillRect(0,0,W,H);ctx.fillStyle='#cfe0f4';ctx.font='600 16px system-ui';ctx.textAlign='center';ctx.fillText('loading the lake…',W/2,H/2);return;}
  if(S.scene==='title'){drawTitle();buildButtons();return;}
  if(S.scene==='charsel'){drawCharSel();buildButtons();return;}
  // play
  const sky=skyAt(S.t);
  drawSky(sky);
  drawAbove(sky,dt);
  drawWaterSurface(sky);
  drawAmbient(sky);
  drawUnderwater(sky,dt);
  drawLine();
  drawBoat();
  // bite flash vignette
  if(S.biteFlash>0){ctx.save();ctx.globalAlpha=S.biteFlash*0.3;ctx.fillStyle='#ffe9a8';ctx.fillRect(0,0,W,H);ctx.restore();}
  drawHUD();
  buildButtons();
  if(S.overlay){drawOverlay();}
  // toast
  if(toastT>0){ctx.save();ctx.globalAlpha=clamp(toastT,0,1);const tw=Math.min(W-40,ctx.measureText(toastMsg).width+60);rr(W/2-tw/2,H*0.4,tw,40,12);ctx.fillStyle='rgba(8,16,34,0.9)';ctx.fill();ctx.fillStyle='#eef4fb';ctx.font='600 14px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(toastMsg,W/2,H*0.4+20);ctx.restore();}
}

/* ---- loop + boot ---- */
let last=0;
function frame(ts){const dt=Math.min(0.05,(ts-last)/1000||0);last=ts;update(dt);render(dt);requestAnimationFrame(frame);}
function boot(){resize();loadAll(()=>{buildWorld();S.scene='title';});requestAnimationFrame(frame);}

/* dev hook (harmless; handy for testing) */
window.SW={get s(){return S;},time(h){S.t=h;},money(m){S.money=m;},
 forceCatch(){if(S.mode!=='fishing'){startFishing();} if(!S.hooked){spawnFish();var f=fishes[0];S.hooked=f;f.state='hooked';S.fishMode='fight';} S.hooked.y=waterY()+10; updateFight(0.05);},
 scene(){return S.scene+'/'+S.mode+'/'+S.fishMode;}};

boot();
})();
