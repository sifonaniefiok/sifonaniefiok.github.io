/* Japa Life — canvas renderer for lots, Sims and city maps. */
(function (G) {
'use strict';
var JL=G.JL, E=JL.E, D=JL.D;
var R={cam:{x:0,y:0,s:32,fit:true},mapCam:{x:0,y:0,s:1,fit:true},t:0};

var FLOOR={concrete:['#B8B2A6','#ADA79A'],tile:['#E9E4D8','#DAD2C1'],tiles:['#EFE7DA','#E2D7C5'],wood:['#C68B59','#B97D4B'],terrazzo:['#DED8CE','#CFC8BC'],
  carpet:['#7C8FA3','#738699'],marble:['#F0F1F3','#E3E5E8'],rubber:['#40445E','#3A3E57'],dark:['#24233B','#2C2B47'],sand:['#F1D49C','#EACB8E'],
  dirt:['#C9784C','#BE6E43'],grass:['#7DB75C','#74AE53'],paving:['#BBB4A8','#B0A99C'],water:['#2E86AB','#2A7BA0']};

function rr(c,x,y,w,h,r){ r=Math.min(r,w/2,h/2); c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
function fillRR(c,x,y,w,h,r,col){ rr(c,x,y,w,h,r); c.fillStyle=col; c.fill(); }
function shade(hex,amt){ var n=parseInt(hex.slice(1),16); if(hex.length===4){ n=parseInt(hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3],16); } var r=(n>>16)+amt, g=((n>>8)&255)+amt, b=(n&255)+amt; r=Math.max(0,Math.min(255,r)); g=Math.max(0,Math.min(255,g)); b=Math.max(0,Math.min(255,b)); return 'rgb('+r+','+g+','+b+')'; }
R.shade=shade; R.rr=rr;

// ---------- static layer cache ----------
var cache={key:null,cv:null};
function staticLayer(L,T){
  var key=L.label+'|'+L.w+'x'+L.h+'|'+T+'|'+(L.items.filter(function(i){return i.fixed;}).length)+'|'+(L.home?L.city:'');
  if(cache.key===key&&cache.L===L) return cache.cv;
  var cv=cache.cv||document.createElement('canvas'); cv.width=Math.ceil(L.w*T); cv.height=Math.ceil(L.h*T); var c=cv.getContext('2d');
  var rnd=E.seeded(E.hash(L.label||'x'));
  // ground
  for(var y=0;y<L.h;y++) for(var x=0;x<L.w;x++){ var rm=E.roomAt(L,x,y); var fl=rm>=0?L.rooms[rm].floor:L.ground; if(E.isWater(L,x,y)) fl='water'; tile(c,fl,x,y,T,rnd); }
  // pool edge
  if(L.pool){ var p=L.pool; c.strokeStyle='#F1FAEE'; c.lineWidth=T*0.18; c.strokeRect(p[0]*T,p[1]*T,p[2]*T,p[3]*T); }
  if(L.water){ var w=L.water; c.fillStyle='rgba(255,255,255,0.35)'; for(var i=0;i<w[2];i++){ c.beginPath(); c.arc((w[0]+i+0.5)*T,w[1]*T,T*0.28,0,Math.PI); c.fill(); } }
  // locked buildings get roofs
  L.rooms.forEach(function(r){ if(r.owned===-1){ fillRR(c,r.x*T+2,r.y*T+2,r.w*T-4,r.h*T-4,T*0.12,'#8D5B4C'); c.fillStyle='rgba(0,0,0,0.12)'; for(var k=0;k<r.h*2;k++) c.fillRect(r.x*T+2,r.y*T+2+k*T/2,r.w*T-4,1.5); } });
  // walls
  walls(c,L,T);
  // parking pad
  if(L.parking){ c.fillStyle='rgba(60,60,60,0.25)'; c.fillRect(L.parking[0]*T+2,L.parking[1]*T+2,2*T-4,T-4); c.strokeStyle='rgba(255,255,255,0.7)'; c.setLineDash([T*0.2,T*0.15]); c.strokeRect(L.parking[0]*T+3,L.parking[1]*T+3,2*T-6,T-6); c.setLineDash([]); }
  cache={key:key,cv:cv,L:L}; return cv;
}
function tile(c,fl,x,y,T,rnd){
  var pal=FLOOR[fl]||FLOOR.concrete; var px=x*T, py=y*T;
  if(fl==='tile'||fl==='tiles'||fl==='marble'){ c.fillStyle=((x+y)%2)?pal[0]:pal[1]; c.fillRect(px,py,T,T); c.strokeStyle='rgba(0,0,0,0.06)'; c.strokeRect(px+0.5,py+0.5,T-1,T-1);
    if(fl==='marble'&&rnd()<0.3){ c.strokeStyle='rgba(120,120,140,0.18)'; c.beginPath(); c.moveTo(px+rnd()*T,py); c.quadraticCurveTo(px+T/2,py+T/2,px+rnd()*T,py+T); c.stroke(); } return; }
  if(fl==='wood'){ c.fillStyle=pal[0]; c.fillRect(px,py,T,T); c.fillStyle=pal[1]; for(var i=0;i<3;i++){ c.fillRect(px,py+i*T/3+((x%2)?T/6:0),T,1); } c.fillStyle='rgba(0,0,0,0.05)'; c.fillRect(px+((y*7)%5)*T/5,py,1,T); return; }
  if(fl==='paving'){ c.fillStyle=pal[0]; c.fillRect(px,py,T,T); c.strokeStyle='rgba(0,0,0,0.08)'; c.strokeRect(px+0.5,py+0.5,T/2,T/2); c.strokeRect(px+T/2,py+T/2-0.5,T/2,T/2); return; }
  if(fl==='water'){ c.fillStyle=pal[(x+y)%2]; c.fillRect(px,py,T,T); return; }
  c.fillStyle=pal[0]; c.fillRect(px,py,T,T);
  var specks=fl==='grass'?4:(fl==='dirt'||fl==='sand'||fl==='terrazzo'||fl==='concrete'?5:2);
  for(var k=0;k<specks;k++){ c.fillStyle=k%2?pal[1]:shade(pal[0].length===7?pal[0]:'#888888',fl==='grass'?18:-14); var s=fl==='grass'?2:1.6; c.fillRect(px+rnd()*T,py+rnd()*T,s,fl==='grass'?3:s); }
  if(fl==='carpet'){ c.fillStyle='rgba(255,255,255,0.04)'; c.fillRect(px,py,T,T/2); }
}
function walls(c,L,T){
  var th=Math.max(3,T*0.16);
  var segs=[];
  for(var y=0;y<=L.h;y++) for(var x=0;x<L.w;x++){ var a=E.roomAt(L,x,y-1), b=E.roomAt(L,x,y); if(a===b) continue; if(a<0&&b<0) continue; if(L.doors['h:'+x+','+y]) { segs.push({x1:x*T,y1:y*T,x2:(x+1)*T,y2:y*T,door:'h'}); continue; } segs.push({x1:x*T,y1:y*T,x2:(x+1)*T,y2:y*T}); }
  for(var x2=0;x2<=L.w;x2++) for(var y2=0;y2<L.h;y2++){ var a2=E.roomAt(L,x2-1,y2), b2=E.roomAt(L,x2,y2); if(a2===b2) continue; if(a2<0&&b2<0) continue; if(L.doors['v:'+x2+','+y2]) { segs.push({x1:x2*T,y1:y2*T,x2:x2*T,y2:(y2+1)*T,door:'v'}); continue; } segs.push({x1:x2*T,y1:y2*T,x2:x2*T,y2:(y2+1)*T}); }
  // shadow
  c.lineCap='square';
  segs.forEach(function(s){ if(s.door) return; c.strokeStyle='rgba(0,0,0,0.18)'; c.lineWidth=th; c.beginPath(); c.moveTo(s.x1+2,s.y1+3); c.lineTo(s.x2+2,s.y2+3); c.stroke(); });
  segs.forEach(function(s){ if(s.door){ c.strokeStyle='#8D6346'; c.lineWidth=Math.max(1.5,T*0.06); c.beginPath(); if(s.door==='h'){ c.moveTo(s.x1+2,s.y1); c.arc(s.x1+2,s.y1,T-4,0,Math.PI/2.6); } else { c.moveTo(s.x1,s.y1+2); c.arc(s.x1,s.y1+2,T-4,Math.PI/2,Math.PI/2-Math.PI/2.6,true); } c.stroke(); return; }
    c.strokeStyle='#4A4036'; c.lineWidth=th; c.beginPath(); c.moveTo(s.x1,s.y1); c.lineTo(s.x2,s.y2); c.stroke();
    c.strokeStyle='#F4EFE6'; c.lineWidth=Math.max(1,th*0.35); c.beginPath(); c.moveTo(s.x1,s.y1); c.lineTo(s.x2,s.y2); c.stroke(); });
}

// ---------- furniture ----------
function itemColor(it,def){ return it.color||def.color||'#999'; }
var K={};
K.mat=function(c,w,h,col){ fillRR(c,-w/2+2,-h/2+2,w-4,h-4,3,col); c.strokeStyle='rgba(90,60,20,0.35)'; c.lineWidth=1; for(var i=-h/2+5;i<h/2-3;i+=4){ c.beginPath(); c.moveTo(-w/2+4,i); c.lineTo(w/2-4,i); c.stroke(); } fillRR(c,-w/2+5,-h/2+4,w-10,h*0.14,3,'#F1FAEE'); };
K.bed=function(c,w,h,col){ fillRR(c,-w/2+1,-h/2+1,w-2,h-2,4,'#6B4A33'); fillRR(c,-w/2+3,-h/2+3,w-6,h-6,4,'#F8F4EC'); fillRR(c,-w/2+3,-h/2+h*0.3,w-6,h*0.68,4,col); c.fillStyle='rgba(255,255,255,0.25)'; c.fillRect(-w/2+3,-h/2+h*0.3,w-6,3);
  var n=w>h*0.8?2:1; for(var i=0;i<n;i++){ fillRR(c,-w/2+4+i*(w-8)/n+1,-h/2+5,(w-8)/n-2,h*0.18,4,'#FFFFFF'); } };
K.royalbed=function(c,w,h,col){ K.bed(c,w,h,col); c.fillStyle='#3D2B1F'; [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(p){ c.beginPath(); c.arc(p[0]*(w/2-3),p[1]*(h/2-3),3.5,0,7); c.fill(); }); c.fillStyle='rgba(212,175,55,0.8)'; c.fillRect(-w/2+3,-h/2+h*0.3,w-6,2); };
K.crib=function(c,w,h,col){ fillRR(c,-w/2+2,-h/2+2,w-4,h-4,4,col); fillRR(c,-w/2+5,-h/2+5,w-10,h-10,3,'#FFF'); c.strokeStyle='rgba(0,0,0,0.25)'; for(var i=-h/2+4;i<h/2-2;i+=4){ c.beginPath(); c.moveTo(-w/2+2,i); c.lineTo(-w/2+5,i); c.moveTo(w/2-5,i); c.lineTo(w/2-2,i); c.stroke(); } };
K.chair=function(c,w,h,col){ fillRR(c,-w*0.32,-h*0.3,w*0.64,h*0.62,4,col); fillRR(c,-w*0.36,-h*0.42,w*0.72,h*0.2,3,shade(col,-30)); };
K.bench=function(c,w,h,col){ fillRR(c,-w/2+2,-h*0.25,w-4,h*0.5,3,col); c.fillStyle=shade(col,-25); c.fillRect(-w/2+2,-h*0.05,w-4,1.5); };
K.sofa=function(c,w,h,col){ fillRR(c,-w/2+1,-h/2+1,w-2,h-2,6,shade(col,-25)); fillRR(c,-w/2+4,-h/2+h*0.32,w-8,h*0.6,5,col); var n=Math.max(2,Math.round(w/(h*1.1))); for(var i=1;i<n;i++){ c.fillStyle='rgba(0,0,0,0.12)'; c.fillRect(-w/2+4+i*(w-8)/n,-h/2+h*0.36,1.5,h*0.5); } fillRR(c,-w/2+1,-h/2+h*0.2,w*0.08,h*0.75,4,shade(col,-15)); fillRR(c,w/2-1-w*0.08,-h/2+h*0.2,w*0.08,h*0.75,4,shade(col,-15)); };
K.table=function(c,w,h,col){ fillRR(c,-w/2+3,-h/2+3,w-6,h-6,4,col); c.fillStyle='rgba(255,255,255,0.15)'; c.fillRect(-w/2+5,-h/2+5,w-10,2); };
K.rtable=function(c,w,h,col){ c.fillStyle=shade(col,-20); c.beginPath(); c.ellipse(0,1,w*0.42,h*0.42,0,0,7); c.fill(); c.fillStyle=col; c.beginPath(); c.ellipse(0,0,w*0.4,h*0.4,0,0,7); c.fill(); c.fillStyle='#E63946'; c.beginPath(); c.arc(0,0,Math.min(w,h)*0.08,0,7); c.fill(); };
K.dining=function(c,w,h,col){ ['#8D6346','#8D6346','#8D6346','#8D6346'].forEach(function(cc,i){ var px=(i%2?1:-1)*w*0.42, py=(i<2?-1:1)*h*0.1; fillRR(c,px-4,py-5,8,10,2,shade(col,-15)); }); fillRR(c,-w*0.32,-h*0.36,w*0.64,h*0.72,4,col); fillRR(c,-w*0.1,-h*0.12,w*0.2,h*0.24,8,'#E9C46A'); };
K.stove=function(c,w,h,col){ fillRR(c,-w/2+3,-h/2+3,w-6,h-6,3,col); c.fillStyle='#222'; c.beginPath(); c.arc(0,0,w*0.22,0,7); c.fill(); c.strokeStyle='#E76F51'; c.lineWidth=1.5; c.beginPath(); c.arc(0,0,w*0.13,0,7); c.stroke(); };
K.cooker=function(c,w,h,col){ fillRR(c,-w/2+2,-h/2+2,w-4,h-4,3,col); c.fillStyle='#333'; for(var i=0;i<4;i++){ c.beginPath(); c.arc(-w*0.22+(i%2)*w*0.44,-h*0.15+((i/2)|0)*h*0.32,Math.min(w,h)*0.13,0,7); c.fill(); } c.fillStyle=shade(col,-40); c.fillRect(-w/2+3,h/2-6,w-6,3); };
K.fridge=function(c,w,h,col,it,on){ fillRR(c,-w/2+2,-h/2+2,w-4,h-4,4,col); c.fillStyle='rgba(0,0,0,0.12)'; if(w>h*1.4) c.fillRect(-1,-h/2+3,2,h-6); c.fillStyle='#ADB5BD'; c.fillRect(w/2-8,-h*0.2,2,h*0.3); if(on){ c.fillStyle='#06D6A0'; c.beginPath(); c.arc(-w/2+7,-h/2+7,2,0,7); c.fill(); } };
K.cooler=function(c,w,h,col){ fillRR(c,-w*0.38,-h*0.3,w*0.76,h*0.62,5,col); fillRR(c,-w*0.38,-h*0.3,w*0.76,h*0.18,5,'#F1FAEE'); };
K.sink=function(c,w,h,col){ fillRR(c,-w/2+3,-h/2+3,w-6,h-6,4,col); fillRR(c,-w*0.3,-h*0.22,w*0.6,h*0.5,6,'#90E0EF'); c.fillStyle='#6C757D'; c.fillRect(-1.5,-h/2+3,3,h*0.2); };
K.mortar=function(c,w,h,col){ c.fillStyle=col; c.beginPath(); c.arc(0,0,w*0.32,0,7); c.fill(); c.fillStyle=shade(col,-35); c.beginPath(); c.arc(0,0,w*0.2,0,7); c.fill(); c.strokeStyle='#D4A373'; c.lineWidth=3; c.beginPath(); c.moveTo(-w*0.1,-h*0.4); c.lineTo(w*0.2,h*0.1); c.stroke(); };
K.toilet=function(c,w,h,col){ fillRR(c,-w*0.28,-h*0.44,w*0.56,h*0.24,3,'#E9ECEF'); c.fillStyle=col; c.beginPath(); c.ellipse(0,h*0.06,w*0.26,h*0.32,0,0,7); c.fill(); c.strokeStyle='#CED4DA'; c.lineWidth=1; c.stroke(); c.fillStyle='#CAF0F8'; c.beginPath(); c.ellipse(0,h*0.08,w*0.16,h*0.2,0,0,7); c.fill(); };
K.bucket=function(c,w,h,col){ c.fillStyle=col; c.beginPath(); c.arc(-w*0.12,0,w*0.24,0,7); c.fill(); c.fillStyle='#90E0EF'; c.beginPath(); c.arc(-w*0.12,0,w*0.17,0,7); c.fill(); c.fillStyle='#FFB703'; c.beginPath(); c.arc(w*0.25,h*0.2,w*0.13,0,7); c.fill(); };
K.shower=function(c,w,h,col){ fillRR(c,-w/2+2,-h/2+2,w-4,h-4,3,'#E9F5F9'); c.strokeStyle=col; c.lineWidth=1; for(var i=-w/2+4;i<w/2-2;i+=4){ c.beginPath(); c.moveTo(i,-h/2+3); c.lineTo(i,h/2-3); c.stroke(); } c.fillStyle='#6C757D'; c.beginPath(); c.arc(0,0,2,0,7); c.fill(); };
K.tub=function(c,w,h,col){ fillRR(c,-w/2+2,-h/2+2,w-4,h-4,h*0.4,col); fillRR(c,-w/2+6,-h/2+6,w-12,h-12,h*0.3,'#90E0EF'); };
K.tv=function(c,w,h,col,it,on){ fillRR(c,-w/2+4,-h*0.08,w-8,h*0.32,2,'#5C4033'); fillRR(c,-w/2+2,-h*0.42,w-4,h*0.3,2,col); if(on){ var g=c.createLinearGradient(-w/2,0,w/2,0); g.addColorStop(0,'#3A86FF'); g.addColorStop(1,'#8338EC'); c.fillStyle=g; c.globalAlpha=0.55+0.25*Math.sin(R.t*3); c.fillRect(-w/2+4,-h*0.4,w-8,h*0.24); c.globalAlpha=1; } };
K.desk=function(c,w,h,col,it,on){ fillRR(c,-w/2+2,-h/2+2,w-4,h*0.7,3,'#A0704D'); fillRR(c,-w*0.22,-h/2+5,w*0.44,h*0.3,2,col); c.fillStyle=on?'#4CC9F0':'#2B2D42'; c.fillRect(-w*0.18,-h/2+7,w*0.36,h*0.2); fillRR(c,-w*0.14,h*0.18,w*0.28,h*0.26,4,'#343A40'); };
K.desk0=function(c,w,h,col){ fillRR(c,-w/2+2,-h/2+3,w-4,h*0.62,3,col); c.fillStyle='#F8F9FA'; c.fillRect(-w*0.25,-h*0.3,w*0.2,h*0.25); fillRR(c,-w*0.12,h*0.2,w*0.24,h*0.24,4,'#6C757D'); };
K.deskoffice=function(c,w,h,col){ fillRR(c,-w/2+2,-h/2+3,w-4,h*0.6,3,'#DEE2E6'); c.fillStyle='#212529'; c.fillRect(-w*0.15,-h*0.35,w*0.3,h*0.15); fillRR(c,-w*0.12,h*0.18,w*0.24,h*0.26,4,'#495057'); };
K.speaker=function(c,w,h,col,it,on){ fillRR(c,-w*0.32,-h*0.36,w*0.64,h*0.72,4,col); c.fillStyle='#6C757D'; var p=on?1+0.12*Math.sin(R.t*12):1; c.beginPath(); c.arc(0,h*0.04,w*0.18*p,0,7); c.fill(); };
K.fan=function(c,w,h,col,it,on){ c.fillStyle='#ADB5BD'; c.beginPath(); c.arc(0,0,w*0.36,0,7); c.fill(); c.save(); c.rotate(on?R.t*14:0.4); c.fillStyle=col; for(var i=0;i<3;i++){ c.rotate(2.094); c.beginPath(); c.ellipse(0,-w*0.17,w*0.08,w*0.17,0,0,7); c.fill(); } c.restore(); };
K.ac=function(c,w,h,col,it,on){ fillRR(c,-w/2+2,-h/2+2,w-4,h*0.4,5,col); c.fillStyle='rgba(0,0,0,0.15)'; c.fillRect(-w/2+6,-h/2+h*0.32,w-12,1.5); if(on){ c.strokeStyle='rgba(144,224,239,0.7)'; c.lineWidth=1.2; for(var i=0;i<3;i++){ var o=((R.t*14+i*6)%18); c.beginPath(); c.moveTo(-w*0.3+i*w*0.3,-h*0.02+o); c.lineTo(-w*0.3+i*w*0.3+3,h*0.05+o); c.stroke(); } } };
K.gen=function(c,w,h,col,it){ fillRR(c,-w/2+2,-h/2+3,w-4,h-6,3,col); c.fillStyle='#222'; c.font='bold '+Math.max(7,h*0.26)+'px Rubik,sans-serif'; c.textAlign='center'; c.textBaseline='middle'; c.fillText('GEN',0,0);
  if(it&&it.on&&it.fuel>0){ c.fillStyle='rgba(120,120,120,0.35)'; for(var i=0;i<3;i++){ var o=(R.t*8+i*7)%20; c.beginPath(); c.arc(w/2-2+o*0.3,-h/2-o,2+o*0.15,0,7); c.fill(); } } };
K.solar=function(c,w,h,col){ fillRR(c,-w/2+2,-h/2+3,w-4,h-6,3,col); c.strokeStyle='rgba(255,255,255,0.4)'; for(var i=1;i<4;i++){ c.beginPath(); c.moveTo(-w/2+2+i*(w-4)/4,-h/2+3); c.lineTo(-w/2+2+i*(w-4)/4,h/2-3); c.stroke(); } c.fillStyle='#06D6A0'; c.beginPath(); c.arc(w/2-6,-h/2+7,2,0,7); c.fill(); };
K.ringlight=function(c,w,h,col,it,on){ c.strokeStyle=on?'#FFF3B0':'#ADB5BD'; c.lineWidth=3; c.beginPath(); c.arc(0,0,w*0.3,0,7); c.stroke(); c.fillStyle='#222'; c.fillRect(-1.5,-1.5,3,3); };
K.dumbbell=function(c,w,h,col){ c.fillStyle=col; [-1,1].forEach(function(s){ c.fillRect(-w*0.3,s*h*0.18-2,w*0.6,4); c.fillRect(-w*0.34,s*h*0.18-5,5,10); c.fillRect(w*0.34-5,s*h*0.18-5,5,10); }); };
K.treadmill=function(c,w,h,col){ fillRR(c,-w/2+3,-h/2+2,w-6,h-4,4,col); fillRR(c,-w/2+6,-h/2+h*0.2,w-12,h*0.7,2,'#212529'); c.fillStyle='#ADB5BD'; c.fillRect(-w/2+4,-h/2+3,w-8,h*0.12); };
K.keyboard=function(c,w,h,col){ fillRR(c,-w/2+2,-h*0.3,w-4,h*0.6,3,col); c.fillStyle='#F8F9FA'; var n=Math.floor((w-8)/4); for(var i=0;i<n;i++) c.fillRect(-w/2+4+i*4,-h*0.05,3,h*0.28); };
K.drum=function(c,w,h,col){ c.fillStyle=col; c.beginPath(); c.ellipse(0,0,w*0.32,h*0.22,0,0,7); c.fill(); c.fillStyle='#E9D8A6'; c.beginPath(); c.ellipse(-w*0.24,0,w*0.08,h*0.2,0,0,7); c.fill(); c.strokeStyle='#5E3A1A'; for(var i=-2;i<=2;i++){ c.beginPath(); c.moveTo(-w*0.2,i*3); c.lineTo(w*0.25,i*3); c.stroke(); } };
K.books=function(c,w,h,col){ fillRR(c,-w/2+2,-h/2+2,w-4,h*0.55,2,col); var cols=['#E63946','#3A86FF','#06D6A0','#FFB703','#8338EC','#F4A261']; for(var i=0;i<Math.floor((w-6)/4);i++){ c.fillStyle=cols[i%6]; c.fillRect(-w/2+4+i*4,-h/2+4,3,h*0.45); } };
K.mirror=function(c,w,h,col){ fillRR(c,-w*0.3,-h*0.42,w*0.6,h*0.36,3,'#8D6346'); fillRR(c,-w*0.24,-h*0.38,w*0.48,h*0.28,2,col); c.fillStyle='rgba(255,255,255,0.6)'; c.fillRect(-w*0.15,-h*0.35,3,h*0.2); };
K.chess=function(c,w,h,col){ fillRR(c,-w*0.38,-h*0.38,w*0.76,h*0.76,3,col); for(var i=0;i<4;i++) for(var j=0;j<4;j++){ if((i+j)%2){ c.fillStyle='#F1FAEE'; c.fillRect(-w*0.3+i*w*0.15,-h*0.3+j*h*0.15,w*0.15,h*0.15); } } };
K.sewing=function(c,w,h,col){ fillRR(c,-w*0.38,-h*0.2,w*0.76,h*0.4,3,col); c.fillStyle='#E9C46A'; c.fillRect(-w*0.3,-h*0.36,w*0.16,h*0.2); c.fillStyle='#E76F51'; c.fillRect(w*0.05,-h*0.1,w*0.25,h*0.2); };
K.easel=function(c,w,h,col){ c.strokeStyle='#8D6346'; c.lineWidth=2; c.beginPath(); c.moveTo(-w*0.3,h*0.4); c.lineTo(0,-h*0.4); c.lineTo(w*0.3,h*0.4); c.stroke(); fillRR(c,-w*0.3,-h*0.3,w*0.6,h*0.42,2,'#FFF'); c.fillStyle='#E76F51'; c.fillRect(-w*0.2,-h*0.2,w*0.2,h*0.15); c.fillStyle='#2A9D8F'; c.fillRect(0,-h*0.1,w*0.15,h*0.15); };
K.decks=function(c,w,h,col,it,on){ fillRR(c,-w/2+2,-h/2+3,w-4,h-6,3,col); [-1,1].forEach(function(s){ c.save(); c.translate(s*w*0.25,0); c.rotate(on?R.t*5:0); c.fillStyle='#111'; c.beginPath(); c.arc(0,0,Math.min(w*0.18,h*0.32),0,7); c.fill(); c.fillStyle='#E63946'; c.fillRect(-1,-Math.min(w*0.18,h*0.32),2,5); c.restore(); }); };
K.plant=function(c,w,h,col){ fillRR(c,-w*0.2,0,w*0.4,h*0.32,3,'#BC6C25'); c.fillStyle=col; for(var i=0;i<6;i++){ var a=i*1.05+0.3; c.beginPath(); c.ellipse(Math.cos(a)*w*0.18,-h*0.05+Math.sin(a)*h*0.14,w*0.13,h*0.08,a,0,7); c.fill(); } };
K.tree=function(c,w,h,col){ c.fillStyle='rgba(0,0,0,0.15)'; c.beginPath(); c.ellipse(3,4,w*0.55,h*0.5,0,0,7); c.fill(); c.fillStyle=col; c.beginPath(); c.arc(0,0,w*0.55,0,7); c.fill(); c.fillStyle=shade(col,22); c.beginPath(); c.arc(-w*0.15,-h*0.15,w*0.3,0,7); c.fill(); };
K.poster=function(c,w,h,col){ fillRR(c,-w*0.32,-h/2+1,w*0.64,h*0.22,1,col); c.fillStyle='#FFF'; c.fillRect(-w*0.1,-h/2+1,w*0.2,h*0.22); };
K.art=function(c,w,h,col){ fillRR(c,-w*0.38,-h/2+1,w*0.76,h*0.22,1,'#8D6346'); c.fillStyle=col; c.fillRect(-w*0.34,-h/2+2,w*0.68,h*0.17); c.fillStyle='#F1FAEE'; for(var i=0;i<4;i++){ c.beginPath(); c.arc(-w*0.25+i*w*0.17,-h/2+2+h*0.085,2,0,7); c.fill(); } };
K.rug=function(c,w,h,col){ fillRR(c,-w/2+3,-h/2+3,w-6,h-6,3,col); c.strokeStyle='rgba(255,255,255,0.55)'; c.lineWidth=1.5; c.strokeRect(-w/2+7,-h/2+7,w-14,h-14); c.fillStyle='#FFB703'; for(var i=0;i<4;i++){ c.beginPath(); c.moveTo(-w*0.2+i*w*0.13,0); c.lineTo(-w*0.2+i*w*0.13+5,-6); c.lineTo(-w*0.2+i*w*0.13+10,0); c.lineTo(-w*0.2+i*w*0.13+5,6); c.fill(); } };
K.bronze=function(c,w,h,col){ fillRR(c,-w*0.3,h*0.05,w*0.6,h*0.3,2,'#343A40'); c.fillStyle=col; c.beginPath(); c.ellipse(0,-h*0.08,w*0.2,h*0.26,0,0,7); c.fill(); c.fillStyle=shade(col,-30); c.fillRect(-w*0.2,-h*0.34,w*0.4,h*0.08); };
K.aquarium=function(c,w,h,col){ fillRR(c,-w/2+2,-h/2+3,w-4,h-6,3,'#264653'); fillRR(c,-w/2+4,-h/2+5,w-8,h-10,2,col); c.fillStyle='#FB8500'; var x=Math.sin(R.t*1.5)*w*0.25; c.beginPath(); c.ellipse(x,0,4,2.4,0,0,7); c.fill(); c.fillStyle='#FFD166'; c.beginPath(); c.ellipse(-x*0.7,3,3,2,0,0,7); c.fill(); };
K.wardrobe=function(c,w,h,col){ fillRR(c,-w/2+2,-h/2+2,w-4,h*0.7,3,col); c.fillStyle='rgba(0,0,0,0.2)'; c.fillRect(-1,-h/2+3,2,h*0.66); c.fillStyle='#E9C46A'; c.fillRect(-5,-h*0.15,2,5); c.fillRect(3,-h*0.15,2,5); };
K.prayermat=function(c,w,h,col){ fillRR(c,-w*0.32,-h*0.42,w*0.64,h*0.84,2,col); c.strokeStyle='#E9C46A'; c.lineWidth=1; c.strokeRect(-w*0.26,-h*0.36,w*0.52,h*0.72); c.beginPath(); c.arc(0,-h*0.2,w*0.12,Math.PI,0); c.stroke(); };
K.waterdrum=function(c,w,h,col){ c.fillStyle=col; c.beginPath(); c.arc(0,0,w*0.36,0,7); c.fill(); c.strokeStyle=shade(col,-40); c.lineWidth=2; c.beginPath(); c.arc(0,0,w*0.28,0,7); c.stroke(); };
// venue props
K.counter=function(c,w,h,col){ fillRR(c,-w/2+1,-h/2+2,w-2,h-4,3,col); c.fillStyle='rgba(255,255,255,0.25)'; c.fillRect(-w/2+3,-h/2+3,w-6,2); };
K.bar=function(c,w,h,col){ fillRR(c,-w/2+1,-h/2+2,w-2,h-4,3,col); var cols=['#FFB703','#06D6A0','#E63946','#F1FAEE']; for(var i=0;i<Math.floor(w/9);i++){ c.fillStyle=cols[i%4]; c.fillRect(-w/2+5+i*9,-h/2+4,3,h*0.3); } };
K.pot=function(c,w,h,col){ c.fillStyle='#333'; c.beginPath(); c.arc(0,0,w*0.36,0,7); c.fill(); c.fillStyle=['#C1121F','#7F5539','#2D6A4F'][Math.abs(Math.round(w))%3]; c.beginPath(); c.arc(0,0,w*0.26,0,7); c.fill(); c.fillStyle='rgba(255,255,255,0.35)'; var o=(R.t*10)%10; c.beginPath(); c.arc(2,-o,2,0,7); c.fill(); };
K.sign=function(c,w,h,col,it){ fillRR(c,-w/2+2,-h*0.32,w-4,h*0.64,3,col); c.fillStyle='#FFF'; c.font='bold '+Math.max(7,Math.min(h*0.34,(w-10)/Math.max(6,(it.label||'').length)*1.7))+'px Rubik,sans-serif'; c.textAlign='center'; c.textBaseline='middle'; c.fillText((it.label||'').toUpperCase(),0,1); };
K.dancefloor=function(c,w,h){ var cols=['#FF006E','#8338EC','#3A86FF','#FFBE0B','#FB5607','#06D6A0']; var n=Math.round(w/(h/Math.max(1,Math.round(h/24)))); var tw=w/Math.max(1,Math.round(w/20)), th=h/Math.max(1,Math.round(h/20)); var k=Math.floor(R.t*3);
  for(var y=0;y<Math.round(h/th);y++) for(var x=0;x<Math.round(w/tw);x++){ c.fillStyle=cols[(x*3+y*5+k)%6]; c.globalAlpha=0.75; c.fillRect(-w/2+x*tw+1,-h/2+y*th+1,tw-2,th-2); } c.globalAlpha=1; };
K.stage=function(c,w,h,col){ fillRR(c,-w/2+1,-h/2+1,w-2,h-2,3,col); c.fillStyle='rgba(255,255,255,0.12)'; for(var i=0;i<5;i++) c.fillRect(-w/2+3,-h/2+3+i*(h-6)/5,w-6,1); c.fillStyle='#ADB5BD'; c.fillRect(-1,-h*0.1,2,h*0.3); c.beginPath(); c.arc(0,-h*0.12,3,0,7); c.fill(); };
K.shore=function(c,w,h){ c.fillStyle='rgba(255,255,255,0.4)'; for(var i=0;i<w/14;i++){ c.beginPath(); c.arc(-w/2+i*14+7+Math.sin(R.t*2+i)*2,h*0.3,4,0,Math.PI); c.fill(); } };
K.shack=function(c,w,h,col){ fillRR(c,-w/2+2,-h/2+2,w-4,h-4,3,'#D4A373'); c.fillStyle=col; for(var i=0;i<6;i++){ c.fillRect(-w/2+2+i*(w-4)/6,-h/2+2,(w-4)/12,h-4); } c.fillStyle='#FFF'; c.font='bold '+Math.max(7,h*0.22)+'px Rubik,sans-serif'; c.textAlign='center'; c.fillText('BAR',0,4); };
K.horse=function(c,w,h,col){ c.fillStyle=col; c.beginPath(); c.ellipse(0,h*0.05,w*0.3,h*0.3,0,0,7); c.fill(); c.beginPath(); c.ellipse(0,-h*0.32,w*0.16,h*0.14,0,0,7); c.fill(); c.fillStyle='#222'; c.fillRect(-2,-h*0.25,4,h*0.25); };
K.bonfire=function(c,w,h){ c.fillStyle='#6F4518'; c.fillRect(-w*0.3,-2,w*0.6,4); c.fillRect(-2,-h*0.3,4,h*0.6); var f=0.8+0.2*Math.sin(R.t*9); c.fillStyle='#FB8500'; c.beginPath(); c.arc(0,0,w*0.24*f,0,7); c.fill(); c.fillStyle='#FFD60A'; c.beginPath(); c.arc(0,0,w*0.13*f,0,7); c.fill(); };
K.umbrella=function(c,w,h,col){ c.fillStyle='rgba(0,0,0,0.12)'; c.beginPath(); c.arc(3,3,w*0.55,0,7); c.fill(); c.fillStyle=col; c.beginPath(); c.arc(0,0,w*0.55,0,7); c.fill(); c.fillStyle='rgba(255,255,255,0.7)'; for(var i=0;i<4;i++){ c.beginPath(); c.moveTo(0,0); c.arc(0,0,w*0.55,i*1.57,i*1.57+0.6); c.fill(); } };
K.stall=function(c,w,h,col){ fillRR(c,-w/2+3,-h/2+6,w-6,h-9,3,'#A47148'); var cols=['#E63946','#FFB703','#06D6A0','#F4A261','#8338EC']; for(var i=0;i<6;i++){ c.fillStyle=cols[i%5]; c.beginPath(); c.arc(-w*0.28+(i%3)*w*0.28,h*0.05+((i/3)|0)*h*0.2,4,0,7); c.fill(); } c.fillStyle=col; c.globalAlpha=0.85; c.beginPath(); c.moveTo(-w/2,-h/2+2); c.lineTo(w/2,-h/2+2); c.lineTo(w/2-4,-h*0.12); c.lineTo(-w/2+4,-h*0.12); c.fill(); c.globalAlpha=1; c.fillStyle='rgba(255,255,255,0.6)'; for(var j=0;j<4;j++) c.fillRect(-w/2+4+j*(w-8)/4,-h/2+2,(w-8)/8,h*0.36); };
K.wheelbarrow=function(c,w,h,col){ fillRR(c,-w*0.32,-h*0.25,w*0.64,h*0.45,3,col); c.fillStyle='#222'; c.beginPath(); c.arc(0,h*0.3,3,0,7); c.fill(); };
K.keke=function(c,w,h,col){ fillRR(c,-w/2+2,-h*0.32,w-4,h*0.64,h*0.25,col); c.fillStyle='#111'; c.fillRect(-w*0.3,-h*0.2,w*0.35,h*0.4); c.fillStyle='#222'; c.beginPath(); c.arc(-w*0.3,h*0.34,3,0,7); c.arc(w*0.3,h*0.34,3,0,7); c.fill(); };
K.shopfront=function(c,w,h,col){ fillRR(c,-w/2+2,-h/2+2,w-4,h-4,3,'#F8F9FA'); c.fillStyle=col; c.fillRect(-w/2+2,-h/2+2,w-4,h*0.25); c.fillStyle='rgba(0,0,0,0.08)'; for(var i=0;i<3;i++) c.fillRect(-w*0.35+i*w*0.25,-h*0.05,w*0.18,h*0.3); };
K.cinema=function(c,w,h,col){ fillRR(c,-w/2+2,-h/2+2,w-4,h-4,3,col); c.fillStyle='#E9ECEF'; c.fillRect(-w*0.4,-h/2+5,w*0.8,4); c.fillStyle='#9D0208'; for(var i=0;i<3;i++) for(var j=0;j<4;j++) fillRR(c,-w*0.35+j*w*0.2,-h*0.1+i*h*0.17,w*0.14,h*0.11,2,'#9D0208'); };
K.checkout=function(c,w,h,col){ fillRR(c,-w/2+2,-h/2+3,w-4,h-6,3,'#DEE2E6'); c.fillStyle=col; c.fillRect(-w/2+2,-h/2+3,w*0.3,h-6); };
K.board=function(c,w,h,col,it){ fillRR(c,-w/2+2,-h/2+2,w-4,h*0.4,2,col); if(it.label){ c.fillStyle='#FFD166'; c.font='bold '+Math.max(6,h*0.22)+'px Rubik,sans-serif'; c.textAlign='center'; c.textBaseline='middle'; c.fillText(it.label.toUpperCase(),0,-h*0.3); } };
K.statue=function(c,w,h,col){ c.fillStyle='#6C757D'; c.fillRect(-w*0.3,-h*0.1,w*0.6,h*0.4); c.fillStyle=col; c.beginPath(); c.arc(0,-h*0.2,w*0.18,0,7); c.fill(); };
K.cooler2=K.cooler;
K.atm=function(c,w,h,col){ fillRR(c,-w*0.36,-h*0.4,w*0.72,h*0.8,3,col); c.fillStyle='#4CC9F0'; c.fillRect(-w*0.24,-h*0.3,w*0.48,h*0.24); };
K.mic=function(c,w,h,col,it){ fillRR(c,-w/2+3,-h/2+3,w-6,h-6,4,'#2B2D42'); c.fillStyle=col; c.beginPath(); c.arc(0,0,5,0,7); c.fill(); c.fillStyle='#FB5607'; c.font='bold 8px Rubik,sans-serif'; c.textAlign='center'; c.fillText('ON AIR',0,-h/2+12); };
K.beanbag=function(c,w,h,col){ c.fillStyle=col; c.beginPath(); c.ellipse(0,0,w*0.38,h*0.32,0.3,0,7); c.fill(); };
K.arcade=function(c,w,h,col){ fillRR(c,-w*0.36,-h*0.42,w*0.72,h*0.84,3,col); c.fillStyle='#4CC9F0'; c.fillRect(-w*0.24,-h*0.32,w*0.48,h*0.3); };
K.altar=function(c,w,h,col){ fillRR(c,-w/2+2,-h/2+2,w-4,h-4,3,col); c.fillStyle='#E9C46A'; c.fillRect(-1.5,-h*0.35,3,h*0.7); c.fillRect(-h*0.25,-h*0.1,h*0.5,3); };
K.pew=function(c,w,h,col){ fillRR(c,-w/2+1,-h*0.3,w-2,h*0.62,3,col); c.fillStyle=shade(col,-30); c.fillRect(-w/2+1,-h*0.3,w-2,h*0.16); };
K.mihrab=function(c,w,h,col){ c.fillStyle=col; c.beginPath(); c.moveTo(-w/2+3,h/2); c.lineTo(-w/2+3,-h*0.1); c.quadraticCurveTo(0,-h/2-4,w/2-3,-h*0.1); c.lineTo(w/2-3,h/2); c.fill(); };
K.hbed=function(c,w,h,col){ K.bed(c,w,h,'#90E0EF'); };
K.ring=function(c,w,h,col){ c.strokeStyle=col; c.lineWidth=2; c.strokeRect(-w/2+4,-h/2+4,w-8,h-8); c.strokeRect(-w/2+7,-h/2+7,w-14,h-14); c.fillStyle='rgba(0,0,0,0.06)'; c.fillRect(-w/2+4,-h/2+4,w-8,h-8); };
K.green=function(c,w,h,col){ c.fillStyle=col; c.beginPath(); c.ellipse(0,0,w*0.48,h*0.46,0,0,7); c.fill(); c.fillStyle='#222'; c.beginPath(); c.arc(0,0,2,0,7); c.fill(); };
K.flag=function(c,w,h,col){ c.fillStyle='#F8F9FA'; c.fillRect(-1,-h*0.4,2,h*0.6); c.fillStyle=col; c.beginPath(); c.moveTo(1,-h*0.4); c.lineTo(w*0.35,-h*0.3); c.lineTo(1,-h*0.2); c.fill(); };
K.buggy=function(c,w,h,col){ fillRR(c,-w*0.38,-h*0.42,w*0.76,h*0.84,5,col); fillRR(c,-w*0.3,-h*0.32,w*0.6,h*0.3,3,'#ADB5BD'); };
K.canopy=function(c,w,h,col){ fillRR(c,-w/2,-h/2+2,w,h-4,2,col); c.strokeStyle='rgba(0,0,0,0.25)'; for(var i=0;i<w;i+=6){ c.beginPath(); c.moveTo(-w/2+i,-h/2+2); c.lineTo(-w/2+i,h/2-2); c.stroke(); } c.strokeStyle='#5E3A1A'; c.lineWidth=1.5; c.beginPath(); c.moveTo(-w/2,-h/2+2); c.lineTo(w/2,-h/2+2); c.moveTo(-w/2,h/2-2); c.lineTo(w/2,h/2-2); c.stroke(); };
K.path=function(c,w,h,col){ c.fillStyle=col; c.globalAlpha=0.8; c.fillRect(-w/2,-h/2+2,w,h-4); c.globalAlpha=1; };
K.pond=function(c,w,h,col){ c.fillStyle=col; c.beginPath(); c.ellipse(0,0,w*0.48,h*0.46,0,0,7); c.fill(); c.fillStyle='#2D6A4F'; c.beginPath(); c.arc(-w*0.2,0,4,0,7); c.arc(w*0.15,h*0.15,3,0,7); c.fill(); };
K.checkin=function(c,w,h,col){ fillRR(c,-w/2+2,-h/2+3,w-4,h-6,3,'#DEE2E6'); c.fillStyle=col; c.fillRect(-w/2+2,-h/2+3,w-4,h*0.25); };
K.seatrow=function(c,w,h,col){ var n=Math.max(2,Math.round(w/(h*0.9))); for(var i=0;i<n;i++) fillRR(c,-w/2+2+i*(w-4)/n,-h*0.3,(w-4)/n-2,h*0.6,3,col); };
K.roulette=function(c,w,h,col){ fillRR(c,-w/2+2,-h/2+2,w-4,h-4,8,col); c.save(); c.rotate(R.t); for(var i=0;i<12;i++){ c.fillStyle=i%2?'#C1121F':'#111'; c.beginPath(); c.moveTo(0,0); c.arc(0,0,Math.min(w,h)*0.3,i*0.5236,(i+1)*0.5236); c.fill(); } c.restore(); c.fillStyle='#E9C46A'; c.beginPath(); c.arc(0,0,3,0,7); c.fill(); };
K.slot=function(c,w,h,col){ fillRR(c,-w*0.36,-h*0.4,w*0.72,h*0.8,3,col); c.fillStyle='#FFF'; c.fillRect(-w*0.24,-h*0.22,w*0.48,h*0.2); c.fillStyle=(Math.floor(R.t*4)%2)?'#E63946':'#06D6A0'; c.beginPath(); c.arc(0,-h*0.32,2,0,7); c.fill(); };
K.tent=function(c,w,h,col){ c.fillStyle=col; c.globalAlpha=0.85; c.fillRect(-w/2,-h/2,w,h); c.globalAlpha=1; c.strokeStyle='#ADB5BD'; for(var i=0;i<w;i+=w/6){ c.beginPath(); c.moveTo(-w/2+i,-h/2); c.lineTo(0,0); c.stroke(); } };
K.ballot=function(c,w,h,col){ fillRR(c,-w*0.32,-h*0.32,w*0.64,h*0.64,2,'#E9ECEF'); c.strokeStyle=col; c.lineWidth=2; c.strokeRect(-w*0.32,-h*0.32,w*0.64,h*0.64); c.fillStyle='#111'; c.fillRect(-w*0.15,-h*0.3,w*0.3,2); };
K.tables=K.rtable;
K.pitch=function(c,w,h,col){ c.fillStyle=col; c.fillRect(-w/2,-h/2,w,h); c.fillStyle='rgba(255,255,255,0.08)'; for(var i=0;i<8;i++) if(i%2) c.fillRect(-w/2+i*w/8,-h/2,w/8,h); c.strokeStyle='rgba(255,255,255,0.8)'; c.lineWidth=2; c.strokeRect(-w/2+3,-h/2+3,w-6,h-6); c.beginPath(); c.moveTo(0,-h/2+3); c.lineTo(0,h/2-3); c.stroke(); c.beginPath(); c.arc(0,0,h*0.16,0,7); c.stroke(); };
K.goal=function(c,w,h,col){ c.strokeStyle='#FFF'; c.lineWidth=2; c.strokeRect(-w*0.3,-h/2+2,w*0.6,h-4); };
K.cooler=K.cooler;
function drawItem(c,it,T,ox,oy){
  var def=E.itemDef(it); var kind=it.kind||def.kind; var f=K[kind]; var col=itemColor(it,def);
  var dm=E.itemDims(it); var pw=dm[0]*T, ph=dm[1]*T; var cx=ox+it.x*T+pw/2, cy=oy+it.y*T+ph/2;
  var on=false; if(def.power){ on=E.hasPower(); } if(kind==='tv'||kind==='desk'||kind==='decks') on=on&&!!it.inUse; if(kind==='speaker'||kind==='ac'||kind==='fan'||kind==='fridge') on=on&&E.hasPower();
  if(!def.flat&&kind!=='tree'&&kind!=='umbrella'){ c.fillStyle='rgba(0,0,0,0.13)'; rr(c,cx-pw/2+3,cy-ph/2+4,pw-4,ph-4,4); c.fill(); }
  c.save(); c.translate(cx,cy); var r=it.r||0; c.rotate(r*Math.PI/2);
  var w0=(r%2)?ph:pw, h0=(r%2)?pw:ph;
  if(f) f(c,w0,h0,col,it,on); else { fillRR(c,-w0/2+2,-h0/2+2,w0-4,h0-4,4,col); }
  c.restore();
}
R.drawItemAt=function(c,id,cx,cy,T){ var def=D.ITEMS[id]; var f=K[def.kind]; c.save(); c.translate(cx,cy); var w=def.w*T, h=def.h*T; if(f) f(c,w,h,def.color,{id:id},true); c.restore(); };

// ---------- Sims ----------
function drawSim(c,look,x,y,T,o){
  look=look||{}; o=o||{}; var s=T/32; var t=o.anim||0; var pose=o.pose||'stand';
  var skin=look.skin||'#7E4B2F', shirt=look.shirt||'#2A9D8F', pants=look.pants||'#1D3557', hair=look.hair||'short', hc=look.hairCol||'#111';
  c.save(); c.translate(x,y);
  if(pose==='lie'){ c.rotate(-Math.PI/2); c.translate(0,0); }
  var bob=o.walking?Math.abs(Math.sin(t*10))*1.5*s:0; if(pose==='dance') bob=Math.abs(Math.sin(t*8))*3*s;
  // shadow & mood ring
  if(pose!=='lie'&&pose!=='swim'){ c.fillStyle='rgba(0,0,0,0.22)'; c.beginPath(); c.ellipse(0,0,9*s,3.5*s,0,0,7); c.fill(); }
  if(o.ring){ c.strokeStyle=o.ring; c.lineWidth=2*s; c.beginPath(); c.ellipse(0,0,12*s,4.8*s,0,0,7); c.stroke(); }
  if(pose==='swim'){ c.fillStyle='rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(0,-2*s,12*s,4*s,0,0,7); c.fill(); }
  c.translate(0,-bob);
  var legH=pose==='sit'?4*s:9*s; var lsw=o.walking?Math.sin(t*10)*2.5*s:0;
  if(pose!=='swim'){ c.fillStyle=pants; c.fillRect(-5*s,-legH,4*s,legH+lsw*0.3); c.fillRect(1*s,-legH,4*s,legH-lsw*0.3); c.fillStyle='#222'; c.fillRect(-5.5*s,-1.5*s+lsw*0.3,5*s,2*s); c.fillRect(0.5*s,-1.5*s-lsw*0.3,5*s,2*s); }
  var by=-legH; var bh=12*s;
  // arms
  var aw=pose==='dance'?Math.sin(t*8)*6*s:(o.walking?Math.sin(t*10)*2*s:0);
  c.fillStyle=skin; if(pose==='dance'){ c.fillRect(-10*s,by-bh-4*s+aw*0.3,3*s,9*s); c.fillRect(7*s,by-bh-4*s-aw*0.3,3*s,9*s); } else { c.fillRect(-9.5*s,by-bh+2*s+aw*0.4,3*s,9*s); c.fillRect(6.5*s,by-bh+2*s-aw*0.4,3*s,9*s); }
  // body
  fillRR(c,-7.5*s,by-bh,15*s,bh+1*s,4*s,shirt);
  if(look.pattern){ c.fillStyle='rgba(255,255,255,0.35)'; for(var i=0;i<3;i++){ c.beginPath(); c.arc(-4*s+i*4*s,by-bh+5*s,1.6*s,0,7); c.fill(); } }
  // head
  var hy=by-bh-7*s; c.fillStyle=skin; c.beginPath(); c.arc(0,hy,7.5*s,0,7); c.fill();
  // hair
  c.fillStyle=hc;
  if(hair==='short'){ c.beginPath(); c.arc(0,hy-1.5*s,7.6*s,Math.PI*1.05,Math.PI*1.95); c.fill(); }
  else if(hair==='afro'){ c.beginPath(); c.arc(0,hy-3*s,10*s,Math.PI*0.95,Math.PI*2.05); c.fill(); c.beginPath(); c.arc(-7*s,hy-1*s,4*s,0,7); c.arc(7*s,hy-1*s,4*s,0,7); c.fill(); }
  else if(hair==='braids'){ c.beginPath(); c.arc(0,hy-1*s,8*s,Math.PI,Math.PI*2); c.fill(); for(var j=-2;j<=2;j++){ c.fillRect(j*3.2*s-1*s,hy-1*s,2*s,(10+Math.abs(j))*s); } }
  else if(hair==='gele'){ c.fillStyle=look.gele||shirt; c.beginPath(); c.ellipse(0,hy-6*s,11*s,6*s,0,0,7); c.fill(); c.fillStyle=shade(look.gele||shirt,30); c.beginPath(); c.ellipse(4*s,hy-9*s,6*s,4*s,0.5,0,7); c.fill(); }
  else if(hair==='cornrow'){ c.beginPath(); c.arc(0,hy-1*s,7.8*s,Math.PI,Math.PI*2); c.fill(); c.strokeStyle=skin; c.lineWidth=0.8*s; for(var k=-2;k<=2;k++){ c.beginPath(); c.moveTo(k*2.5*s,hy-8*s); c.lineTo(k*2.5*s,hy-2*s); c.stroke(); } }
  else if(hair==='locs'){ c.beginPath(); c.arc(0,hy-1*s,8*s,Math.PI,Math.PI*2); c.fill(); for(var m=-3;m<=3;m++){ c.fillRect(m*2.4*s-1*s,hy-2*s,2.2*s,(8+((m+3)%3)*2)*s); } }
  else if(hair==='bun'){ c.beginPath(); c.arc(0,hy-1*s,7.8*s,Math.PI,Math.PI*2); c.fill(); c.beginPath(); c.arc(0,hy-9*s,4*s,0,7); c.fill(); }
  // face
  var ex=(o.dir||1)*1.2*s; c.fillStyle='#111';
  if(pose==='lie'&&o.sleeping){ c.fillRect(-4*s+ex,hy,3*s,1*s); c.fillRect(1*s+ex,hy,3*s,1*s); }
  else { c.beginPath(); c.arc(-2.8*s+ex,hy,1.1*s,0,7); c.arc(2.8*s+ex,hy,1.1*s,0,7); c.fill(); }
  c.strokeStyle='rgba(0,0,0,0.55)'; c.lineWidth=1*s; c.beginPath(); if(o.mood!=null&&o.mood<35){ c.arc(ex,hy+5*s,2*s,Math.PI*1.15,Math.PI*1.85); } else c.arc(ex,hy+2.5*s,2.2*s,0.2,Math.PI-0.2); c.stroke();
  c.restore();
  // label and bubble (not rotated)
  if(o.name){ c.font='600 '+Math.max(9,10*s)+'px Rubik,sans-serif'; c.textAlign='center'; c.textBaseline='bottom'; var tw=c.measureText(o.name).width; var ny=y-(pose==='lie'?20:44)*s-(o.bubble?20*s:0);
    fillRR(c,x-tw/2-5,ny-13*Math.max(1,s),tw+10,14*Math.max(1,s),6,o.me?'rgba(245,183,0,0.95)':(o.live?'rgba(0,135,81,0.92)':'rgba(20,24,30,0.72)')); c.fillStyle=o.me?'#1A1400':'#fff'; c.fillText(o.name,x,ny-1); }
  if(o.bubble){ var by2=y-(pose==='lie'?16:40)*s; var bw=Math.max(18,22*s); fillRR(c,x-bw/2,by2-bw,bw,bw*0.86,7,'rgba(255,255,255,0.95)'); c.fillStyle='rgba(255,255,255,0.95)'; c.beginPath(); c.moveTo(x-3,by2-bw*0.15); c.lineTo(x+3,by2-bw*0.15); c.lineTo(x,by2+3); c.fill();
    c.font=(bw*0.58)+'px sans-serif'; c.textAlign='center'; c.textBaseline='middle'; c.fillStyle='#111'; c.fillText(o.bubble,x,by2-bw*0.57); }
  if(o.say){ c.font='500 '+Math.max(10,11*s)+'px Rubik,sans-serif'; var txt=o.say.length>38?o.say.slice(0,36)+'…':o.say; var w2=c.measureText(txt).width+12; var sy=y-(o.bubble?66:52)*s-(o.name?16*s:0);
    fillRR(c,x-w2/2,sy-18,w2,18,8,'#FFFFFF'); c.strokeStyle='rgba(0,0,0,0.15)'; c.stroke(); c.fillStyle='#111'; c.textAlign='center'; c.textBaseline='middle'; c.fillText(txt,x,sy-9); }
}
R.drawSim=drawSim;
R.portrait=function(cv,look,mood){ var c=cv.getContext('2d'); var w=cv.width, h=cv.height; c.clearRect(0,0,w,h); c.save(); c.beginPath(); c.arc(w/2,h/2,w/2,0,7); c.clip(); c.fillStyle=mood==null?'#F5B700':(mood>=60?'#06D6A0':(mood>=35?'#FFBE0B':'#EF476F')); c.fillRect(0,0,w,h);
  drawSim(c,look,w/2,h*1.18,w*1.15,{dir:1,mood:mood}); c.restore(); };

// ---------- lot frame ----------
R.fitLot=function(cv,L,pad){ var W=cv.clientWidth, H=cv.clientHeight; pad=pad||{t:70,b:120,l:10,r:10}; var s=Math.min((W-pad.l-pad.r)/L.w,(H-pad.t-pad.b)/L.h); s=Math.max(12,Math.min(64,s));
  R.cam.follow=false; if(W<700&&s<30){ s=Math.min(30,Math.max(s,(H-pad.t-pad.b)/L.h)); R.cam.follow=L.w*s>W-pad.l-pad.r||L.h*s>H-pad.t-pad.b; }
  R.cam.s=s; R.cam.x=pad.l+(W-pad.l-pad.r-L.w*s)/2; R.cam.y=pad.t+(H-pad.t-pad.b-L.h*s)/2; R.cam.fit=true; R.cam.pad=pad; };
R.follow=function(cv,L,x,y){ var c=R.cam; if(!c.fit||!c.follow) return; var W=cv.clientWidth, H=cv.clientHeight, p=c.pad, s=c.s;
  function cl(v,lo,hi){ return lo>hi?(lo+hi)/2:Math.max(lo,Math.min(hi,v)); }
  var tx=cl(W/2-(x+0.5)*s, W-p.r-L.w*s, p.l), ty=cl(p.t+(H-p.t-p.b)/2-(y+0.5)*s, H-p.b-L.h*s, p.t);
  c.x+=(tx-c.x)*0.12; c.y+=(ty-c.y)*0.12; };
R.drawLot=function(c,cv,L,st){
  var T=R.cam.s, ox=R.cam.x, oy=R.cam.y; var W=cv.clientWidth, H=cv.clientHeight;
  // backdrop
  c.fillStyle=st.backdrop||'#2B3A2E'; c.fillRect(0,0,W,H);
  var g=c.createRadialGradient(W/2,H/2,50,W/2,H/2,Math.max(W,H)); g.addColorStop(0,'rgba(255,255,255,0.05)'); g.addColorStop(1,'rgba(0,0,0,0.25)'); c.fillStyle=g; c.fillRect(0,0,W,H);
  var sl=staticLayer(L,Math.round(T*2)/2); c.drawImage(sl,ox,oy,L.w*T,L.h*T);
  // buy grid
  if(st.buy){ c.strokeStyle='rgba(255,255,255,0.18)'; c.lineWidth=1; c.beginPath(); for(var gx=0;gx<=L.w;gx++){ c.moveTo(ox+gx*T,oy); c.lineTo(ox+gx*T,oy+L.h*T); } for(var gy=0;gy<=L.h;gy++){ c.moveTo(ox,oy+gy*T); c.lineTo(ox+L.w*T,oy+gy*T); } c.stroke(); }
  // flat items first, then sorted
  var flats=L.items.filter(function(i){ return E.itemDef(i).flat; }), solids=L.items.filter(function(i){ return !E.itemDef(i).flat; });
  flats.forEach(function(it){ drawItem(c,it,T,ox,oy); });
  // parked car
  if(st.car){ var p=L.parking; var cx=ox+(p[0]+1)*T, cy=oy+(p[1]+0.5)*T; fillRR(c,cx-T*0.95,cy-T*0.4,T*1.9,T*0.8,T*0.3,st.car); c.fillStyle='rgba(30,40,60,0.6)'; fillRR(c,cx-T*0.35,cy-T*0.32,T*0.8,T*0.64,T*0.15,'rgba(30,40,60,0.55)'); }
  var draws=solids.map(function(it){ var dm=E.itemDims(it); return {y:it.y+dm[1]-0.5,f:function(){ drawItem(c,it,T,ox,oy); }}; });
  (st.sims||[]).forEach(function(sm){ draws.push({y:sm.y+0.01,f:function(){ drawSim(c,sm.look,ox+(sm.x+0.5)*T,oy+(sm.y+0.82)*T,T,sm); }}); });
  draws.sort(function(a,b){ return a.y-b.y; }); draws.forEach(function(d){ d.f(); });
  // selection highlight
  if(st.hl){ var dm=E.itemDims(st.hl); c.strokeStyle='#F5B700'; c.lineWidth=2.5; c.setLineDash([6,4]); c.strokeRect(ox+st.hl.x*T+1,oy+st.hl.y*T+1,dm[0]*T-2,dm[1]*T-2); c.setLineDash([]); }
  // ghost for buy mode
  if(st.ghost){ var gh=st.ghost; var def=D.ITEMS[gh.id]; var gd=(gh.r%2)?[def.h,def.w]:[def.w,def.h]; c.globalAlpha=0.7; drawItem(c,{id:gh.id,x:gh.x,y:gh.y,r:gh.r},T,ox,oy); c.globalAlpha=1;
    c.fillStyle=gh.ok?'rgba(6,214,160,0.25)':'rgba(239,71,111,0.3)'; c.fillRect(ox+gh.x*T,oy+gh.y*T,gd[0]*T,gd[1]*T); c.strokeStyle=gh.ok?'#06D6A0':'#EF476F'; c.lineWidth=2; c.strokeRect(ox+gh.x*T,oy+gh.y*T,gd[0]*T,gd[1]*T); }
  // walk target marker
  if(st.target){ var tx=ox+(st.target[0]+0.5)*T, ty=oy+(st.target[1]+0.5)*T; c.strokeStyle='rgba(245,183,0,0.9)'; c.lineWidth=2; c.beginPath(); c.arc(tx,ty,T*0.3*(1+0.15*Math.sin(R.t*6)),0,7); c.stroke(); }
  // night overlay
  if(st.night>0){ c.save(); c.fillStyle='rgba(12,20,52,'+st.night+')'; c.fillRect(ox,oy,L.w*T,L.h*T);
    if(st.lit){ c.globalCompositeOperation='lighter'; L.rooms.forEach(function(r){ if(r.owned===-1) return; var gx=ox+(r.x+r.w/2)*T, gy=oy+(r.y+r.h/2)*T; var rg=c.createRadialGradient(gx,gy,4,gx,gy,Math.max(r.w,r.h)*T*0.7); rg.addColorStop(0,'rgba(255,214,140,'+(st.night*0.55)+')'); rg.addColorStop(1,'rgba(255,214,140,0)'); c.fillStyle=rg; c.fillRect(ox+r.x*T,oy+r.y*T,r.w*T,r.h*T); }); }
    c.restore(); }
};
R.screenToTile=function(px,py){ return [Math.floor((px-R.cam.x)/R.cam.s),Math.floor((py-R.cam.y)/R.cam.s)]; };
R.screenToTileF=function(px,py){ return [(px-R.cam.x)/R.cam.s,(py-R.cam.y)/R.cam.s]; };
R.tileToScreen=function(x,y){ return [R.cam.x+x*R.cam.s,R.cam.y+y*R.cam.s]; };

// ---------- maps ----------
var mapCache={key:null,cv:null};
var TYPE_COL={airport:'#3A86FF',market:'#F4A261',mall:'#FF006E',buka:'#E63946',restaurant:'#E63946',club:'#8338EC',shrine:'#8338EC',comedy:'#8338EC',beach:'#00B4D8',campus:'#2A9D8F',office:'#495057',tech:'#06D6A0',bank:'#1D3557',radio:'#FB5607',church:'#9C6644',mosque:'#2D6A4F',hospital:'#EF476F',gym:'#F77F00',golf:'#52B788',park:'#40916C',casino:'#C1121F',polling:'#008751',event:'#C9184A',stadium:'#008751',estate:'#6C757D',studio:'#E76F51',naijashop:'#008751',jobcentre:'#495057'};
var TYPE_GLYPH={airport:'✈',market:'🛒',mall:'🛍',buka:'🍲',restaurant:'🍽',club:'🪩',shrine:'🎷',comedy:'🎤',beach:'🏖',campus:'🎓',office:'💼',tech:'💻',bank:'🏦',radio:'📻',church:'⛪',mosque:'🕌',hospital:'🏥',gym:'🏋',golf:'⛳',park:'🌳',casino:'🎰',polling:'🗳',event:'💒',stadium:'⚽',estate:'🏘',studio:'🧵',naijashop:'🛒',jobcentre:'📄'};
R.TYPE_COL=TYPE_COL; R.TYPE_GLYPH=TYPE_GLYPH;
R.fitMap=function(cv){ var W=cv.clientWidth, H=cv.clientHeight; var s=Math.min(W/1000,(H-150)/640); s=Math.max(0.35,s); if(W<640) s=Math.max(s,(H-170)/640*0.98); R.mapCam.s=s; R.mapCam.x=(W-1000*s)/2; R.mapCam.y=70+((H-190)-640*s)/2; if(W<640){ var me=E.locXY(E.S.loc==='travel'?'home':E.S.loc); R.mapCam.x=Math.min(10,Math.max(W-1000*s-10,W/2-me[0]*s)); } };
function mapStatic(cid){
  if(mapCache.key===cid) return mapCache.cv; var C=D.CITIES[cid]; var cv=mapCache.cv||document.createElement('canvas'); cv.width=2000; cv.height=1280; var c=cv.getContext('2d'); c.setTransform(2,0,0,2,0,0);
  c.fillStyle=C.sea; c.fillRect(0,0,1000,640);
  // waves
  c.strokeStyle='rgba(255,255,255,0.12)'; c.lineWidth=1.2; for(var y=10;y<640;y+=22) for(var x=(y%44?0:20);x<1000;x+=46){ c.beginPath(); c.arc(x,y,8,Math.PI*1.15,Math.PI*1.85); c.stroke(); }
  function poly(p,col){ c.fillStyle=col; c.beginPath(); p.forEach(function(q,i){ if(i) c.lineTo(q[0],q[1]); else c.moveTo(q[0],q[1]); }); c.closePath(); c.fill(); }
  if(C.land[0]) poly(C.land[0].p,C.land[0].c);
  if(C.lagoon){ poly(C.lagoon.p,C.lagoon.c); }
  for(var i=1;i<C.land.length;i++) poly(C.land[i].p,C.land[i].c);
  // land texture: blocks
  var r=E.seeded(E.hash(cid)); c.fillStyle='rgba(120,90,60,0.07)';
  for(var k=0;k<900;k++){ var bx=r()*1000, by=r()*640; var pix=c.getImageData(bx*2|0,by*2|0,1,1).data; if(pix[2]>pix[0]+20) continue; c.fillRect(bx,by,4+r()*6,3+r()*5); }
  // roads
  C.roads.forEach(function(rd){ c.strokeStyle='rgba(60,50,40,0.35)'; c.lineWidth=rd.w+3; c.lineJoin='round'; c.lineCap='round'; c.beginPath(); rd.p.forEach(function(q,i){ if(i) c.lineTo(q[0],q[1]); else c.moveTo(q[0],q[1]); }); c.stroke();
    c.strokeStyle='#F8F4EA'; c.lineWidth=rd.w; c.stroke(); c.strokeStyle='rgba(245,183,0,0.7)'; c.lineWidth=1; c.setLineDash([6,6]); c.stroke(); c.setLineDash([]); });
  // labels
  c.textAlign='center'; c.textBaseline='middle';
  C.labels.forEach(function(l){ var water=/LAGOON|OCEAN|RIVER|LAKE|GULF|MEDITERRANEAN|BAYOU|THAMES/.test(l[0]); c.font=(water?'italic 600 13px':'800 12px')+' Rubik,sans-serif'; c.fillStyle=water?'rgba(255,255,255,0.7)':'rgba(70,55,40,0.55)'; c.save(); c.translate(l[1],l[2]); c.fillText(l[0].split('').join(String.fromCharCode(8202)),0,0); c.restore(); });
  mapCache={key:cid,cv:cv}; return cv;
}
var danfos=[];
R.drawMap=function(c,cv,cid,st){
  var W=cv.clientWidth, H=cv.clientHeight; var C=D.CITIES[cid]; var m=R.mapCam;
  c.fillStyle=C.sea; c.fillRect(0,0,W,H);
  c.save(); c.translate(m.x,m.y); c.scale(m.s,m.s);
  c.drawImage(mapStatic(cid),0,0,1000,640);
  // traffic
  if(danfos.cid!==cid){ danfos=[]; danfos.cid=cid; C.roads.forEach(function(rd,ri){ for(var i=0;i<Math.round(rd.w*1.5);i++) danfos.push({r:ri,t:Math.random(),v:(0.02+Math.random()*0.03)*(Math.random()<0.5?1:-1),col:C.abroad?['#E63946','#3A86FF','#FFFFFF','#222'][i%4]:(i%3?'#F5B700':'#F1FAEE')}); }); }
  danfos.forEach(function(d){ var rd=C.roads[d.r]; var slow=st.rush?0.35:1; d.t=(d.t+d.v*slow*st.dt+1)%1; var pt=along(rd.p,d.t); c.fillStyle=d.col; c.save(); c.translate(pt[0],pt[1]); c.rotate(pt[2]); c.fillRect(-4,-2,8,4); c.fillStyle='rgba(0,0,0,0.5)'; c.fillRect(-4,-2,2,4); c.restore(); });
  // billboards
  C.billboards.forEach(function(b,i){ var ad=D.ADS[(Math.floor(R.t/6)+i*3)%D.ADS.length]; c.fillStyle='#333'; c.fillRect(b[0]-1,b[1],2,10); c.fillStyle=ad[2]; c.fillRect(b[0]-34,b[1]-18,68,18); c.fillStyle='#fff'; c.font='800 7px Rubik,sans-serif'; c.textAlign='center'; c.fillText(ad[0],b[0],b[1]-12); c.font='6px Rubik,sans-serif'; c.fillText(ad[1],b[0],b[1]-4); });
  // pins
  var locs=D.LOCS.filter(function(l){ return l[2]===cid; });
  var homeArea=E.homeAreaLoc(cid);
  locs.forEach(function(l){ var id=l[0], x=l[4], y=l[5], ty=l[3]; var sel=st.sel===id; var here=E.S.loc===id; var col=TYPE_COL[ty]||'#555';
    var rad=(sel?13:10)/Math.max(0.8,Math.min(1.6,m.s));
    c.fillStyle='rgba(0,0,0,0.25)'; c.beginPath(); c.arc(x+1,y+2,rad,0,7); c.fill();
    c.fillStyle=col; c.beginPath(); c.arc(x,y,rad,0,7); c.fill(); c.strokeStyle=here?'#F5B700':'#fff'; c.lineWidth=(here?3:2)/m.s*0.9; c.stroke();
    c.font=(rad*1.05)+'px sans-serif'; c.textAlign='center'; c.textBaseline='middle'; c.fillText(TYPE_GLYPH[ty]||'•',x,y+0.5);
    if(st.labels||sel||here){ var lab=l[1]; c.font='700 '+(9/Math.max(0.75,m.s*0.9))+'px Rubik,sans-serif'; var tw=c.measureText(lab).width; fillRR(c,x-tw/2-4,y+rad+2,tw+8,12/Math.max(0.75,m.s*0.9),4,'rgba(255,255,255,0.88)'); c.fillStyle='#1B1B1B'; c.textBaseline='top'; c.fillText(lab,x,y+rad+3); }
  });
  // home marker
  if(E.S.homes[cid]&&homeArea){ var hl=D.LOC[homeArea]; var hx=hl.x+16, hy=hl.y-14; c.fillStyle='#F5B700'; c.beginPath(); c.moveTo(hx,hy-11); c.lineTo(hx+10,hy-2); c.lineTo(hx+7,hy-2); c.lineTo(hx+7,hy+7); c.lineTo(hx-7,hy+7); c.lineTo(hx-7,hy-2); c.lineTo(hx-10,hy-2); c.closePath(); c.fill(); c.strokeStyle='#1A1400'; c.lineWidth=1.5; c.stroke(); c.fillStyle='#1A1400'; c.fillRect(hx-2,hy+1,4,6); }
  // other players
  (st.players||[]).forEach(function(p){ var xy=p.xy; if(!xy) return; c.fillStyle='#008751'; c.beginPath(); c.arc(xy[0]-8,xy[1]-8,5,0,7); c.fill(); c.strokeStyle='#fff'; c.lineWidth=1.5; c.stroke(); });
  // me
  var me=st.me; if(me){ var pr=6+2*Math.sin(R.t*4); c.fillStyle='rgba(245,183,0,0.35)'; c.beginPath(); c.arc(me[0],me[1],pr+6,0,7); c.fill(); c.fillStyle='#F5B700'; c.beginPath(); c.arc(me[0],me[1],6,0,7); c.fill(); c.strokeStyle='#1A1400'; c.lineWidth=2; c.stroke();
    if(st.trip){ c.strokeStyle='rgba(26,20,0,0.6)'; c.setLineDash([5,5]); c.beginPath(); c.moveTo(st.trip.fromXY[0],st.trip.fromXY[1]); c.lineTo(st.trip.toXY[0],st.trip.toXY[1]); c.stroke(); c.setLineDash([]); } }
  c.restore();
};
function along(p,t){ var L=0, seg=[]; for(var i=1;i<p.length;i++){ var d=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]); seg.push(d); L+=d; } var x=t*L; for(var j=0;j<seg.length;j++){ if(x<=seg[j]){ var f=x/seg[j]; var a=p[j], b=p[j+1]; return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,Math.atan2(b[1]-a[1],b[0]-a[0])]; } x-=seg[j]; } var e=p[p.length-1]; return [e[0],e[1],0]; }
R.mapToScreen=function(x,y){ return [R.mapCam.x+x*R.mapCam.s,R.mapCam.y+y*R.mapCam.s]; };
R.screenToMap=function(px,py){ return [(px-R.mapCam.x)/R.mapCam.s,(py-R.mapCam.y)/R.mapCam.s]; };
R.invalidate=function(){ cache.key=null; };

JL.R=R;
})(typeof window!=='undefined'?window:globalThis);
