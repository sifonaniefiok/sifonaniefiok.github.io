/* Japa Life — UI: loop, input, HUD, panels, phone, buy mode, mini-games, creation. */
(function(){
'use strict';
var JL=window.JL, E=JL.E, D=JL.D, R=JL.R;
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
var fmt=E.fmt;
var cv=$('world'), ctx=cv.getContext('2d');
var UI={mode:'lot',buy:null,labels:true,modalOpen:false,sheet:null,sheetArg:null,target:null,hover:null,creating:false};
JL.UI=UI; UI.esc=esc;
var SAVE_KEY='japa-life-v2';

// ---------- canvas sizing ----------
var DPR=1;
function resize(){ DPR=Math.min(2,window.devicePixelRatio||1); cv.width=Math.round(cv.clientWidth*DPR); cv.height=Math.round(cv.clientHeight*DPR); ctx.setTransform(DPR,0,0,DPR,0,0); refit(); }
function lotPad(){ var W=cv.clientWidth; var mob=W<560; return {t:mob?92:70,b:UI.buy?(mob?250:250):(mob?150:118),l:mob?6:(W>=900&&UI.sheet?20:14),r:W>=900&&UI.sheet?450:(mob?6:14)}; }
function refit(){ if(E.S&&E.rt.lot) R.fitLot(cv,E.rt.lot,lotPad()); if(E.S) R.fitMap(cv); }
window.addEventListener('resize',resize);

// ---------- persistence ----------
function save(){ if(!E.S||UI.creating) return; try{ localStorage.setItem(SAVE_KEY,E.serialize()); }catch(e){} }
function loadSave(){ try{ var t=localStorage.getItem(SAVE_KEY); if(t){ var o=JSON.parse(t); if(o&&o.v===2&&o.needs) return o; } }catch(e){} return null; }
UI.save=save;
setInterval(save,15000);
document.addEventListener('visibilitychange',function(){ if(document.hidden) save(); });

// ---------- toasts ----------
var toastBox=$('toasts');
function toast(text,kind){ var d=document.createElement('div'); d.className='toast '+(kind||'info'); d.textContent=text; toastBox.prepend(d);
  while(toastBox.children.length>4) toastBox.lastChild.remove();
  setTimeout(function(){ d.classList.add('out'); setTimeout(function(){ d.remove(); },450); },kind==='big'?6500:4200); }
UI.toast=toast;
E.hooks.note=function(t,k){ if(UI.creating) return; toast(t,k); if(JL.NET&&k==='badge'&&JL.NET.brag) JL.NET.brag(t); };
E.hooks.changed=function(what){ if(what==='loc'){ R.invalidate(); UI.target=null; if(E.S.loc==='travel'){ UI.prevMode=UI.mode; } else if(UI.mode==='map'&&!UI.userMap){ UI.mode='lot'; } refit(); renderHud(true); if(UI.sheet==='do') openSheet('do'); }
  if(what==='work') renderHud(true); };
E.hooks.event=function(){ };

// ---------- loop ----------
var last=performance.now(), saveTick=0;
function paused(){ return UI.modalOpen||UI.buy||UI.creating; }
function frame(now){
  var dt=Math.min(0.1,(now-last)/1000); last=now; R.t+=dt;
  var S=E.S;
  if(S&&!paused()){
    var sp=S.speed; var rate=[0,1.6,5,15][sp]||0;
    if(sp>0&&E.isFast()) rate=Math.max(rate,S.trip&&!S.trip.flight?14:48);
    if(rate>0){ var before=S.day; E.update(rate*dt); if(S.day!==before) save(); }
    if(S.pendingEvents.length&&!UI.modalOpen) showEvent();
  }
  draw(dt); renderHud(false);
  requestAnimationFrame(frame);
}
function nightAlpha(){ var m=E.S.min/60; if(m>=7&&m<17.5) return 0; if(m>=17.5&&m<20.5) return (m-17.5)/3*0.42; if(m>=20.5||m<4.5) return 0.42; return 0.42*(1-(m-4.5)/2.5); }
function draw(dt){
  var W=cv.clientWidth, H=cv.clientHeight; var S=E.S;
  if(!S){ ctx.fillStyle='#2B3A2E'; ctx.fillRect(0,0,W,H); return; }
  var showMap=UI.mode==='map'||S.loc==='travel';
  if(showMap){
    var cid=S.trip&&S.trip.flight?S.trip.fromCity:S.city;
    var me=null; if(S.trip&&!S.trip.flight){ var f=1-S.trip.left/S.trip.total; me=[S.trip.fromXY[0]+(S.trip.toXY[0]-S.trip.fromXY[0])*f,S.trip.fromXY[1]+(S.trip.toXY[1]-S.trip.fromXY[1])*f]; } else if(!S.trip) me=E.locXY(S.loc);
    var h=E.hour(); R.drawMap(ctx,cv,cid,{sel:UI.mapSel,labels:UI.labels&&R.mapCam.s>1.15,me:me,trip:S.trip&&!S.trip.flight?S.trip:null,rush:(h>=7&&h<10)||(h>=16&&h<20),dt:dt,players:JL.NET?JL.NET.mapPlayers(cid):[]});
    if(S.trip&&S.trip.flight) drawFlight(W,H);
    return;
  }
  var L=E.rt.lot; if(!L) return;
  R.follow(cv,L,S.sim.x,S.sim.y);
  var sims=[]; var rt=E.rt; var c=rt.cur;
  L.items.forEach(function(it){ it.inUse=false; }); if(c&&c.phase==='act'&&c.item) c.item.inUse=true;
  if(!S.atWork&&!S.atGig){
    var pose=c&&c.phase==='act'?c.pose:'stand'; var bub=c&&c.phase==='act'?c.bubble:null; if(c&&c.waiting) bub='⏳';
    var mood=E.mood();
    sims.push({look:S.look,x:S.sim.x,y:S.sim.y,dir:S.sim.dir,pose:pose,walking:!!(c&&c.phase==='walk'&&c.path&&c.path.length),anim:R.t,bubble:bub,name:S.name.split(' ')[0],me:true,mood:mood,ring:mood>=60?'#06D6A0':(mood>=35?'#FFBE0B':'#EF476F'),sleeping:pose==='lie',say:JL.NET&&JL.NET.sayFor('me')});
  }
  rt.npcs.forEach(function(n){ var p=S.people[n.id]; if(!p) return; var R0=S.rel[n.id]; var known=R0&&(R0.f>=5||R0.st!=='stranger');
    sims.push({look:p.look,x:n.x,y:n.y,dir:n.dir,pose:n.path&&n.path.length?'stand':(n.pose||'stand'),walking:!!(n.path&&n.path.length),anim:R.t+n.anim,name:known||UI.hover===n.id?p.name.split(' ')[0]:null,bubble:n.talk?'💬':null,npc:n.id,mood:70}); });
  if(rt.spouseSim){ var sp=S.people[S.spouse]; var ss=rt.spouseSim; sims.push({look:sp.look,x:ss.x,y:ss.y,dir:ss.dir,walking:!!(ss.path&&ss.path.length),anim:R.t+2,name:sp.name.split(' ')[0]+' ❤',npc:S.spouse,mood:80}); }
  if(S.loc==='home'&&S.kids.length){ var crib=L.items.filter(function(i){ return i.id==='crib'; })[0]; S.kids.forEach(function(k,i){ var kx=crib?crib.x+0.1:1+i, ky=crib?crib.y+0.6+i*0.3:L.h-2; sims.push({look:k.look,x:kx,y:ky,dir:1,anim:R.t,pose:crib?'lie':'stand',name:null,npc:null,kid:true,mood:S.babyCare}); }); }
  if(JL.NET) JL.NET.playersHere().forEach(function(p){ sims.push(p); });
  var car=null; if(L.home&&L.parking){ var cc=S.cars.filter(function(x){ return x.city===S.city; })[0]; if(cc) car=D.CARS.filter(function(x){ return x.id===cc.id; })[0].color; }
  var na=nightAlpha();
  R.drawLot(ctx,cv,L,{sims:sims,buy:!!UI.buy,ghost:UI.buy&&UI.buy.ghost,hl:UI.buy&&UI.buy.pick?E.findItem(UI.buy.pick):(UI.menuItem||null),target:UI.target,night:na,lit:L.home?E.hasPower():true,car:car,backdrop:L.home?'#33402F':'#2E3B33'});
  UI.drawnSims=sims;
  if(S.atWork){ ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(0,0,W,H); }
}
function drawFlight(W,H){ var t=E.S.trip; var f=1-t.left/t.total; ctx.fillStyle='rgba(10,30,60,0.55)'; ctx.fillRect(0,0,W,H);
  var x=W*0.12+(W*0.76)*f, y=H*0.45-Math.sin(f*Math.PI)*H*0.12; ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.setLineDash([8,8]); ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(W*0.12,H*0.45); ctx.quadraticCurveTo(W/2,H*0.45-H*0.24,W*0.88,H*0.45); ctx.stroke(); ctx.setLineDash([]);
  ctx.font='42px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('✈️',x,y);
  ctx.fillStyle='#fff'; ctx.font='800 15px Rubik,sans-serif'; ctx.fillText(D.CITIES[t.fromCity].name.toUpperCase(),W*0.12,H*0.45+34); ctx.fillText(D.CITIES[t.toCity].name.toUpperCase(),W*0.88,H*0.45+34); }

// ---------- HUD ----------
var hudCache={};
function setText(id,v){ if(hudCache[id]===v) return; hudCache[id]=v; $(id).textContent=v; }
function setHTML(id,v){ if(hudCache[id]===v) return; hudCache[id]=v; $(id).innerHTML=v; }
var lastPortrait='';
function renderHud(force){
  var S=E.S; if(!S) return; if(force) hudCache={};
  var mb=$('moneyBtn'); setText('moneyBtn',fmt(S.money)); mb.classList.toggle('neg',S.money<0);
  setText('dateLbl',window.innerWidth<560?E.DAYS[E.weekday()].slice(0,3):E.dateLabel()); setText('timeLbl',E.clock());
  document.querySelectorAll('.speeds button').forEach(function(b){ b.setAttribute('aria-pressed',String(+b.dataset.speed===S.speed)); });
  var C=E.city(); var place=S.loc==='travel'?(S.trip.flight?'In the air':'On the road'):(S.loc==='home'?(E.rt.lot?E.rt.lot.name:'Home'):(S.loc==='hotel'?'Hotel room':(D.LOC[S.loc]?D.LOC[S.loc].name:'Somewhere')));
  setHTML('placeLbl','<span class="cc">'+C.flag+'</span> '+esc(place)+' <small>· '+esc(C.name)+'</small>');
  var pw=$('powerLbl'); var hp=E.hasPower(); if(S.loc==='home'&&!C.abroad){ pw.hidden=false; var gen=E.genRunning(); var mob=window.innerWidth<560; setText('powerLbl',S.power?(mob?'💡':'💡 Light'):(gen?(mob?'⛽':'⛽ Gen on'):(mob?'🕯️':'🕯️ No light'))); pw.title=S.power?'Light is on':(gen?'Generator running':'No light (NEPA)'); pw.classList.toggle('off',!S.power&&!gen); } else pw.hidden=true;
  // sim card
  var mood=E.mood(); setText('simName',S.name.split(' ')[0]); setText('simMood',E.moodLabel(mood)+' · '+mood);
  var pk=JSON.stringify(S.look)+(mood>=60?'a':mood>=35?'b':'c'); if(pk!==lastPortrait){ lastPortrait=pk; R.portrait($('portrait'),S.look,mood); }
  var mins=D.NEEDS.map(function(n){ var v=S.needs[n]; return '<i class="'+(v<20?'c':v<45?'l':'')+'" style="height:'+Math.max(3,Math.round(v/100*22))+'px" title="'+D.NEED_NAMES[n]+'"></i>'; }).join('');
  setHTML('minis',mins);
  // queue
  var rt=E.rt; var q=''; if(rt.cur&&!S.atWork&&!S.trip){ var c=rt.cur; var pct=c.phase==='act'&&c.dur?Math.min(100,c.t/c.dur*100):0; q+='<button class="qi cur" data-q="-1"><span class="ic">'+(c.bubble||'🚶')+'</span><span style="flex:1;min-width:0">'+esc(c.q.label)+'<div class="bar"><i style="width:'+pct.toFixed(0)+'%"></i></div></span><span class="x">✕</span></button>'; }
  rt.queue.forEach(function(x,i){ q+='<button class="qi" data-q="'+i+'"><span class="ic">⏳</span><span>'+esc(x.label)+'</span><span class="x">✕</span></button>'; });
  setHTML('queue',q);
  // busy
  var busy=$('busy'); var bl=E.busyLabel();
  if(bl&&!UI.creating){ busy.hidden=false; var pct2=0, em='⏳', sub='';
    if(S.atWork){ pct2=1-S.atWork.left/S.atWork.total; em='💼'; var Cr=D.CAREERS[S.career?S.career.id:'tech']; sub=S.career?Cr.titles[S.career.level-1]+' · '+fmt(E.shiftPay())+' per shift':''; }
    else if(S.atGig){ pct2=0.5; em='⚡'; }
    else if(S.trip){ pct2=1-S.trip.left/S.trip.total; em=S.trip.flight?'✈️':({trek:'🚶',walk:'🚶',keke:'🛺',danfo:'🚌',okada:'🏍️',cab:'🚕',car:'🚗',bus:'🚌',train:'🚆',uber:'🚕'}[S.trip.mode]||'🚌'); sub=Math.ceil(S.trip.left)+' min left'+(S.trip.flight?'':' · '+D.TRANSPORT[S.trip.mode].name); }
    setHTML('busy','<span class="em">'+em+'</span><div style="flex:1;min-width:0"><div class="t">'+esc(bl)+'</div><div class="s">'+esc(sub)+'</div><div class="bar"><i style="width:'+(pct2*100).toFixed(0)+'%"></i></div></div>'+(S.speed<3?'<button data-skip="1">Skip ▶▶▶</button>':''));
  } else busy.hidden=true;
  // work button
  var wb=$('workBtn'); var st=E.shiftStatus();
  if(st&&(st.state==='now'||st.state==='late')&&!S.atWork&&!S.trip&&!UI.creating){ wb.hidden=false; wb.classList.toggle('late',st.state==='late'); var wl=E.workLoc(); setText('workBtn',(S.loc===wl?'Start shift':'Go to work')+' · '+(st.state==='late'?'late!':st.label.replace('Shift starts ',''))); }
  else wb.hidden=true;
  // dock state
  document.querySelectorAll('.dock button').forEach(function(b){ var n=b.dataset.nav; var on=(n==='map'&&UI.mode==='map')||(n==='buy'&&!!UI.buy)||(n===UI.sheet)||(n==='phone'&&UI.sheet==='phone'); b.setAttribute('aria-pressed',String(on)); });
  // chat
  if(JL.NET) JL.NET.hud();
}
$('queue').addEventListener('click',function(e){ var b=e.target.closest('[data-q]'); if(!b) return; E.cancelQ(+b.dataset.q); renderHud(true); });
$('busy').addEventListener('click',function(e){ if(e.target.closest('[data-skip]')){ E.S.speed=3; renderHud(true); } });
document.querySelectorAll('.speeds button').forEach(function(b){ b.addEventListener('click',function(){ E.S.speed=+b.dataset.speed; renderHud(true); }); });
$('moneyBtn').addEventListener('click',function(){ openSheet('phone','bank'); });
$('simcard').addEventListener('click',function(){ toggleSheet('sim'); });
$('workBtn').addEventListener('click',function(){ var S=E.S; var wl=E.workLoc(); if(S.loc===wl||wl==='home'&&S.loc==='home'){ var e=E.startShift(); if(e) toast(e,'warn'); else toast('Shift started. Speeding up time.','info'); }
  else if(wl==='home') openTravel('home'); else openTravel(wl); });
$('chatBtn').addEventListener('click',function(){ var c=$('chat'); c.hidden=!c.hidden; if(!c.hidden&&JL.NET) JL.NET.openChat(); });
$('chatClose').addEventListener('click',function(){ $('chat').hidden=true; });

// ---------- dock / keys ----------
document.querySelector('.dock').addEventListener('click',function(e){ var b=e.target.closest('[data-nav]'); if(!b) return; nav(b.dataset.nav); });
function nav(n){ if(!E.S||UI.creating) return; closeMenu();
  if(n==='map'){ if(UI.buy) exitBuy(); UI.mode=UI.mode==='map'?'lot':'map'; UI.userMap=UI.mode==='map'; if(UI.mode==='map'){ R.fitMap(cv); } else { UI.mapSel=null; if(UI.sheet==='loc') closeSheet(); } renderHud(true); return; }
  if(n==='buy'){ if(UI.buy){ exitBuy(); return; } if(E.S.loc!=='home'){ toast('Buy mode works in your own home. Go home first.','warn'); openTravel('home'); return; } enterBuy(); return; }
  if(n==='home'){ if(E.S.loc==='home'){ UI.mode='lot'; closeSheet(); renderHud(true); return; } openTravel('home'); return; }
  if(UI.buy) exitBuy();
  toggleSheet(n); }
document.addEventListener('keydown',function(e){
  if(e.target.closest&&e.target.closest('input,select,textarea')) return; if(!E.S||UI.creating) return;
  var k=e.key.toLowerCase();
  if(UI.buy){ if(k==='r'){ rotateGhost(); e.preventDefault(); return; } if(k==='enter'){ placeGhost(); e.preventDefault(); return; } if(k==='delete'||k==='backspace'){ if(UI.buy.pick){ var r=E.sellItem(UI.buy.pick); if(r) toast(r,'warn'); UI.buy.pick=null; renderBuy(); } return; } if(k==='c'){ $('buybar').querySelector('.catalog')&&$('buybar').querySelector('.catalog').scrollIntoView(); return; } if(k==='escape'||k==='b'){ exitBuy(); return; } }
  if(UI.modalOpen) return;
  if(k==='escape'){ closeMenu(); closeSheet(); if(UI.mode==='map'){ UI.mode='lot'; } return; }
  if(k===' '){ E.S.speed=E.S.speed?0:1; renderHud(true); e.preventDefault(); return; }
  if(k==='1'||k==='2'||k==='3'||k==='0'){ E.S.speed=+k; renderHud(true); return; }
  var map={m:'map',h:'home',p:'phone',s:'sim',t:'do',b:'buy'}; if(map[k]) nav(map[k]);
});

// ---------- sheets ----------
var sheet=$('sheet'), card=$('sheetCard');
function openSheet(name,arg){ UI.sheet=name; UI.sheetArg=arg; sheet.hidden=false; renderSheet(); refit(); }
function toggleSheet(name){ if(UI.sheet===name&&!UI.sheetArg){ closeSheet(); return; } openSheet(name); }
function closeSheet(){ UI.sheet=null; UI.sheetArg=null; sheet.hidden=true; if(UI.mode==='map') UI.mapSel=null; refit(); renderHud(true); }
UI.openSheet=openSheet; UI.closeSheet=closeSheet;
sheet.addEventListener('click',function(e){ if(e.target===sheet) closeSheet(); });
function head(title,sub,back){ return '<div class="sh-head">'+(back?'<button class="back" data-back="'+back+'" aria-label="Back">‹</button>':'')+'<div style="min-width:0"><h2>'+title+'</h2>'+(sub?'<div class="sub">'+sub+'</div>':'')+'</div><button class="x" data-close aria-label="Close">✕</button></div>'; }
function renderSheet(){ var n=UI.sheet; if(!n) return; var html='';
  if(n==='sim') html=simSheet(); else if(n==='do') html=doSheet(); else if(n==='phone') html=phoneSheet(UI.sheetArg); else if(n==='loc') html=locSheet(UI.sheetArg); else if(n==='travel') html=locSheet(UI.sheetArg,true);
  card.innerHTML=html; drawSheetCanvases(); }
UI.renderSheet=renderSheet;
card.addEventListener('click',function(e){
  var t=e.target.closest('button'); if(!t||t.disabled) return;
  if(t.hasAttribute('data-close')){ closeSheet(); return; }
  if(t.dataset.back!==undefined){ if(t.dataset.back==='phone'){ UI.sheetArg=null; } renderSheet(); return; }
  if(t.dataset.app){ UI.sheetArg=t.dataset.app; renderSheet(); card.scrollTop=0; return; }
  var a=t.dataset.a; if(!a) return; act(a,t.dataset,t);
});
function act(a,ds,btn){
  var S=E.S, r=null;
  switch(a){
    case 'travel': r=E.travel(ds.to,ds.mode); if(!r){ closeSheet(); UI.mode='lot'; UI.userMap=false; UI.mapSel=null; } break;
    case 'venue': if(!E.queueVenue(ds.id)) r='Your queue is full'; else if(window.innerWidth<900) closeSheet(); else renderSheet(); return r&&toast(r,'warn');
    case 'obj': E.queueObj(ds.uid,ds.act); if(window.innerWidth<900) closeSheet(); return;
    case 'apply': r=E.applyJob(ds.id); renderSheet(); break;
    case 'quit': E.quitJob(); renderSheet(); break;
    case 'enrol': r=E.enrol(); renderSheet(); break;
    case 'gig': r=E.doGig(ds.id); if(!r) closeSheet(); break;
    case 'loan': r=E.takeLoan(ds.id); renderSheet(); break;
    case 'repay': r=E.repayLoan(+ds.i); renderSheet(); break;
    case 'remit': r=E.remit(+ds.n); renderSheet(); break;
    case 'papa': r=E.callPapa(); renderSheet(); break;
    case 'move': r=E.moveHouse(ds.id); renderSheet(); break;
    case 'leave': confirmModal('Give up your place in '+D.CITIES[ds.city].name+'?','Your furniture goes to your household inventory. Rent stops.',function(){ E.leaveHome(ds.city); renderSheet(); }); return;
    case 'hotel': r=E.bookHotel(); if(!r){ closeSheet(); r=E.travel('hotel','walk')||E.travel('hotel',E.city().transport[1]); if(r==='You are already here') r=null; } break;
    case 'buyland': r=E.buyLand(ds.id); renderSheet(); break;
    case 'sellland': E.sellLand(+ds.i); renderSheet(); break;
    case 'buybiz': r=E.buyBiz(ds.id); renderSheet(); break;
    case 'sellbiz': confirmModal('Sell this business?','You get back 70% of what it cost.',function(){ E.sellBiz(+ds.i); renderSheet(); }); return;
    case 'buycar': r=E.buyCar(ds.id); renderSheet(); break;
    case 'sellcar': confirmModal('Sell your car?','You get back 70% of the price.',function(){ E.sellCar(+ds.i); renderSheet(); }); return;
    case 'visa': r=E.applyVisa(ds.cc,ds.t); renderSheet(); break;
    case 'fly': r=E.fly(ds.city); if(!r) closeSheet(); break;
    case 'order': r=E.order(ds.id); renderSheet(); break;
    case 'call': E.callPerson(ds.id); renderSheet(); break;
    case 'gem': var ok=E.answerGem(+ds.i); if(ok===true) toast('Correct! 💎','good'); renderSheet(); break;
    case 'freewill': S.freeWill=!S.freeWill; renderSheet(); break;
    case 'labels': UI.labels=!UI.labels; renderSheet(); break;
    case 'theme': var th=document.documentElement.getAttribute('data-theme'); document.documentElement.setAttribute('data-theme',th==='dark'?'light':(th==='light'?'':'dark')); if(!document.documentElement.getAttribute('data-theme')) document.documentElement.removeAttribute('data-theme'); renderSheet(); break;
    case 'newgame': confirmModal('Start a new life?','Your current Sim and progress will be replaced.',function(){ closeSheet(); try{ localStorage.removeItem(SAVE_KEY); }catch(e){} startCreation(); }); return;
    case 'openloc': openTravel(ds.id); return;
    case 'phoneapp': openSheet('phone',ds.app); return;
    case 'dosheet': openSheet('do'); return;
    case 'flights': openSheet('phone','flights'); return;
    case 'gift': if(JL.NET) JL.NET.giftModal(ds.peer); return;
    case 'visit': if(JL.NET){ r=JL.NET.visit(ds.peer); if(!r) closeSheet(); } break;
    case 'emote': if(JL.NET) JL.NET.emote(ds.e); closeMenu(); return;
  }
  if(r) toast(r,'warn'); renderHud(true);
}
UI.act=act;

// ---------- Sim sheet ----------
function bar(v,cls){ return '<div class="bar"><i class="'+(cls||(v<20?'c':v<45?'l':''))+'" style="width:'+Math.max(0,Math.min(100,v)).toFixed(0)+'%"></i></div>'; }
function simSheet(){
  var S=E.S, mood=E.mood(); var L=D.LOTTERY[S.lottery];
  var h=head(esc(S.name),L.name+' · Day '+(S.day+1)+' · '+esc(E.city().name));
  h+='<div style="display:flex;gap:14px;align-items:center"><canvas class="pc" data-look="me" width="160" height="160" style="width:80px;height:80px;border-radius:50%"></canvas><div style="flex:1;min-width:0"><div style="font-family:var(--f-display);font-size:20px">'+E.moodLabel(mood)+' <span class="num">'+mood+'</span></div>'+bar(mood)+'<div class="chips" style="margin-top:8px">'+S.traits.map(function(t){ return '<span class="chip">'+esc(D.TRAITS[t].name)+'</span>'; }).join('')+'</div></div></div>';
  h+='<div class="lbl">Needs</div><div class="list" style="gap:7px">'+D.NEEDS.map(function(n){ var v=S.needs[n]; return '<div class="need"><span>'+D.NEED_NAMES[n]+'</span>'+bar(v)+'<span>'+Math.round(v)+'</span></div>'; }).join('')+'</div>';
  if(S.moodlets.length||S.sick){ h+='<div class="lbl">How they feel</div><div class="chips">'+(S.sick?'<span class="chip neg">Sick (see a doctor)</span>':'')+S.moodlets.map(function(m){ return '<span class="chip '+(m.v>=0?'pos':'neg')+'">'+esc(m.label)+' '+(m.v>0?'+':'')+m.v+'</span>'; }).join('')+'</div>'; }
  h+='<div class="lbl">Skills</div><div class="list" style="gap:7px">'+Object.keys(D.SKILLS).map(function(k){ var v=S.skills[k]; return '<div class="need"><span>'+D.SKILLS[k].name+'</span>'+bar(v*10,'y')+'<span>'+v.toFixed(1)+'</span></div>'; }).join('')+'</div>';
  h+='<div class="lbl">Life</div><div class="card"><dl class="kv">';
  h+='<dt>Lifetime dream</dt><dd>'+esc(D.DREAMS[S.dream].name)+(S.dreamDone?' ✓':'')+'</dd>';
  if(S.career){ var C=D.CAREERS[S.career.id]; h+='<dt>Job</dt><dd>'+esc(C.titles[S.career.level-1])+'</dd><dt>Performance</dt><dd>'+Math.round(S.career.perf)+'%</dd>'; } else h+='<dt>Job</dt><dd>Unemployed</dd>';
  h+='<dt>Net worth</dt><dd>'+fmt(E.netWorth())+'</dd><dt>Food at home</dt><dd>'+S.food+' portions</dd>';
  if(S.spouse) h+='<dt>Spouse</dt><dd>'+esc(S.people[S.spouse].name)+'</dd>';
  if(S.kids.length) h+='<dt>Children</dt><dd>'+S.kids.map(function(k){ return esc(k.name.split(' ')[0]); }).join(', ')+'</dd><dt>Baby care</dt><dd>'+Math.round(S.babyCare)+'%</dd>';
  if(S.pregnant) h+='<dt>Baby due</dt><dd>Day '+(S.pregnant.due+1)+'</dd>';
  h+='<dt>Earned so far</dt><dd>'+fmt(S.stats.earned)+'</dd><dt>Sent home</dt><dd>'+fmt(S.stats.remitted)+'</dd></dl></div>';
  var bd=Object.keys(S.badges).filter(function(b){ return b.indexOf('born_')!==0&&E.BADGES[b]; });
  h+='<div class="lbl">Achievements ('+bd.length+')</div><div class="chips">'+(bd.length?bd.map(function(b){ return '<span class="chip on">'+esc(E.BADGES[b])+'</span>'; }).join(''):'<span class="muted">None yet. Get a job, buy a car, japa…</span>')+'</div>';
  h+='<div class="lbl">Free will</div><button class="row" data-a="freewill"><div class="main"><b>'+(S.freeWill?'On':'Off')+'</b><small>When on, your Sim eats, sleeps and uses the toilet by themselves at home.</small></div><div class="r">Toggle</div></button>';
  return h;
}

// ---------- Do sheet ----------
function doSheet(){
  var S=E.S;
  if(S.loc==='travel') return head('On the move','You will arrive soon');
  if(S.loc==='home'||S.loc==='hotel'){ var L=E.rt.lot; var h=head('Things to do',esc(L.name)+' · Tap furniture in the room too');
    var seen={}; var rows='';
    L.items.forEach(function(it){ var d=E.itemDef(it); (d.acts||[]).forEach(function(a){ var key=a+(d.name||''); if(seen[key]) return; seen[key]=1; var why=E.objMenu(it).filter(function(m){ return m.act===a; })[0].why;
      rows+='<button class="row" data-a="obj" data-uid="'+it.uid+'" data-act="'+a+'"'+(why?' disabled':'')+'><div class="main"><b>'+esc(D.ACTS[a].label)+'</b><small>'+esc(why||d.name)+'</small></div><div class="r">'+(D.ACTS[a].bubble||'')+'</div></button>'; }); });
    h+='<div class="list">'+(rows||'<p class="muted">Nothing here yet. Open Buy mode to get furniture.</p>')+'</div>';
    h+='<div class="lbl">Order in</div><div class="btns"><button class="btn y" data-a="phoneapp" data-app="chop">ChopNow food delivery</button><button class="btn ghost" data-a="phoneapp" data-app="people">Call someone</button></div>';
    return h; }
  var l=D.LOC[S.loc]; var h2=head(esc(l.name),esc(l.area)+' · '+(E.isOpen(S.loc)?'Open now':'Closed now')+' · '+E.openHours(S.loc));
  h2+='<p class="muted">'+esc(l.desc)+'</p><div class="list">';
  E.venueActs().forEach(function(v){ var a=v.a; h2+='<button class="row" data-a="venue" data-id="'+a.id+'"'+(v.why?' disabled':'')+'><span class="ic">'+(a.bubble||'•')+'</span><div class="main"><b>'+esc(a.label)+'</b><small>'+esc(v.why||(a.dur>=60?Math.round(a.dur/60*10)/10+' h':a.dur+' min'))+'</small></div><div class="r">'+(v.cost?fmt(v.cost):'Free')+'</div></button>'; });
  h2+='</div>';
  var here=E.rt.npcs; if(here.length){ h2+='<div class="lbl">People here</div><div class="chips">'+here.map(function(n){ var p=S.people[n.id]; return '<span class="chip">'+esc(p.name)+' · '+esc(E.relStatus(n.id))+'</span>'; }).join('')+'</div><p class="muted" style="margin-top:8px">Tap someone in the world to talk to them.</p>'; }
  if(l.type==='airport') h2+='<div class="lbl">Flights</div><button class="btn y" data-a="flights">See flights</button>';
  return h2;
}

// ---------- location / travel sheet ----------
function openTravel(id){ if(E.S.loc==='travel'){ toast('You are already on the move.','warn'); return; } UI.mode='map'; UI.userMap=true; UI.mapSel=id==='home'?E.homeAreaLoc():id; R.fitMap(cv); openSheet('loc',id); }
UI.openTravel=openTravel;
function locSheet(id){
  var S=E.S; var isHome=id==='home'; var hasHome=!!S.homes[S.city];
  if(isHome&&!hasHome){ var h0=head('No home in '+esc(E.city().name),'Rent a place or book a hotel');
    h0+='<div class="list"><button class="row" data-a="phoneapp" data-app="homes"><span class="ic">🏠</span><div class="main"><b>Find a place to rent</b><small>Phone › Homes</small></div></button>';
    h0+='<button class="row" data-a="hotel"'+(S.money<E.hotelPrice()?' disabled':'')+'><span class="ic">🏨</span><div class="main"><b>Book a hotel night</b><small>Charged each night until you rent</small></div><div class="r">'+fmt(E.hotelPrice())+'</div></button></div>';
    if(S.hotelBooked&&S.hotelCity===S.city) h0+=travelRows('hotel');
    return h0; }
  var l=isHome?null:D.LOC[id];
  var title=isHome?'Home':esc(l.name); var sub=isHome?esc(E.homeTier(S.homes[S.city].tier,S.city).name)+' · '+esc(D.LOC[E.homeAreaLoc()].area):esc(l.area)+' · '+(E.isOpen(id)?'<span style="color:var(--green)">Open</span>':'<span style="color:var(--red)">Closed</span>')+' · '+E.openHours(id);
  var h=head(title,sub);
  if(l){ h+='<p>'+esc(l.desc)+'</p>'; var acts=D.VENUE_ACTS[l.type]||[]; if(acts.length) h+='<div class="chips" style="margin-bottom:10px">'+acts.map(function(a){ return '<span class="chip">'+esc(a.label.replace(/ \(.*\)/,''))+'</span>'; }).join('')+'</div>';
    var jobsHere=Object.keys(D.CAREERS).filter(function(k){ return D.CAREERS[k].loc===id||(D.CITY_WORK[S.city]===id); }); if(jobsHere.length) h+='<p class="muted">Careers here: '+jobsHere.map(function(k){ return D.CAREERS[k].name; }).slice(0,6).join(', ')+(jobsHere.length>6?'…':'')+'</p>';
    if(E.homeAreaLoc()===id&&hasHome) h+='<button class="row" data-a="openloc" data-id="home" style="margin-bottom:8px"><span class="ic">🏠</span><div class="main"><b>Your home is here</b><small>Go home instead</small></div></button>'; }
  if(S.loc===id||(isHome&&S.loc==='home')){ h+='<div class="card"><b>You are here.</b></div>'; if(!isHome) h+='<div class="btns" style="margin-top:10px"><button class="btn y" data-a="dosheet">Things to do</button></div>'; return h; }
  h+=travelRows(id);
  return h;
}
function travelRows(id){ var opts=E.travelOptions(id); var rush=opts[0]&&opts[0].rush;
  var h='<div class="lbl">How to get there · '+(opts[0]?opts[0].km.toFixed(1):'?')+' km'+(rush?' · rush hour 🚦':'')+'</div><div class="list">';
  var ic={trek:'🚶',walk:'🚶',keke:'🛺',danfo:'🚌',okada:'🏍️',cab:'🚕',car:'🚗',bus:'🚌',train:'🚆',uber:'🚕'};
  opts.forEach(function(o){ h+='<button class="row" data-a="travel" data-to="'+id+'" data-mode="'+o.mode+'"'+(o.why?' disabled':'')+'><span class="ic">'+ic[o.mode]+'</span><div class="main"><b>'+esc(o.name)+'</b><small>'+esc(o.why||o.desc)+'</small></div><div class="r">'+(o.cost?fmt(o.cost):'Free')+'<small>'+o.mins+' min</small></div></button>'; });
  return h+'</div>'; }

// ---------- phone ----------
var APPS=[
  ['jobs','Jobs','💼','#3A86FF'],['hustle','Hustle','⚡','#FB5607'],['bank','Bank','🏦','#1D3557'],['homes','Homes','🏠','#2A9D8F'],
  ['biz','Biz','📈','#06D6A0'],['cars','Cars','🚗','#E63946'],['japa','Japa','✈️','#8338EC'],['chop','ChopNow','🍔','#F77F00'],
  ['people','People','👥','#FF006E'],['chat','Chat','💬','#008751'],['news','News','📰','#6C757D'],['gem','Daily Gem','💎','#4CC9F0'],
  ['ranks','Ranks','🏆','#F5B700'],['family','Family','👨🏾‍👩🏾‍👧🏾','#9C6644'],['flights','Flights','🛫','#3A0CA3'],['settings','Settings','⚙️','#495057']];
function phoneSheet(app){
  var S=E.S;
  if(!app){ var h='<div class="phone-top"><span class="num">'+E.clock()+'</span><span>'+esc(E.city().name)+' · '+(S.loc==='home'?'Home':'Out')+'</span><span>📶 🔋</span></div>'+head('Phone','');
    h+='<div class="phone-home">'+APPS.map(function(a){ var lab=a[0]==='family'&&S.lottery==='nepo'?'Papa':a[1]; var badge=(a[0]==='gem'&&S.gemDay!==S.day)?'<span class="badge">1</span>':''; return '<button class="app" data-app="'+a[0]+'"><i style="background:'+a[3]+'">'+a[2]+'</i>'+badge+esc(lab)+'</button>'; }).join('')+'</div>';
    return h; }
  var f=PHONE[app]; return f?f():'';
}
var PHONE={};
PHONE.jobs=function(){ var S=E.S; var h=head('Jobs','Pay is per shift in '+esc(E.city().name),'phone');
  if(E.city().abroad){ var wr=E.workRights(); h+='<div class="card" style="margin-bottom:10px">Work rights here: <b>'+({full:'Full',student:'Student (levels 1–2 only)',none:'None – cash-in-hand at 60% pay, raid risk'}[wr])+'</b></div>'; }
  if(S.career){ var C=D.CAREERS[S.career.id]; var st=E.shiftStatus(); var wl=E.workLoc();
    h+='<div class="card"><div style="font-family:var(--f-display);font-size:20px">'+esc(C.titles[S.career.level-1])+'</div><div class="muted" style="margin-bottom:8px">'+esc(C.name)+' · Level '+S.career.level+' of 5 · '+(wl==='home'?'Works from home':esc(wl?D.LOC[wl].name:'No workplace in this city'))+'</div>';
    h+='<dl class="kv"><dt>Pay per shift</dt><dd>'+fmt(E.shiftPay())+'</dd><dt>Schedule</dt><dd>'+C.days.map(function(d){ return E.DAYS[d].slice(0,3); }).join(' ')+' · '+(C.start%12||12)+(C.start<12?'am':'pm')+' for '+C.len+'h</dd><dt>Next</dt><dd>'+esc(st.state==='off'?st.next:(st.label||st.state))+'</dd><dt>Key skill</dt><dd>'+D.SKILLS[C.skill].name+' '+E.S.skills[C.skill].toFixed(1)+(S.career.level<5?' / need '+D.LEVEL_SKILL[S.career.level]+' for promotion':'')+'</dd></dl>';
    h+='<div style="margin:10px 0 4px;font-size:12px;font-weight:700" class="muted">Performance '+Math.round(S.career.perf)+'%</div>'+bar(S.career.perf,'y');
    if(S.career.level<5) h+='<div style="margin:8px 0 2px;font-size:12px;font-weight:700" class="muted">Next: '+esc(C.titles[S.career.level])+' · '+fmt(Math.round(C.pay[S.career.level]*E.kPay()))+'/shift</div>';
    h+='<div class="btns" style="margin-top:10px">'+(wl&&wl!=='home'&&S.loc!==wl?'<button class="btn y" data-a="openloc" data-id="'+wl+'">Go to work</button>':'')+'<button class="btn ghost" data-a="quit">Quit job</button></div></div>'; }
  if(!S.student) h+='<div class="lbl">School</div><button class="row" data-a="enrol"><span class="ic">🎓</span><div class="main"><b>Enrol as a student</b><small>Free lectures at the campus (big skill boosts)'+(E.city().abroad?' · needs a student visa':'')+'</small></div><div class="r">'+(E.city().abroad?'':fmt(E.price(45000)))+'</div></button>';
  h+='<div class="lbl">Careers</div><div class="list">';
  E.jobList().forEach(function(j){ var C=j.C; var wl=C.loc==='home'?'From home':(E.S.city==='lagos'?D.LOC[C.loc].name:(D.CITY_WORK[E.S.city]?D.LOC[D.CITY_WORK[E.S.city]].name:'—')); var cur=S.career&&S.career.id===j.id;
    h+='<button class="row" data-a="apply" data-id="'+j.id+'"'+(cur?' disabled':'')+'><div class="main"><b>'+esc(C.name)+'</b><small>'+esc(C.titles[0])+' · '+esc(wl)+' · '+C.days.map(function(d){ return E.DAYS[d][0]; }).join('')+' '+(C.start%12||12)+(C.start<12?'am':'pm')+' · '+D.SKILLS[C.skill].name+'</small></div><div class="r">'+fmt(j.pay)+'<small>up to '+fmt(Math.round(C.pay[4]*E.kPay()))+'</small></div></button>'; });
  return h+'</div>'; };
PHONE.hustle=function(){ var h=head('Hustle','Quick side gigs. Paid when done.','phone')+'<div class="list">';
  D.GIGS.forEach(function(g){ var est=Math.round((g.base+g.per*E.S.skills[g.skill])*E.kPay()); var why=g.weekend&&[0,6].indexOf(E.weekday())<0?'Weekends only':(E.S.needs.energy<15?'Too tired':null);
    h+='<button class="row" data-a="gig" data-id="'+g.id+'"'+(why?' disabled':'')+'><div class="main"><b>'+esc(g.name)+'</b><small>'+esc(why||g.hours+' hours · uses '+D.SKILLS[g.skill].name)+'</small></div><div class="r">≈ '+fmt(est)+'</div></button>'; });
  return h+'</div>'; };
PHONE.bank=function(){ var S=E.S; var h=head('Eko Trust Bank','Balance and loans','phone');
  h+='<div class="card"><div class="muted" style="font-weight:700;font-size:12px">BALANCE</div><div style="font-family:var(--f-display);font-size:32px" class="num">'+fmt(S.money)+'</div><dl class="kv" style="margin-top:6px"><dt>Net worth</dt><dd>'+fmt(E.netWorth())+'</dd><dt>Naira rate</dt><dd>₦'+S.rate.toLocaleString('en-US')+' / $1</dd></dl>'+spark(S.rateHist)+'</div>';
  if(S.loans.length){ h+='<div class="lbl">Your loans</div><div class="list">'+S.loans.map(function(l,i){ return '<button class="row" data-a="repay" data-i="'+i+'"'+(S.money<=0?' disabled':'')+'><div class="main"><b>'+esc(l.name)+'</b><small>'+(l.due?(E.S.day>l.due?'OVERDUE':'Due day '+(l.due+1)):'Weekly '+fmt(l.weekly))+'</small></div><div class="r">'+fmt(l.left)+'<small>Repay</small></div></button>'; }).join('')+'</div>'; }
  h+='<div class="lbl">Borrow</div><div class="list">'+E.loanOffers().map(function(o){ return '<button class="row" data-a="loan" data-id="'+o.id+'"'+(o.why||o.amount<=0?' disabled':'')+'><div class="main"><b>'+esc(o.name)+'</b><small>'+esc(o.why||((o.rate*100)+'% interest'))+'</small></div><div class="r">'+fmt(o.amount)+'</div></button>'; }).join('')+'</div>';
  h+='<div class="lbl">Send money home to Mum</div><p class="muted">'+(E.city().abroad?'3% transfer fee. ':'')+'Every naira sent counts toward building Mum a house.</p><div class="btns">';
  [5000,20000,100000,500000].forEach(function(n){ var v=E.city().abroad?n*4:n; h+='<button class="btn '+(S.money>=v?'g':'ghost')+'" data-a="remit" data-n="'+v+'"'+(S.money<v?' disabled':'')+'>'+fmt(v)+'</button>'; });
  h+='</div><p class="muted" style="margin-top:8px">Sent so far: <b>'+fmt(S.stats.remitted)+'</b> of ₦5,000,000</p>'+bar(S.stats.remitted/50000,'y');
  return h; };
function spark(a){ if(!a||a.length<2) return ''; var mn=Math.min.apply(null,a), mx=Math.max.apply(null,a); var w=300,h=40; var pts=a.map(function(v,i){ return (i/(a.length-1)*w).toFixed(1)+','+(h-4-(mx===mn?0.5:(v-mn)/(mx-mn))*(h-8)).toFixed(1); }).join(' ');
  return '<svg viewBox="0 0 '+w+' '+h+'" style="width:100%;height:40px;margin-top:6px" role="img" aria-label="Naira rate over the last '+a.length+' days"><polyline points="'+pts+'" fill="none" stroke="var(--green)" stroke-width="2"/><text x="'+w+'" y="10" text-anchor="end" font-size="9" fill="var(--muted)">₦'+mx+'</text><text x="'+w+'" y="'+(h-1)+'" text-anchor="end" font-size="9" fill="var(--muted)">₦'+mn+'</text></svg>'; }
PHONE.homes=function(){ var S=E.S; var h=head('Homes','Rent is paid every Saturday','phone');
  h+='<div class="lbl">Your homes</div><div class="list">';
  var any=false; Object.keys(S.homes).forEach(function(c){ any=true; var t=E.homeTier(S.homes[c].tier,c); var rent=E.homeRent(S.homes[c],c);
    h+='<div class="row"><span class="ic">🏠</span><div class="main"><b>'+esc(t.name)+'</b><small>'+esc(D.CITIES[c].name)+' · '+(c==='lagos'&&S.papaPays?'Daddy pays the rent':fmt(rent)+'/week')+'</small></div>'+(Object.keys(S.homes).length>1||c!==S.city?'<button class="btn ghost" data-a="leave" data-city="'+c+'">Give up</button>':'')+'</div>'; });
  if(!any) h+='<p class="muted">You have no home right now.</p>';
  h+='</div>';
  h+='<div class="lbl">To let in '+esc(E.city().name)+' · pay 3 weeks upfront (agent, caution, rent)</div><div class="list">';
  E.homeListings().forEach(function(o){ h+='<button class="row" data-a="move" data-id="'+o.t.id+'"'+(o.why?' disabled':'')+'><div class="main"><b>'+esc(o.t.name)+(o.t.area?' · '+esc(D.LOC[o.t.area].name):'')+'</b><small>'+esc(o.why||o.t.note)+'</small></div><div class="r">'+fmt(o.rent)+'/wk<small>'+fmt(o.upfront)+' now</small></div></button>'; });
  h+='</div>';
  if(!S.homes[S.city]) h+='<div class="lbl">Short stay</div><button class="row" data-a="hotel"'+(S.money<E.hotelPrice()?' disabled':'')+'><span class="ic">🏨</span><div class="main"><b>Book a hotel night</b><small>Charged nightly until you rent</small></div><div class="r">'+fmt(E.hotelPrice())+'</div></button>';
  if(!E.city().abroad&&S.city==='lagos'){ h+='<div class="lbl">Land (buy at the estate on the map, or here)</div><div class="list">';
    D.LAND.forEach(function(l){ var v=E.landValue(l.id); h+='<button class="row" data-a="buyland" data-id="'+l.id+'"'+(S.money<v?' disabled':'')+'><span class="ic">📜</span><div class="main"><b>'+esc(l.name)+'</b><small>Grows about '+(l.growth*100*7).toFixed(1)+'% a week</small></div><div class="r">'+fmt(v)+'</div></button>'; }); h+='</div>'; }
  if(S.land.length){ h+='<div class="lbl">Your land</div><div class="list">'+S.land.map(function(l,i){ var d=D.LAND.filter(function(x){ return x.id===l.id; })[0]; var g=(l.value/l.paid-1)*100; return '<button class="row" data-a="sellland" data-i="'+i+'"><div class="main"><b>'+esc(d.name)+'</b><small>Paid '+fmt(l.paid)+' · '+(g>=0?'+':'')+g.toFixed(1)+'%</small></div><div class="r">'+fmt(l.value)+'<small>Sell (95%)</small></div></button>'; }).join('')+'</div>'; }
  return h; };
PHONE.biz=function(){ var S=E.S; var h=head('Money ladder','Businesses pay out every morning','phone')+'<div class="list">';
  D.BUSINESSES.forEach(function(b,i){ h+='<button class="row" data-a="buybiz" data-id="'+b.id+'"'+(S.money<b.cost?' disabled':'')+'><span class="ic">'+(i+1)+'</span><div class="main"><b>'+esc(b.name)+'</b><small>'+fmt(b.min)+'–'+fmt(b.max)+' a day</small></div><div class="r">'+fmt(b.cost)+'</div></button>'; });
  h+='</div>'; if(S.biz.length){ h+='<div class="lbl">You own</div><div class="list">'+S.biz.map(function(x,i){ var b=D.BUSINESSES.filter(function(y){ return y.id===x.id; })[0]; return '<button class="row" data-a="sellbiz" data-i="'+i+'"><div class="main"><b>'+esc(b.name)+'</b><small>Earned '+fmt(x.earned)+' since day '+(x.day+1)+'</small></div><div class="r">Sell</div></button>'; }).join('')+'</div>'; }
  return h; };
PHONE.cars=function(){ var S=E.S; var h=head('Cars','Drive from the map. Fuel is per km.','phone')+'<div class="list">';
  D.CARS.forEach(function(c){ var p=E.price(c.price); h+='<button class="row" data-a="buycar" data-id="'+c.id+'"'+(S.money<p?' disabled':'')+'><span class="ic" style="background:'+c.color+'"></span><div class="main"><b>'+esc(c.name)+'</b><small>'+fmt(E.price(c.kmCost))+' fuel per km</small></div><div class="r">'+fmt(p)+'</div></button>'; });
  h+='</div>'; if(S.cars.length){ h+='<div class="lbl">Your cars</div><div class="list">'+S.cars.map(function(x,i){ var c=D.CARS.filter(function(y){ return y.id===x.id; })[0]; return '<button class="row" data-a="sellcar" data-i="'+i+'"><span class="ic" style="background:'+c.color+'"></span><div class="main"><b>'+esc(c.name)+'</b><small>Parked in '+esc(D.CITIES[x.city].name)+'</small></div><div class="r">Sell</div></button>'; }).join('')+'</div>'; }
  return h; };
PHONE.japa=function(){ var S=E.S; var h=head('Japa','Visas for life abroad. Fly from the airport.','phone');
  Object.keys(D.COUNTRIES).forEach(function(cc){ var C=D.COUNTRIES[cc]; var v=S.visas[cc]; var city=D.CITIES[C.city];
    h+='<div class="card" style="margin-bottom:10px"><div style="display:flex;align-items:center;gap:8px"><span class="cc">'+city.flag+'</span><b style="font-size:16px">'+esc(C.name)+'</b><span class="muted" style="margin-left:auto;font-size:12px">'+esc(city.name)+'</span></div>';
    h+='<div style="margin:6px 0 8px;font-size:13px">Status: <b>'+(v&&v.type?D.VISA_NAMES[v.type]:'No visa')+'</b>'+(v&&v.pending?' · <span class="muted">'+D.VISA_NAMES[v.pending.type]+' decision on day '+(v.pending.ready+1)+'</span>':'')+(v&&v.type==='work'&&v.arrived?' · residency in '+Math.max(0,21-(S.day-v.arrived))+' days':'')+'</div>';
    if(!(v&&(v.type==='citizen'||v.type==='resident'))){ h+='<div class="list">'+E.visaOptions(cc).map(function(o){ return '<button class="row" data-a="visa" data-cc="'+cc+'" data-t="'+o.type+'"'+(o.why?' disabled':'')+'><div class="main"><b>'+o.name+'</b><small>'+esc(o.why||('Show '+fmt(o.funds)+' in your account for best odds · '+Math.round(o.chance*100)+'% chance'))+'</small></div><div class="r">'+fmt(o.fee+o.tuition)+(o.tuition?'<small>incl. tuition</small>':'')+'</div></button>'; }).join('')+'</div>'; }
    h+='</div>'; });
  return h; };
PHONE.flights=function(){ var S=E.S; var atAirport=D.LOC[S.loc]&&D.LOC[S.loc].type==='airport'; var h=head('Flights',atAirport?'From '+esc(D.LOC[S.loc].name):'Go to '+esc(D.LOC[D.CITY_AIRPORT[S.city]].name)+' to fly','phone');
  if(!atAirport) h+='<button class="btn y" data-a="openloc" data-id="'+D.CITY_AIRPORT[S.city]+'" style="margin-bottom:10px">Go to the airport</button>';
  h+='<div class="list">'+E.flightOptions().map(function(o){ var why=o.why||(atAirport?null:'Go to the airport'); return '<button class="row" data-a="fly" data-city="'+o.city+'"'+(why?' disabled':'')+'><span class="ic">✈️</span><div class="main"><b>'+esc(o.name)+'</b><small>'+esc(why||o.country+' · '+o.hours+'h')+'</small></div><div class="r">'+fmt(o.price)+'</div></button>'; }).join('')+'</div>';
  return h; };
PHONE.chop=function(){ var h=head(E.city().abroad?'FoodDash':'ChopNow','Delivered to your home in 30–50 minutes','phone')+'<div class="list">';
  Object.keys(E.ORDERS).forEach(function(k){ var o=E.ORDERS[k]; var c=E.price(o.cost); var why=(E.S.loc!=='home'&&E.S.loc!=='hotel')?'Only delivers to your home':(E.S.money<c?'Need '+fmt(c):null);
    h+='<button class="row" data-a="order" data-id="'+k+'"'+(why?' disabled':'')+'><span class="ic">🛵</span><div class="main"><b>'+esc(o.name)+'</b><small>'+esc(why||(o.food?'+'+o.food+' food portions':'+'+o.hunger+' hunger'))+'</small></div><div class="r">'+fmt(c)+'</div></button>'; });
  return h+'</div>'; };
PHONE.people=function(){ var S=E.S; var h=head('People','Friends, family and love','phone');
  var ids=Object.keys(S.rel).filter(function(id){ return S.people[id]&&(S.rel[id].st!=='stranger'||S.rel[id].f>=5); });
  ids.sort(function(a,b){ var o={spouse:0,fiance:1,partner:2,family:3}; return ((o[S.rel[a].st]!=null?o[S.rel[a].st]:9)-(o[S.rel[b].st]!=null?o[S.rel[b].st]:9))||(S.rel[b].f-S.rel[a].f); });
  if(!ids.length) return h+'<p class="muted">Meet people at bukas, markets, clubs and church. Tap someone in the world to talk.</p>';
  h+='<div class="list">'+ids.map(function(id){ var p=S.people[id], R0=S.rel[id]; var role=p.role?p.role:E.relStatus(id);
    return '<div class="row"><canvas class="pc" data-npc="'+id+'" width="80" height="80" style="width:40px;height:40px;border-radius:50%"></canvas><div class="main"><b>'+esc(p.name)+'</b><small>'+esc(role)+' · '+esc(D.CITIES[p.city]?D.CITIES[p.city].name:'')+'</small><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:5px">'+bar((R0.f+100)/2,'')+(R0.r?bar(R0.r,'p'):'<span></span>')+'</div></div><button class="btn ghost" data-a="call" data-id="'+id+'">Call</button></div>'; }).join('')+'</div>';
  return h; };
PHONE.chat=function(){ closeSheet(); $('chat').hidden=false; if(JL.NET) JL.NET.openChat(); return ''; };
PHONE.news=function(){ var S=E.S; var h=head('News','Lagos today','phone');
  h+='<div class="card"><dl class="kv"><dt>Naira</dt><dd>₦'+S.rate+' / $1</dd><dt>Governor</dt><dd>'+(S.policy.winner?esc(D.CANDIDATES.filter(function(c){ return c.id===S.policy.winner; })[0].name):'Election pending')+'</dd><dt>Next election</dt><dd>Day '+(S.election.next+1)+' · Polling Unit 001</dd>'+(S.fuelScarce?'<dt>Fuel</dt><dd>Scarcity!</dd>':'')+'</dl></div>';
  h+='<div class="lbl">Candidates</div><div class="list">'+D.CANDIDATES.map(function(c){ return '<div class="row"><div class="main"><b>'+esc(c.name)+'</b><small>'+esc(c.party)+' · '+esc(c.promise)+'</small></div></div>'; }).join('')+'</div>';
  h+='<div class="lbl">Your timeline</div><div class="list">'+S.log.slice(0,40).map(function(l){ var hh=Math.floor(l.m/60); return '<div class="row" style="padding:8px 10px"><div class="main"><small>Day '+(l.d+1)+' · '+((hh%12)||12)+(hh<12?'am':'pm')+'</small><span style="font-size:13px">'+esc(l.t)+'</span></div></div>'; }).join('')+'</div>';
  return h; };
PHONE.gem=function(){ var S=E.S; var g=E.gemQuestion(); var done=S.gemDay===S.day; var h=head('Daily Gem','💎 '+S.gems+' gems · one question a day','phone');
  h+='<div class="card"><p style="font-weight:700;font-size:16px">'+esc(g.q)+'</p><div class="list">'+g.opts.map(function(o,i){ return '<button class="row" data-a="gem" data-i="'+i+'"'+(done?' disabled':'')+'><div class="main"><b>'+esc(o)+'</b></div>'+(done&&i===g.correct?'<div class="r">✓</div>':'')+'</button>'; }).join('')+'</div>'+(done?'<p class="muted" style="margin-top:8px">Come back tomorrow for another gem.</p>':'<p class="muted" style="margin-top:8px">Correct answers pay '+fmt(E.price(5000))+'.</p>')+'</div>';
  return h; };
PHONE.ranks=function(){ var h=head('Ranks','Richest players right now','phone'); if(window.JAPA_CONFIG) h+='<a class="btn y" href="/japa-life/stats/" target="_blank" rel="noopener" style="display:block;text-decoration:none;margin-bottom:10px">Live stats: who is online, total players</a>'; h+=JL.NET?JL.NET.ranksHTML():'<p class="muted">Leaderboard is unavailable.</p>'; return h; };
PHONE.family=function(){ var S=E.S; var h=head(S.lottery==='nepo'?'Papa':'Family','People back home','phone');
  if(S.lottery==='nepo') h+='<div class="card" style="margin-bottom:10px"><b>Call Papa for money</b><p class="muted">Once a day. Papa gets tired if you call too often.</p><button class="btn y" data-a="papa"'+(S.papaDay===S.day?' disabled':'')+'>'+(S.papaDay===S.day?'Already called today':'Call Papa')+'</button></div>';
  [S.mum,S.sibling].forEach(function(id){ var p=S.people[id]; h+='<div class="row" style="margin-bottom:8px"><canvas class="pc" data-npc="'+id+'" width="80" height="80" style="width:40px;height:40px;border-radius:50%"></canvas><div class="main"><b>'+esc(p.name)+'</b><small>'+esc(p.role)+'</small></div><button class="btn ghost" data-a="call" data-id="'+id+'">Call</button></div>'; });
  h+='<button class="btn g" data-a="phoneapp" data-app="bank">Send money home</button>'; return h; };
PHONE.settings=function(){ var S=E.S; var h=head('Settings','','phone');
  h+='<div class="list"><button class="row" data-a="freewill"><div class="main"><b>Free will: '+(S.freeWill?'On':'Off')+'</b><small>Your Sim takes care of needs at home by themselves</small></div></button>';
  h+='<button class="row" data-a="labels"><div class="main"><b>Map labels: '+(UI.labels?'On':'Off')+'</b><small>Show place names on the map</small></div></button>';
  h+='<button class="row" data-a="theme"><div class="main"><b>Menu theme: '+(document.documentElement.getAttribute('data-theme')||'System')+'</b><small>Light, dark or follow your device</small></div></button>';
  h+='<button class="row" data-a="newgame"><div class="main"><b>Start a new life</b><small>Replaces your current save</small></div></button></div>';
  h+='<div class="lbl">Controls</div><p class="muted">Tap furniture or people to interact. Tap the floor to walk. Drag to pan, pinch or scroll to zoom. Keys: H home · B buy · M map · P phone · S sim · T things to do · Space pause · 1–3 speed. In Buy mode: R rotate, Enter place, Delete sell.</p>';
  h+='<p class="muted">Your game saves automatically in this browser.</p>'; return h; };

function drawSheetCanvases(){ card.querySelectorAll('canvas.pc').forEach(function(c){ var look=c.dataset.look==='me'?E.S.look:(E.S.people[c.dataset.npc]||{}).look; R.portrait(c,look,c.dataset.look==='me'?E.mood():null); }); }

// ---------- modal ----------
var modal=$('modal'), mcard=$('modalCard');
function openModal(html,wide){ UI.modalOpen=true; modal.hidden=false; mcard.className='modal-card'+(wide?' wide':''); mcard.innerHTML=html; }
function closeModal(){ UI.modalOpen=false; modal.hidden=true; mcard.innerHTML=''; }
UI.openModal=openModal; UI.closeModal=closeModal;
function confirmModal(title,text,yes){ openModal('<h2>'+esc(title)+'</h2><p>'+esc(text)+'</p><div class="btns"><button class="btn y" id="mYes">Yes</button><button class="btn ghost" id="mNo">Cancel</button></div>');
  $('mYes').onclick=function(){ closeModal(); yes(); }; $('mNo').onclick=closeModal; }
UI.confirmModal=confirmModal;
function showEvent(){ var v=E.eventView(); if(!v) return;
  openModal('<h2>'+esc(v.title)+'</h2><p>'+esc(v.text)+'</p><div class="list">'+v.choices.map(function(c,i){ return '<button class="row" data-ch="'+i+'"><div class="main"><b>'+esc(c)+'</b></div></button>'; }).join('')+'</div>');
  mcard.querySelectorAll('[data-ch]').forEach(function(b){ b.onclick=function(){ var r=E.resolveEvent(+b.dataset.ch); if(r){ mcard.innerHTML='<h2>'+esc(v.title)+'</h2><p>'+esc(r)+'</p><button class="btn y" id="mOk">Okay</button>'; $('mOk').onclick=function(){ closeModal(); renderHud(true); }; } else { closeModal(); } }; }); }

// ---------- engine UI hooks (mini-games and app shortcuts) ----------
E.hooks.ui=function(name,ctx2,done){
  switch(name){
    case 'jollof': return jollofGame(done);
    case 'roulette': return rouletteGame(done);
    case 'outfit': return outfitModal(done);
    case 'vote': return voteModal(done);
    case 'wedding': return confirmModal('Host your wedding?','It costs '+fmt(E.price(300000))+'. Your fiancé(e) will move in with you.',function(){ var r=E.wedding(); if(r) toast(r,'warn'); done(true); }) , mNoHook(done);
    case 'flights': openSheet('phone','flights'); return done(null);
    case 'bank': case 'remitapp': openSheet('phone','bank'); return done(null);
    case 'househunt': case 'buyland': openSheet('phone','homes'); return done(null);
    case 'jobsHere': openSheet('phone','jobs'); return done(null);
    case 'visa': openSheet('phone','japa'); return done(null);
  }
  done(null);
};
function mNoHook(done){ var no=$('mNo'); if(no) no.onclick=function(){ closeModal(); done(false); }; }
function jollofGame(done){
  var round=0, scores=[], t0=performance.now(), p=0.5, raf=0;
  openModal('<h2>Party jollof</h2><p>Stir when the marker is in the yellow zone. Three stirs. Nail it for that smoky party flavour.</p><div class="pot"><div class="zone"></div><div class="mark" id="mk"></div></div><button class="btn y" id="stir" style="width:100%">Stir (1 of 3)</button>');
  var mk=$('mk'); function fr(now){ var sp=0.0032+round*0.0014; p=0.5+0.5*Math.sin((now-t0)*sp); mk.style.left=(p*100)+'%'; raf=requestAnimationFrame(fr); } raf=requestAnimationFrame(fr);
  $('stir').onclick=function(){ scores.push(Math.max(0,1-Math.abs(p-0.5)/0.32)); round++; if(round<3){ this.textContent='Stir ('+(round+1)+' of 3)'; return; }
    cancelAnimationFrame(raf); var avg=scores.reduce(function(a,b){ return a+b; },0)/3; mcard.innerHTML='<h2>'+Math.round(avg*100)+'% jollof</h2><p>'+(avg>0.8?'Smoky bottom, perfect colour. Party standard!':avg>0.5?'Solid pot. Nobody will complain.':'E don burn small. Still chop-able.')+'</p><button class="btn y" id="mOk">Serve it</button>'; $('mOk').onclick=function(){ closeModal(); done(avg); }; };
}
function rouletteGame(done){
  var bets=[1000,5000,20000,100000].map(function(n){ return E.price(n); }); var pick={amt:bets[0],col:'red'};
  function render(msg){ mcard.innerHTML='<h2>Eko Casino roulette</h2><p class="muted">Virtual naira only. Red or black pays double; green pays 14×.</p><canvas class="wheel" id="wh" width="360" height="360"></canvas>'+(msg?'<p style="font-weight:700;text-align:center">'+esc(msg)+'</p>':'')+
    '<div class="lbl">Bet</div><div class="btns">'+bets.map(function(b){ return '<button class="btn '+(pick.amt===b?'y':'ghost')+'" data-amt="'+b+'"'+(E.S.money<b?' disabled':'')+'>'+fmt(b)+'</button>'; }).join('')+'</div><div class="lbl">On</div><div class="btns">'+['red','black','green'].map(function(c){ return '<button class="btn '+(pick.col===c?'y':'ghost')+'" data-col="'+c+'">'+c[0].toUpperCase()+c.slice(1)+'</button>'; }).join('')+'</div><div class="btns" style="margin-top:14px"><button class="btn g" id="spin"'+(E.S.money<pick.amt?' disabled':'')+'>Spin</button><button class="btn ghost" id="leave">Leave the table</button></div>';
    wheel(0,null); mcard.querySelectorAll('[data-amt]').forEach(function(b){ b.onclick=function(){ pick.amt=+b.dataset.amt; render(); }; }); mcard.querySelectorAll('[data-col]').forEach(function(b){ b.onclick=function(){ pick.col=b.dataset.col; render(); }; });
    $('leave').onclick=function(){ closeModal(); done(true); };
    $('spin').onclick=function(){ if(E.S.money<pick.amt) return; E.S.money-=pick.amt; var n=Math.floor(Math.random()*37); var col=n===0?'green':([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].indexOf(n)>=0?'red':'black'); var t0=performance.now(), rot0=Math.random()*6;
      (function sp(now){ var f=Math.min(1,(now-t0)/2200); wheel(rot0+(1-Math.pow(1-f,3))*14,null); if(f<1) requestAnimationFrame(sp); else { var win=col===pick.col?pick.amt*(col==='green'?14:2):0; if(win){ E.S.money+=win; } render('Ball landed on '+n+' '+col+'. '+(win?'You won '+fmt(win)+'!':'House wins.')); E.moodlet(win?'casinowin':'casinoloss',win?'Won at roulette':'Lost at roulette',win?6:-4,6); } })(t0); };
  }
  function wheel(rot){ var c=$('wh'); if(!c) return; var g=c.getContext('2d'); g.clearRect(0,0,360,360); g.save(); g.translate(180,180); g.rotate(rot); for(var i=0;i<37;i++){ g.fillStyle=i===0?'#2D6A4F':(i%2?'#C1121F':'#111'); g.beginPath(); g.moveTo(0,0); g.arc(0,0,170,i*2*Math.PI/37,(i+1)*2*Math.PI/37); g.fill(); } g.fillStyle='#E9C46A'; g.beginPath(); g.arc(0,0,40,0,7); g.fill(); g.restore(); g.fillStyle='#fff'; g.beginPath(); g.moveTo(180,4); g.lineTo(172,24); g.lineTo(188,24); g.fill(); }
  openModal('',false); render();
}
function outfitModal(done){
  var look=JSON.parse(JSON.stringify(E.S.look));
  function render(){ mcard.innerHTML='<h2>New look</h2><canvas class="cc-prev" id="ofp" width="300" height="300" style="width:120px;height:120px;display:block;margin:0 auto 10px"></canvas>'+lookPickers(look)+'<button class="btn y" id="mOk" style="margin-top:12px">Done</button>'; R.portrait($('ofp'),look,null); bindLook(look,render); $('mOk').onclick=function(){ E.S.look=look; closeModal(); done(true); }; }
  openModal('',false); render();
}
function voteModal(done){ openModal('<h2>Governorship election</h2><p>Who gets your vote? The winner\'s promise comes into force for two weeks.</p><div class="list">'+D.CANDIDATES.map(function(c){ return '<button class="row" data-v="'+c.id+'"><div class="main"><b>'+esc(c.name)+'</b><small>'+esc(c.party)+' · '+esc(c.promise)+'</small></div></button>'; }).join('')+'</div>');
  mcard.querySelectorAll('[data-v]').forEach(function(b){ b.onclick=function(){ E.vote(b.dataset.v); closeModal(); done(true); }; }); }

// ---------- popup menu ----------
var menu=$('menu');
function openMenu(x,y,title,sub,items){
  var h='<div class="mh">'+esc(title)+(sub?'<small>'+esc(sub)+'</small>':'')+'</div>';
  items.forEach(function(it,i){ h+='<button data-mi="'+i+'"'+(it.why?' disabled':'')+'>'+esc(it.label)+(it.why||it.sub?'<small>'+esc(it.why||it.sub)+'</small>':'')+'</button>'; });
  menu.innerHTML=h; menu.hidden=false; var W=window.innerWidth, H=window.innerHeight; var mw=menu.offsetWidth, mh=menu.offsetHeight;
  menu.style.left=Math.max(10,Math.min(W-mw-10,x-mw/2))+'px'; menu.style.top=Math.max(60,Math.min(H-mh-90,y+12))+'px';
  menu.querySelectorAll('[data-mi]').forEach(function(b){ b.onclick=function(){ var it=items[+b.dataset.mi]; closeMenu(); it.fn(); renderHud(true); }; });
}
function closeMenu(){ menu.hidden=true; UI.menuItem=null; }
UI.openMenu=openMenu; UI.closeMenu=closeMenu;

// ---------- pointer input ----------
var ptrs={}, drag=null, pinch=null;
cv.addEventListener('pointerdown',function(e){ cv.setPointerCapture(e.pointerId); ptrs[e.pointerId]=[e.clientX,e.clientY];
  var ids=Object.keys(ptrs); if(ids.length===2){ var a=ptrs[ids[0]], b=ptrs[ids[1]]; pinch={d:Math.hypot(a[0]-b[0],a[1]-b[1]),cam:camCopy()}; drag=null; return; }
  drag={x:e.clientX,y:e.clientY,moved:false,cam:camCopy()}; });
cv.addEventListener('pointermove',function(e){ if(ptrs[e.pointerId]) ptrs[e.pointerId]=[e.clientX,e.clientY];
  var rect=cv.getBoundingClientRect(); var px=e.clientX-rect.left, py=e.clientY-rect.top;
  if(pinch){ var ids=Object.keys(ptrs); if(ids.length<2) return; var a=ptrs[ids[0]], b=ptrs[ids[1]]; var d=Math.hypot(a[0]-b[0],a[1]-b[1]); zoomAt((a[0]+b[0])/2-rect.left,(a[1]+b[1])/2-rect.top,d/pinch.d,pinch.cam); return; }
  if(drag){ var dx=e.clientX-drag.x, dy=e.clientY-drag.y; if(!drag.moved&&Math.hypot(dx,dy)>7) drag.moved=true; if(drag.moved){ var cam=curCam(); cam.x=drag.cam.x+dx; cam.y=drag.cam.y+dy; cam.fit=false; } }
  if(e.pointerType==='mouse'&&UI.buy&&UI.buy.ghost&&!drag){ var tf=R.screenToTileF(px,py); moveGhost(tf); }
  if(e.pointerType==='mouse'&&!drag&&UI.mode!=='map'&&E.S&&E.S.loc!=='travel'){ var hs=hitSim(px,py); UI.hover=hs?hs.npc:null; cv.style.cursor=hs||hitItem(px,py)?'pointer':'default'; }
});
function endPtr(e){ delete ptrs[e.pointerId]; if(pinch){ if(Object.keys(ptrs).length<2) pinch=null; drag=null; return; }
  if(drag&&!drag.moved){ var rect=cv.getBoundingClientRect(); tap(e.clientX-rect.left,e.clientY-rect.top,e); } drag=null; }
cv.addEventListener('pointerup',endPtr); cv.addEventListener('pointercancel',function(e){ delete ptrs[e.pointerId]; drag=null; pinch=null; });
cv.addEventListener('wheel',function(e){ e.preventDefault(); var rect=cv.getBoundingClientRect(); zoomAt(e.clientX-rect.left,e.clientY-rect.top,e.deltaY<0?1.12:1/1.12,camCopy()); },{passive:false});
function curCam(){ return (UI.mode==='map'||(E.S&&E.S.loc==='travel'))?R.mapCam:R.cam; }
function camCopy(){ var c=curCam(); return {x:c.x,y:c.y,s:c.s}; }
function zoomAt(px,py,f,base){ var cam=curCam(); var isMap=cam===R.mapCam; var ns=Math.max(isMap?0.35:10,Math.min(isMap?3:90,base.s*f)); var k=ns/base.s; cam.x=px-(px-base.x)*k; cam.y=py-(py-base.y)*k; cam.s=ns; cam.fit=false; }

function hitSim(px,py){ var list=UI.drawnSims||[]; var T=R.cam.s; var best=null, bd=1e9;
  list.forEach(function(s){ if(s.me||s.kid) return; var sx=R.cam.x+(s.x+0.5)*T, sy=R.cam.y+(s.y+0.82)*T; if(px>sx-T*0.45&&px<sx+T*0.45&&py<sy+T*0.15&&py>sy-T*1.45){ var d=Math.abs(px-sx)+Math.abs(py-(sy-T*0.6)); if(d<bd){ bd=d; best=s; } } }); return best; }
function hitMe(px,py){ var S=E.S; if(S.atWork) return false; var T=R.cam.s; var sx=R.cam.x+(S.sim.x+0.5)*T, sy=R.cam.y+(S.sim.y+0.82)*T; return px>sx-T*0.4&&px<sx+T*0.4&&py<sy+T*0.1&&py>sy-T*1.4; }
function hitItem(px,py){ var L=E.rt.lot; if(!L) return null; var tf=R.screenToTileF(px,py); var x=Math.floor(tf[0]), y=Math.floor(tf[1]); var found=null;
  L.items.forEach(function(it){ var dm=E.itemDims(it); if(x>=it.x&&x<it.x+dm[0]&&y>=it.y&&y<it.y+dm[1]){ var d=E.itemDef(it); var useful=(d.acts&&d.acts.length)||it.prop; if(!useful) return; if(!found||(E.itemDef(found).flat&&!d.flat)) found=it; } }); return found; }

function tap(px,py,e){
  var S=E.S; if(!S||UI.creating) return; closeMenu();
  if(UI.mode==='map'||S.loc==='travel'){ if(S.loc==='travel') return; mapTap(px,py); return; }
  if(S.atWork){ toast('You are at work. Use Skip to speed through the shift.','info'); return; }
  if(UI.buy){ buyTap(px,py,e); return; }
  var sim=hitSim(px,py);
  if(sim&&sim.npc){ socialMenu(sim.npc,px,py); return; }
  if(sim&&sim.peer&&JL.NET){ JL.NET.playerMenu(sim.peer,px,py); return; }
  if(hitMe(px,py)){ openSheet('sim'); return; }
  var it=hitItem(px,py);
  if(it){ itemMenu(it,px,py); return; }
  var tf=R.screenToTileF(px,py); var tx=Math.floor(tf[0]), ty=Math.floor(tf[1]); var L=E.rt.lot;
  if(tx>=0&&ty>=0&&tx<L.w&&ty<L.h&&!E.blocked(L,tx,ty)){ E.queueWalk(tx,ty); UI.target=[tx,ty]; setTimeout(function(){ UI.target=null; },900); }
}
function itemMenu(it,px,py){
  var S=E.S; var d=E.itemDef(it); UI.menuItem=it;
  if(it.prop&&!(d.acts&&d.acts.length)){ var acts=E.venueActs().filter(function(v){ return v.a.prop===it.prop; });
    if(!acts.length){ closeMenu(); return; }
    openMenu(px,py,it.label||D.LOC[S.loc].name,null,acts.map(function(v){ return {label:v.a.label+(v.cost?' · '+fmt(v.cost):''),why:v.why,fn:function(){ E.queueVenue(v.a.id); }}; })); UI.menuItem=it; return; }
  var items=E.objMenu(it).map(function(m){ return {label:m.label,why:m.why,fn:function(){ E.queueObj(it.uid,m.act); }}; });
  var sub=null; if(d.gen) sub='Fuel: '+(it.fuel||0)+' of '+d.gen.tank+' hours · '+(it.on?'running':'off');
  if(it.shared) sub='Shared with neighbours';
  if(!items.length) return;
  openMenu(px,py,d.name||'Item',sub,items); UI.menuItem=it;
}
function socialMenu(id,px,py){ var p=E.S.people[id]; var R0=E.rel(id);
  var items=E.socialMenu(id).map(function(m){ return {label:m.label,why:m.why,fn:function(){ E.queueSocial(id,m.act); }}; });
  openMenu(px,py,p.name,E.relStatus(id)+' · friendship '+Math.round(R0.f)+(R0.r?' · romance '+Math.round(R0.r):'')+(D.TRAITS[p.trait]?' · '+D.TRAITS[p.trait].name:''),items); }
function mapTap(px,py){ var S=E.S; var m=R.screenToMap(px,py); var best=null, bd=1e9; var rad=18/R.mapCam.s;
  D.LOCS.forEach(function(l){ if(l[2]!==S.city) return; var d=Math.hypot(l[4]-m[0],l[5]-m[1]); if(d<bd&&d<rad){ bd=d; best=l[0]; } });
  var ha=E.homeAreaLoc(); if(ha&&S.homes[S.city]){ var hl=D.LOC[ha]; var d2=Math.hypot(hl.x+16-m[0],hl.y-14-m[1]); if(d2<rad&&d2<bd){ best='home'; } }
  if(!best){ UI.mapSel=null; if(UI.sheet==='loc') closeSheet(); return; }
  UI.mapSel=best==='home'?ha:best; openSheet('loc',best); }

// ---------- buy mode ----------
function enterBuy(){ closeSheet(); UI.mode='lot'; UI.buy={cat:'Beds',sel:null,ghost:null,pick:null}; $('buybar').hidden=false; renderBuy(); refit(); renderHud(true); toast('Buy mode: time is paused. Pick an item, then tap where it goes.','info'); }
function exitBuy(){ UI.buy=null; $('buybar').hidden=true; refit(); renderHud(true); }
UI.enterBuy=enterBuy;
function renderBuy(){ var B=UI.buy; if(!B) return; var S=E.S; var bb=$('buybar');
  var tools='<div class="buytools">';
  if(B.ghost){ var nm=B.sel.inv!=null?D.ITEMS[S.inv[B.sel.inv].id].name:(B.sel.move?E.itemDef(E.findItem(B.sel.move)).name:D.ITEMS[B.sel.id].name); tools+='<span class="pill">'+esc(nm)+(B.ghost.ok?'':' · '+esc(B.ghost.why||''))+'</span><button class="btn ghost" data-b="rot">Rotate (R)</button><button class="btn g" data-b="place"'+(B.ghost.ok?'':' disabled')+'>'+(B.sel.id?'Buy '+fmt(E.buyPrice(B.sel.id)):'Place')+'</button><button class="btn ghost" data-b="cancel">Cancel</button>'; }
  else if(B.pick){ var it=E.findItem(B.pick); var d=E.itemDef(it); tools+='<span class="pill">'+esc(d.name)+'</span><button class="btn ghost" data-b="move">Move</button><button class="btn ghost" data-b="store">Store</button><button class="btn red" data-b="sell">Sell '+fmt(Math.round((it.paid||d.price)*0.6))+'</button><button class="btn ghost" data-b="unpick">Done</button>'; }
  else tools+='<span class="pill">Tap an item below, or tap your furniture to move or sell it</span>';
  tools+='<button class="btn y" data-b="exit">Exit buy mode</button></div>';
  var cats=D.CATS.concat(['Stored']); var tabs='<div class="tabs">'+cats.map(function(c){ return '<button data-cat="'+c+'" aria-pressed="'+(B.cat===c)+'">'+c+(c==='Stored'&&S.inv.length?' ('+S.inv.length+')':'')+'</button>'; }).join('')+'</div>';
  var items='<div class="items">';
  if(B.cat==='Stored'){ if(!S.inv.length) items+='<p class="muted" style="padding:10px">Nothing in storage.</p>'; S.inv.forEach(function(x,i){ var d=D.ITEMS[x.id]; items+='<button class="it" data-inv="'+i+'" aria-pressed="'+(B.sel&&B.sel.inv===i)+'"><canvas data-icon="'+x.id+'" width="200" height="112"></canvas><b>'+esc(d.name)+'</b><span>Free to place</span></button>'; }); }
  else Object.keys(D.ITEMS).forEach(function(id){ var d=D.ITEMS[id]; if(d.cat!==B.cat||!d.price) return; var p=E.buyPrice(id); items+='<button class="it" data-id="'+id+'" aria-pressed="'+(B.sel&&B.sel.id===id)+'"'+(S.money<p?' style="opacity:.55"':'')+'><canvas data-icon="'+id+'" width="200" height="112"></canvas><b>'+esc(d.name)+'</b><span>'+fmt(p)+'</span></button>'; });
  items+='</div>';
  bb.innerHTML=tools+'<div class="catalog">'+tabs+items+'</div>';
  bb.querySelectorAll('canvas[data-icon]').forEach(function(c){ var id=c.dataset.icon, d=D.ITEMS[id]; var g=c.getContext('2d'); g.clearRect(0,0,200,112); var T=Math.min(160/d.w,90/d.h,46); R.drawItemAt(g,id,100,56,T); });
}
$('buybar').addEventListener('click',function(e){ var B=UI.buy; if(!B) return; var t=e.target.closest('button'); if(!t) return; var S=E.S;
  if(t.dataset.cat){ B.cat=t.dataset.cat; renderBuy(); return; }
  if(t.dataset.id){ if(S.money<E.buyPrice(t.dataset.id)){ toast('Not enough money for that.','warn'); return; } B.sel={id:t.dataset.id}; B.pick=null; startGhost(); return; }
  if(t.dataset.inv!=null){ B.sel={inv:+t.dataset.inv}; B.pick=null; startGhost(); return; }
  var b=t.dataset.b; if(!b) return;
  if(b==='exit') exitBuy(); else if(b==='rot') rotateGhost(); else if(b==='place') placeGhost(); else if(b==='cancel'){ B.ghost=null; B.sel=null; renderBuy(); }
  else if(b==='unpick'){ B.pick=null; renderBuy(); }
  else if(b==='sell'){ var r=E.sellItem(B.pick); if(r) toast(r,'warn'); B.pick=null; renderBuy(); renderHud(true); }
  else if(b==='store'){ E.storeItem(B.pick); B.pick=null; renderBuy(); }
  else if(b==='move'){ var it=E.findItem(B.pick); B.sel={move:it.uid,id0:it.id}; B.ghost={id:it.id,x:it.x,y:it.y,r:it.r||0,ok:true}; B.pick=null; renderBuy(); }
});
function ghostId(){ var B=UI.buy; return B.sel.inv!=null?E.S.inv[B.sel.inv].id:(B.sel.move?B.sel.id0:B.sel.id); }
function startGhost(){ var B=UI.buy; var L=E.rt.lot; var id=ghostId(); B.ghost={id:id,x:Math.floor(L.w/2),y:Math.floor(L.h/2),r:0}; validateGhost(); renderBuy(); }
function validateGhost(){ var B=UI.buy, g=B.ghost; if(!g) return; var why=E.canPlace(E.rt.lot,g.id,g.x,g.y,g.r,B.sel&&B.sel.move); g.ok=!why; g.why=why; }
function moveGhost(tf){ var B=UI.buy; var g=B.ghost; var d=D.ITEMS[g.id]; var dm=(g.r%2)?[d.h,d.w]:[d.w,d.h]; var nx=Math.round(tf[0]-dm[0]/2), ny=Math.round(tf[1]-dm[1]/2); if(nx===g.x&&ny===g.y) return; g.x=nx; g.y=ny; var was=g.ok; validateGhost(); if(was!==g.ok) renderBuy(); }
function rotateGhost(){ var B=UI.buy; if(!B||!B.ghost) return; B.ghost.r=(B.ghost.r+1)%4; validateGhost(); renderBuy(); }
function placeGhost(){ var B=UI.buy; if(!B||!B.ghost) return; var g=B.ghost; var r;
  if(B.sel.move) r=E.moveItem(B.sel.move,g.x,g.y,g.r); else if(B.sel.inv!=null) r=E.placeInv(B.sel.inv,g.x,g.y,g.r); else r=E.buyItem(g.id,g.x,g.y,g.r);
  if(r){ toast(r,'warn'); return; }
  R.invalidate(); if(B.sel.id&&E.S.money>=E.buyPrice(B.sel.id)){ validateGhost(); } else { B.ghost=null; B.sel=null; } renderBuy(); renderHud(true); }
function buyTap(px,py,e){ var B=UI.buy; var tf=R.screenToTileF(px,py);
  if(B.ghost){ var g=B.ghost; var d=D.ITEMS[g.id]; var dm=(g.r%2)?[d.h,d.w]:[d.w,d.h]; var inside=tf[0]>=g.x&&tf[0]<g.x+dm[0]&&tf[1]>=g.y&&tf[1]<g.y+dm[1];
    if(e.pointerType==='mouse'||inside){ if(e.pointerType!=='mouse'&&inside||e.pointerType==='mouse'){ moveGhost(tf); if(B.ghost.ok) placeGhost(); else toast(B.ghost.why||'Can\'t place there','warn'); } return; }
    moveGhost(tf); renderBuy(); return; }
  var x=Math.floor(tf[0]), y=Math.floor(tf[1]); var L=E.rt.lot; var found=null;
  L.items.forEach(function(it){ var dm=E.itemDims(it); if(x>=it.x&&x<it.x+dm[0]&&y>=it.y&&y<it.y+dm[1]&&!it.fixed){ if(!found||E.itemDef(found).flat) found=it; } });
  B.pick=found?found.uid:null; renderBuy(); }

// ---------- character creation ----------
function lookPickers(look){
  var h='<div class="lbl">Skin</div><div class="sw">'+D.SKINS.map(function(c){ return '<button data-k="skin" data-v="'+c+'" style="background:'+c+'" aria-pressed="'+(look.skin===c)+'" aria-label="Skin tone"></button>'; }).join('')+'</div>';
  h+='<div class="lbl">Hair</div><div class="chips">'+D.HAIRS.map(function(x){ return '<button class="chip'+(look.hair===x?' on':'')+'" data-k="hair" data-v="'+x+'">'+x[0].toUpperCase()+x.slice(1)+'</button>'; }).join('')+'</div>';
  h+='<div class="sw" style="margin-top:8px">'+D.HAIRCOLS.map(function(c){ return '<button data-k="hairCol" data-v="'+c+'" style="background:'+c+'" aria-pressed="'+(look.hairCol===c)+'" aria-label="Hair colour"></button>'; }).join('')+'</div>';
  h+='<div class="lbl">Top</div><div class="sw">'+D.SHIRTS.map(function(c){ return '<button data-k="shirt" data-v="'+c+'" style="background:'+c+'" aria-pressed="'+(look.shirt===c)+'" aria-label="Top colour"></button>'; }).join('')+'<button class="chip'+(look.pattern?' on':'')+'" data-k="pattern" data-v="1" style="width:auto;height:28px;border-radius:999px">Ankara print</button></div>';
  h+='<div class="lbl">Bottoms</div><div class="sw">'+['#1D3557','#2B2D42','#6C757D','#3D405B','#E9C46A','#F1FAEE','#7F5539'].map(function(c){ return '<button data-k="pants" data-v="'+c+'" style="background:'+c+'" aria-pressed="'+(look.pants===c)+'" aria-label="Bottoms colour"></button>'; }).join('')+'</div>';
  return h; }
function bindLook(look,rerender){ mcard.querySelectorAll('[data-k]').forEach(function(b){ b.onclick=function(){ var k=b.dataset.k; if(k==='pattern') look.pattern=!look.pattern; else look[k]=b.dataset.v; rerender(); }; }); }
function startCreation(){
  UI.creating=true; E.S=null; $('busy').hidden=true; $('workBtn').hidden=true;
  var st={step:0,name:'',g:'m',look:{skin:D.SKINS[3],hair:'short',hairCol:'#111111',shirt:'#008751',pants:'#1D3557',pattern:false},traits:[],dream:'millionaire',lottery:null};
  function render(){ var h='';
    if(st.step===0){ h='<p class="brand">Japa <em>Life</em></p><p style="margin-top:10px">A Lagos-style life sim. Hustle in Lagos, pay rent every Saturday, eat amala at Shitta, dance at Quilox, then japa to London, Houston, Toronto, Dubai or Girne and send money home.</p>';
      h+='<div class="cc-grid"><canvas class="cc-prev" id="ccp" width="300" height="300"></canvas><div><div class="field"><label class="lbl" for="ccName" style="margin:0">Name</label><input id="ccName" maxlength="24" placeholder="e.g. Tunde Bello" value="'+esc(st.name)+'" autocomplete="off"></div>';
      h+='<div class="chips"><button class="chip'+(st.g==='m'?' on':'')+'" data-g="m">Man</button><button class="chip'+(st.g==='f'?' on':'')+'" data-g="f">Woman</button></div>'+lookPickers(st.look)+'</div></div>';
      h+='<div class="btns" style="margin-top:16px;justify-content:flex-end"><button class="btn y" id="ccNext">Next: personality</button></div>'; }
    if(st.step===1){ h='<h2>Personality</h2><p>Pick two traits.</p><div class="opts">'+Object.keys(D.TRAITS).map(function(k){ var on=st.traits.indexOf(k)>=0; return '<button class="opt" data-t="'+k+'" aria-pressed="'+on+'"><b>'+esc(D.TRAITS[k].name)+'</b><span>'+esc(D.TRAITS[k].desc)+'</span></button>'; }).join('')+'</div>';
      h+='<div class="lbl">Lifetime dream</div><div class="opts">'+Object.keys(D.DREAMS).map(function(k){ return '<button class="opt" data-d="'+k+'" aria-pressed="'+(st.dream===k)+'"><b>'+esc(D.DREAMS[k].name)+'</b><span>'+esc(D.DREAMS[k].desc)+'</span></button>'; }).join('')+'</div>';
      h+='<div class="btns" style="margin-top:16px;justify-content:space-between"><button class="btn ghost" id="ccBack">Back</button><button class="btn y" id="ccNext"'+(st.traits.length<2?' disabled':'')+'>Next: birth lottery</button></div>'; }
    if(st.step===2){ h='<h2>The birth lottery</h2><p>Where you start in life is not your choice. Spin to find out. No re-rolls.</p><div class="lot-wheel">'+Object.keys(D.LOTTERY).map(function(k){ return '<div data-l="'+k+'">'+esc(D.LOTTERY[k].name)+'<div style="font:600 11.5px var(--f-body);color:inherit;opacity:.7">'+Math.round(D.LOTTERY[k].odds*100)+'% chance</div></div>'; }).join('')+'</div><div id="lotRes"></div>';
      h+='<div class="btns" style="justify-content:space-between"><button class="btn ghost" id="ccBack">Back</button><button class="btn y" id="ccSpin">Spin the lottery</button></div>'; }
    openModal(h,true); UI.modalOpen=true;
    if(st.step===0){ R.portrait($('ccp'),st.look,null); var nm=$('ccName'); nm.oninput=function(){ st.name=nm.value; }; mcard.querySelectorAll('[data-g]').forEach(function(b){ b.onclick=function(){ st.g=b.dataset.g; if(st.g==='f'&&(st.look.hair==='short'||st.look.hair==='bald')) st.look.hair='braids'; if(st.g==='m'&&(st.look.hair==='gele'||st.look.hair==='braids')) st.look.hair='short'; render(); }; }); bindLook(st.look,render);
      $('ccNext').onclick=function(){ if(!st.name.trim()){ st.name=(st.g==='m'?D.FIRST_M:D.FIRST_F)[Math.floor(Math.random()*20)]+' '+D.LAST[Math.floor(Math.random()*20)]; } st.step=1; render(); }; }
    if(st.step===1){ mcard.querySelectorAll('[data-t]').forEach(function(b){ b.onclick=function(){ var k=b.dataset.t, i=st.traits.indexOf(k); if(i>=0) st.traits.splice(i,1); else { if(st.traits.length>=2) st.traits.shift(); st.traits.push(k); } render(); }; });
      mcard.querySelectorAll('[data-d]').forEach(function(b){ b.onclick=function(){ st.dream=b.dataset.d; render(); }; });
      $('ccBack').onclick=function(){ st.step=0; render(); }; $('ccNext').onclick=function(){ st.step=2; render(); }; }
    if(st.step===2){ $('ccBack').onclick=function(){ st.step=1; render(); };
      $('ccSpin').onclick=function(){ var btn=this; btn.disabled=true; $('ccBack').disabled=true; var x=Math.random(), acc=0, res='lapo'; for(var k in D.LOTTERY){ acc+=D.LOTTERY[k].odds; if(x<=acc){ res=k; break; } }
        var keys=Object.keys(D.LOTTERY); var steps=14+keys.indexOf(res)+Math.floor(Math.random()*2)*4; var i=0;
        (function tick(){ var k=keys[i%4]; mcard.querySelectorAll('[data-l]').forEach(function(d){ d.classList.toggle('hot',d.dataset.l===k); }); if(i>=steps&&k===res){ st.lottery=res; $('lotRes').innerHTML='<div class="card" style="margin-bottom:12px"><b style="font-family:var(--f-display);font-size:22px">You are a '+esc(D.LOTTERY[res].name)+'!</b><p style="margin-top:6px">'+esc(D.LOTTERY[res].desc)+'</p></div>'; btn.textContent='Start life'; btn.disabled=false; btn.onclick=begin; return; } i++; setTimeout(tick,60+i*i*1.2); })(); }; }
  }
  function begin(){ closeModal(); UI.creating=false; E.newGame({name:st.name.trim(),g:st.g,look:st.look,traits:st.traits,dream:st.dream,lottery:st.lottery}); E.S.speed=1; UI.mode='lot'; resize(); renderHud(true); save(); if(JL.NET) JL.NET.onNewGame();
    setTimeout(function(){ toast('Tap furniture to use it, tap the floor to walk. Open the Phone to find a job.','info'); },1500); }
  render();
}
UI.startCreation=startCreation;

// ---------- boot ----------
function start(data){
  resize();
  var saved=data&&data.save?data.save:loadSave();
  if(saved){ try{ E.load(saved); }catch(err){ saved=null; } }
  if(!saved){ startCreation(); }
  else { refit(); renderHud(true); }
  requestAnimationFrame(frame);
}
UI.renderHud=renderHud;
var hot=window.claude&&window.claude.hot;
if(hot&&hot.snapshot) try{ hot.snapshot(function(){ return {save:E.S?JSON.parse(E.serialize()):null}; }); }catch(e){}
if(hot&&hot.ready) hot.ready(start); else start(hot&&hot.data||{});
})();
