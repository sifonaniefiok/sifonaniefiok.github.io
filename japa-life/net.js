/* Japa Life — live multiplayer.
   Two transports with one interface:
   - Supabase Realtime (public site): lobby channel for presence + chat + gifts, one channel per venue for positions,
     and a leaderboard behind two RPCs (japa_submit / japa_top).
   - claude.ai artifact runtime (room + db), used when the page runs as an artifact.
   The game always works solo; multiplayer lights up when a transport connects. */
(function(){
'use strict';
var JL=window.JL, E=JL.E, D=JL.D, UI=JL.UI, R=JL.R;
var esc=UI.esc, fmt=E.fmt;
function $(id){ return document.getElementById(id); }
var NET={mode:'solo',me:null,peers:[],log:[],unread:0,board:null,says:{},pos:{},lastChat:0,lastBoard:0,lastCoarse:'',lastPos:'',lastPosAt:0,muted:{},emote:null,emoteUntil:0};
JL.NET=NET;
try{ NET.muted=JSON.parse(localStorage.getItem('japa-muted')||'{}')||{}; }catch(e){ NET.muted={}; }

function cleanName(n){ n=String(n||'Someone').replace(/[\u0000-\u001f​-‏‪-‮<>]/g,'').trim().slice(0,24); return n||'Someone'; }
function trim(){ if(NET.log.length>150) NET.log.splice(0,NET.log.length-150); }
function sys(t){ NET.log.push({sys:true,t:t}); trim(); renderChat(); }
var BAD=['fuck','shit','bitch','nigger','nigga','cunt','dick','pussy','whore','slut','faggot','retard','ashawo','olodo','mumu','werey','oloshi'];
function cleanText(t){ t=String(t||'').replace(/[\u0000-\u001f​-‏‪-‮]/g,'').replace(/\s+/g,' ').trim().slice(0,200);
  t=t.replace(/\b(?:https?:\/\/|www\.)\S+/gi,'[link removed]').replace(/\b[\w.-]+\.(?:com|net|org|ng|io|xyz|me|ly|app)\b\S*/gi,'[link removed]');
  t=t.replace(/(\+?\d[\d\s-]{8,}\d)/g,'[number removed]');
  BAD.forEach(function(w){ t=t.replace(new RegExp(w,'gi'),function(m){ return m[0]+'*'.repeat(m.length-1); }); });
  return t; }
NET.cleanText=cleanText;

// ---------- shared handlers ----------
function onChat(from,isMe,d){ var t=cleanText(d.t); if(!t) return; if(!isMe&&NET.muted[from]) return; var n=cleanName(d.n);
  NET.log.push({n:n,t:t,live:true,mine:isMe,sys:!!d.sys,from:from}); trim(); if(!d.sys) NET.says[isMe?'me':from]={t:t,until:Date.now()+6000};
  if(!isMe&&$('chat').hidden&&!d.sys) NET.unread++; renderChat(); }
function onGift(from,isMe,d){ if(!NET.me||d.to!==NET.me||isMe||!E.S) return; var amt=Math.max(0,Math.min(50000000,Math.round(+d.amt||0))); if(!amt) return;
  E.S.money+=amt; UI.toast(cleanName(d.n)+' sent you '+fmt(amt)+'! 🎁','money'); sys(cleanName(d.n)+' sent you '+fmt(amt)+'.'); }
function emit(topic,data){ if(NET.mode==='supabase') return NET.sbLobby.send({type:'broadcast',event:topic,payload:Object.assign({id:NET.me},data)}).then(function(r){ if(r!=='ok') throw {code:r}; });
  if(NET.mode==='artifact') return NET.room.emit(topic,data); return Promise.reject({code:'offline'}); }

// ---------- what each player shares ----------
function locKey(){ var S=E.S; if(!S) return null; if(S.loc==='home') return 'h:'+(NET.me||'x'); if(S.loc.indexOf('visit:')===0) return 'h:'+S.loc.slice(6); if(S.loc==='travel'||S.loc==='hotel') return null; return 'v:'+S.loc; }
function homeCompact(){ var S=E.S; var h=S.homes[S.city]; if(!h) return null; return {t:h.tier,c:S.city,i:h.items.slice(0,70).map(function(it){ return [it.id,it.x,it.y,it.r||0]; })}; }
function coarse(){ var S=E.S; return {n:S.name.split(' ')[0],c:S.city,l:locKey(),k:[S.look.skin,S.look.hair,S.look.hairCol,S.look.shirt,S.look.pants,S.look.pattern?1:0],
  a:S.atWork?1:0,nw:Math.round(E.netWorth()/1000),job:S.career?D.CAREERS[S.career.id].titles[S.career.level-1]:null,ho:S.loc==='home'?homeCompact():null}; }
function posState(){ var S=E.S, c=E.rt.cur; return {x:Math.round(S.sim.x*10)/10,y:Math.round(S.sim.y*10)/10,d:S.sim.dir||1,p:c&&c.phase==='act'?c.pose:'stand',w:c&&c.phase==='walk'&&c.path&&c.path.length?1:0,b:c&&c.phase==='act'?(c.bubble||null):null,em:NET.emoteUntil>Date.now()?NET.emote:null}; }

// ---------- transport: Supabase (public site) ----------
var CFG=window.JAPA_CONFIG;
function uuid(){ if(window.crypto&&crypto.randomUUID) return crypto.randomUUID(); var a=new Uint8Array(16); crypto.getRandomValues(a); a[6]=(a[6]&15)|64; a[8]=(a[8]&63)|128; var h=[].map.call(a,function(b){ return ('0'+b.toString(16)).slice(-2); }).join(''); return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20); }
function ident(){ var id=null, sec=null; try{ id=localStorage.getItem('japa-id'); sec=localStorage.getItem('japa-secret'); }catch(e){}
  if(!id||!/^[0-9a-f-]{36}$/.test(id)){ id=uuid(); try{ localStorage.setItem('japa-id',id); }catch(e){} }
  if(!sec||sec.length<32){ var a=new Uint8Array(24); crypto.getRandomValues(a); sec=[].map.call(a,function(b){ return ('0'+b.toString(16)).slice(-2); }).join(''); try{ localStorage.setItem('japa-secret',sec); }catch(e){} }
  return {id:id,secret:sec}; }
function startSupabase(){
  var me=ident(); NET.me=me.id; NET.secret=me.secret; NET.mode='supabase';
  var sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false},realtime:{params:{eventsPerSecond:8}}});
  NET.sb=sb; NET.coarse={}; NET.posMap={};
  var lobby=sb.channel('japa-lobby',{config:{presence:{key:me.id},broadcast:{self:true}}});
  NET.sbLobby=lobby;
  lobby.on('presence',{event:'sync'},function(){ var st=lobby.presenceState(); var map={}; Object.keys(st).forEach(function(k){ var arr=st[k]; if(arr&&arr.length){ var m=arr[arr.length-1]; if(m&&m.n) map[k]=m; } });
      Object.keys(map).forEach(function(k){ if(!NET.coarse[k]&&k!==me.id) sys(cleanName(map[k].n)+' came online.'); }); NET.coarse=map; rebuildPeers(); renderChat(); })
    .on('broadcast',{event:'chat'},function(m){ var d=m.payload||{}; onChat(String(d.id||''),d.id===me.id,d); })
    .on('broadcast',{event:'gift'},function(m){ var d=m.payload||{}; onGift(String(d.id||''),d.id===me.id,d); })
    .subscribe(function(status){ if(status==='SUBSCRIBED'){ NET.connected=true; NET.lastCoarse=''; } else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){ NET.connected=false; } });
  setInterval(sbTick,300);
  setInterval(function(){ var now=Date.now(); Object.keys(NET.posMap).forEach(function(k){ if(now-NET.posMap[k].t>20000) delete NET.posMap[k]; }); rebuildPeers(); },3000);
  fetchBoard(); setInterval(function(){ if(UI.sheet==='phone'&&UI.sheetArg==='ranks') fetchBoard(); },30000);
}
function sbTick(){
  var S=E.S; if(!S||UI.creating||!NET.connected) return;
  var c=coarse(); var ck=JSON.stringify(c);
  if(ck!==NET.lastCoarse&&Date.now()-(NET.lastCoarseAt||0)>1500){ NET.lastCoarse=ck; NET.lastCoarseAt=Date.now(); NET.sbLobby.track(c).catch(function(){}); }
  // venue channel follows where I am
  var lk=c.l; if(lk!==NET.venueKey){ if(NET.venue){ NET.sb.removeChannel(NET.venue); NET.venue=null; } NET.posMap={}; NET.venueKey=lk; NET.venueReady=false;
    if(lk){ var ch=NET.sb.channel('japa-'+lk.replace(/[^a-z0-9:_-]/gi,'').slice(0,60),{config:{broadcast:{self:false}}});
      ch.on('broadcast',{event:'pos'},function(m){ var d=m.payload||{}; var id=String(d.id||''); if(!id||id===NET.me) return; NET.posMap[id]={x:+d.x||0,y:+d.y||0,d:d.d===-1?-1:1,p:d.p,w:d.w?1:0,b:d.b,em:d.em,t:Date.now()}; rebuildPeers(); })
        .subscribe(function(st){ if(st==='SUBSCRIBED'){ NET.venueReady=true; NET.lastPos=''; } }); NET.venue=ch; } }
  if(NET.venue&&NET.venueReady){ var p=posState(); var pk=JSON.stringify(p); var now=Date.now();
    if((pk!==NET.lastPos&&now-NET.lastPosAt>280)||now-NET.lastPosAt>4000){ NET.lastPos=pk; NET.lastPosAt=now; NET.venue.send({type:'broadcast',event:'pos',payload:Object.assign({id:NET.me},p)}).catch(function(){}); } }
  // leaderboard once a minute
  if(Date.now()-NET.lastBoard>60000){ NET.lastBoard=Date.now(); NET.sb.rpc('japa_submit',{p_id:NET.me,p_secret:NET.secret,p_name:S.name,p_nw:E.netWorth(),p_job:S.career?D.CAREERS[S.career.id].titles[S.career.level-1]:'Unemployed',p_city:S.city,p_day:S.day+1,p_lottery:S.lottery}).then(function(){},function(){}); }
}
function rebuildPeers(){ if(NET.mode!=='supabase') return; var lk=locKey();
  NET.peers=Object.keys(NET.coarse).map(function(id){ var c=NET.coarse[id]; var pr=Object.assign({},c); if(c.l&&c.l===lk&&NET.posMap[id]){ Object.assign(pr,NET.posMap[id]); pr.l=c.l; } else if(c.l===lk){ pr.hidden=true; }
    return {peer:id,isMe:id===NET.me,sameTab:id===NET.me,kind:'viewer',presence:pr}; }); }
function fetchBoard(){ if(!NET.sb) return; NET.sb.rpc('japa_top',{p_limit:25}).then(function(r){ if(r.error){ NET.board=NET.board||[]; return; } NET.board=(r.data||[]).map(function(x){ return {id:x.id,n:cleanName(x.name),nw:+x.nw||0,job:String(x.job||'').slice(0,40),city:String(x.city||''),day:+x.day||0,lot:String(x.lottery||'')}; }); if(UI.sheet==='phone'&&UI.sheetArg==='ranks') UI.renderSheet(); }); }

// ---------- transport: claude.ai artifact runtime ----------
function startArtifact(cl){
  cl.use('room').then(function(room){ if(!room) return; NET.room=room; NET.mode='artifact';
    room.onPeers(function(ch){ NET.peers=ch.peers; ch.peers.forEach(function(p){ if(p.isMe&&p.sameTab) NET.me=p.peer; }); ch.joined.forEach(function(p){ if(!p.isMe&&p.presence&&p.presence.n) sys(cleanName(p.presence.n)+' came online.'); }); },function(){ NET.room=null; NET.mode='solo'; });
    room.on('chat',function(m){ onChat(m.peer,m.isMe,m.data||{}); },function(){});
    room.on('gift',function(m){ onGift(m.peer,m.isMe,m.data||{}); },function(){});
    (function tick(){ setTimeout(tick,260); var S=E.S; if(!NET.room||!S||UI.creating) return; var p=Object.assign(coarse(),posState()); var k=JSON.stringify(p); if(k===NET.lastCoarse) return; NET.lastCoarse=k; room.presence(p).catch(function(){});
      if(NET.db&&NET.uid&&Date.now()-NET.lastBoard>60000){ NET.lastBoard=Date.now(); NET.db.doc('board/'+NET.uid).set({n:S.name.slice(0,24),nw:E.netWorth(),job:S.career?D.CAREERS[S.career.id].titles[S.career.level-1]:'Unemployed',city:S.city,day:S.day+1,lot:S.lottery,ts:Date.now()}).catch(function(){}); } })();
  }).catch(function(){});
  Promise.all([cl.use('db'),cl.use('user')]).then(function(r){ NET.db=r[0]; var user=r[1]; if(!user) return; return user.id().then(function(id){ NET.uid=id; if(NET.db&&id){ try{ NET.db.collection('board').orderBy('nw','desc').limit(25).onSnapshot(function(snap){ NET.board=snap.docs.map(function(d){ var x=d.data()||{}; return {id:d.id,n:cleanName(x.n),nw:+x.nw||0,job:String(x.job||'').slice(0,40),city:String(x.city||''),day:+x.day||0,lot:String(x.lot||'')}; }); if(UI.sheet==='phone'&&UI.sheetArg==='ranks') UI.renderSheet(); },function(){ NET.board=null; }); }catch(e){} } }); }).catch(function(){});
}

// ---------- pick a transport ----------
if(CFG&&CFG.supabaseUrl&&window.supabase&&window.supabase.createClient){ try{ startSupabase(); }catch(e){ NET.mode='solo'; } }
else if(window.claude&&window.claude.use) startArtifact(window.claude);
NET.boardId=function(){ return NET.mode==='supabase'?NET.me:NET.uid; };
NET.onNewGame=function(){ NET.lastBoard=0; NET.lastCoarse=''; };

function others(){ return NET.peers.filter(function(p){ return !p.isMe&&p.kind==='viewer'&&p.presence&&p.presence.n&&!NET.muted[p.peer]; }); }
function lookOf(pr){ var k=Array.isArray(pr.k)?pr.k:[]; function col(v,d){ return /^#[0-9a-f]{3,8}$/i.test(String(v))?v:d; } return {skin:col(k[0],'#7E4B2F'),hair:D.HAIRS.indexOf(k[1])>=0?k[1]:'short',hairCol:col(k[2],'#111'),shirt:col(k[3],'#3A86FF'),pants:col(k[4],'#1D3557'),pattern:!!k[5]}; }

// ---------- what the renderer asks for ----------
NET.playersHere=function(){ var lk=locKey(); if(!lk) return []; var out=[];
  others().forEach(function(p){ var pr=p.presence; if(pr.l!==lk||pr.a||pr.hidden) return; var tx=+pr.x||0, ty=+pr.y||0; var cur=NET.pos[p.peer]||{x:tx,y:ty}; cur.x+=(tx-cur.x)*0.25; cur.y+=(ty-cur.y)*0.25; NET.pos[p.peer]=cur;
    var s=NET.says[p.peer]; out.push({look:lookOf(pr),x:cur.x,y:cur.y,dir:pr.d===-1?-1:1,pose:['stand','sit','lie','dance','swim'].indexOf(pr.p)>=0?pr.p:'stand',walking:!!pr.w,anim:R.t+String(p.peer).length,name:cleanName(pr.n),live:true,peer:p.peer,bubble:typeof pr.em==='string'?pr.em.slice(0,4):(typeof pr.b==='string'?pr.b.slice(0,4):null),say:s&&s.until>Date.now()?s.t:null}); });
  return out; };
NET.mapPlayers=function(cid){ return others().filter(function(p){ return p.presence.c===cid&&typeof p.presence.l==='string'&&p.presence.l.indexOf('v:')===0; }).map(function(p){ var l=D.LOC[p.presence.l.slice(2)]; return {xy:l?[l.x,l.y]:null}; }); };
NET.sayFor=function(k){ var s=NET.says[k]; return s&&s.until>Date.now()?s.t:null; };

// ---------- HUD + chat drawer ----------
var lastHud='';
NET.hud=function(){ var n=others().length; var h='Chat'+(n?' <span class="dot">'+n+' live</span>':'')+(NET.unread?' <span class="unread">'+NET.unread+'</span>':''); if(h!==lastHud){ lastHud=h; $('chatBtn').innerHTML=h; } };
NET.openChat=function(){ NET.unread=0; renderChat(); setTimeout(function(){ $('chatInput').focus(); },50); };
function renderChat(){ var box=$('chatLog'); if(!box||$('chat').hidden) return; var n=others().length;
  $('chatSub').textContent=NET.mode==='solo'?'Solo mode':(NET.mode==='supabase'&&!NET.connected?'Connecting to live players…':n?n+' other player'+(n>1?'s':'')+' online':'Only you online right now');
  var html='<div class="msg sys">Public chat. Be respectful: no insults, links or phone numbers. Tap Mute on anyone bothering you.</div>';
  html+=NET.log.slice(-90).map(function(m){ if(m.sys) return '<div class="msg sys">'+esc(m.t)+'</div>'; if(m.gist) return '<div class="msg gist">Street gist · <b>'+esc(m.n)+'</b>: '+esc(m.t)+'</div>'; return '<div class="msg"><span class="live">LIVE</span><b>'+esc(m.n)+(m.mine?' (you)':'')+':</b> '+esc(m.t)+'</div>'; }).join('');
  var ppl=others(); if(ppl.length){ html+='<div class="lbl" style="margin:10px 0 4px">Online now</div>'+ppl.slice(0,40).map(function(p){ var pr=p.presence; var where=typeof pr.l==='string'?(pr.l.indexOf('v:')===0&&D.LOC[pr.l.slice(2)]?D.LOC[pr.l.slice(2)].name:(pr.ho?'At home':'Busy')):'On the move';
    return '<div class="row" style="padding:8px 10px;margin-bottom:6px;flex-wrap:wrap"><div class="main"><b>'+esc(cleanName(pr.n))+'</b><small>'+esc(where)+' · '+esc((D.CITIES[pr.c]||{}).name||'')+(pr.job?' · '+esc(String(pr.job).slice(0,30)):'')+'</small></div><button class="btn ghost" style="padding:6px 9px" data-gift="'+esc(p.peer)+'">Gift</button>'+(pr.ho&&pr.c===(E.S&&E.S.city)?'<button class="btn y" style="padding:6px 9px" data-visit="'+esc(p.peer)+'">Visit</button>':'')+'<button class="btn ghost" style="padding:6px 9px" data-mute="'+esc(p.peer)+'">Mute</button></div>'; }).join(''); }
  if(NET.mode==='solo') html+='<div class="msg sys">You are playing solo right now. Live chat comes back when the connection does.</div>';
  box.innerHTML=html; box.scrollTop=box.scrollHeight; }
$('chatLog').addEventListener('click',function(e){ var g=e.target.closest('[data-gift]'); if(g){ NET.giftModal(g.dataset.gift); return; } var v=e.target.closest('[data-visit]'); if(v){ var r=NET.visit(v.dataset.visit); if(r) UI.toast(r,'warn'); else $('chat').hidden=true; return; }
  var mu=e.target.closest('[data-mute]'); if(mu){ NET.mute(mu.dataset.mute); } });
NET.mute=function(peer){ NET.muted[peer]=1; try{ localStorage.setItem('japa-muted',JSON.stringify(NET.muted)); }catch(e){} UI.toast('Muted. You will not see their messages or their Sim.','info'); renderChat(); };
$('chatForm').addEventListener('submit',function(e){ e.preventDefault(); var inp=$('chatInput'); var t=cleanText(inp.value); if(!t) return;
  if(NET.mode==='solo'){ UI.toast('Live chat is offline right now.','warn'); return; }
  if(Date.now()-NET.lastChat<1500){ UI.toast('Slow down small.','warn'); return; } NET.lastChat=Date.now();
  emit('chat',{t:t,n:E.S?E.S.name.split(' ')[0]:'Someone'}).catch(function(err){ UI.toast(err&&err.code==='not_permitted'?'You can watch, but this share does not let you chat.':'Message not sent. Try again.','warn'); });
  inp.value=''; });
NET.brag=function(t){ if(NET.mode==='solo'||!E.S) return; emit('chat',{t:E.S.name.split(' ')[0]+': '+t,n:'Japa Life',sys:1}).catch(function(){}); };

// ---------- player interactions ----------
function peerById(peer){ return NET.peers.filter(function(x){ return x.peer===peer; })[0]; }
NET.playerMenu=function(peer,px,py){ var p=peerById(peer); if(!p) return; var pr=p.presence;
  UI.openMenu(px,py,cleanName(pr.n),'Live player'+(pr.job?' · '+String(pr.job).slice(0,30):''),[
    {label:'Wave 👋',fn:function(){ NET.emoteSet('👋'); }},{label:'Dance 💃',fn:function(){ NET.emoteSet('💃'); }},{label:'Laugh 😂',fn:function(){ NET.emoteSet('😂'); }},
    {label:'Send money',fn:function(){ NET.giftModal(peer); }},{label:'Open chat',fn:function(){ $('chat').hidden=false; NET.openChat(); }},{label:'Mute',sub:'Hide their messages and Sim',fn:function(){ NET.mute(peer); }}]); };
NET.emoteSet=function(e){ NET.emote=e; NET.emoteUntil=Date.now()+3500; };
NET.giftModal=function(peer){ var p=peerById(peer); if(!p||!E.S) return; var name=cleanName(p.presence.n);
  var amts=[1000,10000,100000,1000000].map(function(n){ return E.price(n); });
  UI.openModal('<h2>Send money to '+esc(name)+'</h2><p class="muted">In-game naira only. It leaves your wallet.</p><div class="btns">'+amts.map(function(a){ return '<button class="btn '+(E.S.money>=a?'g':'ghost')+'" data-amt="'+a+'"'+(E.S.money<a?' disabled':'')+'>'+fmt(a)+'</button>'; }).join('')+'</div><div class="btns" style="margin-top:12px"><button class="btn ghost" id="gCancel">Cancel</button></div>');
  var mc=$('modalCard'); $('gCancel').onclick=UI.closeModal;
  mc.querySelectorAll('[data-amt]').forEach(function(b){ b.onclick=function(){ var a=+b.dataset.amt; if(E.S.money<a) return; emit('gift',{to:peer,amt:a,n:E.S.name.split(' ')[0]}).then(function(){ E.S.money-=a; UI.toast('Sent '+fmt(a)+' to '+name+'.','money'); }).catch(function(){ UI.toast('Gift failed. Nothing was taken.','warn'); }); UI.closeModal(); }; }); };
NET.visit=function(peer){ var S=E.S; var p=peerById(peer); if(!p) return 'They went offline.'; var pr=p.presence; var ho=pr.ho;
  if(!ho||typeof ho!=='object'||pr.c!==S.city) return 'They are not at home in '+E.city().name+'.';
  if(S.atWork||S.loc==='travel') return 'You are busy right now.';
  var tier=E.homeTier(String(ho.t),S.city); if(!tier) return 'Can\'t find their house.';
  var spec=D.LAYOUTS[tier.layout]; var L=E.buildLot(spec); L.city=S.city;
  spec.fix.forEach(function(f){ L.items.push({uid:'vf'+f[0]+f[1]+f[2],id:f[0],x:f[1],y:f[2],r:0,fixed:true}); });
  (Array.isArray(ho.i)?ho.i:[]).slice(0,70).forEach(function(a,i){ if(!Array.isArray(a)||!D.ITEMS[a[0]]) return; var x=a[1]|0, y=a[2]|0, r=(a[3]|0)%4; if(x<0||y<0||x>=L.w||y>=L.h) return; L.items.push({uid:'vi'+i,id:a[0],x:x,y:y,r:r,fixed:true}); });
  E.rebuildOcc(L); var fare=E.price(1500); if(S.money<fare) return 'You need '+fmt(fare)+' for a cab.';
  S.money-=fare; E.rt.visitLot=L; E.rt.visitName=cleanName(pr.n)+'\'s '+tier.name.toLowerCase(); E.enterLoc('visit:'+peer); UI.toast('You took a cab to '+cleanName(pr.n)+'\'s place ('+fmt(fare)+').','info'); return null; };

// ---------- leaderboard ----------
NET.ranksHTML=function(){ var h='<div class="card" style="margin-bottom:10px"><dl class="kv"><dt>Your net worth</dt><dd>'+fmt(E.netWorth())+'</dd></dl></div>';
  if(NET.mode==='supabase') fetchBoard();
  if(NET.mode==='solo'||(NET.mode==='artifact'&&!NET.uid)) return h+'<p class="muted">The leaderboard is offline right now.</p>';
  if(!NET.board) return h+'<p class="muted">Loading the leaderboard…</p>';
  if(!NET.board.length) return h+'<p class="muted">No one on the board yet. Yours appears within a minute.</p>';
  var myId=NET.boardId();
  return h+'<div class="list">'+NET.board.map(function(r,i){ var me=r.id===myId; return '<div class="row"'+(me?' style="border-color:var(--danfo)"':'')+'><span class="ic" style="font-family:var(--f-display)">'+(i+1)+'</span><div class="main"><b>'+esc(r.n)+(me?' (you)':'')+'</b><small>'+esc(r.job)+' · '+esc((D.CITIES[r.city]||{}).name||'')+' · day '+r.day+'</small></div><div class="r">'+fmt(r.nw)+'</div></div>'; }).join('')+'</div>'; };

// ---------- street gist (townspeople, clearly marked) ----------
var GIST=['Who else is stuck on Third Mainland right now?','Light just came back in Surulere. UP NEPA!','Amala Shitta queue is long today o','Danfo driver just said "no change" again 😂','Who wan follow me go Quilox tonight?','Rent don due again. Saturday comes too fast.','My visa interview is next week, pray for me','Jollof at the owambe was elite','Fuel queue for Lekki is crazy','Just got promoted at work! God did','Somebody help me, which side is Polling Unit 001?','Computer Village guys sold me a fake charger again','Naira moved again today, japa is calling','Peckham Naija shop has fresh ugu leaves','Who is in Houston? Alief meetup this weekend'];
setInterval(function(){ if(!E.S||UI.creating||document.hidden) return; if(Math.random()<0.55){ var ids=Object.keys(E.S.people).filter(function(id){ return !E.S.people[id].role; }); var p=E.S.people[ids[Math.floor(Math.random()*ids.length)]]; if(!p) return; NET.log.push({gist:true,n:p.name.split(' ')[0],t:GIST[Math.floor(Math.random()*GIST.length)]}); trim(); renderChat(); } },45000);
})();
