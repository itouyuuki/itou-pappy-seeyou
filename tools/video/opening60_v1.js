// 1本目 冒頭1分の仮動画 v1（Vコンテ v6 の 0:00〜1:00）
// 冒頭4カット＝実素材のスロー、それ以降＝未撮影なので構図を作画（1〜2秒台の短いカットに分割）
//
// 使い方（Node。ffmpeg-static / ffprobe-static / @napi-rs/canvas を入れたフォルダを NODE_PATH に指定）
//   node opening60_v1.js <clipsDir> <audio.mp4> <out.mp4>          … 動画を書き出す
//   node opening60_v1.js <clipsDir> - <outDir> --sheet             … 各カットの中間コマを一覧 PNG にする
// clipsDir には 1〜4 のフォルダ（冒頭4カットの連番 jpg、1280x720・30fps）を置く。
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {spawn}=require('child_process');
const fs=require('fs'),path=require('path');
const [CLIPS,AUDIO,OUT,MODE]=process.argv.slice(2);
const W=1280,H=720,FPS=30,TOTAL=60;
const cv=createCanvas(W,H),ctx=cv.getContext('2d');
const FONT='"Noto Sans JP","Yu Gothic","Meiryo",sans-serif';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=u=>{u=clamp(u,0,1);return u*u*(3-2*u);},lerp=(a,b,k)=>a+(b-a)*k;
const nf=n=>Math.floor(n).toLocaleString('ja-JP');

// ---------- 数字（出会い 2019-03-06 → 送別会 2027-03-06。仮） ----------
const SEC=(new Date('2027-03-06')-new Date('2019-03-06'))/1000;
const N={years:8,days:SEC/86400,hours:SEC/3600,secs:SEC};

// ---------- 描画パーツ（Vコンテ v6 から移植） ----------
const INK='#26242e';
const GLOW={pappy:'rgba(255,140,40,.95)',asako:'rgba(90,160,255,.95)',rara:'rgba(110,210,140,.95)',chacha:'rgba(240,120,170,.95)'};
function bgGrad(a,b,y0=0,y1=H){const g=ctx.createLinearGradient(0,y0,0,y1);g.addColorStop(0,a);g.addColorStop(1,b);ctx.fillStyle=g;ctx.fillRect(-200,-200,W+400,H+400);}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}
function rrect(x,y,w,h,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function poly(pts,c){ctx.fillStyle=c;ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();}
function circ(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,Math.max(0,r),0,Math.PI*2);ctx.fill();}
function ell(x,y,rx,ry,c){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function line(x1,y1,x2,y2,w,c){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function text(t,x,y,size,color,align='center',weight=500){ctx.font=`${weight} ${size}px ${FONT}`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(t,x,y);}
function shadowText(t,x,y,size,align='center',weight=500){ctx.save();ctx.shadowColor='rgba(0,0,0,.75)';ctx.shadowBlur=12;text(t,x,y,size,'#fff',align,weight);ctx.restore();}
function subtitle(t,who){ctx.font=`500 30px ${FONT}`;const w=ctx.measureText(t).width+48;ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(640-w/2,620,w,54);text(t,640,647,30,'#fff');if(who)shadowText(who,640,598,16);}
function black(a){if(a<=0)return;ctx.fillStyle=`rgba(0,0,0,${clamp(a,0,1)})`;ctx.fillRect(0,0,W,H);}
function vignette(a){const g=ctx.createRadialGradient(640,360,220,640,360,820);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,0,0,${a})`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
function glow(who,blur=16){if(who&&GLOW[who]){ctx.shadowColor=GLOW[who];ctx.shadowBlur=blur;}else ctx.shadowBlur=0;}
function screenGlow(x,y,r,c='rgba(160,200,255,.35)'){const g=ctx.createRadialGradient(x,y,10,x,y,r);g.addColorStop(0,c);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(-200,-200,W+400,H+400);}
function blurred(px,fn){ctx.save();ctx.filter=`blur(${px}px)`;fn();ctx.restore();}

function fig(x,y,s,o={}){
  const t=o.t||0,pose=o.pose||'stand',view=o.view||'front',d=view==='left'?-1:1,ph=t*(pose==='run'?11:6);
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  glow(o.who);ctx.strokeStyle=ctx.fillStyle=o.color||INK;ctx.lineCap='round';ctx.lineJoin='round';
  const sitting=pose==='sit'||pose==='slump'||pose==='think',hip=sitting?-40:-82,sh=hip-64,side=view==='left'||view==='right';
  const L=(x1,y1,x2,y2,w)=>{ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();};
  const P=(pts,w)=>{ctx.lineWidth=w;ctx.beginPath();pts.forEach(([a,b],i)=>i?ctx.lineTo(a,b):ctx.moveTo(a,b));ctx.stroke();};
  if(sitting){if(side)P([[0,hip],[d*58,hip],[d*62,0]],17);else{P([[-10,hip],[-22,hip+14],[-24,0]],17);P([[10,hip],[22,hip+14],[24,0]],17);}}
  else{L(-9,hip,-12,0,17);L(9,hip,12,0,17);}
  const lean=o.lean||0;
  L(0,hip,lean,sh+6,38);
  if(pose==='think'){P([[-14,sh],[-24,sh+38],[14,sh+44]],13);P([[14,sh],[24,sh+38],[-14,sh+50]],13);}
  else if(pose==='reach'){P([[lean-12,sh],[lean+d*30,sh+20],[lean+d*70,sh+30]],13);P([[lean+12,sh],[lean+d*40,sh+26],[lean+d*78,sh+38]],13);}
  else if(pose==='stick'){P([[-14,sh],[-20,sh+34],[-20,sh+62]],13);P([[14,sh],[-10,sh-30],[-40+Math.sin(t*5)*10,sh-70]],13);}
  else if(sitting&&side){P([[0,sh],[d*24,sh+30],[d*44,sh+36]],13);}
  else{P([[-14,sh],[-20,sh+34],[-20,sh+62]],13);P([[14,sh],[20,sh+34],[20,sh+62]],13);}
  const hx=(side?d*3:0)+lean*1.4,hy=sh-30+(o.head||0);ctx.beginPath();ctx.arc(hx,hy,25,0,Math.PI*2);ctx.fill();
  if(side){ctx.beginPath();ctx.moveTo(hx+d*21,hy-4);ctx.lineTo(hx+d*29,hy+4);ctx.lineTo(hx+d*20,hy+9);ctx.fill();}
  if(view==='back'){ctx.fillStyle='rgba(0,0,0,.35)';ctx.shadowBlur=0;ctx.beginPath();ctx.arc(hx,hy-4,23,Math.PI*1.05,Math.PI*1.95);ctx.fill();}
  ctx.restore();
}
function bust(x,y,s,o={}){
  const view=o.view||'front',d=view==='left'?-1:1,side=view==='left'||view==='right',t=o.t||0,down=o.down||0;
  ctx.save();ctx.translate(x,y+(o.bob?Math.sin(t*o.bob)*4:0));ctx.scale(s,s);ctx.rotate(o.tilt||0);
  glow(o.who,26);ctx.fillStyle=o.color||INK;
  ctx.beginPath();ctx.ellipse(side?-d*20:0,330,side?190:250,170,0,Math.PI,0);ctx.fill();
  ctx.fillRect(-45,120,90,100);
  ctx.save();ctx.translate(0,down*40);ctx.rotate(side?d*down*.35:0);
  ctx.beginPath();ctx.ellipse(side?d*8:0,40,side?104:110,128,0,0,Math.PI*2);ctx.fill();
  if(side){ctx.beginPath();ctx.moveTo(d*100,10);ctx.lineTo(d*132,52);ctx.lineTo(d*100,62);ctx.fill();ctx.beginPath();ctx.moveTo(d*96,88);ctx.lineTo(d*112,96);ctx.lineTo(d*90,128);ctx.fill();}
  if(view==='back'){ctx.shadowBlur=0;ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(0,20,104,118,0,Math.PI,0);ctx.fill();}
  ctx.restore();ctx.restore();
}
function arm(x0,y0,x1,y1,w,c=INK){line(x0,y0,x1,y1,w,c);circ(x1,y1,w*.62,c);}
function laptop(x,y,s,screen){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  rrect(-300,-370,600,380,14,'#1d1f24');ctx.save();ctx.beginPath();ctx.rect(-280,-350,560,340);ctx.clip();screen(-280,-350,560,340);ctx.restore();
  poly([[-330,10],[330,10],[370,40],[-370,40]],'#3a3d44');ctx.restore();
}
function deskRoom(){bgGrad('#14161d','#0b0c10');rect(-200,520,W+400,400,'#1c1a17');}

// ---------- カフェの背景 ----------
// 窓のある壁・ペンダントライト・床。k＝暗さ（0〜1）
function cafe(o={}){
  bgGrad('#dcc8aa','#9a8061');
  const wx=o.winX??120;
  for(let i=0;i<3;i++){const x=wx+i*330;rect(x,70,270,330,'#f6ead2');const g=ctx.createLinearGradient(x,70,x,400);g.addColorStop(0,'rgba(255,250,230,.9)');g.addColorStop(1,'rgba(240,215,170,.6)');ctx.fillStyle=g;ctx.fillRect(x,70,270,330);rect(x+130,70,10,330,'#6b5038');rect(x,230,270,8,'#6b5038');ctx.strokeStyle='#6b5038';ctx.lineWidth=12;ctx.strokeRect(x,70,270,330);}
  rect(-200,400,W+400,14,'#7b5f44');rect(-200,520,W+400,400,'#5a4632');
  if(o.lamps!==false)[300,640,980].forEach(x=>lamp(x,o.lampY??120));
}
function lamp(x,y,s=1){line(x,-200,x,y-30*s,3*s,'#2c2620');poly([[x-16*s,y-30*s],[x+16*s,y-30*s],[x+46*s,y+18*s],[x-46*s,y+18*s]],'#2c2620');ell(x,y+18*s,46*s,8*s,'#ffe7ad');screenGlow(x,y+30*s,150*s,'rgba(255,225,160,.35)');}
function table(x,y,w){rrect(x-w/2,y,w,24,6,'#3a2d20');rect(x-10,y+24,20,200,'#2c2218');}
function cup(x,y,s=1){rrect(x-18*s,y-30*s,36*s,30*s,5*s,'#f4f1ea');ctx.strokeStyle='#f4f1ea';ctx.lineWidth=5*s;ctx.beginPath();ctx.arc(x+20*s,y-16*s,9*s,-Math.PI/2,Math.PI/2);ctx.stroke();ell(x,y,26*s,5*s,'#e3ded2');}
function steam(x,y,t,s=1){ctx.save();ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=4*s;ctx.lineCap='round';for(let i=0;i<2;i++){ctx.beginPath();for(let k=0;k<=10;k++){const yy=y-k*14*s,xx=x+(i*22-11)*s+Math.sin(k*.7+t*2+i*2)*8*s;k?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);}ctx.stroke();}ctx.restore();}
function question(x,y,size,t,i=0){shadowText('？',x,y+Math.sin(t*3+i)*6,size,'center',700);}

// ---------- 画面の中身 ----------
function browser(x,y,w,h,u){
  rect(x,y,w,h,'#fff');rect(x,y,w,h*.11,'#e8eaed');circ(x+w*.03,y+h*.055,h*.018,'#f66');circ(x+w*.06,y+h*.055,h*.018,'#fc5');circ(x+w*.09,y+h*.055,h*.018,'#6c6');
  rrect(x+w*.14,y+h*.2,w*.72,h*.13,h*.065,'#f1f3f4');const q='送別会 思い出に残る内容',n=Math.ceil(clamp(u/.45,0,1)*q.length);
  text(q.slice(0,n)+(u<.5&&Math.floor(u*30)%2?'|':''),x+w*.18,y+h*.265,h*.065,'#222','left');
  for(let i=0;i<4;i++){const a=clamp((u-.55-i*.07)/.1,0,1);if(a<=0)continue;ctx.globalAlpha=a;rect(x+w*.14,y+h*.42+i*h*.14,w*.42,h*.035,'#1a0dab');rect(x+w*.14,y+h*.47+i*h*.14,w*.62-(i*37%60),h*.022,'#bbb');rect(x+w*.14,y+h*.505+i*h*.14,w*.5,h*.022,'#ccc');ctx.globalAlpha=1;}
}
const THUMB=['#f2c6a0','#9cc3e6','#a8d5a2','#f4b6c2','#f5d58a','#c9b8e8'];
function explorer(x,y,w,h,u,o={}){
  rect(x,y,w,h,'#f4f5f7');rect(x,y,w,h*.1,'#dfe3ea');text('ぱっぴー素材　'+Math.floor(lerp(o.n0??3,o.n1??148,smooth(u)))+' 個',x+w*.03,y+h*.05,h*.05,'#333','left',600);
  const cols=o.cols||6,cw=w/(cols+.4),chh=cw*.66,n=Math.floor(lerp(o.t0??3,o.t1??30,u)),rows=Math.floor((h*.86)/(chh));
  for(let i=0;i<n;i++){const r=Math.floor(i/cols)-Math.max(0,Math.ceil(n/cols)-rows);if(r<0)continue;const tx=x+cw*.2+(i%cols)*cw,ty=y+h*.14+r*chh;rrect(tx,ty,cw*.86,chh*.8,4,THUMB[i%6]);poly([[tx+cw*.36,ty+chh*.25],[tx+cw*.36,ty+chh*.55],[tx+cw*.54,ty+chh*.4]],'rgba(255,255,255,.8)');}
}
function noteList(){
  rect(-200,-200,W+400,H+400,'#8a6b4a');rect(330,60,620,640,'#fbfaf3');for(let i=0;i<11;i++)line(360,170+i*48,920,170+i*48,1,'#c9d6e6');
  text('ぱっぴー福島行き　送別会でやること',640,112,30,'#222','center',700);line(390,138,890,138,3,'#222');
  ['・飲み会','・寄せ書き','・アルバム','・みんなで旅行','・花束とプレゼント','・動画制作','・サプライズで登場'].forEach((s,i)=>text(s,400+(i%2)*10,180+i*58+(i%3)*2,26,'#333','left'));
}
function sticky(x,y,r,label,c,s=1){ctx.save();ctx.translate(x,y);ctx.rotate(r);ctx.scale(s,s);ctx.shadowColor='rgba(0,0,0,.25)';ctx.shadowBlur=10;ctx.shadowOffsetY=4;rect(-80,-60,160,120,c);ctx.shadowColor='transparent';text(label,0,0,28,'#333','center',700);ctx.restore();}
const NCOL=['#fff17a','#ffb3c7','#9fe0ff'];

// ---------- カット（未撮影の場面を短く分割） ----------
// [秒, 名前, 描画(u,t), {cam, line:[セリフ,話者]}]
const real={}; // 実素材のコマ（その都度読み込む）
const CUTS=[
// ② カフェで3人一緒に知る（6.0秒 → 4カット）
[1.8,'カフェ・引き',(u,t)=>{cafe();table(640,500,420);cup(540,500);cup(740,500);steam(540,465,t,.8);
  fig(330,650,2,{pose:'sit',view:'right',who:'rara',t});fig(640,650,2,{pose:'sit',view:'front',who:'chacha',t,head:Math.sin(t*5)*2});fig(950,650,2,{pose:'sit',view:'left',who:'asako',t});},{cam:{z0:1,z1:1.07}}],
[1.4,'ちゃちゃ「福島行き決まったって」',(u,t)=>{cafe({winX:-60,lamps:false});lamp(1040,90,1.3);bust(560,300,.95,{who:'chacha',t,bob:5});rrect(770,470,96,170,14,'#111');rrect(778,482,80,146,8,'#bcd3f0');screenGlow(818,550,170);arm(900,820,850,640,46);},
  {cam:{z0:1.04,z1:1.04},line:['ぱっぴー、福島行き決まったって','（誰が言うかは仮）']}],
[1.2,'カップに伸びた手が止まる',(u,t)=>{bgGrad('#b89c78','#8b7153');rect(-200,430,W+400,500,'#3a2d20');rect(-200,430,W+400,10,'#5a4632');cup(560,470,4.2);steam(560,330,t,2.2);
  const k=smooth(u/.35);arm(1500,560,lerp(1150,880,k),lerp(520,470,k),90);},{cam:{z0:1.05,z1:1.1}}],
[1.6,'あさこ「そっかー…」',(u,t)=>{cafe({winX:-180,lamps:false});rect(-200,-200,W+400,H+400,'rgba(60,45,30,.25)');bust(640,285,1.1,{who:'asako',down:.2*smooth((u-.25)*2)});},{cam:{z0:1,z1:1.1},line:['そっかー…','あさこ']}],
// ③ 「送別会やりたいわ！」→「何するの？」→「うーん？？」（15.0秒 → 9カット）
[1.5,'身を乗り出す（横）',(u,t)=>{cafe({winX:-240});table(520,520,700);cup(360,520,1.4);cup(560,520,1.4);
  const k=smooth(u/.3);blurred(10,()=>bust(120,330,1.0,{view:'back',who:'rara'}));bust(lerp(1040,900,k),lerp(300,270,k),.95,{view:'left',who:'asako'});arm(lerp(1100,980,k),640,lerp(900,760,k),530,44);
  if(u>.3&&u<.6){ctx.globalAlpha=1-(u-.3)/.3;for(let i=0;i<4;i++)line(700-i*18,500-i*6,670-i*22,470-i*16,5,'#fff');ctx.globalAlpha=1;}},{}],
[1.8,'あさこ「送別会やりたいわ！」',(u,t)=>{cafe({winX:-100,lamps:false});bust(640,265,1.12,{who:'asako',t,bob:9});
  ctx.save();ctx.globalAlpha=clamp(1-u*1.5,0,1)*.8;ctx.strokeStyle='#fff';ctx.lineWidth=6;ctx.lineCap='round';for(let i=0;i<10;i++){const a=i/10*Math.PI*2+.3;ctx.beginPath();ctx.moveTo(640+Math.cos(a)*330,300+Math.sin(a)*260);ctx.lineTo(640+Math.cos(a)*(390+u*60),300+Math.sin(a)*(310+u*60));ctx.stroke();}ctx.restore();},
  {cam:{z0:1.14,z1:1.02,fast:1},line:['送別会やりたいわ！','あさこ']}],
[1.2,'らら・ちゃちゃ、顔を見合わせる',(u,t)=>{cafe({winX:60});const k=smooth((u-.2)/.3);bust(360,320,.85,{view:k>.5?'right':'front',who:'rara'});bust(920,320,.85,{view:k>.5?'left':'front',who:'chacha'});},{cam:{z0:1.03,z1:1.06}}],
[2.0,'らら「え、何するの？」（肩越し）',(u,t)=>{cafe({winX:-200,lamps:false});lamp(260,80,1.2);bust(470,300,.82,{view:'right',who:'rara',t,bob:4});blurred(12,()=>bust(1080,390,1.25,{view:'back',who:'asako'}));},{cam:{z0:1,z1:1.05},line:['え、何するの？','らら（誰が言うかは仮）']}],
[1.0,'ちゃちゃ、うんうんとうなずく',(u,t)=>{cafe({winX:100,lamps:false});bust(640,290,1.0,{who:'chacha',down:.25*(Math.sin(u*Math.PI*4-1.2)*.5+.5)});},{}],
[2.0,'あさこ「うーん？？」',(u,t)=>{cafe({winX:-100,lamps:false});bust(640,285,1.0,{who:'asako',tilt:Math.sin(t*1.6)*.07});ctx.globalAlpha=clamp((u-.15)/.15,0,1);question(880,130,84,t);if(u>.45)question(960,220,56,t,1);ctx.globalAlpha=1;},{line:['うーん？？','あさこ']}],
[1.5,'目が泳ぐ（天井のライト）',(u,t)=>{bgGrad('#6e5a44','#a48a69');for(let i=0;i<6;i++)poly([[i*260-200,-50],[i*260-120,-50],[i*200+100,800],[i*200+20,800]],'rgba(60,45,30,.35)');
  const x=640+Math.sin(u*Math.PI*1.5)*180,y=330+Math.cos(u*Math.PI*2)*40;screenGlow(x,y,420,'rgba(255,225,160,.5)');circ(x,y,120,'#2c2620');circ(x,y,84,'#fff3cf');circ(x,y,40,'#fffdf4');},{cam:{z0:1.1,z1:1.1,p0:[60,0],p1:[-60,20]}}],
[2.0,'3人で腕組み',(u,t)=>{cafe();table(640,510,760);['rara','chacha','asako'].forEach((w,i)=>{fig(400+i*240,660,1.95,{pose:'think',who:w,t,head:Math.sin(t*2+i*2)*3});if(u>.2+i*.15)question(400+i*240,270,48,t,i);});[480,640,800].forEach(x=>cup(x,510));},{cam:{z0:1,z1:1.05}}],
[2.0,'テーブル真上（腕組みが3つ）',(u,t)=>{rect(-200,-200,W+400,H+400,'#5a4632');for(let i=0;i<14;i++)rect(-200,i*70-100,W+400,3,'rgba(0,0,0,.18)');
  ctx.save();ctx.translate(640,370);ctx.scale(.74,.74);ctx.rotate(lerp(-.06,.06,u));circ(0,0,250,'#3a2d20');circ(0,0,238,'#4a3a2a');
  [['rara',-2.1-Math.PI/2],['chacha',-Math.PI/2],['asako',2.1-Math.PI/2]].forEach(([w,a],i)=>{ctx.save();ctx.rotate(a+Math.PI/2);ctx.translate(0,-330);glow(w,22);ell(0,-40,120,70,INK);circ(0,20,46,INK);ctx.shadowBlur=0;ctx.rotate(Math.sin(t*2+i)*.03);rrect(-90,70,180,34,17,INK);rrect(-80,96,160,30,15,'#34313d');ctx.restore();
    ctx.save();ctx.rotate(a+Math.PI/2);circ(0,-130,30,'#e3ded2');circ(0,-130,22,'#5b3a22');ctx.restore();});ctx.restore();},{}],
// ④ 家で何をするか悩む →「動画制作」に〇 → 張り切る（22.9秒 → 14カット）
[1.5,'夜、家の外観',(u,t)=>{bgGrad('#0b1226','#1b2440');for(let i=0;i<40;i++)circ((i*211)%W,(i*97)%330,1+(i%3)*.6,`rgba(255,255,255,${.3+.3*Math.sin(t*2+i)})`);circ(1040,130,44,'#f3ecd0');
  poly([[340,330],[640,170],[940,330]],'#0a0d18');rect(380,330,520,400,'#0d111f');rect(690,400,150,130,'#ffd98a');rect(761,400,6,130,'#0d111f');rect(690,462,150,6,'#0d111f');screenGlow(765,465,260,'rgba(255,210,130,.35)');
  ctx.save();ctx.beginPath();ctx.rect(690,400,150,130);ctx.clip();circ(740+Math.sin(t)*8,560,60,'#3a2d20');circ(740+Math.sin(t)*8,470,26,'#3a2d20');ctx.restore();rect(-200,650,W+400,200,'#070910');},{cam:{z0:1,z1:1.08}}],
[1.8,'付箋を貼る手（寄り）',(u,t)=>{rect(-200,-200,W+400,H+400,'#d8d2c6');sticky(250,200,-.05,'寄せ書き',NCOL[1],1.9);sticky(1080,560,.06,'アルバム',NCOL[2],1.9);
  const k=smooth(u/.4),out=smooth((u-.6)/.4);sticky(660,lerp(420,330,k),lerp(.2,.03,k),'飲み会',NCOL[0],2.1);arm(lerp(1500,1300,out)+0,1000,lerp(760,760+out*300,1)-0,lerp(520,430,k)+out*200,110);},{cam:{z0:1,z1:1.05}}],
[2.2,'壁いっぱいの付箋（タイムラプス）',(u,t)=>{rect(-200,-200,W+400,H+400,'#d8d2c6');rect(-200,640,W+400,200,'#8a775f');const L=['飲み会','寄せ書き','アルバム','旅行','花束','手紙','サプライズ','動画？'],ORD=[[0,1,2,3,4,5,6,7],[2,0,5,1,7,3,4,6],[4,7,0,6,2,1,3,5],[6,3,1,5,0,7,2,4]],p=Math.min(3,Math.floor(u*4)),n=Math.min(8,Math.floor(u/.3*8)+2);
  for(let i=0;i<n;i++){const sl=ORD[p][i];sticky(230+(sl%4)*230,140+Math.floor(sl/4)*180,((i*7)%5-2)*.03,L[i],NCOL[i%3]);}
  const fx=1060+Math.sin(Math.floor(u*8)*2.1)*70;fig(fx,720,2.1,{pose:Math.floor(u*8)%2?'stick':'stand',view:'back',who:'asako',t:t*3});},{}],
[1.4,'付箋が1枚、床に落ちる',(u,t)=>{bgGrad('#cfc8ba','#b9b1a2',0,300);rect(-200,300,W+400,30,'#8d7a62');rect(-200,330,W+400,500,'#7a6650');for(let i=0;i<8;i++)line(i*190-100,330,i*240-300,900,2,'rgba(0,0,0,.15)');
  sticky(360,560,.5,'花束',NCOL[2],1.3);sticky(980,610,-.4,'手紙',NCOL[0],1.3);const k=clamp(u/.7,0,1),y=lerp(-80,520,k*k);sticky(650+Math.sin(k*9)*70,y,k*2.6+.2,'旅行',NCOL[1],1.4);
  blurred(8,()=>{rrect(1080,180,90,560,40,INK);rrect(1180,220,90,560,40,INK);});},{cam:{z0:1.05,z1:1.05}}],
[1.6,'キーボードを打つ手',(u,t)=>{rect(-200,-200,W+400,H+400,'#16171c');screenGlow(640,80,620);rrect(180,280,920,360,20,'#2c2e35');for(let r=0;r<4;r++)for(let c=0;c<13;c++){const hit=(Math.floor(t*12)+r*5+c*3)%17===0;rrect(214+c*66,312+r*72,58,58,7,hit?'#6d7280':'#43464f');}
  arm(-80,950,430+Math.sin(t*15)*26,480+Math.cos(t*11)*10,84);arm(1360,950,850+Math.cos(t*14)*26,480+Math.sin(t*12)*10,84);},{cam:{z0:1.06,z1:1.1}}],
[2.0,'「送別会 思い出に残る内容」で検索',(u,t)=>{rect(-200,-200,W+400,H+400,'#0c0d12');browser(90,40,1100,640,u);},{cam:{z0:1,z1:1.1,p0:[0,60],p1:[0,20]}}],
[1.5,'画面の光に照らされる顔',(u,t)=>{rect(-200,-200,W+400,H+400,'#0a0b10');const f=.32+.08*Math.sin(t*9)*Math.sin(t*2.3);screenGlow(640,470,560,`rgba(170,205,255,${f})`);bust(640,290,1.05,{who:'asako',tilt:Math.sin(t*.8)*.02});},{cam:{z0:1,z1:1.08}}],
[2.0,'ノートのリスト（真上）',(u,t)=>{noteList();const k=smooth(u/.8);arm(1250,900,lerp(1040,560,k),lerp(660,520,k),60);line(lerp(1040,560,k),lerp(660,520,k),lerp(1040,560,k)-46,lerp(660,520,k)-40,8,'#c33');},{cam:{z0:1,z1:1.12,p0:[0,0],p1:[40,-60]}}],
[2.0,'「動画制作」に〇（寄り）',(u,t)=>{noteList();const cx=480,cy=472,ck=smooth(u/.6),a=-Math.PI*.6+ck*Math.PI*2.15;ctx.strokeStyle='#c33';ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.ellipse(cx,cy,104,30,-.05,-Math.PI*.6,a);ctx.stroke();
  const px=u<.6?cx+Math.cos(a)*104:lerp(cx+90,cx+320,smooth((u-.6)/.4)),py=u<.6?cy+Math.sin(a)*30:lerp(cy+10,cy+140,smooth((u-.6)/.4));line(px,py,px+60,py+52,9,'#c33');arm(px+330,py+320,px+70,py+62,46);},{cam:{z0:2.3,z1:2.5,p0:[380,-250],p1:[400,-270]}}],
[1.0,'よし！と拳を握る',(u,t)=>{deskRoom();screenGlow(640,430,560,'rgba(255,220,160,.3)');bust(600,300,1.0,{who:'asako',t,bob:10});const k=smooth(u/.3);arm(980,800,lerp(900,880,k),lerp(600,330,k),70);ctx.globalAlpha=clamp((u-.25)/.15,0,1);shadowText('よし！',1060,200,46,'center',700);ctx.globalAlpha=1;},{}],
[2.0,'素材フォルダが増えていく',(u,t)=>{deskRoom();screenGlow(640,330,460);laptop(640,560,1.05,(x,y,w,h)=>explorer(x,y,w,h,u));blurred(14,()=>bust(150,480,1.15,{view:'back',who:'asako',bob:10,t}));},{cam:{z0:1,z1:1.08}}],
[1.5,'画面いっぱいの素材。次々ドラッグ',(u,t)=>{rect(-200,-200,W+400,H+400,'#0c0d12');explorer(60,30,1160,660,u,{cols:7,n0:148,n1:212,t0:21,t1:35});const k=(u*2)%1,mx=lerp(300,900,smooth(k)),my=lerp(260,520,smooth(k));ctx.globalAlpha=.75;rrect(mx-70,my-45,140,90,6,THUMB[Math.floor(u*2)%6]);ctx.globalAlpha=1;poly([[mx,my],[mx,my+34],[mx+9,my+26],[mx+16,my+40],[mx+22,my+37],[mx+15,my+23],[mx+26,my+23]],'#111');},{cam:{z0:1.06,z1:1.02}}],
[1.4,'ぱっぴーの動画を再生（実素材を画面に）',(u,t,img)=>{deskRoom();screenGlow(640,330,560,'rgba(255,210,160,.3)');rrect(250,60,780,470,16,'#111');if(img)ctx.drawImage(img,270,78,740,416);rect(270,502,740,6,'#333');rect(270,502,740*u,6,'#e33');poly([[580,530],[700,530],[740,600],[540,600]],'#2a2c33');rrect(440,596,400,16,6,'#3a3d44');},{cam:{z0:1,z1:1.12,p0:[0,40],p1:[0,60]},real:3}],
[1.0,'思わず吹き出す',(u,t)=>{rect(-200,-200,W+400,H+400,'#14161d');screenGlow(900,400,620,'rgba(255,210,160,.34)');bust(520,300,.95,{view:'right',who:'asako',bob:u>.2?20:0,t,down:u>.2?.12:0});ctx.globalAlpha=clamp((u-.2)/.12,0,1);shadowText('ぶはっ',300,120,44,'center',700);ctx.globalAlpha=1;},{}],
];

// ---------- タイムライン ----------
const segs=[];let T=0;
segs.push({type:'black',start:0,end:1.2});T=1.2;
[3.7,3.7,3.7,3.8].forEach((d,i)=>{segs.push({type:'real',n:i+1,start:T,end:T+d});T+=d;});
CUTS.forEach(([d,name,draw,o])=>{segs.push({type:'draw',name,draw,o:o||{},start:T,end:T+d});T=Math.round((T+d)*1000)/1000;});
if(Math.abs(T-TOTAL)>.05)console.error('注意：合計が '+T+' 秒（60秒とずれている）');

const imgCache=new Map();
async function clipFrame(n,idx){const dir=path.join(CLIPS,String(n));if(!imgCache.has(n))imgCache.set(n,fs.readdirSync(dir).filter(f=>/\.jpg$/.test(f)).sort());const fl=imgCache.get(n);return loadImage(path.join(dir,fl[clamp(idx,0,fl.length-1)]));}

async function render(t){
  t=clamp(t,0,TOTAL-1e-6);const s=segs.find(x=>t>=x.start&&t<x.end)||segs[segs.length-1],d=s.end-s.start,lt=t-s.start,u=lt/d;
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.filter='none';rect(0,0,W,H,'#000');
  if(s.type==='real'){
    const img=await clipFrame(s.n,Math.floor(lt*FPS)),z=1+.04*u;ctx.save();ctx.translate(640,360);ctx.scale(z,z);ctx.drawImage(img,-640,-360,W,H);ctx.restore();
    const g=ctx.createLinearGradient(0,0,0,260);g.addColorStop(0,'rgba(0,0,0,.45)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,260);vignette(.35);
    if(s.n===1)black(1-lt/1.2);
    ctx.globalAlpha=clamp((lt-.3)/.5,0,1)*clamp((d-lt)/.3,0,1);
    const str=[`長野で一緒に ${N.years}年`,`${nf(N.days)}日`,`${nf(N.hours)}時間`,null][s.n-1];
    if(str)shadowText(str,640,112,s.n>1?56:44,'center',300);
    else shadowText(nf(N.secs-(N.secs*.03)*(1-smooth(lt/2.5)))+'秒',640,112,56,'center',300);
    ctx.globalAlpha=1;
  }else if(s.type==='draw'){
    const c=s.o.cam||{z0:1.02,z1:1.05},k=c.fast?smooth(u*3):smooth(u),z=lerp(c.z0||1,c.z1||c.z0||1,k),p0=c.p0||[0,0],p1=c.p1||p0;
    const img=s.o.real?await clipFrame(s.o.real,Math.floor(lt*FPS)+20):null;
    ctx.save();ctx.translate(640+lerp(p0[0],p1[0],k),360+lerp(p0[1],p1[1],k));ctx.scale(z,z);ctx.translate(-640,-360);s.draw(u,t,img);ctx.restore();
    ctx.shadowBlur=0;ctx.globalAlpha=1;vignette(.42);
    if(s.o.line&&u>.12)subtitle('「'+s.o.line[0]+'」',s.o.line[1]);
  }
  black((t-(TOTAL-.7))/.7);
  return s;
}

(async()=>{
  if(MODE==='--sheet'){
    const list=segs.filter(s=>s.type!=='black'),per=16,cw=480,chh=270;fs.mkdirSync(OUT,{recursive:true});
    for(let p=0;p*per<list.length;p++){const part=list.slice(p*per,(p+1)*per),sh=createCanvas(cw*4,chh*Math.ceil(part.length/4)),sx=sh.getContext('2d');
      for(let i=0;i<part.length;i++){const s=part[i];await render(s.start+(s.end-s.start)*.62);sx.drawImage(cv,(i%4)*cw,Math.floor(i/4)*chh,cw,chh);sx.fillStyle='rgba(0,0,0,.7)';sx.fillRect((i%4)*cw,Math.floor(i/4)*chh,cw,26);sx.font=`500 15px ${FONT}`;sx.fillStyle='#ffd24a';sx.textBaseline='middle';sx.fillText(`${s.start.toFixed(1)}s (${(s.end-s.start).toFixed(1)}) ${s.name||'実素材'+s.n}`,(i%4)*cw+6,Math.floor(i/4)*chh+13);}
      fs.writeFileSync(path.join(OUT,`sheet${p+1}.png`),sh.toBuffer('image/png'));}
    console.log('sheets ok',list.length,'cuts');return;
  }
  const ff=spawn(require('ffmpeg-static'),['-v','error','-y','-f','rawvideo','-pix_fmt','rgba','-s',`${W}x${H}`,'-r',String(FPS),'-i','-','-i',AUDIO,'-map','0:v','-map','1:a','-t',String(TOTAL),
    '-af',`afade=t=out:st=${TOTAL-1.2}:d=1.2`,'-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',OUT],{stdio:['pipe','inherit','inherit']});
  const n=TOTAL*FPS;
  for(let i=0;i<n;i++){await render(i/FPS);if(!ff.stdin.write(cv.data()))await new Promise(r=>ff.stdin.once('drain',r));if(i%300===0)console.log('frame',i,'/',n);}
  ff.stdin.end();ff.on('close',c=>console.log('ffmpeg exit',c));
})();
