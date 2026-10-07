/* Japa Life — simulation engine. No DOM here; the UI talks to it through JL.E and hooks. */
(function (G) {
'use strict';
var D = G.JL_DATA;
var E = {S:null, rt:{}, hooks:{note:function(){}, ui:function(n,ctx,done){ if(done) done(null); }, event:function(){}, changed:function(){}}};
var S;

// ---------- helpers ----------
function rnd(){ return Math.random(); }
function ri(a,b){ return Math.floor(rnd()*(b-a+1))+a; }
function pick(a){ return a[Math.floor(rnd()*a.length)]; }
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function fmt(n){ n=Math.round(n); return (n<0?'-₦':'₦')+Math.abs(n).toLocaleString('en-US'); }
function hash(s){ var h=2166136261; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
function seeded(seed){ var t=seed>>>0; return function(){ t+=0x6D2B79F5; var r=Math.imul(t^(t>>>15),1|t); r^=r+Math.imul(r^(r>>>7),61|r); return ((r^(r>>>14))>>>0)/4294967296; }; }
function uid(){ return 'i'+Math.floor(rnd()*1e9).toString(36)+(E._u=(E._u||0)+1); }
E.fmt=fmt; E.rnd=rnd; E.ri=ri; E.pick=pick; E.clamp=clamp; E.hash=hash; E.seeded=seeded;

function note(text, kind){ E.hooks.note(text, kind||'info'); log(text); }
function log(text){ S.log.unshift({d:S.day,m:S.min,t:text}); if(S.log.length>80) S.log.length=80; }
E.note=note;

// ---------- time ----------
var DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
E.DAYS=DAYS;
function weekday(d){ return ((d===undefined?S.day:d)+1)%7; }  // day 0 is a Monday
function hour(){ return Math.floor(S.min/60); }
E.weekday=weekday; E.hour=hour;
E.clock=function(){ var h=hour(), m=Math.floor(S.min%60); var ap=h<12?'am':'pm'; var hh=h%12; if(hh===0) hh=12; return hh+':'+(m<10?'0':'')+m+' '+ap; };
E.dateLabel=function(){ return DAYS[weekday()].slice(0,3)+' · Week '+(Math.floor(S.day/7)+1); };

// ---------- economy scaling ----------
function city(c){ return D.CITIES[c||S.city]; }
function kCost(c){ var C=city(c); return C.abroad ? C.cost*15*S.rate/1550 : C.cost; }
function kPay(c){ var C=city(c); return C.abroad ? C.pay*17*S.rate/1550 : C.pay; }
function price(n,c){ return Math.round(n*kCost(c)); }
E.kCost=kCost; E.kPay=kPay; E.price=price; E.city=city;

// ---------- lots, walls, pathfinding ----------
function buildLot(spec){
  var L={w:spec.w,h:spec.h,ground:spec.ground,rooms:spec.rooms.map(function(r){return {x:r[0],y:r[1],w:r[2],h:r[3],floor:r[4],name:r[5],owned:r[6]};}),
    doors:{},doorList:spec.doors.slice(),pool:spec.pool||null,water:spec.water||null,items:[],parking:spec.parking||null,label:spec.label||''};
  spec.doors.forEach(function(d){ L.doors[d[2]+':'+d[0]+','+d[1]]=1; });
  L.room=new Int16Array(L.w*L.h).fill(-1);
  L.rooms.forEach(function(r,i){ for(var y=r.y;y<r.y+r.h;y++) for(var x=r.x;x<r.x+r.w;x++) if(x>=0&&y>=0&&x<L.w&&y<L.h) L.room[y*L.w+x]=i; });
  L.occ=null; return L;
}
E.buildLot=buildLot;
function roomAt(L,x,y){ if(x<0||y<0||x>=L.w||y>=L.h) return -2; return L.room[y*L.w+x]; }
function isWater(L,x,y){ var p=L.pool; if(p&&x>=p[0]&&x<p[0]+p[2]&&y>=p[1]&&y<p[1]+p[3]) return true; var w=L.water; return !!(w&&x>=w[0]&&x<w[0]+w[2]&&y>=w[1]&&y<w[1]+w[3]); }
function itemDims(it){ var def=it.def||D.ITEMS[it.id]||it; var w=it.w||def.w, h=it.h||def.h; return (it.r%2===1)?[h,w]:[w,h]; }
E.itemDims=itemDims;
function itemDef(it){ return it.def || D.ITEMS[it.id] || it; }
E.itemDef=itemDef;
function rebuildOcc(L){
  L.occ=new Array(L.w*L.h).fill(null);
  L.items.forEach(function(it){ var d=itemDef(it); if(d.flat) return; var dm=itemDims(it);
    for(var y=it.y;y<it.y+dm[1];y++) for(var x=it.x;x<it.x+dm[0];x++) if(x>=0&&y>=0&&x<L.w&&y<L.h) L.occ[y*L.w+x]=it; });
}
E.rebuildOcc=rebuildOcc;
function blocked(L,x,y){
  if(x<0||y<0||x>=L.w||y>=L.h) return true;
  var r=L.room[y*L.w+x]; if(r>=0&&L.rooms[r].owned===-1) return true;
  if(isWater(L,x,y)) return true;
  if(!L.occ) rebuildOcc(L);
  return !!L.occ[y*L.w+x];
}
function wallBetween(L,ax,ay,bx,by){
  var ra=roomAt(L,ax,ay), rb=roomAt(L,bx,by); if(ra===rb) return false;
  if(ax!==bx){ var x=Math.max(ax,bx); return !L.doors['v:'+x+','+ay]; }
  var y=Math.max(ay,by); return !L.doors['h:'+ax+','+y];
}
E.wallBetween=wallBetween; E.blocked=blocked; E.roomAt=roomAt; E.isWater=isWater;
var DIRS=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
function canStep(L,x,y,dx,dy){
  var nx=x+dx, ny=y+dy; if(blocked(L,nx,ny)) return false;
  if(dx&&dy){ if(blocked(L,x+dx,y)||blocked(L,x,y+dy)) return false;
    if(wallBetween(L,x,y,x+dx,y)||wallBetween(L,x,y,x,y+dy)||wallBetween(L,x+dx,y,nx,ny)||wallBetween(L,x,y+dy,nx,ny)) return false; return true; }
  return !wallBetween(L,x,y,nx,ny);
}
// BFS distances from a start tile
function bfs(L,sx,sy,ignoreStart){
  var n=L.w*L.h, dist=new Float32Array(n).fill(1e9), prev=new Int32Array(n).fill(-1);
  var s=sy*L.w+sx; dist[s]=0; var q=[s], qi=0;
  while(qi<q.length){ var c=q[qi++], cx=c%L.w, cy=(c/L.w)|0;
    for(var k=0;k<8;k++){ var dx=DIRS[k][0], dy=DIRS[k][1];
      if(!canStep(L,cx,cy,dx,dy)) continue;
      var ni=(cy+dy)*L.w+cx+dx, nd=dist[c]+(dx&&dy?1.414:1);
      if(nd<dist[ni]-1e-6){ dist[ni]=nd; prev[ni]=c; q.push(ni); } } }
  return {dist:dist,prev:prev};
}
function pathFrom(L,B,tx,ty){ var p=[], c=ty*L.w+tx; if(B.dist[c]>=1e9) return null; while(c!==-1){ p.push([c%L.w,(c/L.w)|0]); c=B.prev[c]; } p.reverse(); p.shift(); return p; }
function startTile(L,sim){
  var x=Math.round(sim.x), y=Math.round(sim.y);
  if(!blocked(L,x,y)) return [x,y];
  // stuck inside furniture (after an 'on' action) — step to nearest free tile
  for(var r=1;r<4;r++) for(var dy=-r;dy<=r;dy++) for(var dx=-r;dx<=r;dx++){ if(!blocked(L,x+dx,y+dy)) return [x+dx,y+dy]; }
  return [x,y];
}
function useTiles(L,it){
  var dm=itemDims(it), out=[];
  for(var y=it.y-1;y<=it.y+dm[1];y++) for(var x=it.x-1;x<=it.x+dm[0];x++){
    var inside=x>=it.x&&x<it.x+dm[0]&&y>=it.y&&y<it.y+dm[1]; if(inside) continue;
    var corner=(x===it.x-1||x===it.x+dm[0])&&(y===it.y-1||y===it.y+dm[1]); if(corner) continue;
    if(blocked(L,x,y)) continue;
    // must not be separated from the item by a wall
    var ax=clamp(x,it.x,it.x+dm[0]-1), ay=clamp(y,it.y,it.y+dm[1]-1);
    if(wallBetween(L,x,y,ax,ay)) continue;
    out.push([x,y,ax,ay]); }
  return out;
}
function pathToItem(L,sim,it){
  var st=startTile(L,sim), B=bfs(L,st[0],st[1]);
  var d=itemDef(it);
  if(d.flat && it.prop){ // walk onto a flat prop (dancefloor, shore, path)
    var dm=itemDims(it), best=null;
    for(var y=it.y;y<it.y+dm[1];y++) for(var x=it.x;x<it.x+dm[0];x++){ var i=y*L.w+x; if(B.dist[i]<1e9 && (!best||rnd()<0.35)) best=[x,y]; }
    if(!best) return null; var p=pathFrom(L,B,best[0],best[1]); return p?{path:p,face:best}:null;
  }
  var cands=useTiles(L,it), bi=-1, bd=1e9;
  cands.forEach(function(c,i){ var dd=B.dist[c[1]*L.w+c[0]]; if(dd<bd){ bd=dd; bi=i; } });
  if(bi<0) return null;
  var c=cands[bi]; var p2=(st[0]===c[0]&&st[1]===c[1])?[]:pathFrom(L,B,c[0],c[1]);
  if(!p2) return null; return {path:p2,face:[c[2],c[3]],stand:[c[0],c[1]]};
}
function pathToTile(L,sim,tx,ty){ var st=startTile(L,sim); var B=bfs(L,st[0],st[1]); return pathFrom(L,B,tx,ty); }
E.pathToTile=pathToTile; E.pathToItem=pathToItem; E.useTiles=useTiles;

// ---------- venue lots ----------
function P(kind,x,y,w,h,prop,color,label,extra){ var o={uid:uid(),kind:kind,x:x,y:y,w:w,h:h,r:0,prop:prop||null,color:color||null,label:label||'',fixed:true,def:null}; if(extra) for(var k in extra) o[k]=extra[k]; o.def={kind:kind,w:w,h:h,flat:!!(extra&&extra.flat),color:color}; return o; }
var VENUE = {};
function officeBase(name,floor){ return {w:20,h:13,ground:'paving',rooms:[[1,1,18,10,floor||'carpet',name,0]],doors:[[9,11,'h'],[10,11,'h']]}; }
VENUE.buka=function(l,r){ var L=buildLot({w:18,h:12,ground:'dirt',rooms:[[2,1,14,7,'concrete',l.name,0]],doors:[[8,8,'h'],[9,8,'h']]});
  L.items.push(P('counter',3,2,4,1,'counter','#8D6346','Serving'), P('pot',8,2,1,1,null,'#555'), P('pot',9,2,1,1,null,'#666'), P('pot',10,2,1,1,null,'#444'));
  [4,8,12].forEach(function(x){ L.items.push(P('table',x,5,2,1,'table','#A47148'), P('bench',x,6,2,1,'bench','#7F5539')); });
  L.items.push(P('bench',3,10,2,1,'bench','#7F5539'), P('bench',12,10,2,1,'bench','#7F5539'), P('gen',16,10,1,1,null,'#F4A261'), P('sign',6,9,4,1,null,'#E63946',l.name,{flat:true}));
  return L; };
VENUE.restaurant=function(l,r){ var L=VENUE.buka(l,r); L.rooms[0].floor='tiles'; return L; };
VENUE.club=function(l,r,stage){ var L=buildLot({w:20,h:13,ground:'paving',rooms:[[1,1,18,10,'dark',l.name,0]],doors:[[9,11,'h'],[10,11,'h']]});
  L.items.push(P('bar',2,2,6,1,'bar','#3A0CA3','Bar'), P('decks',14,2,3,1,'stage','#7209B7','DJ'), P('dancefloor',7,5,6,4,'dancefloor',null,'',{flat:true}),
    P('sofa',2,8,3,1,'vip','#9D0208','VIP'), P('sofa',14,8,3,1,'vip','#9D0208','VIP'), P('speaker',1,5,1,1,null,'#111'), P('speaker',18,5,1,1,null,'#111'));
  return L; };
VENUE.shrine=function(l,r){ var L=buildLot({w:20,h:13,ground:'dirt',rooms:[[1,1,18,10,'concrete',l.name,0]],doors:[[9,11,'h'],[10,11,'h']]});
  L.items.push(P('stage',6,1,8,2,'stage','#9C6644','Stage'), P('bar',2,9,4,1,'bar','#264653'), P('dancefloor',7,4,6,3,'dancefloor',null,'',{flat:true}),P('counter',15,9,3,1,'counter','#8D6346','Office'));
  [2,15].forEach(function(x){ L.items.push(P('bench',x,4,2,1,'bench','#7F5539'),P('bench',x,6,2,1,'bench','#7F5539')); }); return L; };
VENUE.comedy=function(l,r){ var L=buildLot({w:20,h:13,ground:'paving',rooms:[[1,1,18,10,'dark',l.name,0]],doors:[[9,11,'h'],[10,11,'h']]});
  L.items.push(P('stage',7,1,6,2,'stage','#6A040F','Stage'), P('bar',2,9,4,1,'bar','#3A0CA3'));
  [[3,5],[7,5],[11,5],[15,5],[5,7],[9,7],[13,7]].forEach(function(p){ L.items.push(P('rtable',p[0],p[1],1,1,'table','#ddd')); }); return L; };
VENUE.beach=function(l,r){ var L=buildLot({w:20,h:13,ground:'sand',rooms:[],doors:[],water:[0,9,20,4]});
  L.items.push(P('shore',2,8,16,1,'shore',null,'',{flat:true}), P('shack',1,1,4,2,'bar','#BC6C25','Beach bar'), P('horse',17,5,1,2,'horse','#7F4F24'), P('bonfire',10,5,1,1,'bonfire','#FB8500'));
  [[3,4],[7,3],[13,3],[15,6],[6,6]].forEach(function(p,i){ L.items.push(P('umbrella',p[0],p[1],1,1,'umbrella',D.SHIRTS[(i*3)%12])); }); return L; };
VENUE.market=function(l,r){ var L=buildLot({w:20,h:13,ground:'dirt',rooms:[],doors:[]});
  var i=0; [2,6,10,14].forEach(function(x){ [2,7].forEach(function(y){ L.items.push(P('stall',x,y,2,2,'stall',D.SHIRTS[(i++*5)%12])); }); });
  L.items.push(P('wheelbarrow',18,4,1,1,null,'#6C757D'), P('keke',17,10,2,1,null,'#F5B700'), P('sign',8,11,4,1,null,'#2A9D8F',l.name,{flat:true})); return L; };
VENUE.mall=function(l,r){ var L=buildLot({w:20,h:14,ground:'paving',rooms:[[1,1,18,11,'marble',l.name,0]],doors:[[9,12,'h'],[10,12,'h']]});
  [2,6,10].forEach(function(x,i){ L.items.push(P('shopfront',x,1,3,2,'shopfront',['#E63946','#3A86FF','#FF006E'][i])); });
  L.items.push(P('cinema',14,1,4,3,'cinema','#1D1D1D','Cinema'), P('checkout',2,6,2,1,'checkout','#06D6A0'), P('checkout',5,6,2,1,'checkout','#06D6A0'), P('plant',8,9,1,1,null,'#40916C'));
  [[11,7],[13,7],[15,7],[11,9],[13,9],[15,9]].forEach(function(p){ L.items.push(P('rtable',p[0],p[1],1,1,'table','#F1FAEE')); }); return L; };
VENUE.campus=function(l,r){ var L=buildLot({w:22,h:14,ground:'grass',rooms:[[1,1,10,7,'tile','Lecture hall',0],[12,1,9,7,'wood','Library',0]],doors:[[5,8,'h'],[16,8,'h']]});
  L.items.push(P('board',3,1,5,1,null,'#2D6A4F'));
  [[2,3],[5,3],[8,3],[2,5],[5,5],[8,5]].forEach(function(p){ L.items.push(P('desk0',p[0],p[1],2,1,'desk','#A0704D')); });
  [[13,2],[16,2],[13,5],[16,5]].forEach(function(p){ L.items.push(P('books',p[0],p[1],2,1,'books','#7F5539')); });
  [[4,11],[10,11],[16,11]].forEach(function(p){ L.items.push(P('bench',p[0],p[1],2,1,'bench','#8D6346')); });
  L.items.push(P('tree',1,12,1,1,null,'#2D6A4F'),P('tree',20,10,1,1,null,'#2D6A4F'),P('statue',8,10,1,1,null,'#ADB5BD')); return L; };
function officeVenue(l,r,kind){ var L=buildLot(officeBase(l.name, kind==='bank'?'marble':(kind==='tech'?'wood':'carpet')));
  L.items.push(P('counter',7,2,6,1,'counter',kind==='bank'?'#1D3557':'#6C757D','Reception'), P('cooler',17,2,1,1,'cooler','#90E0EF'), P('plant',2,2,1,1,null,'#40916C'));
  [[3,5],[7,5],[11,5],[3,8],[7,8],[11,8]].forEach(function(p){ L.items.push(P('deskoffice',p[0],p[1],2,1,'desk','#ADB5BD')); });
  if(kind==='bank') L.items.push(P('atm',16,8,1,1,null,'#1D3557'));
  if(kind==='radio') L.items.push(P('mic',15,5,3,3,'mic','#FB5607','On Air'));
  if(kind==='tech') L.items.push(P('beanbag',15,5,1,1,null,'#FF006E'),P('beanbag',16,7,1,1,null,'#3A86FF'),P('arcade',17,9,1,1,null,'#7209B7'));
  if(kind==='studio') L.items.push(P('sewing',15,5,1,1,'desk','#264653'),P('sewing',15,7,1,1,'desk','#264653'),P('rug',13,8,2,2,null,'#E76F51','',{flat:true}));
  return L; }
VENUE.office=function(l,r){ return officeVenue(l,r,'office'); };
VENUE.bank=function(l,r){ return officeVenue(l,r,'bank'); };
VENUE.radio=function(l,r){ return officeVenue(l,r,'radio'); };
VENUE.tech=function(l,r){ return officeVenue(l,r,'tech'); };
VENUE.studio=function(l,r){ return officeVenue(l,r,'studio'); };
VENUE.jobcentre=function(l,r){ return officeVenue(l,r,'office'); };
VENUE.church=function(l,r){ var L=buildLot({w:20,h:13,ground:'paving',rooms:[[2,1,16,10,'tile',l.name,0]],doors:[[9,11,'h'],[10,11,'h']]});
  L.items.push(P('altar',8,2,4,1,'altar','#F1FAEE','Altar'));
  [4,6,8].forEach(function(y){ L.items.push(P('pew',3,y,5,1,'pew','#8D6346'),P('pew',12,y,5,1,'pew','#8D6346')); }); return L; };
VENUE.mosque=function(l,r){ var L=buildLot({w:20,h:13,ground:'paving',rooms:[[2,1,16,10,'carpet',l.name,0]],doors:[[9,11,'h'],[10,11,'h']]});
  L.items.push(P('mihrab',9,1,2,1,null,'#2D6A4F'));
  [4,6,8].forEach(function(y){ [4,7,12,15].forEach(function(x){ L.items.push(P('prayermat',x,y,1,1,'rug','#2D6A4F','',{flat:true})); }); }); return L; };
VENUE.hospital=function(l,r){ var L=buildLot(officeBase(l.name,'tile')); L.items.push(P('counter',7,2,6,1,'counter','#90E0EF','Reception'));
  [3,6,9,12,15].forEach(function(x){ L.items.push(P('hbed',x,6,1,2,'hbed','#F8F9FA')); }); return L; };
VENUE.gym=function(l,r){ var L=buildLot(officeBase(l.name,'rubber'));
  [3,5,7].forEach(function(x){ L.items.push(P('treadmill',x,2,1,2,'treadmill','#343A40')); });
  L.items.push(P('dumbbell',10,2,1,1,'treadmill','#495057'),P('dumbbell',11,2,1,1,'treadmill','#495057'),P('ring',12,5,5,5,'ring','#E63946','',{flat:true}),P('mirror',2,9,1,1,null,'#ADE8F4')); return L; };
VENUE.golf=function(l,r){ var L=buildLot({w:22,h:14,ground:'grass',rooms:[[15,1,6,5,'wood','Clubhouse',0]],doors:[[17,6,'h']]});
  L.items.push(P('green',3,3,3,3,'green','#52B788','',{flat:true}),P('green',9,8,3,3,'green','#52B788','',{flat:true}),P('flag',4,4,1,1,null,'#E63946',' ',{flat:true}),P('buggy',12,2,1,2,null,'#F8F9FA'));
  L.items.push(P('rtable',16,2,1,1,'table','#ddd'),P('rtable',18,3,1,1,'table','#ddd'),P('tree',1,11,1,1,null,'#2D6A4F'),P('tree',7,1,1,1,null,'#2D6A4F')); return L; };
VENUE.park=function(l,r){ var L=buildLot({w:22,h:14,ground:'grass',rooms:[],doors:[]});
  L.items.push(P('canopy',3,2,12,1,'canopy','#9C6644','',{flat:true}),P('path',1,7,20,1,'path','#D4A373','',{flat:true}),P('pond',14,9,4,3,null,'#48CAE4'));
  [[3,9],[8,9],[10,5]].forEach(function(p){ L.items.push(P('bench',p[0],p[1],2,1,'bench','#8D6346')); });
  [[1,1],[17,2],[19,4],[2,11],[6,12],[11,11],[20,12],[5,4],[16,5]].forEach(function(p){ L.items.push(P('tree',p[0],p[1],1,1,null,'#2D6A4F')); }); return L; };
VENUE.airport=function(l,r){ var L=buildLot(officeBase(l.name,'marble'));
  [2,6,10].forEach(function(x){ L.items.push(P('checkin',x,2,3,1,'checkin','#3A86FF')); });
  L.items.push(P('board',14,1,4,1,null,'#111','Departures'));
  [[3,6],[9,6],[3,8],[9,8]].forEach(function(p){ L.items.push(P('seatrow',p[0],p[1],4,1,'seat','#457B9D')); }); return L; };
VENUE.casino=function(l,r){ var L=buildLot({w:20,h:13,ground:'paving',rooms:[[1,1,18,10,'dark',l.name,0]],doors:[[9,11,'h'],[10,11,'h']]});
  L.items.push(P('roulette',4,4,2,2,'roulette','#2D6A4F'),P('roulette',10,4,2,2,'roulette','#2D6A4F'),P('bar',14,2,4,1,'bar','#6A040F'));
  [3,5,7,9,11].forEach(function(x){ L.items.push(P('slot',x,9,1,1,null,'#FFB703')); }); return L; };
VENUE.polling=function(l,r){ var L=buildLot({w:18,h:12,ground:'dirt',rooms:[],doors:[]});
  L.items.push(P('tent',4,2,9,4,'canopy','#F1FAEE','',{flat:true}),P('ballot',8,3,1,1,'ballot','#3A86FF'),P('table',6,3,2,1,null,'#A47148'),P('bench',4,8,3,1,'canopy','#7F5539'),P('bench',10,8,3,1,'canopy','#7F5539'),P('sign',6,10,6,1,null,'#008751','INEC · '+l.name,{flat:true})); return L; };
VENUE.event=function(l,r){ var L=buildLot({w:20,h:13,ground:'paving',rooms:[[1,1,18,10,'marble',l.name,0]],doors:[[9,11,'h'],[10,11,'h']]});
  L.items.push(P('stage',7,1,6,2,'stage','#C9184A','Stage'),P('dancefloor',7,4,6,2,'dancefloor',null,'',{flat:true}));
  [[2,4],[2,7],[15,4],[15,7],[5,8],[12,8]].forEach(function(p){ L.items.push(P('rtable',p[0],p[1],2,2,'tables','#FFF0F3')); }); return L; };
VENUE.stadium=function(l,r){ var L=buildLot({w:22,h:14,ground:'paving',rooms:[],doors:[]});
  L.items.push(P('pitch',3,3,16,8,'pitch','#2D6A4F','',{flat:true}),P('goal',3,6,1,2,null,'#fff','',{flat:true}),P('goal',18,6,1,2,null,'#fff','',{flat:true}));
  [2,8,14].forEach(function(x){ L.items.push(P('seatrow',x,1,5,1,'seats','#008751'),P('seatrow',x,12,5,1,'seats','#008751')); }); return L; };
VENUE.estate=function(l,r){ var rich=/ikoyi|banana|lekkip1|garki|phgra|alief|brampton/.test(l.id);
  var spec={w:22,h:14,ground:rich?'grass':'dirt',rooms:[[2,1,5,4,'concrete','House',-1],[9,1,5,4,'concrete','House',-1],[16,1,5,4,'concrete','House',-1],[2,9,5,4,'concrete','House',-1],[16,9,5,4,'concrete','House',-1]],doors:[]};
  var L=buildLot(spec); L.items.push(P('path',0,6,22,2,'path','#ADB5BD','',{flat:true}),P('sign',9,9,4,1,'sign','#F5B700',l.id==='imota'||l.id==='lekkimarket'?'LAND FOR SALE':'TO LET',{flat:false}));
  L.items.push(P('tree',8,11,1,1,null,'#2D6A4F'),P('tree',14,12,1,1,null,'#2D6A4F'));
  if(!rich) L.items.push(P('drumwater',1,6,1,1,null,'#1E88E5'),P('keke',14,10,2,1,null,'#F5B700'));
  return L; };
VENUE.naijashop=function(l,r){ var L=buildLot({w:18,h:12,ground:'paving',rooms:[[3,1,12,7,'tile',l.name,0]],doors:[[8,8,'h']]});
  L.items.push(P('counter',4,2,4,1,'counter','#2A9D8F','Till'),P('stall',9,2,2,2,'stall','#F4A261'),P('stall',12,2,2,2,'stall','#E9C46A'),P('stall',9,5,2,2,'stall','#E76F51'),P('bench',3,10,3,1,'bench','#7F5539'),P('bench',11,10,3,1,'bench','#7F5539'),P('sign',6,9,6,1,null,'#008751',l.name,{flat:true})); return L; };

function venueLot(locId){
  var l=D.LOC[locId]; var r=seeded(hash(locId));
  var f=VENUE[l.type]||VENUE.office; var L=f(l,r); L.label=l.name; L.locId=locId;
  rebuildOcc(L); return L;
}
E.venueLot=venueLot;

// ---------- homes ----------
function homeTier(id, c){ var list=city(c).abroad?D.HOMES_ABROAD:D.HOMES_NG; for(var i=0;i<list.length;i++) if(list[i].id===id) return list[i]; return null; }
E.homeTier=homeTier;
function homeRent(h,c){ var t=homeTier(h.tier,c); if(!t) return 0; var r=t.rent*kCost(c); if(!city(c).abroad) r*=S.policy.rent; return Math.round(r); }
E.homeRent=homeRent;
function homeLot(c){
  var h=S.homes[c]; if(!h) return null;
  var t=homeTier(h.tier,c); var spec=D.LAYOUTS[t.layout]; var L=buildLot(spec); L.home=true; L.city=c;
  spec.fix.forEach(function(f){ L.items.push({uid:'fx'+f[1]+'_'+f[2]+f[0],id:f[0],x:f[1],y:f[2],r:0,fixed:true,shared:roomAt(L,f[1],f[2])>=0&&L.rooms[roomAt(L,f[1],f[2])].owned===0}); });
  h.items.forEach(function(it){ L.items.push(it); });
  rebuildOcc(L); return L;
}
function hotelLot(){ var spec=D.LAYOUTS.hotel; var L=buildLot(spec); L.hotel=true; spec.fix.forEach(function(f){ L.items.push({uid:'h'+f[0]+f[1],id:f[0],x:f[1],y:f[2],r:0,fixed:true}); }); rebuildOcc(L); return L; }
E.homeLot=homeLot;
function canPlace(L,id,x,y,r,ignoreUid){
  var def=D.ITEMS[id]; var dm=(r%2===1)?[def.h,def.w]:[def.w,def.h];
  for(var yy=y;yy<y+dm[1];yy++) for(var xx=x;xx<x+dm[0];xx++){
    if(xx<0||yy<0||xx>=L.w||yy>=L.h) return 'Outside the lot';
    var rm=roomAt(L,xx,yy); if(rm>=0&&L.rooms[rm].owned!==1) return 'Not your space';
    if(isWater(L,xx,yy)) return 'That is water';
    if(L.parking && xx>=L.parking[0]&&xx<L.parking[0]+2&&yy>=L.parking[1]&&yy<L.parking[1]+1) return 'Keep the parking space free';
    for(var i=0;i<L.items.length;i++){ var it=L.items[i]; if(it.uid===ignoreUid) continue; var d2=itemDef(it); if(!!d2.flat!==!!def.flat) continue;
      var dm2=itemDims(it); if(xx>=it.x&&xx<it.x+dm2[0]&&yy>=it.y&&yy<it.y+dm2[1]) return 'Something is in the way'; }
    // keep doorways clear
    for(var k=0;k<L.doorList.length;k++){ var d=L.doorList[k];
      if(d[2]==='h'&&xx===d[0]&&(yy===d[1]||yy===d[1]-1)&&!def.flat) return 'Keep the doorway clear';
      if(d[2]==='v'&&yy===d[1]&&(xx===d[0]||xx===d[0]-1)&&!def.flat) return 'Keep the doorway clear'; }
  }
  if(!def.flat){ // must leave the item reachable
    var tmp={uid:'tmp',id:id,x:x,y:y,r:r}; var save=L.items; L.items=save.filter(function(i){return i.uid!==ignoreUid;}).concat([tmp]); rebuildOcc(L);
    var ok=useTiles(L,tmp).length>0; L.items=save; rebuildOcc(L); if(!ok&&(def.acts||[]).length) return 'Nowhere to stand to use it';
  }
  return null;
}
E.canPlace=canPlace;

// ---------- NPC population ----------
function makePerson(c, g){
  g=g||(rnd()<0.5?'m':'f');
  return {id:'n'+uid(),name:pick(g==='m'?D.FIRST_M:D.FIRST_F)+' '+pick(D.LAST),g:g,city:c||'lagos',
    look:{skin:pick(D.SKINS),hair:g==='m'?pick(['short','afro','bald','cornrow','locs']):pick(['braids','gele','afro','bun','locs','cornrow']),hairCol:pick(D.HAIRCOLS),shirt:pick(D.SHIRTS),pants:pick(['#1D3557','#2B2D42','#6C757D','#3D405B','#E9C46A'])},
    trait:pick(Object.keys(D.TRAITS)),likesBall:rnd()<0.6};
}
E.makePerson=makePerson;
function npc(id){ return S.people[id]; }
E.npc=npc;
function rel(id){ return S.rel[id]||(S.rel[id]={f:0,r:0,st:'stranger',met:S.day,lastAsk:-1}); }
E.rel=rel;
function relStatus(id){ var R=rel(id); if(R.st==='spouse'||R.st==='fiance'||R.st==='partner'||R.st==='family'||R.st==='ex') return R.st;
  if(R.f>=70) return 'best friend'; if(R.f>=35) return 'friend'; if(R.f>=10) return 'acquaintance'; if(R.f<=-30) return 'enemy'; return 'stranger'; }
E.relStatus=relStatus;

// ---------- new game ----------
var STARTER = {
  nepo:[['foambed',13,1,0],['wardrobe',10,1,0],['ac',11,6,0],['laptop',13,5,0],['plant',14,4,0],['sofa',2,5,0],['tvsmall',2,2,0],['ctable',2,4,0],['dining',6,4,0],['rug',5,2,0],['plant',8,1,0],['poster',1,1,0],['gensilent',15,2,0],['speaker',8,6,0],['mirror',9,6,0]],
  lapo_faceme:[['mat',1,1,0],['kerosene',5,1,0],['cooler',5,3,0],['pchair',3,1,0]],
  lapo_selfcon:[['springbed',1,1,0],['kerosene',7,5,0],['cooler',7,6,0],['pchair',3,1,0],['gen',11,7,0]],
  fresher:[['cooler',6,5,0],['mirror',6,1,0]],
  japakid:[['springbed',1,1,0],['sofa',5,4,0],['tvsmall',5,1,0],['wardrobe',1,4,0],['plant',8,1,0],['laptop',7,3,0]]
};
E.newGame=function(o){
  var lot=o.lottery; if(!lot){ var x=rnd(), acc=0; for(var k in D.LOTTERY){ acc+=D.LOTTERY[k].odds; if(x<=acc){ lot=k; break; } } lot=lot||'lapo'; }
  S=E.S={v:2,name:o.name||'Tunde',g:o.g||'m',look:o.look,traits:o.traits||[],dream:o.dream||'millionaire',lottery:lot,
    money:0,day:0,min:7*60,city:'lagos',loc:'home',homes:{},inv:[],food:4,
    needs:{hunger:80,energy:85,hygiene:75,bladder:70,fun:70,social:60},
    skills:{charisma:0,tech:0,logic:0,fitness:0,music:0,comedy:0,cooking:0,creativity:0,hustle:0},
    career:null,cars:[],land:[],biz:[],loans:[],visas:{},citizen:['NG'],student:false,
    people:{},rel:{},spouse:null,kids:[],pregnant:null,ring:0,sick:0,
    rate:1550,rateHist:[1550],power:true,policy:{traffic:1,rent:1,power:0,winner:null},election:{next:13,voted:false},
    stats:{earned:0,remitted:0,spent:0,shifts:0,promotions:0,partiesThrown:0},moodlets:[],badges:{},
    papaDay:-1,papaCount:0,gemDay:-1,gems:0,lastEventDay:-1,pendingEvents:[],
    sim:{x:3,y:6,dir:1},log:[],speed:1,freeWill:true,papaPays:false,lapo:null,rentDebtWeeks:0,
    nextDayPrompt:0,missedShift:{},workedDay:{},babyCare:80,hotelNights:0};
  // family
  var mum=makePerson('lagos','f'); mum.name='Mama '+S.name.split(' ')[0]; mum.role='Mum'; mum.look.hair='gele'; S.people[mum.id]=mum; S.rel[mum.id]={f:80,r:0,st:'family',met:0,lastAsk:-1}; S.mum=mum.id;
  var sib=makePerson('lagos'); sib.role=sib.g==='m'?'Brother':'Sister'; S.people[sib.id]=sib; S.rel[sib.id]={f:55,r:0,st:'family',met:0,lastAsk:-1}; S.sibling=sib.id;
  for(var i=0;i<34;i++){ var p=makePerson('lagos'); S.people[p.id]=p; }
  ['abuja','ph','london','houston','toronto','dubai','girne'].forEach(function(c){ for(var j=0;j<7;j++){ var q=makePerson(c); S.people[q.id]=q; } });

  function setHome(c,tier,starter){ S.homes[c]={tier:tier,items:(starter||[]).map(function(s){ return {uid:uid(),id:s[0],x:s[1],y:s[2],r:s[3]||0,paid:D.ITEMS[s[0]].price}; })}; }
  if(lot==='nepo'){ S.money=500000; setHome('lagos','miniflat',STARTER.nepo); S.papaPays=true; S.cars.push({id:'prado',city:'lagos'}); S.career={id:'banking',level:4,perf:20,missed:0}; S.skills.charisma=2; S.food=10;
    S.homes.lagos.items.forEach(function(it){ if(it.id==='gensilent'){ it.fuel=10; } }); }
  else if(lot==='lapo'){ var face=rnd()<0.6; S.money=60000+ri(16,36)*1000; setHome('lagos',face?'faceme':'selfcon',face?STARTER.lapo_faceme:STARTER.lapo_selfcon);
    S.loans.push({name:'LAPO microfinance loan',left:75000,weekly:6250,rate:0}); S.lapo=true; S.food=6; }
  else if(lot==='fresher'){ S.money=14000; setHome('lagos','hall',STARTER.fresher); S.student=true; S.food=3; }
  else { var cs=['london','houston','toronto','dubai','girne']; var c=pick(cs); S.city=c; S.money=600000; setHome(c,'studio',STARTER.japakid);
    var cc=Object.keys(D.COUNTRIES).filter(function(k){ return D.COUNTRIES[k].city===c; })[0]; S.citizen.push(cc); S.visas[cc]={type:'citizen'}; S.food=8; }
  S.sim={x:Math.floor(D.LAYOUTS[homeTier(S.homes[S.city].tier,S.city).layout].w/2),y:D.LAYOUTS[homeTier(S.homes[S.city].tier,S.city).layout].h-1,dir:1};
  E.rt={}; enterLoc('home', true);
  badge('born_'+lot);
  note('Welcome to '+city().name+', '+S.name+'. You are a '+D.LOTTERY[lot].name+'.','big');
  return S;
};

E.load=function(obj){ S=E.S=obj; E.rt={}; if(!S.homes[S.city]&&S.loc==='home') S.loc=D.CITY_AIRPORT[S.city];
  if(S.loc.indexOf('visit:')===0) S.loc=S.homes[S.city]?'home':D.CITY_AIRPORT[S.city];
  if(S.loc==='travel'||S.loc==='work'||S.loc==='flight') { S.loc=S.trip?S.trip.to:(S.loc==='work'?E.workLoc():'home'); S.trip=null; S.atWork=null; }
  enterLoc(S.loc, true); };
E.serialize=function(){ return JSON.stringify(S); };

// ---------- locations ----------
function homeAreaLoc(c){ c=c||S.city; if(c==='lagos'){ var h=S.homes.lagos; return h?homeTier(h.tier,'lagos').area:'mushin'; } return D.CITY_HOMEAREA[c]; }
E.homeAreaLoc=homeAreaLoc;
function locXY(loc){ if(loc==='home'||loc==='hotel'||String(loc).indexOf('visit:')===0) { var a=D.LOC[homeAreaLoc()]; return [a.x+8,a.y-8]; } var l=D.LOC[loc]; return l?[l.x,l.y]:[500,300]; }
E.locXY=locXY;
function enterLoc(loc, keepPos){
  S.loc=loc; var rt=E.rt; rt.npcs=[]; rt.queue=rt.queue||[]; rt.queue.length=0; rt.cur=null; rt.path=null;
  if(loc==='home'){ rt.lot=homeLot(S.city); if(!rt.lot){ S.loc=D.CITY_AIRPORT[S.city]; return enterLoc(S.loc); } rt.lot.name=homeTier(S.homes[S.city].tier,S.city).name; }
  else if(loc==='hotel'){ rt.lot=hotelLot(); rt.lot.name='Hotel room'; }
  else if(loc.indexOf('visit:')===0){ rt.lot=E.rt.visitLot||hotelLot(); rt.lot.name=E.rt.visitName||'Friend\'s place'; }
  else { rt.lot=venueLot(loc); rt.lot.name=D.LOC[loc].name; spawnNpcs(); }
  var L=rt.lot;
  if(!keepPos||blocked(L,Math.round(S.sim.x),Math.round(S.sim.y))||S.sim.x>=L.w||S.sim.y>=L.h){
    var spot=null; for(var sy=L.h-1;sy>=0&&!spot;sy--){ for(var i=0;i<L.w;i++){ var tx=Math.floor(L.w/2)+((i%2)?-1:1)*Math.ceil(i/2); if(tx>=0&&tx<L.w&&!blocked(L,tx,sy)){ spot=[tx,sy]; break; } } }
    spot=spot||[0,0]; S.sim.x=spot[0]; S.sim.y=spot[1]; }
  E.hooks.changed('loc');
}
E.enterLoc=enterLoc;
function spawnNpcs(){
  var l=D.LOC[S.loc]; if(!l) return; var h=hour(); var open=isOpen(S.loc);
  var busy={club:h>=22||h<4?9:3,shrine:h>=19||h<2?8:3,market:6,mall:5,buka:5,beach:6,campus:6,church:weekday()===0?9:3,mosque:weekday()===5?9:3,stadium:6,event:weekday()===6?9:3,naijashop:4}[l.type]||3;
  if(!open) busy=Math.min(busy,1);
  var pool=Object.keys(S.people).filter(function(id){ var p=S.people[id]; return p.city===l.city&&!p.role&&id!==S.spouse; });
  // bias towards people you know
  pool.sort(function(a,b){ return (S.rel[b]?S.rel[b].f:0)-(S.rel[a]?S.rel[a].f:0)+ (rnd()-0.5)*80; });
  var L=E.rt.lot; var n=Math.min(pool.length, busy+ri(-1,2));
  for(var i=0;i<n;i++){ var t=randomFree(L); if(!t) break; E.rt.npcs.push({id:pool[i],x:t[0],y:t[1],dir:1,path:null,wait:ri(0,30),pose:null,anim:rnd()*6}); }
}
function randomFree(L){ for(var k=0;k<60;k++){ var x=ri(0,L.w-1), y=ri(0,L.h-1); if(!blocked(L,x,y)) return [x,y]; } return null; }
function isOpen(loc){ var l=D.LOC[loc]; if(!l) return true; var hr=D.HOURS[l.type]; if(!hr) return true; var h=hour(); return hr[0]<hr[1]? (h>=hr[0]&&h<hr[1]) : (h>=hr[0]||h<hr[1]); }
E.isOpen=isOpen;
E.openHours=function(loc){ var l=D.LOC[loc]; var hr=l&&D.HOURS[l.type]; if(!hr) return 'Open 24 hours'; function f(h){ h=h%24; return (h%12||12)+(h<12?'am':'pm'); } return 'Open '+f(hr[0])+' – '+f(hr[1]); };

// ---------- power ----------
function homePower(){ var h=S.homes[S.city]; if(S.loc!=='home') return true; if(!h) return true; return S.power || genRunning(); }
function genRunning(){ var L=E.rt.lot; if(!L||!L.home) return false; return L.items.some(function(it){ var d=D.ITEMS[it.id]; return d&&((d.solar)||(d.gen&&it.on&&it.fuel>0)); }); }
E.hasPower=function(){ if(S.loc!=='home') return true; return S.power||genRunning(); };
E.genRunning=genRunning;

// ---------- needs & mood ----------
function traitHas(t){ return S.traits.indexOf(t)>=0; }
E.traitHas=traitHas;
function decayMult(n){ var m=1;
  if(n==='hunger'&&traitHas('foodie')) m*=1.25; if(n==='social'&&traitHas('owambe')) m*=1.3; if(n==='energy'&&traitHas('gymrat')) m*=0.8;
  if(n==='hygiene'&&traitHas('neat')) m*=0.75; if(n==='fun'&&traitHas('comedian')) m*=0.8;
  if(n==='energy'&&traitHas('nightowl')){ var h=hour(); m*= (h>=20||h<3)?0.5:(h>=6&&h<11?1.4:1); }
  if(S.sick&&n==='energy') m*=1.6; return m; }
function moodlet(id,label,val,hours){ for(var i=0;i<S.moodlets.length;i++) if(S.moodlets[i].id===id){ S.moodlets[i].until=S.day*1440+S.min+hours*60; return; }
  S.moodlets.push({id:id,label:label,v:val,until:S.day*1440+S.min+hours*60}); }
E.moodlet=moodlet;
function envScore(){ var L=E.rt.lot; if(!L||!L.home) return 0; var s=0; L.items.forEach(function(it){ var d=D.ITEMS[it.id]; if(d&&d.env) s+=d.env; }); return clamp(s,-10,40); }
E.envScore=envScore;
E.mood=function(){ var n=S.needs, w={hunger:1.4,energy:1.3,hygiene:0.8,bladder:1,fun:1,social:0.8}, t=0, ws=0;
  for(var k in w){ var v=n[k]; var f=v<20?1.8:1; t+=v*w[k]*f; ws+=w[k]*f; }
  var m=t/ws; S.moodlets.forEach(function(x){ m+=x.v; }); if(S.loc==='home') m+=envScore()*0.25;
  if(S.kids.length&&S.babyCare<25) m-=10; if(S.sick) m-=12;
  return clamp(Math.round(m),0,100); };
E.moodLabel=function(m){ return m>=80?'Very happy':m>=60?'Happy':m>=40?'Fine':m>=20?'Stressed':'Miserable'; };

// ---------- skills ----------
function skillGain(sk, hours, mult){
  var lvl=S.skills[sk]; var rate=0.42/(1+lvl*0.32)*(mult||1);
  if(S.lottery==='lapo'||S.lottery==='fresher') rate*=1.25;
  if((sk==='hustle'&&traitHas('hustler'))||(sk==='cooking'&&traitHas('foodie'))||((sk==='logic'||sk==='tech')&&traitHas('bookworm'))||(sk==='charisma'&&traitHas('charmer'))||(sk==='fitness'&&traitHas('gymrat'))||(sk==='comedy'&&traitHas('comedian'))) rate*=1.5;
  if(E.mood()<30) rate*=0.6;
  var before=Math.floor(S.skills[sk]); S.skills[sk]=Math.min(10,S.skills[sk]+rate*hours);
  if(Math.floor(S.skills[sk])>before) note(D.SKILLS[sk].name+' skill is now level '+Math.floor(S.skills[sk])+'.','skill');
}
E.skillGain=skillGain;

// ---------- actions ----------
// queue entries: {kind:'obj',uid,act} | {kind:'venue',act} | {kind:'walk',x,y} | {kind:'social',npc,act} | {kind:'gig',gig}
E.queueObj=function(uid2,act){ return pushQ({kind:'obj',uid:uid2,act:act,label:D.ACTS[act].label}); };
E.queueVenue=function(actId){ var a=venueAct(actId); if(!a) return false; return pushQ({kind:'venue',act:actId,label:a.label}); };
E.queueWalk=function(x,y){ var rt=E.rt; rt.queue.length=0; if(rt.cur&&!rt.cur.locked) endCur(true); return pushQ({kind:'walk',x:x,y:y,label:'Walk here'}); };
E.queueSocial=function(npcId,act){ var I=SOCIAL[act]; return pushQ({kind:'social',npc:npcId,act:act,label:I.label+' · '+S.people[npcId].name.split(' ')[0]}); };
function pushQ(q){ var rt=E.rt; if(rt.queue.length>=6) return false; rt.queue.push(q); E.hooks.changed('queue'); return true; }
E.cancelQ=function(i){ var rt=E.rt; if(i===-1){ if(rt.cur&&!rt.cur.locked) endCur(true); } else rt.queue.splice(i,1); E.hooks.changed('queue'); };
function findItem(uid2){ var L=E.rt.lot; for(var i=0;i<L.items.length;i++) if(L.items[i].uid===uid2) return L.items[i]; return null; }
E.findItem=findItem;
function venueAct(id){ var l=D.LOC[S.loc]; if(!l) return null; var list=D.VENUE_ACTS[l.type]||[]; for(var i=0;i<list.length;i++) if(list[i].id===id) return list[i]; return null; }
E.venueActs=function(){ var l=D.LOC[S.loc]; if(!l) return []; return (D.VENUE_ACTS[l.type]||[]).map(function(a){ return {a:a,why:venueWhy(a),cost:a.cost?price(a.cost):0}; }); };
function venueWhy(a){
  if(!isOpen(S.loc)&&['visit','loan','fly','vote','househunt','buyland','visaoffice','remit'].indexOf(a.id)<0) return 'Closed now';
  if(a.cost&&S.money<price(a.cost)) return 'Need '+fmt(price(a.cost));
  if(a.hours){ var h=hour(); if(h<a.hours[0]||h>=a.hours[1]) return 'Only '+a.hours[0]+':00–'+a.hours[1]+':00'; }
  if(a.days&&a.days.indexOf(weekday())<0) return 'Only on '+a.days.map(function(d){ return DAYS[d].slice(0,3); }).join(', ');
  if(a.special==='class'&&!S.student&&!/campus/.test(D.LOC[S.loc].type)) return 'Students only';
  if(a.special==='class'&&!S.student) return 'Enrol as a student first (Phone › Jobs)';
  if(a.special==='vote'&&!(S.day===S.election.next&&S.city==='lagos')) return 'Election day only (day '+(S.election.next+1)+')';
  if(a.special==='vote'&&S.election.voted) return 'You already voted';
  if(a.special==='wedding'){ var f=fianceId(); if(!f) return 'You need a fiancé(e) first'; if(S.money<price(300000)) return 'Need '+fmt(price(300000)); }
  if(a.special==='perform'&&S.skills.music<2) return 'Needs Music 2';
  if(a.special==='openmic'&&S.skills.comedy<1) return 'Needs Comedy 1';
  if(a.special==='hackathon'&&S.skills.tech<3) return 'Needs Tech 3';
  return null;
}
function fianceId(){ for(var id in S.rel) if(S.rel[id].st==='fiance') return id; return null; }
E.fianceId=fianceId;
function partnerId(){ for(var id in S.rel) if(S.rel[id].st==='partner'||S.rel[id].st==='fiance') return id; return null; }
E.partnerId=partnerId;
E.objMenu=function(it){
  var def=itemDef(it); var acts=(def.acts||[]).slice(); var out=[];
  acts.forEach(function(a){ var A=D.ACTS[a]; if(!A) return; out.push({act:a,label:A.label,why:actWhy(it,a)}); });
  return out;
};
function actWhy(it,a){
  var A=D.ACTS[a], def=itemDef(it);
  if((A.power||def.power)&&!E.hasPower()) return 'No light (NEPA). Switch on a gen.';
  if(A.food&&S.food<A.food) return 'Not enough food (need '+A.food+'). Buy foodstuff.';
  if(A.needSpouse&&!(S.spouse&&S.loc==='home')) return 'Needs your spouse at home';
  if(a==='genon'&&it.on) return 'Already on'; if(a==='genoff'&&!it.on) return 'Already off';
  if(a==='genon'&&!(it.fuel>0)) return 'No fuel. Refuel first.';
  if(a==='refuel'&&S.money<fuelCost(it)) return 'Need '+fmt(fuelCost(it));
  if((a==='feedbaby'||a==='playbaby')&&!S.kids.length) return 'No baby yet';
  if(a==='baby'&&(S.pregnant||S.kids.length>=6)) return S.pregnant?'Baby already on the way':'Your house is full';
  return null;
}
function fuelCost(it){ var d=D.ITEMS[it.id]; return price(d.gen.tank*350*(S.fuelScarce?3:1)); }
E.fuelCost=fuelCost;

function startNext(){
  var rt=E.rt; if(rt.cur||!rt.queue.length) return;
  var q=rt.queue.shift(); E.hooks.changed('queue'); var L=rt.lot;
  if(q.kind==='walk'){ var p=pathToTile(L,S.sim,q.x,q.y); if(!p){ note('Can\'t get there.','warn'); return; } rt.cur={q:q,phase:'walk',path:p}; return; }
  if(q.kind==='obj'){ var it=findItem(q.uid); if(!it) return; var why=actWhy(it,q.act); if(why){ note(why,'warn'); return; }
    var r=pathToItem(L,S.sim,it); if(!r){ note('Your Sim can\'t reach the '+(itemDef(it).name||'item')+'.','warn'); return; }
    rt.cur={q:q,phase:'walk',path:r.path,face:r.face,stand:r.stand,item:it}; return; }
  if(q.kind==='venue'){ var a=venueAct(q.act); if(!a) return; var w=venueWhy(a); if(w){ note(w,'warn'); return; }
    var props=L.items.filter(function(i){ return i.prop===a.prop; }); var tgt=props.length?pick(props):null;
    var r2=tgt?pathToItem(L,S.sim,tgt):{path:[],face:null}; if(!r2) r2={path:[],face:null};
    rt.cur={q:q,phase:'walk',path:r2.path,face:r2.face,item:tgt,va:a}; return; }
  if(q.kind==='social'){ var n=rt.npcs.filter(function(x){ return x.id===q.npc; })[0]; var target=n?[Math.round(n.x),Math.round(n.y)]:null;
    if(!n&&!(q.npc===S.spouse&&S.loc==='home')){ note(S.people[q.npc].name+' is not here.','warn'); return; }
    if(q.npc===S.spouse&&S.loc==='home'&&rt.spouseSim) target=[Math.round(rt.spouseSim.x),Math.round(rt.spouseSim.y)];
    var B=bfs(L,startTile(L,S.sim)[0],startTile(L,S.sim)[1]); var best=null,bd=1e9;
    DIRS.forEach(function(d){ var x=target[0]+d[0], y=target[1]+d[1]; if(x<0||y<0||x>=L.w||y>=L.h) return; var dd=B.dist[y*L.w+x]; if(dd<bd){ bd=dd; best=[x,y]; } });
    var p3=best?(Math.round(S.sim.x)===best[0]&&Math.round(S.sim.y)===best[1]?[]:pathFrom(L,B,best[0],best[1])):[];
    if(n){ n.path=null; n.wait=40; n.talk=true; }
    rt.cur={q:q,phase:'walk',path:p3||[],face:target,npc:n}; return; }
}
function beginAction(){
  var rt=E.rt, c=rt.cur; c.phase='act'; c.t=0;
  if(c.face){ S.sim.dir=c.face[0]>S.sim.x?1:(c.face[0]<S.sim.x?-1:S.sim.dir); }
  var q=c.q;
  if(q.kind==='walk'){ endCur(); return; }
  if(q.kind==='obj'){ var A=D.ACTS[q.act]; c.A=A; c.dur=A.dur; c.bubble=A.bubble; c.pose=A.pose||'stand';
    if(A.food){ if(S.food<A.food){ note('Not enough food.','warn'); endCur(true); return; } S.food-=A.food; }
    if(A.on&&c.item){ var dm=itemDims(c.item); c.onPos=[c.item.x+(dm[0]-1)/2, c.item.y+(dm[1]-1)/2]; c.back=[S.sim.x,S.sim.y]; S.sim.x=c.onPos[0]; S.sim.y=c.onPos[1]; }
    if(A.special==='jollof'){ c.waiting=true; E.hooks.ui('jollof',{},function(score){ c.score=score==null?0.6:score; c.waiting=false; }); }
    if(A.special==='outfit'){ c.waiting=true; E.hooks.ui('outfit',{},function(){ c.waiting=false; }); }
    if(A.special==='genon'){ c.item.on=true; note('Generator on. "I better pass my neighbour."'); }
    if(A.special==='genoff'){ c.item.on=false; }
    if(A.special==='refuel'){ var fc=fuelCost(c.item); S.money-=fc; c.item.fuel=D.ITEMS[c.item.id].gen.tank; note('Refuelled for '+fmt(fc)+'.'); }
    return; }
  if(q.kind==='venue'){ var a=c.va; c.dur=a.dur; c.bubble=a.bubble; c.pose=/bench|pew|seat|table|vip|tables|desk/.test(a.prop||'')?'sit':(a.prop==='dancefloor'?'dance':'stand');
    if(a.prop==='shore') c.pose='swim';
    var cost=a.cost?price(a.cost):0; if(cost){ if(S.money<cost){ note('Not enough money.','warn'); endCur(true); return; } S.money-=cost; S.stats.spent+=cost; }
    var ui=['flights','bank','househunt','buyland','jobsHere','remitapp','visa','vote','roulette','outfit','wedding'];
    if(a.special&&ui.indexOf(a.special)>=0){ c.waiting=true; E.hooks.ui(a.special,{loc:S.loc},function(res){ c.uiRes=res; c.waiting=false; if(a.special!=='wedding'&&a.special!=='owambe') c.t=c.dur; }); }
    return; }
  if(q.kind==='social'){ c.dur=SOCIAL[q.act].dur; c.bubble='💬'; c.pose='stand'; return; }
}
function endCur(cancelled){
  var rt=E.rt, c=rt.cur; if(!c) return; rt.cur=null;
  if(c.back){ S.sim.x=c.back[0]; S.sim.y=c.back[1]; }
  if(c.npc) c.npc.talk=false;
  if(!cancelled&&c.phase==='act') finishAction(c);
  E.hooks.changed('queue');
}
function applyRates(rate,mins,mult){ for(var k in rate){ var v=rate[k]*(mins/60)*(mult||1); if(k in S.needs) S.needs[k]=clamp(S.needs[k]+v,0,100); } }
function tickAction(mins){
  var rt=E.rt, c=rt.cur; if(!c||c.phase!=='act'||c.waiting) return;
  var q=c.q, A=c.A||c.va||null;
  if(q.kind==='obj'){ var it=c.item, def=itemDef(it), qmult=def.q||1;
    if((A.power||def.power)&&!E.hasPower()){ note('NEPA took the light. '+A.label+' stopped.','warn'); endCur(true); return; }
    var rate=A.rate||{}; var m=qmult;
    if(A.comfort){ var cf=0; rt.lot.items.forEach(function(x){ var d=D.ITEMS[x.id]; if(d&&d.comfort&&(!d.power||E.hasPower())) cf=Math.max(cf,d.comfort); }); m*=1+cf; if(genNoisy()) m*=0.85; }
    applyRates(rate,mins,(rate.energy>0||rate.hygiene>0)?m:1);
    if(A.skill) for(var s in A.skill) skillGain(s,mins/60,A.skill[s]*qmult);
  } else if(q.kind==='venue'){ var a=c.va; var pm=(a.party&&traitHas('owambe'))?2:1; if(a.rate) applyRates(a.rate,mins,1); if(a.rate&&a.rate.fun&&pm>1) S.needs.fun=clamp(S.needs.fun+a.rate.fun*(mins/60)*(pm-1),0,100);
    if(a.skill) for(var s2 in a.skill) skillGain(s2,mins/60,a.skill[s2]);
  } else if(q.kind==='social'){ applyRates({social:55,fun:12},mins); }
  c.t+=mins;
  var until=A&&A.until; var done=c.t>=c.dur || (until&&S.needs[until]>=99.5&&c.t>=5);
  if(q.kind==='obj'&&A.slow&&(S.needs.bladder<12||S.needs.hunger<10)&&S.freeWill) done=true;
  if(q.kind==='obj'&&A.label==='Sleep'&&S.needs.energy>=99.5&&hour()>=5&&hour()<11) done=true;
  if(done) endCur();
}
function genNoisy(){ var L=E.rt.lot; return !!(L&&L.home&&L.items.some(function(it){ var d=D.ITEMS[it.id]; return d&&d.gen&&d.gen.noisy&&it.on&&it.fuel>0; })); }
function finishAction(c){
  var q=c.q;
  if(q.kind==='obj'){ var A=c.A; var it=c.item; var d=itemDef(it);
    if(A.special==='cook'){ var ql=0.5+S.skills.cooking/20*(d.q||1); S.needs.hunger=clamp(S.needs.hunger+55+ql*20,0,100); if(ql>0.85) moodlet('goodfood','Delicious stew',6,6); if(rnd()<0.12-S.skills.cooking*0.012){ note('You burnt the stew small. Still edible.','warn'); moodlet('burnt','Burnt the food',-4,4); } else note('Pot of stew ready. Leftovers go into the fridge (+1 food).'); S.food+=1; }
    if(A.special==='jollof'){ var sc=c.score||0.5; var qual=sc*0.6+S.skills.cooking/10*0.4; S.needs.hunger=clamp(S.needs.hunger+60,0,100); S.needs.fun=clamp(S.needs.fun+20*qual,0,100); S.food+=2;
      if(qual>0.8){ moodlet('jollof','Party jollof perfection',12,10); badge('jollof'); note('Party jollof! Smoky bottom, perfect colour. (+2 food)','good'); } else if(qual>0.5) note('Solid jollof. (+2 food)'); else note('The bottom burnt well well. (+2 food)','warn'); }
    if(A.special==='freelance'){ var pay=Math.round((800+S.skills.tech*900)*kPay()*(0.8+rnd()*0.4)); earn(pay,'Freelance gig'); }
    if(A.special==='stream'){ var p2=Math.round((200+S.skills.charisma*350)*kPay()*(rnd()<0.1?4:1)); earn(p2,'Livestream gifts'); }
    if(A.special==='content'){ var views=Math.round((S.skills.charisma+S.skills.creativity+S.skills.comedy)*rnd()*4000+200); var p3=Math.round(views*0.25*kPay()); earn(p3,'Skit got '+views.toLocaleString('en-US')+' views'); if(views>40000){ moodlet('viral','Went viral',14,24); badge('viral'); } }
    if(A.special==='sell'){ var sk=c.A===D.ACTS.sew?'creativity':'creativity'; var p4=Math.round((300+S.skills[sk]*600)*kPay()*(0.7+rnd()*0.6)); earn(p4,'Sold your work'); }
    if(A.special==='pray'){ moodlet('pray','Prayed',traitHas('prayer')?10:5,8); }
    if(A.special==='trybaby'){ if(!S.pregnant&&rnd()<0.45){ S.pregnant={due:S.day+3}; note('Congratulations! A baby is on the way (due in 3 days).','big'); } }
    if(A.special==='feedbaby'){ S.babyCare=clamp(S.babyCare+40,0,100); }
    if(A.special==='playbaby'){ S.babyCare=clamp(S.babyCare+25,0,100); }
    if(A.label==='Use toilet'&&it.shared&&rnd()<0.2) note('The shared toilet was occupied. Face-me-I-face-you life.');
  }
  if(q.kind==='venue') finishVenue(c);
  if(q.kind==='social') doSocial(q.npc,q.act,c.npc);
}
function earn(n,why){ S.money+=n; S.stats.earned+=n; note(why+': +'+fmt(n)+'.','money'); }
E.earn=earn;
function finishVenue(c){
  var a=c.va, sp=a.special;
  if(!sp) return;
  if(sp==='takeaway'){ S.food+=3; note('3 takeaway packs added to your food.'); }
  if(sp==='groceries'){ S.food+=6; note('Foodstuff bought. Food: '+S.food+'.'); }
  if(sp==='ring'){ S.ring++; note('You bought an engagement ring. 💍','good'); }
  if(sp==='bigboy'){ moodlet('bigboy','Big boy energy',15,12); S.skills.charisma=Math.min(10,S.skills.charisma+0.3); badge('bigboy'); note('Sparklers everywhere. The whole club knows your name tonight.','good'); }
  if(sp==='perform'){ var tip=Math.round((S.skills.music*500+ri(0,1500))*kPay()); earn(tip,'Crowd tips'); }
  if(sp==='openmic'){ if(rnd()<0.3+S.skills.comedy*0.07){ moodlet('laughs','Killed it on stage',10,12); earn(Math.round((800+S.skills.comedy*400)*kPay()),'Open mic prize'); } else { moodlet('bombed','Bombed on stage',-8,8); note('The jokes no land. Tough crowd.','warn'); } }
  if(sp==='class'){ var opts=['logic','tech','creativity','charisma']; var sk=pick(opts); skillGain(sk,2,1.6); note('Lecture done. '+D.SKILLS[sk].name+' improved.'); }
  if(sp==='hackathon'){ var place=S.skills.tech*0.08+rnd()*0.4; if(place>0.6){ var prize=Math.round(150000*kPay()); earn(prize,'Won the hackathon'); badge('hackathon'); } else note('No prize this time, but you learnt a lot.'); skillGain('tech',4,1); }
  if(sp==='worship'){ moodlet('worship','Uplifted after service',traitHas('prayer')?14:7,24); }
  if(sp==='offering'){ moodlet('giver','Cheerful giver',4,24); if(traitHas('prayer')&&rnd()<0.25){ var bless=price(ri(5,20)*1000); earn(bless,'Unexpected blessing'); } }
  if(sp==='heal'){ if(S.sick){ S.sick=0; note('The doctor sorted you out. You feel better.','good'); } else note('Clean bill of health.'); }
  if(sp==='callin'){ if(rnd()<0.2+S.skills.comedy*0.04){ earn(price(ri(2,10)*1000),'Radio prize'); } else note('Your call dropped. Network wahala.'); }
  if(sp==='owambe'){ moodlet('owambe','Owambe vibes',traitHas('owambe')?18:10,24); S.food+=1; note('You danced, ate, and took home a pack of jollof (+1 food).','good'); }
  if(sp==='wedding'&&c.uiRes){ /* handled in UI via E.wedding */ }
}

// ---------- social ----------
var SOCIAL = {
  greet:{label:'Greet',dur:8},
  gist:{label:'Gist',dur:20},
  joke:{label:'Tell a joke',dur:12},
  compliment:{label:'Compliment',dur:10},
  football:{label:'Talk football',dur:15},
  askmoney:{label:'Ask for money',dur:10,need:50},
  flirt:{label:'Flirt',dur:12,need:25},
  date:{label:'Go on a date here',dur:90,rneed:35},
  kiss:{label:'Kiss',dur:6,rneed:55},
  partner:{label:'Ask to be my partner',dur:10,rneed:60},
  propose:{label:'Propose',dur:15},
  breakup:{label:'Break up',dur:10},
  insult:{label:'Insult',dur:6}
};
E.SOCIAL=SOCIAL;
E.socialMenu=function(id){
  var R=rel(id), st=R.st, out=[]; var fam=st==='family';
  ['greet','gist','joke','compliment','football'].forEach(function(k){ out.push({act:k,label:SOCIAL[k].label,why:null}); });
  out.push({act:'askmoney',label:SOCIAL.askmoney.label,why:R.f<50?'Needs friendship 50':(R.lastAsk===S.day?'Already asked today':null)});
  if(!fam){
    out.push({act:'flirt',label:'Flirt',why:R.f<25?'Get to know them first':null});
    out.push({act:'date',label:'Go on a date here (₦'+price(3000).toLocaleString('en-US')+')',why:R.r<35?'Needs romance 35':(S.loc==='home'?'Go somewhere nice':null)});
    out.push({act:'kiss',label:'Kiss',why:R.r<55?'Needs romance 55':null});
    if(st!=='partner'&&st!=='fiance'&&st!=='spouse') out.push({act:'partner',label:'Ask to be my partner',why:R.r<60?'Needs romance 60':(partnerId()||S.spouse?'You are already taken':null)});
    if(st==='partner') out.push({act:'propose',label:'Propose',why:!S.ring?'Buy a ring first (market or mall)':(R.r<80?'Needs romance 80':null)});
    if(st==='partner'||st==='fiance') out.push({act:'breakup',label:'Break up',why:null});
    out.push({act:'insult',label:'Insult',why:null});
  }
  return out;
};
function doSocial(id,act,n){
  var R=rel(id), P2=S.people[id], first=P2.name.split(' ')[0]; var ch=S.skills.charisma, co=S.skills.comedy; var bonus=traitHas('charmer')?0.1:0;
  function f(d){ R.f=clamp(R.f+d,-100,100); } function r(d){ R.r=clamp(R.r+d,0,100); }
  var msg='';
  switch(act){
    case 'greet': f(3); msg='You greeted '+first+'.'; break;
    case 'gist': f(3+ch*0.6+rnd()*3); S.needs.fun=clamp(S.needs.fun+8,0,100); msg='You and '+first+' gisted about '+pick(['Lagos traffic','the price of tomatoes','Big Brother Naija','Burna Boy\'s new song','Detty December plans','japa plans','their landlord'])+'.'; skillGain('charisma',0.15,1); break;
    case 'joke': if(rnd()<0.35+co*0.06+bonus){ f(8); S.needs.fun=clamp(S.needs.fun+20,0,100); msg=first+' laughed till they cried.'; skillGain('comedy',0.2,1); } else { f(-4); msg=first+' did not find it funny.'; } break;
    case 'compliment': if(rnd()<0.5+ch*0.04+bonus){ f(6); r(3); msg=first+' blushed. "Thank you o!"'; } else { f(-2); msg=first+' gave you a side-eye.'; } break;
    case 'football': if(P2.likesBall){ f(6); msg='You and '+first+' argued about the Super Eagles for ages.'; } else { f(-1); msg=first+' does not care about football.'; } break;
    case 'askmoney': R.lastAsk=S.day; if(R.f>=50&&rnd()<0.4+R.f/200){ var amt=price(ri(1,8)*500); S.money+=amt; f(-6); msg=first+' sent you '+fmt(amt)+'. "Pay me back o."'; } else { f(-8); msg=first+' said "God will provide."'; } break;
    case 'flirt': if(R.f>=25&&rnd()<0.4+ch*0.05+bonus){ r(9); f(2); msg=first+' flirted back.'; } else { r(-3); f(-3); msg='Awkward. '+first+' changed the topic.'; } break;
    case 'date': var c=price(3000); if(S.money<c){ msg='You can\'t afford the date.'; break; } S.money-=c; r(12); f(5); S.needs.fun=clamp(S.needs.fun+30,0,100); msg='Lovely date with '+first+'.'; moodlet('date','Great date',8,12); break;
    case 'kiss': if(R.r>=55&&rnd()<0.75){ r(10); msg='You kissed '+first+'. ❤️'; } else { r(-6); msg=first+' pulled back. Too soon.'; } break;
    case 'partner': if(R.r>=60&&rnd()<0.7){ R.st='partner'; msg=first+' said yes! You\'re now a couple.'; badge('love'); } else { r(-5); msg=first+' wants to take it slow.'; } break;
    case 'propose': if(S.ring&&R.r>=80&&rnd()<0.8){ S.ring--; R.st='fiance'; msg=first+' said YES! 💍 Book a wedding at an event centre.'; badge('engaged'); moodlet('engaged','Just got engaged',20,48); } else { r(-15); msg=first+' said "Not now." Ouch.'; moodlet('rejected','Proposal rejected',-15,24); } break;
    case 'breakup': R.st='ex'; R.r=5; f(-30); msg='You broke up with '+first+'.'; moodlet('breakup','Breakup',-15,48); break;
    case 'insult': f(-20); r(-15); msg=first+' is vexed with you now.'; break;
  }
  if(R.st==='stranger'&&R.f>=5) R.st='known';
  note(msg,'social');
}
E.callPerson=function(id){ if(S.loc==='work'||S.loc==='travel') return; var R=rel(id); R.f=clamp(R.f+2,-100,100); S.needs.social=clamp(S.needs.social+15,0,100); S.min+=15; note('You called '+S.people[id].name.split(' ')[0]+'. '+pick(['Long gist.','They are fine.','They said you should call more often.','They gave you updates from home.']),'social'); };

// ---------- jobs ----------
E.workLoc=function(){ var c=S.career; if(!c) return null; var C=D.CAREERS[c.id]; if(C.loc==='home') return 'home'; return S.city==='lagos'?C.loc:(D.CITY_WORK[S.city]||null); };
function workRights(){ var C=city(); if(!C.abroad) return 'full'; var cc=countryOf(S.city); var v=S.visas[cc]; if(!v) return 'none'; if(v.type==='citizen'||v.type==='resident'||v.type==='work') return 'full'; if(v.type==='student') return 'student'; return 'none'; }
E.workRights=workRights;
function countryOf(c){ for(var k in D.COUNTRIES) if(D.COUNTRIES[k].city===c) return k; return 'NG'; }
E.countryOf=countryOf;
E.shiftPay=function(){ var c=S.career; if(!c) return 0; var C=D.CAREERS[c.id]; var p=C.pay[c.level-1]*kPay(); if(workRights()==='none') p*=0.6; return Math.round(p); };
E.shiftStatus=function(){
  var c=S.career; if(!c) return null; var C=D.CAREERS[c.id]; var wd=weekday(); var h=S.min/60;
  var today=C.days.indexOf(wd)>=0; var worked=S.workedDay[c.id]===S.day;
  var start=C.start, end=C.start+C.len;
  var night=end>24;
  // overnight shift started yesterday?
  if(!today&&night){ var yd=(wd+6)%7; if(C.days.indexOf(yd)>=0&&h<end-24&&S.workedDay[c.id]!==S.day-1) return {state:'late',start:start,end:end,label:'Shift ends '+((end-24)%12||12)+'am'}; }
  if(!today||worked) return {state:'off',next:nextShiftLabel()};
  if(h<start-2) return {state:'later',start:start,label:'Shift at '+(start%12||12)+(start<12?'am':'pm')};
  if(h<start+1) return {state:'now',start:start,label:'Shift starts '+(start%12||12)+(start<12?'am':'pm')};
  if(h<Math.min(end,start+3)) return {state:'late',start:start,label:'You are late!'};
  return {state:'missed'};
};
function nextShiftLabel(){ var C=D.CAREERS[S.career.id]; for(var i=1;i<=7;i++){ var wd=(weekday()+i)%7; if(C.days.indexOf(wd)>=0) return DAYS[wd].slice(0,3)+' '+(C.start%12||12)+(C.start<12?'am':'pm'); } return ''; }
E.canWorkNow=function(){ var st=E.shiftStatus(); if(!st) return 'No job'; if(st.state!=='now'&&st.state!=='late') return st.state==='later'?st.label:(st.state==='off'?'Next shift: '+st.next:'Too late for today\'s shift');
  var wl=E.workLoc(); if(!wl) return 'No workplace in this city'; if(workRights()==='none'&&city().abroad) return null; if(workRights()==='student'&&S.career.level>2) return 'Student visa: only level 1–2 jobs';
  if(wl!=='home'&&S.loc!==wl) return 'Go to '+D.LOC[wl].name; if(wl==='home'&&S.loc!=='home') return 'Work from home'; return null; };
E.startShift=function(){
  var why=E.canWorkNow(); if(why) return why;
  var C=D.CAREERS[S.career.id]; var st=E.shiftStatus(); var start=C.start*60; var end=(C.start+C.len)*60; var nowM=S.min; if(st.state==='late'&&nowM<start) nowM+=1440;
  var lateMin=Math.max(0,nowM-start); var remaining=end-Math.max(nowM,start);
  if(S.min<start&&st.state!=='late') remaining=end-S.min; // early: wait at work
  E.rt.queue.length=0; if(E.rt.cur) endCur(true);
  S.atWork={left:remaining,total:remaining,late:lateMin,day:S.day,id:S.career.id};
  S.workedDay[S.career.id]=(st.state==='late'&&S.min<start)?S.day-1:S.day;
  if(lateMin>20) note('You are '+Math.round(lateMin)+' minutes late. Your boss noticed.','warn');
  E.hooks.changed('work'); return null;
};
function tickWork(mins){
  var w=S.atWork; if(!w) return; var d=Math.min(mins,w.left); w.left-=d;
  applyRates({fun:-1.5,social:4},d); // colleagues keep you company
  if(w.left<=0) endShift();
}
function endShift(){
  var w=S.atWork; S.atWork=null; var c=S.career; if(!c||c.id!==w.id) return;
  var C=D.CAREERS[c.id]; var mood=E.mood();
  var skillOk=S.skills[C.skill]>=D.LEVEL_SKILL[c.level-1]-0.01;
  var perfGain=8+(mood-50)/6+(skillOk?4:-4)+(traitHas('hustler')?3:0)-(w.late>20?8:0)+(S.needs.energy<20?-5:0);
  var frac=w.total>0?Math.min(1,(w.total)/(C.len*60)):1;
  var pay=Math.round(E.shiftPay()*(0.85+mood/400)*frac);
  if(S.sick) pay=Math.round(pay*0.8);
  c.perf=clamp(c.perf+perfGain,0,100); c.missed=0; S.stats.shifts++;
  earn(pay,C.titles[c.level-1]+' shift');
  if(workRights()==='none'&&city().abroad&&rnd()<0.18){ E.queueEvent('raid'); }
  if(c.perf>=100){ if(c.level<5&&S.skills[C.skill]>=D.LEVEL_SKILL[c.level]){ c.level++; c.perf=25; S.stats.promotions++; note('PROMOTED! You are now '+C.titles[c.level-1]+'. Pay: '+fmt(E.shiftPay())+'/shift.','big'); moodlet('promo','Got promoted',20,48); badge('promo'); if(c.level===5) badge('top'); }
    else if(c.level<5){ c.perf=90; note('Your boss wants to promote you, but you need '+D.SKILLS[C.skill].name+' '+D.LEVEL_SKILL[c.level]+'.','warn'); } }
  E.hooks.changed('work');
}
E.jobList=function(){ return Object.keys(D.CAREERS).map(function(k){ var C=D.CAREERS[k]; return {id:k,C:C,pay:Math.round(C.pay[0]*kPay())}; }); };
E.applyJob=function(id){ var C=D.CAREERS[id]; if(S.career&&S.career.id===id) return 'You already work here';
  if(city().abroad&&workRights()==='none') note('No work permit here. You will be paid cash-in-hand (60%) and risk raids.','warn');
  var lvl=1; if(S.career){ /* switching keeps nothing */ }
  S.career={id:id,level:lvl,perf:10,missed:0}; note('You got a job: '+C.titles[0]+' ('+C.name+'). Shifts: '+C.days.map(function(d){return DAYS[d].slice(0,3);}).join(', ')+' at '+(C.start%12||12)+(C.start<12?'am':'pm')+'.','big'); badge('job'); return null; };
E.quitJob=function(){ if(!S.career) return; note('You quit your job.'); S.career=null; };
E.enrol=function(){ if(S.student) return 'Already a student'; var fee=price(45000); if(city().abroad){ var v=S.visas[countryOf(S.city)]; if(!v||v.type!=='student'&&v.type!=='citizen'&&v.type!=='resident') return 'You need a student visa here'; fee=0; }
  if(S.money<fee) return 'Need '+fmt(fee)+' for school fees'; S.money-=fee; S.student=true; note('Enrolled! Attend lectures at the campus for big skill boosts.','good'); return null; };
E.doGig=function(id){ var g=D.GIGS.filter(function(x){return x.id===id;})[0]; if(!g) return 'No gig';
  if(S.atWork||S.loc==='travel') return 'Busy right now'; if(g.weekend&&[0,6].indexOf(weekday())<0) return 'Weekend only';
  if(S.needs.energy<15) return 'Too tired'; E.rt.queue.length=0; if(E.rt.cur) endCur(true);
  S.atGig={left:g.hours*60,g:g.id}; return null; };
function tickGig(mins){ var a=S.atGig; if(!a) return; var g=D.GIGS.filter(function(x){return x.id===a.g;})[0]; var d=Math.min(mins,a.left); a.left-=d;
  applyRates(g.need,d/(g.hours)); skillGain(g.skill,d/60,0.6);
  if(a.left<=0){ S.atGig=null; var pay=Math.round((g.base+g.per*S.skills[g.skill])*kPay()*(0.8+rnd()*0.4)); earn(pay,g.name); } }

// ---------- travel ----------
E.travelOptions=function(to){
  var a=locXY(S.loc==='work'?E.workLoc():S.loc), b=locXY(to);
  var km=Math.max(0.6,Math.hypot(a[0]-b[0],a[1]-b[1])*D.KM_PER_PX*(city().abroad?0.6:1));
  var h=hour(); var rush=!city().abroad&&((h>=7&&h<10)||(h>=16&&h<20));
  return city().transport.map(function(m){
    var T=D.TRANSPORT[m]; var why=null;
    var car=S.cars.filter(function(c){ return c.city===S.city; })[0];
    if(m==='car'&&!car) why='You don\'t own a car here';
    if(m==='trek'&&km>12) why='Too far to trek';
    if((m==='keke'||m==='okada')&&S.city==='lagos'&&/VI|Ikoyi|Island/.test('')) why=null;
    var cost=Math.round((T.base+T.perKm*km)*kCost()*(S.fuelScarce&&(m==='danfo'||m==='keke'||m==='okada'||m==='cab')?1.6:1));
    if(m==='car'&&car){ var cd=D.CARS.filter(function(x){return x.id===car.id;})[0]; cost=Math.round(km*cd.kmCost*kCost()*(S.fuelScarce?3:1)); }
    var tr=rush?T.traffic*S.policy.traffic:1; var mins=Math.round(km/T.speed*60*tr+(T.wait||0));
    if(S.money<cost&&!why) why='Need '+fmt(cost);
    return {mode:m,name:T.name,desc:T.desc,cost:cost,mins:Math.max(3,mins),why:why,km:km,rush:rush};
  });
};
E.travel=function(to,mode){
  if(S.atWork) return 'You are at work'; if(S.loc==='travel') return 'Already travelling';
  if(to===S.loc) return 'You are already here';
  if(to!=='home'&&to!=='hotel'&&D.LOC[to]&&D.LOC[to].city!==S.city) return 'That is in '+city(D.LOC[to].city).name+'. Fly there from the airport.';
  var o=E.travelOptions(to).filter(function(x){return x.mode===mode;})[0]; if(!o) return 'No such transport'; if(o.why) return o.why;
  S.money-=o.cost; S.stats.spent+=o.cost; E.rt.queue.length=0; if(E.rt.cur) endCur(true);
  S.trip={from:S.loc,to:to,mode:mode,left:o.mins,total:o.mins,fromXY:locXY(S.loc),toXY:locXY(to)}; S.loc='travel';
  var T=D.TRANSPORT[mode]; if(T.tired) S.needs.energy=clamp(S.needs.energy-T.tired*o.km/3,0,100);
  if(T.tired) S.needs.hygiene=clamp(S.needs.hygiene-o.km*2,0,100);
  // things that happen on the road
  var h=hour();
  if((mode==='car'||mode==='cab'||mode==='keke'||mode==='danfo')&&!city().abroad&&rnd()<(h>=20||h<5?0.22:0.08)) E.queueEvent('checkpoint');
  else if(mode==='okada'&&rnd()<T.risk) E.queueEvent('okadacrash');
  else if((mode==='trek')&&(h>=21||h<5)&&rnd()<0.15) E.queueEvent('robbery');
  E.rt.queue.length=0; E.rt.npcs=[]; E.hooks.changed('loc'); return null;
};
function tickTravel(mins){ var t=S.trip; if(!t) return; t.left-=mins; if(t.left<=0){ var to=t.to; S.trip=null; if(to==='home'&&!S.homes[S.city]) to=S.hotelBooked?'hotel':D.CITY_AIRPORT[S.city]; enterLoc(to); arrived(to); } }
function arrived(to){
  if(to==='home') return; var l=D.LOC[to];
  if(l&&l.type==='market'&&rnd()<0.08){ var lost=Math.min(S.money,price(ri(1,5)*1000)); if(lost>0){ S.money-=lost; note('Pickpocket! Someone dipped hand in your pocket in the crowd. -'+fmt(lost)+'.','bad'); } }
  if(l&&l.type==='club'&&hour()>=1&&hour()<4&&rnd()<0.12) E.queueEvent('clubraid');
}
// flights
E.flightOptions=function(){
  var from=S.city; var out=[];
  Object.keys(D.CITIES).forEach(function(c){ if(c===from) return;
    var f=D.FLIGHTS[c]||D.FLIGHTS[from]; var base=(D.FLIGHTS[c]||{}).price||D.FLIGHTS[from].price;
    if(!D.CITIES[c].abroad&&!D.CITIES[from].abroad) base=Math.max(base, (D.FLIGHTS[from]||{price:60000}).price);
    var hours=(D.FLIGHTS[c]||{}).hours||(D.FLIGHTS[from]||{}).hours||7; if(D.CITIES[c].abroad&&D.CITIES[from].abroad) hours=Math.max(4,hours);
    var priceN=Math.round(base*(D.CITIES[c].abroad||D.CITIES[from].abroad?S.rate/1550:1));
    var why=null; var C=D.CITIES[c];
    if(C.abroad){ var cc=countryOf(c); var v=S.visas[cc]; if(!v||!v.type) why='Needs a visa ('+D.COUNTRIES[cc].name+')'; }
    if(!why&&S.money<priceN) why='Need '+fmt(priceN);
    out.push({city:c,name:C.name,country:C.country,price:priceN,hours:hours,why:why});
  });
  return out;
};
E.fly=function(c){ var o=E.flightOptions().filter(function(x){return x.city===c;})[0]; if(!o) return 'No flight'; if(o.why) return o.why;
  if(D.LOC[S.loc]&&D.LOC[S.loc].type!=='airport') return 'Go to the airport first';
  S.money-=o.price; S.stats.spent+=o.price; E.rt.queue.length=0; if(E.rt.cur) endCur(true);
  S.trip={from:S.loc,to:D.CITY_AIRPORT[c],mode:'flight',left:o.hours*60,total:o.hours*60,flight:true,fromCity:S.city,toCity:c}; S.loc='travel';
  E.hooks.changed('loc'); return null; };
function tickFlight(){ var t=S.trip; if(t&&t.flight&&t.left<=0){ S.city=t.toCity; S.trip=null; var to=t.to; enterLoc(to); onLand(); } }
function onLand(){ var C=city(); note('Landed in '+C.name+'. '+(C.abroad?'Welcome to '+C.country+'.':'Welcome home.'),'big');
  if(C.abroad){ badge('japa'); var cc=countryOf(S.city); var v=S.visas[cc]; if(v&&!v.arrived){ v.arrived=S.day; } if(!S.homes[S.city]) note('You have no home here yet. Open Phone › Homes to rent, or book a hotel.','warn'); }
  if(C.cold&&!S.badges.coat) E.queueEvent('cold'); }

// ---------- homes & stuff ----------
E.homeListings=function(c){ c=c||S.city; var list=city(c).abroad?D.HOMES_ABROAD:D.HOMES_NG;
  return list.map(function(t){ var rent=Math.round(t.rent*kCost(c)*(city(c).abroad?1:S.policy.rent)); var upfront=rent*3; var cur=S.homes[c]&&S.homes[c].tier===t.id;
    return {t:t,rent:rent,upfront:upfront,cur:cur,why:cur?'You live here':(S.money<upfront?'Need '+fmt(upfront)+' (agent + caution + rent)':null)}; }); };
E.moveHouse=function(tier){ var c=S.city; var o=E.homeListings(c).filter(function(x){ return x.t.id===tier; })[0]; if(!o||o.why) return o?o.why:'No listing';
  S.money-=o.upfront; S.stats.spent+=o.upfront; var old=S.homes[c];
  if(old) old.items.forEach(function(it){ S.inv.push({id:it.id,paid:it.paid}); });
  if(c==='lagos') S.papaPays=false;
  S.homes[c]={tier:tier,items:[]}; S.hotelBooked=false; S.rentDebtWeeks=0;
  note('You moved into a '+o.t.name+'. Your old things are in your household inventory (Buy mode).','big');
  if(S.loc==='home'||S.loc==='hotel'){ enterLoc('home'); } badge('moved'); return null; };
E.leaveHome=function(c){ var h=S.homes[c]; if(!h) return; h.items.forEach(function(it){ S.inv.push({id:it.id,paid:it.paid}); }); delete S.homes[c]; if(S.city===c&&S.loc==='home') enterLoc(D.CITY_AIRPORT[c]); note('You gave up your place in '+city(c).name+'.'); };
E.bookHotel=function(){ var cost=price(city().abroad?3500:9000); if(S.money<cost) return 'Need '+fmt(cost); S.money-=cost; S.hotelBooked=true; S.hotelCity=S.city; note('Hotel booked for '+fmt(cost)+' a night.'); return null; };
E.hotelPrice=function(){ return price(city().abroad?3500:9000); };
E.buyPrice=function(id){ return price(D.ITEMS[id].price); };
E.buyItem=function(id,x,y,r){ var L=E.rt.lot; if(!L||!L.home) return 'You can only buy furniture at home'; var p=E.buyPrice(id); if(S.money<p) return 'Need '+fmt(p);
  var why=canPlace(L,id,x,y,r); if(why) return why; S.money-=p; S.stats.spent+=p; var it={uid:uid(),id:id,x:x,y:y,r:r,paid:p}; if(D.ITEMS[id].gen) it.fuel=D.ITEMS[id].gen.tank; S.homes[S.city].items.push(it); L.items.push(it); rebuildOcc(L); return null; };
E.placeInv=function(idx,x,y,r){ var L=E.rt.lot; var inv=S.inv[idx]; if(!inv) return 'Nothing to place'; var why=canPlace(L,inv.id,x,y,r); if(why) return why;
  S.inv.splice(idx,1); var it={uid:uid(),id:inv.id,x:x,y:y,r:r,paid:inv.paid}; if(D.ITEMS[inv.id].gen) it.fuel=0; S.homes[S.city].items.push(it); L.items.push(it); rebuildOcc(L); return null; };
E.moveItem=function(uid2,x,y,r){ var L=E.rt.lot; var it=findItem(uid2); if(!it||it.fixed) return 'Can\'t move that'; var why=canPlace(L,it.id,x,y,r,uid2); if(why) return why; it.x=x; it.y=y; it.r=r; rebuildOcc(L); return null; };
E.sellItem=function(uid2){ var L=E.rt.lot; var it=findItem(uid2); if(!it||it.fixed) return 'Can\'t sell that';
  var back=Math.round((it.paid||D.ITEMS[it.id].price)*0.6); S.money+=back; L.items=L.items.filter(function(i){return i.uid!==uid2;}); var h=S.homes[S.city]; h.items=h.items.filter(function(i){return i.uid!==uid2;}); rebuildOcc(L); note('Sold for '+fmt(back)+'.'); return null; };
E.storeItem=function(uid2){ var L=E.rt.lot; var it=findItem(uid2); if(!it||it.fixed) return 'Can\'t store that'; S.inv.push({id:it.id,paid:it.paid}); L.items=L.items.filter(function(i){return i.uid!==uid2;}); var h=S.homes[S.city]; h.items=h.items.filter(function(i){return i.uid!==uid2;}); rebuildOcc(L); return null; };
E.sellInv=function(idx){ var inv=S.inv[idx]; if(!inv) return; var back=Math.round((inv.paid||D.ITEMS[inv.id].price)*0.6); S.money+=back; S.inv.splice(idx,1); note('Sold for '+fmt(back)+'.'); };

E.buyCar=function(id){ var c=D.CARS.filter(function(x){return x.id===id;})[0]; var p=price(c.price); if(S.money<p) return 'Need '+fmt(p); S.money-=p; S.cars.push({id:id,city:S.city,paid:p}); note('You bought a '+c.name+'! Drive it from the Map.','big'); badge('car'); return null; };
E.sellCar=function(i){ var c=S.cars[i]; if(!c) return; var d=D.CARS.filter(function(x){return x.id===c.id;})[0]; var back=Math.round((c.paid||d.price)*0.7); S.money+=back; S.cars.splice(i,1); note('Sold the '+d.name+' for '+fmt(back)+'.'); };
E.buyBiz=function(id){ var b=D.BUSINESSES.filter(function(x){return x.id===id;})[0]; if(S.money<b.cost) return 'Need '+fmt(b.cost); S.money-=b.cost; S.biz.push({id:id,day:S.day,earned:0}); note('You now own a '+b.name+'. It pays out every morning.','big'); badge('biz'); return null; };
E.sellBiz=function(i){ var x=S.biz[i]; if(!x) return; var b=D.BUSINESSES.filter(function(y){return y.id===x.id;})[0]; var back=Math.round(b.cost*0.7); S.money+=back; S.biz.splice(i,1); note('Sold your '+b.name+' for '+fmt(back)+'.'); };
E.buyLand=function(id){ var l=D.LAND.filter(function(x){return x.id===id;})[0]; var cur=landValue(id); if(S.money<cur) return 'Need '+fmt(cur); S.money-=cur; S.land.push({id:id,paid:cur,value:cur,day:S.day}); note('You bought a '+l.name+' for '+fmt(cur)+'.','big'); if(rnd()<0.5) E.queueEvent('omonile'); if(S.land.length>=3) badge('landlord'); return null; };
function landValue(id){ var l=D.LAND.filter(function(x){return x.id===id;})[0]; var growth=Math.pow(1+l.growth,S.day); return Math.round(l.price*growth); }
E.landValue=landValue;
E.sellLand=function(i){ var x=S.land[i]; if(!x) return; var v=Math.round(x.value*0.95); S.money+=v; S.land.splice(i,1); note('Sold land for '+fmt(v)+'.'); };

// ---------- bank ----------
E.loanOffers=function(){ var nw=E.netWorth(); return [
  {id:'quick',name:'Quick loan (7 days)',amount:price(50000),rate:0.15,days:7},
  {id:'salary',name:'Salary advance (14 days)',amount:S.career?E.shiftPay()*8:0,rate:0.1,days:14,why:S.career?null:'Needs a job'},
  {id:'business',name:'Business loan (28 days)',amount:Math.max(0,Math.round(nw*0.4)),rate:0.2,days:28,why:nw<price(300000)?'Net worth too low':null}
]; };
E.takeLoan=function(id){ var o=E.loanOffers().filter(function(x){return x.id===id;})[0]; if(!o||o.why||o.amount<=0) return o&&o.why||'Not available'; if(S.loans.length>=3) return 'Too many loans'; S.money+=o.amount; S.loans.push({name:o.name,left:Math.round(o.amount*(1+o.rate)),due:S.day+o.days}); note('Loan of '+fmt(o.amount)+' approved. Repay '+fmt(o.amount*(1+o.rate))+' by day '+(S.day+o.days+1)+'.','money'); return null; };
E.repayLoan=function(i){ var l=S.loans[i]; if(!l) return; var amt=Math.min(l.left,Math.max(0,S.money)); if(amt<=0) return 'No money'; S.money-=amt; l.left-=amt; if(l.left<=0){ S.loans.splice(i,1); note('Loan fully repaid.','good'); } return null; };
E.remit=function(n){ n=Math.round(n); if(n<=0||S.money<n) return 'Not enough money'; var fee=city().abroad?Math.round(n*0.03):Math.round(Math.min(n*0.01,500)); S.money-=n+fee; S.stats.remitted+=n; rel(S.mum).f=clamp(rel(S.mum).f+Math.min(10,n/20000),-100,100); moodlet('remit','Sent money home',6,24); note('Sent '+fmt(n)+' home (fee '+fmt(fee)+'). Mum is praying for you.','money'); badge('remit'); if(S.stats.remitted>=5000000) badge('mumhouse'); return null; };
E.callPapa=function(){ if(S.lottery!=='nepo') return 'Only Nepo Babies can call Papa'; if(S.papaDay===S.day) return 'Papa already picked today. Try tomorrow.';
  S.papaDay=S.day; S.papaCount++; if(S.papaCount>5&&rnd()<0.35){ note('Papa: "Your mates are building companies. Go and work!" (No money today.)','warn'); return null; }
  var amt=ri(20,100)*1000; S.money+=amt; note('Papa sent '+fmt(amt)+'. "Use it wisely o."','money'); return null; };
E.netWorth=function(){ var n=S.money; for(var c in S.homes) S.homes[c].items.forEach(function(it){ n+=(it.paid||0)*0.5; });
  S.inv.forEach(function(i){ n+=(i.paid||0)*0.5; }); S.cars.forEach(function(c){ var d=D.CARS.filter(function(x){return x.id===c.id;})[0]; n+=(c.paid||d.price)*0.7; });
  S.biz.forEach(function(b){ var d=D.BUSINESSES.filter(function(x){return x.id===b.id;})[0]; n+=d.cost*0.7; }); S.land.forEach(function(l){ n+=l.value; });
  S.loans.forEach(function(l){ n-=l.left; }); return Math.round(n); };

// ---------- visas ----------
E.visaOptions=function(cc){ var C=D.COUNTRIES[cc]; var v=S.visas[cc]; var out=[];
  ['visitor','student','work'].forEach(function(t){ var V=C.visas[t]; var fee=Math.round(V.fee*S.rate/1550), funds=Math.round(V.funds*S.rate/1550), tui=V.tuition?Math.round(V.tuition*S.rate/1550):0;
    var why=null; if(v&&(v.type==='citizen'||v.type==='resident')) why='You already have '+D.VISA_NAMES[v.type];
    else if(v&&v.pending) why='Application in progress'; else if(v&&v.type===t) why='You already have this';
    else if(t==='work'&&(!S.career||S.career.level<V.level)) why='Needs a level '+V.level+'+ job';
    else if(S.money<fee+tui) why='Need '+fmt(fee+tui);
    var chance=V.chance+(S.money>=funds?0.12:-0.25)+S.skills.logic*0.01+(S.career?S.career.level*0.02:0); chance=clamp(chance,0.05,0.95);
    out.push({type:t,name:D.VISA_NAMES[t],fee:fee,funds:funds,tuition:tui,chance:chance,why:why}); });
  return out; };
E.applyVisa=function(cc,t){ var o=E.visaOptions(cc).filter(function(x){return x.type===t;})[0]; if(!o||o.why) return o?o.why:'Not available';
  S.money-=o.fee+o.tuition; var cur=S.visas[cc]||(S.visas[cc]={type:null}); cur.pending={type:t,ready:S.day+ri(2,4),chance:o.chance,tuition:o.tuition};
  note('Visa application submitted. Decision in a few days. Fee: '+fmt(o.fee)+(o.tuition?' + tuition '+fmt(o.tuition):'')+'.'); return null; };

// ---------- elections & gems ----------
E.vote=function(cand){ S.election.voted=cand; note('You voted for '+D.CANDIDATES.filter(function(c){return c.id===cand;})[0].name+'. Your thumb is purple.','good'); badge('voter'); };
E.gemQuestion=function(){ var q=D.TRIVIA[(S.day*7+3)%D.TRIVIA.length]; var order=[0,1,2,3]; var r=seeded(S.day+99); order.sort(function(){ return r()-0.5; }); return {q:q[0],opts:order.map(function(i){return q[1][i];}),correct:order.indexOf(q[2])}; };
E.answerGem=function(i){ if(S.gemDay===S.day) return 'Come back tomorrow'; S.gemDay=S.day; var g=E.gemQuestion(); if(i===g.correct){ S.gems++; var p=price(5000); earn(p,'Daily gem correct'); return true; } note('Wrong answer. The right one was "'+g.opts[g.correct]+'".','warn'); return false; };

// ---------- random events ----------
var EV = {
  nepa:{title:'Light don go!',text:'NEPA took the light. Fridge, TV and laptop need power.',choices:[['Okay',function(){}]]},
  checkpoint:{title:'Police checkpoint',text:'"Oga, wetin you carry? Show me your particulars." The officer is smiling too much.',choices:[
    ['Settle him (₦1,000)',function(){ var c=price(1000); S.money-=c; return 'You "settled" and drove off. -'+fmt(c)+'.'; }],
    ['Know your rights (Charisma check)',function(){ if(rnd()<0.35+S.skills.charisma*0.06){ return 'You calmly quoted the law. He waved you through.'; } var c=price(5000); S.money-=c; if(S.trip) S.trip.left+=120; return 'He was not having it. Two hours at the station and -'+fmt(c)+'.'; }]]},
  okadacrash:{title:'Okada wahala',text:'The okada man swerved for a pothole and you both fell. Small injury.',choices:[['Go to hospital later',function(){ S.sick=1; S.needs.energy=clamp(S.needs.energy-20,0,100); return 'You are hurt. Visit a hospital to heal.'; }]]},
  robbery:{title:'One chance!',text:'Some boys stopped you on a dark street.',choices:[['Hand over cash',function(){ var l=Math.min(S.money,price(ri(3,15)*1000)); S.money-=l; moodlet('robbed','Got robbed',-15,24); return 'They took '+fmt(l)+'. You are shaken but okay.'; }],['Run!',function(){ if(rnd()<0.5+S.skills.fitness*0.05) return 'You ran like Usain Bolt. Safe.'; var l=Math.min(S.money,price(ri(5,20)*1000)); S.money-=l; S.sick=1; return 'They caught you. -'+fmt(l)+' and a few bruises.'; }]]},
  clubraid:{title:'Police raid at the club',text:'The music stopped. Police are rounding people up.',choices:[['Pay "bail" (₦5,000)',function(){ var c=price(5000); S.money-=c; return 'You paid and walked out. -'+fmt(c)+'.'; }],['Wait it out',function(){ S.min=Math.min(1439,S.min+180); S.needs.energy=clamp(S.needs.energy-20,0,100); return 'Three hours later they released everyone.'; }]]},
  raid:{title:'Immigration spot check',text:'Officers are checking work papers. You don\'t have work rights here.',choices:[['Pay the fine',function(){ var c=price(8000); S.money-=c; return 'Fined '+fmt(c)+'. Sort your papers soon.'; }],['Slip out the back',function(){ if(rnd()<0.5) return 'You got away. Heart still racing.'; var c=price(20000); S.money-=c; if(S.career) S.career.perf=0; return 'Caught. '+fmt(c)+' fine and your boss is nervous.'; }]]},
  owambeinvite:{title:'Owambe invite',text:function(){ return 'Your friend is celebrating on Saturday at the event centre. Aso-ebi is '+fmt(price(8000))+'.'; },choices:[['Buy aso-ebi',function(){ var c=price(8000); S.money-=c; S.asoebi=true; return 'Aso-ebi bought. Go to an event centre on Saturday.'; }],['Send regards',function(){ return 'You sent a congratulations message.'; }]]},
  fees:{title:'School fees',text:function(){ return S.people[S.sibling].name.split(' ')[0]+' needs '+fmt(price(15000))+' for school fees.'; },choices:[['Send it',function(){ var c=price(15000); S.money-=c; rel(S.sibling).f+=10; moodlet('helped','Helped family',8,48); return 'Sent. Your sibling is grateful.'; }],['Next week',function(){ rel(S.sibling).f-=8; return 'They said "no wahala" in the tone that means wahala.'; }]]},
  mumcall:{title:'Mum is calling',text:'"My pikin, how is work? The roof is leaking small."',choices:[['Send something (₦10,000)',function(){ var c=price(10000); S.money-=c; S.stats.remitted+=c; rel(S.mum).f+=6; moodlet('mum','Mum is proud',8,48); return 'Mum prayed for you for ten straight minutes.'; }],['Promise next month',function(){ moodlet('guilt','Guilt',-4,24); return 'Mum said okay. You feel a little guilty.'; }]]},
  scam:{title:'SMS: Your BVN has been blocked',text:'"Click this link to update your BVN within 24 hours or lose your account."',choices:[['Ignore and delete',function(){ return 'Smart. That was phishing.'; }],['Click the link',function(){ var l=Math.min(Math.max(0,S.money),price(ri(10,40)*1000)); S.money-=l; moodlet('scammed','Got scammed',-12,48); return 'The link drained '+fmt(l)+'. Banks never ask for your BVN by SMS.'; }],['Report it',function(){ skillGain('tech',0.4,1); return 'Reported. Your security sense is sharper.'; }]]},
  landlord:{title:'Baba Landlord',text:'"From next week, rent go up 10%. Na economy."',choices:[['Beg him (Charisma)',function(){ if(rnd()<0.35+S.skills.charisma*0.05) return 'He laughed and said "okay, for your sake."'; S.policy.rent*=1.1; return 'He did not budge. Rent is up 10%.'; }],['Accept',function(){ S.policy.rent*=1.1; return 'Rent up 10%.'; }]]},
  fuel:{title:'Fuel scarcity',text:'Queues at every filling station. Transport fares and fuel just went up.',choices:[['Na wa',function(){ S.fuelScarce=S.day+2; return 'Fuel scarcity for 2 days.'; }]]},
  flood:{title:'Flood!',text:'Heavy rain. Roads are flooded and traffic is crazy.',choices:[['Stay indoors',function(){ S.policy.traffic*=1; S.flood=S.day; return 'Travel is slower today.'; }]]},
  match:{title:'Super Eagles win!',text:'The whole of Lagos is celebrating a big win.',choices:[['Celebrate!',function(){ moodlet('eagles','Super Eagles won',10,24); return 'Horns, vuvuzelas, joy.'; }]]},
  omonile:{title:'Omo onile',text:'Area boys appear on your new land. "You go pay foundation fee before you build."',choices:[['Pay them (10%)',function(){ var l=S.land[S.land.length-1]; var c=Math.round(l.paid*0.1); S.money-=c; return 'You paid '+fmt(c)+'. They left.'; }],['Call the police',function(){ if(rnd()<0.55) return 'The police chased them away.'; var l=S.land[S.land.length-1]; l.value*=0.85; return 'They kept disturbing. Your land value dropped 15%.'; }]]},
  cold:{title:'First winter',text:'The cold enters your bones. Everyone has a proper coat but you.',choices:[['Buy a winter coat',function(){ var c=price(6000); S.money-=c; S.badges.coat=1; return 'Warm at last. -'+fmt(c)+'.'; }],['Tough it out',function(){ S.sick=1; return 'You caught a cold. Go to a hospital.'; }]]},
  posrobbery:{title:'POS robbery',text:'Thieves hit your POS stand last night.',choices:[['Ouch',function(){ var c=price(20000); S.money-=c; return 'You lost '+fmt(c)+' in cash.'; }]]},
  election:{title:'Election results',text:function(){ return 'The governorship election results are in.'; },choices:[['See results',function(){ return electionResult(); }]]}
};
E.EV=EV;
E.queueEvent=function(id){ if(S.pendingEvents.length>3) return; S.pendingEvents.push(id); E.hooks.event(); };
E.eventView=function(){ var id=S.pendingEvents[0]; if(!id) return null; var e=EV[id]; return {id:id,title:e.title,text:typeof e.text==='function'?e.text():e.text,choices:e.choices.map(function(c){return c[0];})}; };
E.resolveEvent=function(i){ var id=S.pendingEvents.shift(); var e=EV[id]; if(!e) return ''; var r=e.choices[i]?e.choices[i][1]():''; if(r) log(r); E.hooks.changed('money'); return r||''; };
function electionResult(){ var w={pp:1,pum:1,nla:1}; if(S.election.voted) w[S.election.voted]+=0.35; var tot=w.pp+w.pum+w.nla, x=rnd()*tot, win='pp'; for(var k in w){ x-=w[k]; if(x<=0){ win=k; break; } }
  var c=D.CANDIDATES.filter(function(q){return q.id===win;})[0]; S.policy.traffic=win==='pp'?0.8:1; S.policy.rent=win==='pum'?0.9:1; S.policy.power=win==='nla'?0.15:0; S.policy.winner=win;
  S.election={next:S.day+14,voted:false}; return c.name+' ('+c.party+') won! Policy: '+c.promise+'.'; }

// ---------- daily & hourly ----------
function newDay(){
  S.day++; var wd=weekday();
  // currency
  var d=ri(-25,25); if(rnd()<0.06) d+=(rnd()<0.6?1:-1)*ri(60,140); S.rate=clamp(S.rate+d,1200,2600); S.rateHist.push(S.rate); if(S.rateHist.length>30) S.rateHist.shift();
  if(S.fuelScarce&&S.day>S.fuelScarce) S.fuelScarce=0;
  // rent on Saturday
  if(wd===6){ var tot=0; for(var c in S.homes){ if(c==='lagos'&&S.papaPays) continue; tot+=homeRent(S.homes[c],c); }
    if(tot>0){ if(S.money>=tot){ S.money-=tot; S.rentDebtWeeks=0; note('Rent paid: '+fmt(tot)+'.','money'); } else { S.money-=tot; S.rentDebtWeeks++; moodlet('rent','Rent wahala',-12,48); note('You could not cover rent ('+fmt(tot)+'). Baba Landlord is angry. Weeks owing: '+S.rentDebtWeeks+'.','bad');
      if(S.rentDebtWeeks>=3){ evict(); } } }
    if(S.papaPays) note('Daddy paid your Lekki rent again.');
    S.loans.forEach(function(l){ if(l.weekly){ var p=Math.min(l.weekly,l.left); S.money-=p; l.left-=p; note('LAPO repayment: '+fmt(p)+'. Left: '+fmt(l.left)+'.','money'); } });
    S.loans=S.loans.filter(function(l){ return l.left>0; });
    if(S.hotelBooked){ /* nightly below */ } }
  // loans due
  S.loans.forEach(function(l){ if(l.due&&S.day>l.due){ l.left=Math.round(l.left*1.03); if(S.day===l.due+1) note('Your '+l.name+' is overdue. Interest is piling up.','bad'); } });
  // businesses
  var biz=0; S.biz.forEach(function(b){ var B=D.BUSINESSES.filter(function(x){return x.id===b.id;})[0]; var inc=ri(B.min,B.max); b.earned+=inc; biz+=inc; if(B.risk&&rnd()<0.04) E.queueEvent('posrobbery'); });
  if(biz){ S.money+=biz; S.stats.earned+=biz; note('Your businesses made '+fmt(biz)+' yesterday.','money'); }
  S.land.forEach(function(l){ var L=D.LAND.filter(function(x){return x.id===l.id;})[0]; l.value=Math.round(l.value*(1+L.growth+(rnd()-0.5)*0.004)); });
  // hotel
  if(S.hotelBooked&&S.hotelCity===S.city&&!S.homes[S.city]){ var hp=E.hotelPrice(); S.money-=hp; note('Hotel night: '+fmt(hp)+'.','money'); }
  // missed shifts yesterday
  if(S.career){ var C=D.CAREERS[S.career.id]; var yd=(wd+6)%7; if(C.days.indexOf(yd)>=0&&S.workedDay[S.career.id]!==S.day-1&&!(C.start+C.len>24)){ S.career.missed++; S.career.perf=clamp(S.career.perf-15,0,100); note('You missed your shift yesterday. Performance dropped.','bad');
      if(S.career.missed>=3){ note('You were sacked for missing 3 shifts in a row.','bad'); S.career=null; moodlet('sacked','Got sacked',-20,72); } } }
  // pregnancy & kids
  if(S.pregnant&&S.day>=S.pregnant.due){ S.pregnant=null; var g=rnd()<0.5?'m':'f'; var kid=makePerson(S.city,g); kid.name=pick(g==='m'?['Tobi','Chidera','Ayomide','Kamsi','Ife','Somto']:['Tiwa','Adaeze','Morenike','Chisom','Ife','Zara'])+' '+S.name.split(' ').slice(-1)[0]; kid.born=S.day; S.kids.push(kid); S.babyCare=70; note('Your baby '+kid.name.split(' ')[0]+' is here! Buy a crib and take good care.','big'); badge('baby'); moodlet('newbaby','New baby',25,72); }
  if(S.kids.length){ var cost=price(800)*S.kids.length; S.money-=cost; }
  // visas
  for(var cc in S.visas){ var v=S.visas[cc]; if(v.pending&&S.day>=v.pending.ready){ var ok=rnd()<v.pending.chance; if(ok){ v.type=v.pending.type; v.granted=S.day; note(D.VISA_NAMES[v.type]+' for '+D.COUNTRIES[cc].name+' APPROVED! Book a flight at the airport.','big'); if(v.type==='student') S.student=true; } else note('Visa for '+D.COUNTRIES[cc].name+' refused. "Insufficient ties to home country."','bad'); v.pending=null; if(!v.type) delete S.visas[cc]; }
    if(v.type==='work'&&v.arrived&&S.day-v.arrived>=21&&S.city===D.COUNTRIES[cc].city){ v.type='resident'; note('You got permanent residency in '+D.COUNTRIES[cc].name+'! 🎉','big'); badge('pr'); } }
  // election
  if(S.day===S.election.next-1&&S.city==='lagos') note('Tomorrow is election day. Vote at Polling Unit 001 on Lagos Island.','info');
  if(S.day>S.election.next){ E.queueEvent('election'); }
  // random daily event
  var pool=['mumcall','scam','fees','owambeinvite','fuel','match','landlord','flood'];
  if(rnd()<0.55){ var ev=pick(pool); if(ev==='landlord'&&!S.homes.lagos) ev='scam'; if(ev==='flood'&&S.city!=='lagos') ev='mumcall'; if(ev==='fuel'&&city().abroad) ev='mumcall'; E.queueEvent(ev); }
  // moodlets
  var nowT=S.day*1440+S.min; S.moodlets=S.moodlets.filter(function(m){ return m.until>nowT; });
  S.papaCount=Math.max(0,S.papaCount-0.3);
  checkDream(); E.hooks.changed('day');
}
function evict(){ var c=S.homes.lagos?'lagos':S.city; note('EVICTED! Baba Landlord threw your things outside. You moved to the cheapest room you could find.','bad'); moodlet('evicted','Evicted',-25,96);
  var cheapest=city(c).abroad?'abroom':'faceme'; var old=S.homes[c]; if(old) old.items.forEach(function(it){ S.inv.push({id:it.id,paid:it.paid}); }); S.homes[c]={tier:cheapest,items:[]}; S.rentDebtWeeks=0; if(S.loc==='home') enterLoc('home'); }
function newHour(){
  var h=hour();
  // power: Nigerian homes get random outages; generators burn fuel
  if(!city().abroad){ var t=S.homes[S.city]?homeTier(S.homes[S.city].tier,S.city):null; var p=clamp((t?t.power:0.5)+S.policy.power,0,0.98); var was=S.power;
    if(was&&rnd()<(1-p)*0.3) S.power=false; else if(!was&&rnd()<p*0.45) S.power=true;
    if(was&&!S.power&&S.loc==='home') note('NEPA took the light. 💡','warn'); if(!was&&S.power&&S.loc==='home') note('UP NEPA! Light is back.','good'); } else S.power=true;
  var L=E.rt.lot; if(S.homes[S.city]) S.homes[S.city].items.forEach(function(it){ var d=D.ITEMS[it.id]; if(d&&d.gen&&it.on){ if(S.power){ /* idle */ } else { it.fuel=Math.max(0,(it.fuel||0)-1); if(it.fuel<=0){ it.on=false; if(S.loc==='home') note('Your generator ran out of fuel.','warn'); } } } });
  // shift reminder
  if(S.career){ var st=E.shiftStatus(); if(st&&st.state==='now'&&!S.atWork&&h===D.CAREERS[S.career.id].start-1) note('Your shift starts in an hour. Use the Work button.','warn'); }
  if(S.kids.length) S.babyCare=clamp(S.babyCare-3,0,100);
  if(S.kids.length&&S.babyCare<20&&rnd()<0.2) note('The baby is crying. Feed and play with them (crib).','warn');
  // sickness drift
  if(S.needs.hygiene<10&&rnd()<0.05) { S.sick=1; note('You fell sick. Being dirty for too long is not good. See a doctor.','bad'); }
}
function checkDream(){ var d=S.dream, ok=false; var nw=E.netWorth();
  if(d==='millionaire') ok=nw>=1000000; if(d==='billionaire') ok=nw>=1e9; if(d==='ceo') ok=S.career&&S.career.level===5; if(d==='legend') ok=S.career&&S.career.id==='music'&&S.career.level===5;
  if(d==='mumhouse') ok=S.stats.remitted>=5000000; if(d==='japa') ok=Object.keys(S.visas).some(function(k){ return S.visas[k].type==='resident'; }); if(d==='family') ok=!!S.spouse&&S.kids.length>=2; if(d==='landlord') ok=S.land.length>=3;
  if(ok&&!S.dreamDone){ S.dreamDone=S.day; note('LIFETIME DREAM ACHIEVED: '+D.DREAMS[d].name+'! 🏆','big'); badge('dream'); }
  if(nw>=1000000) badge('millionaire'); if(nw>=1e9) badge('billionaire'); }
var BADGES={born_nepo:'Born with a silver spoon',born_lapo:'LAPO survivor',born_fresher:'Jambite',born_japakid:'Born abroad',job:'First job',promo:'Promoted',top:'Top of the ladder',car:'First car',japa:'Japa\'d',remit:'Sent money home',mumhouse:'Built Mum a house',jollof:'Party jollof master',bigboy:'Big boy at Quilox',viral:'Went viral',hackathon:'Hackathon winner',love:'In a relationship',engaged:'Engaged',married:'Married',baby:'Parent',moved:'New house',biz:'Business owner',landlord:'Landlord',voter:'Voted',pr:'Permanent resident',millionaire:'Millionaire',billionaire:'Billionaire',dream:'Lifetime dream'};
E.BADGES=BADGES;
function badge(id){ if(S.badges[id]) return; S.badges[id]=S.day+1; if(BADGES[id]&&id.indexOf('born_')!==0) note('Achievement: '+BADGES[id]+'.','badge'); }
E.badge=badge;

E.wedding=function(){ var f=fianceId(); if(!f) return 'No fiancé(e)'; var c=price(300000); if(S.money<c) return 'Need '+fmt(c); S.money-=c; S.rel[f].st='spouse'; S.spouse=f; S.people[f].city=S.city;
  moodlet('wedding','Just married',30,96); badge('married'); note('You married '+S.people[f].name+'! The owambe was legendary. They moved in with you.','big'); return null; };

// ---------- food delivery ----------
E.ORDERS={jollofpack:{name:'Jollof & chicken pack',cost:1200,hunger:60,fun:8},amalapack:{name:'Amala & ewedu pack',cost:900,hunger:55},groceries:{name:'Foodstuff delivery (+6 food)',cost:2600,food:6},suyapack:{name:'Suya & cold drink',cost:1500,hunger:35,fun:18}};
E.order=function(k){ var o=E.ORDERS[k]; var c=price(o.cost); if(S.money<c) return 'Need '+fmt(c); if(S.loc!=='home'&&S.loc!=='hotel') return 'Delivery only to your home or hotel';
  S.money-=c; (S.deliveries=S.deliveries||[]).push({k:k,at:S.day*1440+S.min+ri(30,50)}); note('Order placed: '+o.name+'. Rider is on the way.'); return null; };
function tickDeliveries(){ if(!S.deliveries||!S.deliveries.length) return; var nowT=S.day*1440+S.min;
  S.deliveries=S.deliveries.filter(function(d){ if(d.at>nowT) return true; var o=E.ORDERS[d.k]; if(o.food) S.food+=o.food; if(o.hunger) S.needs.hunger=clamp(S.needs.hunger+o.hunger,0,100); if(o.fun) S.needs.fun=clamp(S.needs.fun+o.fun,0,100); note('Delivery arrived: '+o.name+'.','good'); return false; }); }

// ---------- the main tick ----------
E.update=function(mins){
  if(!S) return; if(S.pendingEvents.length) return; // events pause the world
  var steps=Math.ceil(mins/2); var dt=mins/steps;
  for(var i=0;i<steps;i++) step(dt);
};
function step(dt){
  var prevH=hour();
  S.min+=dt; if(S.min>=1440){ S.min-=1440; newDay(); }
  if(hour()!==prevH) newHour();
  // needs
  var rt=E.rt, c=rt.cur; var slow=(c&&c.phase==='act'&&c.A&&c.A.slow)?c.A.slow:1;
  var AW=S.atWork?{bladder:0,hygiene:0.4,hunger:0.45,social:0.3}:(S.trip?{bladder:0.4,social:0.5}:(S.atGig?{bladder:0.3,hunger:0.7}:{}));
  D.NEEDS.forEach(function(n){ var r=D.NEED_DECAY[n]*decayMult(n)*(n==='bladder'||n==='hunger'?slow:1)*(n in AW?AW[n]:1);
    if(c&&c.phase==='act'&&n==='energy'&&c.A&&c.A.rate&&c.A.rate.energy>0) r=0;
    S.needs[n]=clamp(S.needs[n]-r*dt/60,0,100); });
  tickDeliveries();
  if(S.atWork){ tickWork(dt); return; }
  if(S.atGig){ tickGig(dt); return; }
  if(S.trip){ S.trip.left-=dt; if(S.trip.left<=0){ if(S.trip.flight) tickFlight(); else tickTravel(0); } return; }
  // emergencies
  if(S.needs.bladder<=0){ S.needs.bladder=100; S.needs.hygiene=0; moodlet('accident','Had an accident',-20,12); note('Your Sim couldn\'t hold it. Embarrassing!','bad'); if(rt.cur) endCur(true); }
  if(S.needs.energy<=0&&!(c&&c.A&&c.A.label==='Sleep')){ S.needs.energy=15; moodlet('passout','Passed out',-15,12); note('Your Sim passed out from exhaustion.','bad'); S.min=Math.min(1439,S.min+120); if(rt.cur) endCur(true); }
  if(S.needs.hunger<=0){ S.needs.hunger=30; S.sick=1; var bill=price(10000); S.money-=bill; moodlet('starved','Fainted from hunger',-20,24); note('You fainted from hunger and woke up in hospital. Bill: '+fmt(bill)+'.','bad'); if(rt.cur) endCur(true); }
  // Sim movement & actions
  if(rt.cur){ if(rt.cur.phase==='walk') walkSim(dt); else tickAction(dt); }
  else if(rt.queue.length) startNext();
  else if(S.freeWill) autonomy();
  tickNpcs(dt);
}
var WALK=1.25; // tiles per game minute
function walkSim(dt){
  var c=E.rt.cur; var budget=WALK*dt;
  while(budget>0&&c.path&&c.path.length){ var t=c.path[0]; var dx=t[0]-S.sim.x, dy=t[1]-S.sim.y; var d=Math.hypot(dx,dy);
    if(dx) S.sim.dir=dx>0?1:-1;
    if(d<=budget){ S.sim.x=t[0]; S.sim.y=t[1]; budget-=d; c.path.shift(); } else { S.sim.x+=dx/d*budget; S.sim.y+=dy/d*budget; budget=0; } }
  S.sim.walking=!!(c.path&&c.path.length);
  if(!c.path||!c.path.length){ S.sim.walking=false; beginAction(); }
}
function autonomy(){
  if(E.rt.idle===undefined) E.rt.idle=0; E.rt.idle++; if(E.rt.idle<8) return; E.rt.idle=0;
  if(S.loc!=='home'&&S.loc!=='hotel') return;
  var L=E.rt.lot; var n=S.needs;
  var opts={bladder:[['toilet'],38],hunger:[['eatmeal','snack','cook'],35],energy:[['sleep','nap'],hour()>=21||hour()<6?55:22],hygiene:[['bath'],30],fun:[['watchtv','game','browse','dance','watchfish','music','chess'],30],social:[['browse','stream'],25]};
  var list=Object.keys(opts).filter(function(k){ return n[k]<opts[k][1]; }).sort(function(a,b){ return n[a]-n[b]; });
  for(var i=0;i<list.length;i++){ var want=opts[list[i]][0];
    for(var j=0;j<want.length;j++){ var a=want[j]; var it=L.items.filter(function(x){ var d=itemDef(x); return (d.acts||[]).indexOf(a)>=0&&!actWhy(x,a); })[0]; if(it){ E.queueObj(it.uid,a); return; } }
    if(list[i]==='social'&&rnd()<0.3){ var fr=Object.keys(S.rel).filter(function(id){ return S.rel[id].f>20; }); if(fr.length){ E.callPerson(pick(fr)); return; } } }
}
function tickNpcs(dt){
  var rt=E.rt, L=rt.lot; if(!L) return;
  rt.npcs.forEach(function(n){
    n.anim+=dt*0.2;
    if(n.talk) return;
    if(n.path&&n.path.length){ var b=WALK*0.8*dt; while(b>0&&n.path.length){ var t=n.path[0]; var dx=t[0]-n.x, dy=t[1]-n.y, d=Math.hypot(dx,dy); if(dx) n.dir=dx>0?1:-1; if(d<=b){ n.x=t[0]; n.y=t[1]; b-=d; n.path.shift(); } else { n.x+=dx/d*b; n.y+=dy/d*b; b=0; } }
      if(!n.path.length){ n.wait=ri(20,90); } return; }
    n.wait-=dt; if(n.wait>0) return;
    var props=L.items.filter(function(i){ return i.prop; }); var tgt=props.length&&rnd()<0.75?pick(props):null;
    var r=tgt?pathToItem(L,n,tgt):null; if(r){ n.path=r.path; n.pose=/dancefloor/.test(tgt.prop)?'dance':(/bench|pew|seat|vip|tables|table/.test(tgt.prop)?'sit':null); }
    else { var f=randomFree(L); if(f){ n.path=pathToTile(L,n,f[0],f[1])||[]; n.pose=null; } }
  });
  // spouse at home
  if(S.loc==='home'&&S.spouse){ if(!rt.spouseSim){ var f=randomFree(L); rt.spouseSim={id:S.spouse,x:f?f[0]:1,y:f?f[1]:1,dir:1,path:null,wait:10,anim:0}; }
    var sp=rt.spouseSim; if(sp.path&&sp.path.length){ var b2=WALK*0.7*dt; while(b2>0&&sp.path.length){ var t2=sp.path[0]; var dx2=t2[0]-sp.x, dy2=t2[1]-sp.y, d2=Math.hypot(dx2,dy2); if(dx2) sp.dir=dx2>0?1:-1; if(d2<=b2){ sp.x=t2[0]; sp.y=t2[1]; b2-=d2; sp.path.shift(); } else { sp.x+=dx2/d2*b2; sp.y+=dy2/d2*b2; b2=0; } } }
    else { sp.wait-=dt; if(sp.wait<=0){ var g=randomFree(L); if(g) sp.path=pathToTile(L,sp,g[0],g[1])||[]; sp.wait=ri(30,120); } } }
  else rt.spouseSim=null;
}

E.busyLabel=function(){ if(S.atWork){ return 'At work · '+Math.ceil(S.atWork.left/60)+'h left'; } if(S.atGig) return 'Doing a side gig'; if(S.trip) return S.trip.flight?'Flying to '+city(S.trip.toCity).name:'On the way to '+(S.trip.to==='home'?'home':D.LOC[S.trip.to].name); return null; };
E.isFast=function(){ var c=E.rt.cur; return !!(S.atWork||S.trip||S.atGig||(c&&c.phase==='act'&&c.A&&(c.A.label==='Sleep'))); };

G.JL={E:E,D:D};
})(typeof window!=='undefined'?window:globalThis);
