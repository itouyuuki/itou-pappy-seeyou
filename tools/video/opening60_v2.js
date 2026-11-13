// 1本目 冒頭1分の仮動画 v2（Vコンテ v6 の 0:00〜1:00。未撮影の場面を実写風の1枚絵に差し替え）
// 冒頭4カット＝実素材のスロー、それ以降＝AI生成の実写風スチル（PHOTOS のフォルダ）にカメラの動きを付ける
//
// 使い方（Node。ffmpeg-static / ffprobe-static / @napi-rs/canvas を入れたフォルダを NODE_PATH に指定）
//   node opening60_v2.js <clipsDir> <audio.mp4> <out.mp4>          … 動画を書き出す
//   node opening60_v2.js <clipsDir> - <outDir> --sheet             … 各カットの中間コマを一覧 PNG にする
// clipsDir には 1〜4 のフォルダ（冒頭4カットの連番 jpg、1280x720・30fps）を置く。
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const {spawn}=require('child_process');
const fs=require('fs'),path=require('path');
const [CLIPS,AUDIO,OUT,MODE]=process.argv.slice(2);
const PHOTOS=process.env.PHOTOS||path.join(__dirname,"../../deliverables/20261113_実写風スチル");
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

// ---------- カット（未撮影の場面。実写風の1枚絵＋カメラの動き。画面の中身だけ作画） ----------
// [秒, 名前, 描画(u,t,実素材コマ,写真), {photo:ファイル名, cam, line:[セリフ,話者], real}]
function ph(img){if(img)ctx.drawImage(img,0,0,W,H);}
function ink(str,x,y,size,o={}){ctx.save();ctx.translate(x,y);ctx.rotate(o.rot||0);ctx.scale(o.sx||1,o.sy||1);ctx.globalCompositeOperation='multiply';ctx.globalAlpha=o.a??.82;text(str,0,0,size,o.c||'#23232e',o.align||'center',o.w||600);ctx.restore();}
function listText(){ink('ぱっぴー福島行き　送別会でやること',640,112,21,{w:700});ctx.save();ctx.globalCompositeOperation='multiply';line(455,134,825,134,2,'rgba(35,35,46,.8)');ctx.restore();
  ['・飲み会','・寄せ書き','・アルバム','・みんなで旅行','・花束とプレゼント','・動画制作','・サプライズで登場'].forEach((s,i)=>ink(s,470+(i%2)*8,178+i*58+(i%3)*2,25,{align:'left',w:500,rot:((i*5)%3-1)*.006}));}
const real={};
const P=(d,name,photo,cam,line,over)=>[d,name,(u,t,img,p)=>{ph(p);if(over)over(u,t);},{photo,cam,line}];
const CUTS=[
// ② カフェで3人一緒に知る
P(2.3,'カフェ・引き','a1_cafe_wide',{z0:1.03,z1:1.1}),
P(1.4,'スマホを見て「福島行き決まったって」','a2_phone',{z0:1.1,z1:1.05,p0:[-20,0],p1:[10,0]},['ぱっぴー、福島行き決まったって','（誰が言うかは仮）']),
P(1.6,'カップに伸びた手が止まる','a3_cup',{z0:1.14,z1:1.08,p0:[-50,0],p1:[-20,0]}),
P(1.6,'あさこ「そっかー…」（後ろから）','a4_sokka',{z0:1.03,z1:1.13,p0:[0,0],p1:[-30,10]},['そっかー…','あさこ']),
// ③ 「送別会やりたいわ！」→「何するの？」→「うーん？？」
P(1.5,'身を乗り出す','b1_lean',{z0:1.18,z1:1.05,fast:1,p0:[40,0],p1:[0,0]}),
P(1.8,'あさこ「送別会やりたいわ！」','b2_party',{z0:1.22,z1:1.06,fast:1,p0:[0,60],p1:[0,10]},['送別会やりたいわ！','あさこ']),
P(1.2,'らら・ちゃちゃ、顔を見合わせる','b3_look',{z0:1.04,z1:1.1}),
P(2.0,'らら「え、何するの？」（肩越し）','b4_ots_what',{z0:1.03,z1:1.1,p0:[0,0],p1:[40,0]},['え、何するの？','らら（誰が言うかは仮）']),
[1.0,'ちゃちゃ、うなずく',(u,t,img,p)=>{ctx.translate(0,Math.sin(u*Math.PI*4-1.2)*9);ph(p);},{photo:'b5_nod',cam:{z0:1.08,z1:1.1}}],
[2.0,'あさこ「うーん？？」（頭をかく）',(u,t,img,p)=>{ctx.translate(640,360);ctx.rotate(Math.sin(t*1.6)*.012);ctx.translate(-640,-360);ph(p);},{photo:'b6_hmm',cam:{z0:1.08,z1:1.14},line:['うーん？？','あさこ']}],
[1.5,'目が泳ぐ（天井のライト）',(u,t,img,p)=>{ctx.translate(640,360);ctx.rotate(lerp(-.05,.06,smooth(u)));ctx.translate(-640,-360);ph(p);},{photo:'b7_ceiling',cam:{z0:1.28,z1:1.28,p0:[90,-30],p1:[-90,30]}}],
P(2.0,'3人で腕組み（後ろから）','b8_think',{z0:1.03,z1:1.12}),
[2.0,'テーブル真上（腕組みが3つ）',(u,t,img,p)=>{ctx.translate(640,360);ctx.rotate(lerp(-.05,.05,u));ctx.translate(-640,-360);ph(p);},{photo:'b9_top',cam:{z0:1.2,z1:1.28}}],
// ④ 家で何をするか悩む →「動画制作」に〇 → 張り切る
P(1.5,'夜、家の外観','c1_house',{z0:1.02,z1:1.12,p0:[0,0],p1:[-40,30]}),
P(1.8,'付箋を貼る手','c2_sticky_hand',{z0:1.04,z1:1.1,p0:[-20,0],p1:[-40,10]},null,()=>{ink('飲み会',838,205,34,{rot:.03});ink('寄せ書き',615,118,26,{rot:.05});ink('アルバム',1110,287,40,{rot:.03});ink('旅行',830,550,36,{rot:.04,c:'#1a2430'});ink('花束',1075,610,40,{rot:.04});ink('手紙',520,190,22,{rot:-.03});}),
P(2.2,'壁いっぱいの付箋を眺める','c3_wall',{z0:1.04,z1:1.14,p0:[-40,0],p1:[60,20]}),
P(1.4,'付箋が1枚、床に落ちている','c4_fall',{z0:1.16,z1:1.08,p0:[0,60],p1:[0,-40]},null,()=>{ink('旅行',560,522,40,{rot:.07,sy:.42,sx:1.05});}),
[1.6,'キーボードを打つ手',(u,t,img,p)=>{ctx.translate(Math.sin(t*23)*1.5,Math.cos(t*19)*1.5);ph(p);},{photo:'c5_typing',cam:{z0:1.06,z1:1.12}}],
[2.0,'「送別会 思い出に残る内容」で検索',(u,t)=>{rect(-200,-200,W+400,H+400,'#0c0d12');browser(90,40,1100,640,u);},{cam:{z0:1,z1:1.1,p0:[0,60],p1:[0,20]},nowob:1}],
[1.5,'画面の光に照らされる後ろ姿',(u,t,img,p)=>{ph(p);ctx.fillStyle=`rgba(150,190,255,${.05+.05*Math.sin(t*9)*Math.sin(t*2.3)})`;ctx.globalCompositeOperation='screen';ctx.fillRect(-200,-200,W+400,H+400);ctx.globalCompositeOperation='source-over';},{photo:'c7_glow',cam:{z0:1.03,z1:1.12}}],
P(2.0,'ノートのリスト（真上）','c8_note',{z0:1.03,z1:1.16,p0:[0,0],p1:[20,-40]},null,()=>listText()),
[2.0,'「動画制作」に〇（寄り）',(u,t,img,p)=>{ph(p);listText();const cx=548,cy=466,ck=smooth(u/.6),a=-Math.PI*.6+ck*Math.PI*2.15;ctx.save();ctx.globalCompositeOperation='multiply';ctx.strokeStyle='rgba(200,40,40,.9)';ctx.lineWidth=3.5;ctx.lineCap='round';ctx.beginPath();ctx.ellipse(cx,cy,92,27,-.05,-Math.PI*.6,a);ctx.stroke();ctx.restore();},{photo:'c8_note',cam:{z0:2.2,z1:2.4,p0:[200,-230],p1:[220,-255]},nowob:1}],
P(1.0,'よし！と拳を握る','c10_fist',{z0:1.2,z1:1.06,fast:1,p0:[60,0],p1:[20,0]}),
P(2.0,'素材を集める（肩越しに画面）','c11_gather',{z0:1.03,z1:1.2,p0:[0,0],p1:[-70,-10]}),
[1.5,'画面いっぱいの素材。次々ドラッグ',(u,t)=>{rect(-200,-200,W+400,H+400,'#0c0d12');explorer(60,30,1160,660,u,{cols:7,n0:148,n1:212,t0:21,t1:35});const k=(u*2)%1,mx=lerp(300,900,smooth(k)),my=lerp(260,520,smooth(k));ctx.globalAlpha=.75;rrect(mx-70,my-45,140,90,6,THUMB[Math.floor(u*2)%6]);ctx.globalAlpha=1;poly([[mx,my],[mx,my+34],[mx+9,my+26],[mx+16,my+40],[mx+22,my+37],[mx+15,my+23],[mx+26,my+23]],'#111');},{cam:{z0:1.06,z1:1.02},nowob:1}],
[1.4,'ぱっぴーの動画を再生（実素材を画面に）',(u,t,img)=>{deskRoom();screenGlow(640,330,560,'rgba(255,210,160,.3)');rrect(250,60,780,470,16,'#111');if(img)ctx.drawImage(img,270,78,740,416);rect(270,502,740,6,'#333');rect(270,502,740*u,6,'#e33');poly([[580,530],[700,530],[740,600],[540,600]],'#2a2c33');rrect(440,596,400,16,6,'#3a3d44');},{cam:{z0:1,z1:1.12,p0:[0,40],p1:[0,60]},real:3,nowob:1}],
[1.0,'思わず吹き出す（後ろから）',(u,t,img,p)=>{ctx.translate(0,u>.15?Math.sin(t*26)*5:0);ph(p);},{photo:'c14_laugh',cam:{z0:1.1,z1:1.16}}],
];

// ---------- タイムライン ----------
const segs=[];let T=0;
segs.push({type:'black',start:0,end:1.2});T=1.2;
// 冒頭の切り替えは途中版（動画編集.mp4）の文字が替わる時刻に合わせる：年 →5.20／日 →7.24／時間 →8.78／秒 →12.0／秒（続き）→15.2
// ※ナレーションに等間隔で当てるとずれる（2026-11-13 伊藤の指摘）
[4.0,2.04,1.54,3.22,3.2].forEach((d,i)=>{segs.push({type:'real',n:i+1,start:T,end:T+d});T=Math.round((T+d)*1000)/1000;});
CUTS.forEach(([d,name,draw,o])=>{segs.push({type:'draw',name,draw,o:o||{},start:T,end:T+d});T=Math.round((T+d)*1000)/1000;});
if(Math.abs(T-TOTAL)>.05)console.error('注意：合計が '+T+' 秒（60秒とずれている）');

const imgCache=new Map(),photoCache=new Map();
async function photo(n){if(!photoCache.has(n))photoCache.set(n,await loadImage(path.join(PHOTOS,n+".png")));return photoCache.get(n);}
async function clipFrame(n,idx){const dir=path.join(CLIPS,String(n));if(!imgCache.has(n))imgCache.set(n,fs.readdirSync(dir).filter(f=>/\.jpg$/.test(f)).sort());const fl=imgCache.get(n);return loadImage(path.join(dir,fl[clamp(idx,0,fl.length-1)]));}

async function render(t){
  t=clamp(t,0,TOTAL-1e-6);const s=segs.find(x=>t>=x.start&&t<x.end)||segs[segs.length-1],d=s.end-s.start,lt=t-s.start,u=lt/d;
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.filter='none';rect(0,0,W,H,'#000');
  if(s.type==='real'){
    const img=await clipFrame(s.n,Math.floor(lt*FPS)),z=1+.04*u;ctx.save();ctx.translate(640,360);ctx.scale(z,z);ctx.drawImage(img,-640,-360,W,H);ctx.restore();
    const g=ctx.createLinearGradient(0,0,0,260);g.addColorStop(0,'rgba(0,0,0,.45)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,260);vignette(.35);
    if(s.n===1)black(1-lt/1.2);
    // 文字はカットの頭から出す（1カット目だけ、音が入る 2.2秒あたりから）。秒は4カット目で数え上がり、5カット目は止めて最後に消す
    ctx.globalAlpha=s.n===1?clamp((lt-.9)/.5,0,1)*clamp((d-lt)/.2,0,1):s.n===4?clamp(lt/.25,0,1):s.n===5?clamp((d-lt-.3)/.7,0,1):clamp(lt/.25,0,1)*clamp((d-lt)/.15,0,1);
    const str=[`長野で一緒に ${N.years}年`,`${nf(N.days)}日`,`${nf(N.hours)}時間`,null,nf(N.secs)+'秒'][s.n-1];
    if(str)shadowText(str,640,112,s.n>1?56:44,'center',300);
    else shadowText(nf(N.secs-(N.secs*.03)*(1-smooth(lt/2.5)))+'秒',640,112,56,'center',300);
    ctx.globalAlpha=1;
  }else if(s.type==='draw'){
    const c=s.o.cam||{z0:1.02,z1:1.05},k=c.fast?smooth(u*3):smooth(u),z=lerp(c.z0||1,c.z1||c.z0||1,k),p0=c.p0||[0,0],p1=c.p1||p0;
    const img=s.o.real?await clipFrame(s.o.real,Math.floor(lt*FPS)+20):null,pimg=s.o.photo?await photo(s.o.photo):null;
    const wob=s.o.nowob?0:1,wx=wob*(Math.sin(t*1.7)*2.2+Math.sin(t*3.9)*1.1),wy=wob*(Math.cos(t*1.3)*1.8+Math.sin(t*4.6)*.9);
    ctx.save();ctx.translate(640+lerp(p0[0],p1[0],k)+wx,360+lerp(p0[1],p1[1],k)+wy);ctx.scale(z,z);ctx.translate(-640,-360);s.draw(u,t,img,pimg);ctx.restore();
    ctx.globalCompositeOperation="source-over";
    ctx.shadowBlur=0;ctx.globalAlpha=1;vignette(s.o.photo?.28:.42);
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
