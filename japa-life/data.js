/* Japa Life — game content. Plain globals so the engine can run in a browser or in node tests. */
(function (G) {
'use strict';

var SKILLS = {
  charisma:{name:'Charisma'}, tech:{name:'Tech'}, logic:{name:'Logic'}, fitness:{name:'Fitness'},
  music:{name:'Music'}, comedy:{name:'Comedy'}, cooking:{name:'Cooking'}, creativity:{name:'Creativity'}, hustle:{name:'Hustle'}
};
var NEEDS = ['hunger','energy','hygiene','bladder','fun','social'];
var NEED_NAMES = {hunger:'Hunger',energy:'Energy',hygiene:'Hygiene',bladder:'Bladder',fun:'Fun',social:'Social'};
// drain per game hour, from the Lagos Life wiki numbers
var NEED_DECAY = {hunger:5.5,energy:4,hygiene:3.5,bladder:7,fun:4.5,social:3};

var TRAITS = {
  hustler:{name:'Hustler',desc:'Hustle skill grows faster, +10% job performance'},
  foodie:{name:'Foodie',desc:'Cooking grows faster, gets hungry quicker'},
  owambe:{name:'Owambe Spirit',desc:'Parties give double fun, needs people more'},
  bookworm:{name:'Bookworm',desc:'Logic and Tech grow faster'},
  charmer:{name:'Charmer',desc:'Charisma grows faster, conversations land better'},
  gymrat:{name:'Gym Rat',desc:'Fitness grows faster, tires more slowly'},
  nightowl:{name:'Night Owl',desc:'Full of energy after 8pm, sluggish mornings'},
  neat:{name:'Neat Freak',desc:'Stays clean longer, hates a dirty body'},
  comedian:{name:'Comedian',desc:'Comedy grows faster, bored less easily'},
  prayer:{name:'Prayer Warrior',desc:'Worship lifts mood a lot, a little luckier'}
};

var DREAMS = {
  millionaire:{name:'Millionaire',desc:'Reach ₦1,000,000 net worth'},
  billionaire:{name:'Billionaire',desc:'Reach ₦1,000,000,000 net worth'},
  ceo:{name:'Top of the Ladder',desc:'Reach level 5 in any career'},
  legend:{name:'Afrobeats Legend',desc:'Reach level 5 in Music'},
  mumhouse:{name:"Build Mum a House",desc:'Send ₦5,000,000 home in total'},
  japa:{name:'Japa Success',desc:'Get permanent residency abroad'},
  family:{name:'Big Family',desc:'Get married and have two children'},
  landlord:{name:'Landlord',desc:'Own three plots of land'}
};

// ---------- furniture ----------
// kind = how it is drawn; acts = interactions; q = quality multiplier; env = decor score
var ITEMS = {
  mat:{name:'Sleeping mat',cat:'Beds',price:1500,w:1,h:2,kind:'mat',color:'#C9A15A',q:0.7,acts:['sleep','nap'],env:0},
  bunk:{name:'Hostel bunk',cat:'Beds',price:0,w:1,h:2,kind:'bed',color:'#6C7A89',q:0.85,acts:['sleep','nap'],env:0},
  springbed:{name:'Spring bed',cat:'Beds',price:6000,w:1,h:2,kind:'bed',color:'#3E7CB1',q:1,acts:['sleep','nap'],env:0},
  foambed:{name:'Vono foam double',cat:'Beds',price:18000,w:2,h:2,kind:'bed',color:'#B23A48',q:1.15,acts:['sleep','nap','cuddle','baby'],env:1},
  royalbed:{name:'Royal four-poster',cat:'Beds',price:120000,w:2,h:3,kind:'royalbed',color:'#7B2D8B',q:1.35,acts:['sleep','nap','cuddle','baby'],env:4},
  crib:{name:'Baby crib',cat:'Beds',price:45000,w:1,h:2,kind:'crib',color:'#F2C6DE',acts:['feedbaby','playbaby'],env:1},

  pchair:{name:'Plastic chair',cat:'Seating',price:1500,w:1,h:1,kind:'chair',color:'#E63946',acts:['sit'],env:0},
  bench:{name:'Wooden bench',cat:'Seating',price:3000,w:2,h:1,kind:'bench',color:'#8D6346',acts:['sit'],env:0},
  sofa:{name:'Fabric sofa',cat:'Seating',price:25000,w:3,h:1,kind:'sofa',color:'#2A9D8F',q:1,acts:['sit','nap','watchtv'],env:2},
  leather:{name:'Leather sectional',cat:'Seating',price:150000,w:3,h:2,kind:'sofa',color:'#5B3A29',q:1.3,acts:['sit','nap','watchtv'],env:5},
  ctable:{name:'Centre table',cat:'Seating',price:5000,w:2,h:1,kind:'table',color:'#A47148',acts:[],env:1},
  dining:{name:'Dining set',cat:'Seating',price:20000,w:2,h:2,kind:'dining',color:'#6B4226',acts:['eatmeal'],env:2},

  kerosene:{name:'Kerosene stove',cat:'Kitchen',price:4000,w:1,h:1,kind:'stove',color:'#2F6690',q:0.8,acts:['cook','jollof'],env:0},
  gas:{name:'Gas cooker',cat:'Kitchen',price:35000,w:2,h:1,kind:'cooker',color:'#D9D9D9',q:1,acts:['cook','jollof'],env:1},
  chefrange:{name:'Chef range',cat:'Kitchen',price:220000,w:2,h:1,kind:'cooker',color:'#9AA5B1',q:1.3,acts:['cook','jollof'],env:3},
  fridge:{name:'Small fridge',cat:'Kitchen',price:28000,w:1,h:1,kind:'fridge',color:'#F1F3F5',power:true,acts:['snack'],env:0},
  fridge2:{name:'Double-door fridge',cat:'Kitchen',price:180000,w:2,h:1,kind:'fridge',color:'#C0C7CF',power:true,acts:['snack'],env:2},
  cooler:{name:'Food cooler',cat:'Kitchen',price:6000,w:1,h:1,kind:'cooler',color:'#1D70A2',acts:['snack'],env:0},
  ksink:{name:'Kitchen sink',cat:'Kitchen',price:12000,w:1,h:1,kind:'sink',color:'#B8C4CE',acts:['washhands'],env:0},
  mortar:{name:'Mortar & pestle',cat:'Kitchen',price:3000,w:1,h:1,kind:'mortar',color:'#7F5539',acts:['poundyam'],env:1},

  toilet:{name:'Toilet',cat:'Bathroom',price:18000,w:1,h:1,kind:'toilet',color:'#FFFFFF',acts:['toilet'],env:0},
  bucket:{name:'Bucket & bowl',cat:'Bathroom',price:1200,w:1,h:1,kind:'bucket',color:'#2B9348',q:0.8,acts:['bath'],env:0},
  shower:{name:'Shower',cat:'Bathroom',price:30000,w:1,h:1,kind:'shower',color:'#90E0EF',q:1,acts:['bath'],env:0},
  tub:{name:'Bathtub',cat:'Bathroom',price:160000,w:2,h:1,kind:'tub',color:'#FFFFFF',q:1.3,acts:['bath','soak'],env:3},
  basin:{name:'Wash basin',cat:'Bathroom',price:9000,w:1,h:1,kind:'sink',color:'#E9ECEF',acts:['washhands'],env:0},

  tvsmall:{name:'Small TV',cat:'Electronics',price:45000,w:2,h:1,kind:'tv',color:'#222',power:true,acts:['watchtv','watchball'],env:1},
  tvbig:{name:'Smart TV 65"',cat:'Electronics',price:280000,w:3,h:1,kind:'tv',color:'#111',power:true,q:1.4,acts:['watchtv','watchball'],env:3},
  laptop:{name:'Laptop desk',cat:'Electronics',price:120000,w:2,h:1,kind:'desk',color:'#8D99AE',power:true,acts:['code','browse','freelance','stream'],env:1},
  gamingpc:{name:'Gaming PC rig',cat:'Electronics',price:600000,w:2,h:1,kind:'desk',color:'#7209B7',power:true,q:1.4,acts:['code','browse','freelance','game','stream'],env:2},
  speaker:{name:'Bluetooth speaker',cat:'Electronics',price:12000,w:1,h:1,kind:'speaker',color:'#14213D',power:true,acts:['dance'],env:1},
  fan:{name:'Standing fan',cat:'Electronics',price:15000,w:1,h:1,kind:'fan',color:'#EDF2F4',power:true,comfort:0.12,acts:[],env:0},
  ac:{name:'Split AC',cat:'Electronics',price:250000,w:2,h:1,kind:'ac',color:'#F8F9FA',power:true,comfort:0.25,acts:[],env:2},
  gen:{name:'"I pass my neighbour" gen',cat:'Power',price:45000,w:1,h:1,kind:'gen',color:'#F4A261',gen:{tank:4,noisy:true},acts:['genon','genoff','refuel'],env:-2},
  gensilent:{name:'Silent generator',cat:'Power',price:350000,w:2,h:1,kind:'gen',color:'#2A9D8F',gen:{tank:10},acts:['genon','genoff','refuel'],env:0},
  solar:{name:'Inverter + solar',cat:'Power',price:1200000,w:2,h:1,kind:'solar',color:'#023E8A',solar:true,acts:[],env:1},
  ringlight:{name:'Ring light',cat:'Electronics',price:18000,w:1,h:1,kind:'ringlight',color:'#FFF3B0',power:true,acts:['content'],env:0},

  dumbbells:{name:'Dumbbells',cat:'Skills',price:15000,w:1,h:1,kind:'dumbbell',color:'#495057',acts:['workout'],env:0},
  treadmill:{name:'Treadmill',cat:'Skills',price:300000,w:1,h:2,kind:'treadmill',color:'#343A40',power:true,q:1.4,acts:['workout'],env:1},
  keyboard:{name:'Keyboard',cat:'Skills',price:85000,w:2,h:1,kind:'keyboard',color:'#212529',acts:['music'],env:1},
  drum:{name:'Talking drum',cat:'Skills',price:8000,w:1,h:1,kind:'drum',color:'#9C6644',acts:['music'],env:1},
  books:{name:'Bookshelf',cat:'Skills',price:20000,w:2,h:1,kind:'books',color:'#7F5539',acts:['read'],env:2},
  mirror:{name:'Standing mirror',cat:'Skills',price:7000,w:1,h:1,kind:'mirror',color:'#ADE8F4',acts:['speech','jokes'],env:1},
  chess:{name:'Chess table',cat:'Skills',price:25000,w:1,h:1,kind:'chess',color:'#6F4E37',acts:['chess'],env:1},
  sewing:{name:'Sewing machine',cat:'Skills',price:40000,w:1,h:1,kind:'sewing',color:'#264653',acts:['sew'],env:1},
  easel:{name:'Easel',cat:'Skills',price:15000,w:1,h:1,kind:'easel',color:'#E9C46A',acts:['paint'],env:1},
  decks:{name:'DJ decks',cat:'Skills',price:450000,w:2,h:1,kind:'decks',color:'#3A0CA3',power:true,acts:['djmix','dance'],env:2},

  plant:{name:'Pot plant',cat:'Decor',price:4000,w:1,h:1,kind:'plant',color:'#40916C',acts:[],env:2},
  poster:{name:'Super Eagles poster',cat:'Decor',price:1500,w:1,h:1,kind:'poster',color:'#008751',flat:true,acts:[],env:1},
  rug:{name:'Ankara rug',cat:'Decor',price:12000,w:2,h:2,kind:'rug',color:'#E76F51',flat:true,acts:[],env:3},
  adire:{name:'Adire wall art',cat:'Decor',price:25000,w:1,h:1,kind:'art',color:'#1D3557',flat:true,acts:[],env:3},
  bronze:{name:'Bronze head replica',cat:'Decor',price:90000,w:1,h:1,kind:'bronze',color:'#B08D57',acts:[],env:6},
  persian:{name:'Persian rug',cat:'Decor',price:220000,w:3,h:2,kind:'rug',color:'#9D0208',flat:true,acts:[],env:7},
  aquarium:{name:'Aquarium',cat:'Decor',price:150000,w:2,h:1,kind:'aquarium',color:'#48CAE4',power:true,acts:['watchfish'],env:6},
  wardrobe:{name:'Wardrobe',cat:'Decor',price:30000,w:2,h:1,kind:'wardrobe',color:'#8B5E34',acts:['outfit'],env:1},
  prayermat:{name:'Prayer mat',cat:'Decor',price:3000,w:1,h:1,kind:'prayermat',color:'#2D6A4F',flat:true,acts:['pray'],env:1},
  desk:{name:'Study desk',cat:'Skills',price:8000,w:2,h:1,kind:'desk0',color:'#A0704D',acts:['study'],env:0},
  drumwater:{name:'Water drum',cat:'Decor',price:2500,w:1,h:1,kind:'waterdrum',color:'#1E88E5',acts:[],env:0}
};
var CATS = ['Beds','Seating','Kitchen','Bathroom','Electronics','Power','Skills','Decor'];

// ---------- object actions ----------
// rates are per game hour. 'until' ends the action when that need is full.
var ACTS = {
  sleep:{label:'Sleep',dur:600,until:'energy',on:true,pose:'lie',bubble:'💤',rate:{energy:14},slow:0.45,comfort:true},
  nap:{label:'Nap',dur:90,on:true,pose:'lie',bubble:'💤',rate:{energy:10},slow:0.6,comfort:true},
  cuddle:{label:'Cuddle with partner',dur:45,on:true,pose:'lie',bubble:'❤️',rate:{social:40,fun:20},needSpouse:true},
  baby:{label:'Try for baby',dur:30,on:true,pose:'lie',bubble:'❤️',rate:{social:30,fun:20},needSpouse:true,special:'trybaby'},
  sit:{label:'Sit and relax',dur:30,on:true,pose:'sit',rate:{energy:3,fun:2}},
  watchtv:{label:'Watch Nollywood',dur:60,power:true,pose:'sit',bubble:'📺',rate:{fun:32},skill:{}},
  watchball:{label:'Watch Super Eagles replay',dur:90,power:true,pose:'sit',bubble:'⚽',rate:{fun:28,social:6}},
  eatmeal:{label:'Eat at the table',dur:25,pose:'sit',bubble:'🍲',food:1,rate:{hunger:120,fun:10}},
  snack:{label:'Grab something to eat',dur:12,bubble:'🥤',food:1,rate:{hunger:175}},
  cook:{label:'Cook a pot of stew',dur:50,bubble:'🍳',food:2,rate:{hunger:0},skill:{cooking:1},special:'cook'},
  jollof:{label:'Cook party jollof',dur:70,bubble:'🍛',food:3,skill:{cooking:1.4},special:'jollof'},
  poundyam:{label:'Pound yam',dur:40,bubble:'💪',food:1,rate:{hunger:90,energy:-10},skill:{cooking:0.6,fitness:0.6}},
  washhands:{label:'Wash up',dur:5,rate:{hygiene:120}},
  toilet:{label:'Use toilet',dur:6,until:'bladder',on:true,pose:'sit',bubble:'🚽',rate:{bladder:1100}},
  bath:{label:'Take a bath',dur:18,until:'hygiene',on:true,bubble:'🚿',rate:{hygiene:360}},
  soak:{label:'Long bubble soak',dur:45,on:true,pose:'lie',bubble:'🛁',rate:{hygiene:200,fun:25,energy:6}},
  code:{label:'Practise coding',dur:60,power:true,pose:'sit',bubble:'💻',rate:{fun:-6},skill:{tech:1}},
  browse:{label:'Scroll social media',dur:45,power:true,pose:'sit',bubble:'📱',rate:{fun:24,social:14}},
  game:{label:'Play FIFA',dur:60,power:true,pose:'sit',bubble:'🎮',rate:{fun:40}},
  freelance:{label:'Do a freelance gig',dur:120,power:true,pose:'sit',bubble:'💸',rate:{fun:-8},skill:{tech:0.4},special:'freelance'},
  stream:{label:'Livestream',dur:90,power:true,pose:'sit',bubble:'🎥',rate:{social:20,fun:12},skill:{charisma:0.6},special:'stream'},
  content:{label:'Make a skit',dur:60,power:true,bubble:'🎬',rate:{fun:12},skill:{charisma:0.6,creativity:0.6,comedy:0.3},special:'content'},
  dance:{label:'Dance to Afrobeats',dur:40,power:true,bubble:'🎶',rate:{fun:42,energy:-8,hygiene:-6},skill:{fitness:0.3}},
  djmix:{label:'Practise mixing',dur:60,power:true,bubble:'🎧',rate:{fun:20},skill:{music:1}},
  workout:{label:'Work out',dur:60,bubble:'💪',rate:{energy:-14,hygiene:-18,fun:6},skill:{fitness:1}},
  music:{label:'Practise music',dur:60,bubble:'🎵',rate:{fun:16},skill:{music:1}},
  read:{label:'Read a book',dur:60,pose:'stand',bubble:'📖',rate:{fun:6},skill:{logic:0.8,creativity:0.2}},
  study:{label:'Study',dur:60,pose:'sit',bubble:'📚',rate:{fun:-8},skill:{logic:1}},
  speech:{label:'Practise a speech',dur:45,bubble:'🗣️',rate:{fun:4},skill:{charisma:1}},
  jokes:{label:'Practise jokes',dur:45,bubble:'😂',rate:{fun:12},skill:{comedy:1}},
  chess:{label:'Play chess',dur:50,bubble:'♟️',rate:{fun:18},skill:{logic:0.8}},
  sew:{label:'Sew an outfit',dur:90,bubble:'🧵',rate:{fun:8},skill:{creativity:1},special:'sell'},
  paint:{label:'Paint',dur:75,bubble:'🎨',rate:{fun:20},skill:{creativity:1},special:'sell'},
  pray:{label:'Pray',dur:20,bubble:'🙏',rate:{fun:6},special:'pray'},
  outfit:{label:'Change outfit',dur:5,special:'outfit'},
  watchfish:{label:'Watch the fish',dur:30,power:true,rate:{fun:20,energy:4}},
  genon:{label:'Switch on gen',dur:2,special:'genon'},
  genoff:{label:'Switch off gen',dur:2,special:'genoff'},
  refuel:{label:'Buy fuel and refill',dur:10,special:'refuel'},
  feedbaby:{label:'Feed the baby',dur:15,bubble:'🍼',rate:{social:20},special:'feedbaby'},
  playbaby:{label:'Play with the baby',dur:25,bubble:'👶',rate:{fun:30,social:30},special:'playbaby'}
};

// ---------- careers ----------
// pay per shift in Lagos naira; days 0=Sun..6=Sat; start hour, length hours
var CAREERS = {
  banking:{name:'Banking',loc:'ekotrust',skill:'charisma',days:[1,2,3,4,5],start:8,len:8,titles:['Teller','Customer Service Officer','Relationship Manager','Branch Manager','Managing Director'],pay:[4200,7800,14500,27000,55000]},
  tech:{name:'Tech',loc:'cchub',skill:'tech',days:[1,2,3,4,5],start:9,len:8,titles:['Intern Developer','Junior Developer','Senior Engineer','Tech Lead','CTO'],pay:[3600,8500,17000,34000,72000]},
  music:{name:'Music',loc:'shrine',skill:'music',days:[4,5,6,0],start:20,len:4,titles:['Backup Singer','Session Artist','Hit Maker','Headliner','Afrobeats Legend'],pay:[2700,6500,16000,48000,124000]},
  broadcast:{name:'Broadcasting',loc:'radiohouse',skill:'comedy',days:[1,2,3,4,5],start:6,len:6,titles:['Studio Intern','Traffic Reporter','On-Air Personality','Breakfast Show Host','Media Mogul'],pay:[3000,6500,14000,40000,100000]},
  realestate:{name:'Real Estate',loc:'coastline',skill:'charisma',days:[1,2,3,4,5,6],start:10,len:7,titles:['Junior Agent','Agent','Senior Agent','Developer','Property Tycoon'],pay:[3200,7500,18000,45000,105000]},
  aviation:{name:'Aviation',loc:'mmia',skill:'fitness',days:[1,3,5],start:5,len:10,titles:['Ground Staff','Cabin Crew','First Officer','Captain','Chief Pilot'],pay:[5000,12000,30000,70000,158000]},
  medicine:{name:'Medicine',loc:'luth',skill:'logic',days:[1,2,3,4,5],start:8,len:9,titles:['House Officer','Resident Doctor','Registrar','Consultant','Chief Medical Director'],pay:[4500,9000,19000,38000,80000]},
  chef:{name:'Chef',loc:'iyabasira',skill:'cooking',days:[2,3,4,5,6],start:10,len:8,titles:['Kitchen Hand','Line Cook','Sous Chef','Head Chef','Celebrity Chef'],pay:[2500,5500,12000,26000,60000]},
  dj:{name:'DJ',loc:'quilox',skill:'music',days:[3,4,5,6],start:22,len:5,titles:['Hype Man','Resident DJ','Headline DJ','Festival DJ','Global DJ'],pay:[3000,7000,17000,42000,110000]},
  creator:{name:'Content Creator',loc:'home',skill:'charisma',days:[1,2,3,4,5,6],start:12,len:5,titles:['Newbie Creator','Micro-Influencer','Influencer','Celebrity','Internet Icon'],pay:[2400,5200,14000,40000,90000]},
  pm:{name:'Product Management',loc:'kobolabs',skill:'logic',days:[1,2,3,4,5],start:9,len:8,titles:['Associate PM','Product Manager','Senior PM','Group PM','Chief Product Officer'],pay:[4000,9000,19000,40000,92000]},
  trading:{name:'Trading',loc:'balogun',skill:'hustle',days:[1,2,3,4,5,6],start:8,len:9,titles:['Apprentice','Trader','Wholesaler','Importer','Oga Distributor'],pay:[3000,6500,15000,35000,85000]},
  hair:{name:'Hairstyling',loc:'yabamarket',skill:'creativity',days:[2,3,4,5,6],start:9,len:8,titles:['Apprentice','Stylist','Senior Stylist','Salon Owner','Celebrity Stylist'],pay:[2200,5000,11000,25000,60000]},
  comedy:{name:'Stand-up Comedy',loc:'laff',skill:'comedy',days:[5,6,0],start:19,len:4,titles:['Open Mic Comic','Opening Act','Headliner','Arena Comic','Comedy Royalty'],pay:[3000,8000,20000,55000,130000]},
  football:{name:'Football',loc:'stadium',skill:'fitness',days:[1,2,3,4,6],start:7,len:5,titles:['Academy Player','Club Player','NPFL Star','Super Eagle','Ballon d\'Or Nominee'],pay:[2500,7000,22000,70000,170000]},
  law:{name:'Law',loc:'highcourt',skill:'logic',days:[1,2,3,4,5],start:8,len:9,titles:['Pupil','Associate','Senior Associate','Partner','Senior Advocate'],pay:[4000,8500,20000,45000,110000]},
  fashion:{name:'Fashion Design',loc:'ankara',skill:'creativity',days:[1,2,3,4,5,6],start:9,len:8,titles:['Tailor Apprentice','Tailor','Designer','Creative Director','Fashion House Owner'],pay:[2600,6000,14000,32000,78000]},
  dispatch:{name:'Dispatch Rider',loc:'oshodi',skill:'hustle',days:[1,2,3,4,5,6],start:8,len:6,titles:['Rider','Senior Rider','Fleet Captain','Logistics Lead','Logistics Boss'],pay:[2800,4500,8000,14000,24000]}
};
var LEVEL_SKILL = [0,2,4,6,8];  // skill needed to hold level 1..5

// side gigs from the Hustle app
var GIGS = [
  {id:'deliver',name:'Deliver packages',hours:2,skill:'fitness',base:900,per:250,need:{energy:-14,hygiene:-10}},
  {id:'phones',name:'Fix phones at Computer Village',hours:2,skill:'tech',base:800,per:400,need:{fun:-6}},
  {id:'tutor',name:'Tutor a JAMB candidate',hours:2,skill:'logic',base:700,per:380,need:{social:8}},
  {id:'recharge',name:'Sell recharge cards',hours:3,skill:'hustle',base:900,per:300,need:{social:6}},
  {id:'logo',name:'Design a logo',hours:2,skill:'creativity',base:700,per:450,need:{fun:4}},
  {id:'mc',name:'MC a small party',hours:4,skill:'comedy',base:1500,per:700,need:{fun:20,social:20,energy:-10},weekend:true}
];

// ---------- money ladder ----------
var BUSINESSES = [
  {id:'kiosk',name:'Recharge & Data Kiosk',cost:150000,min:2500,max:5500},
  {id:'pos',name:'POS Stand',cost:500000,min:4000,max:9000,risk:'POS robbery'},
  {id:'buka',name:'Buka / Mama Put',cost:2500000,min:40000,max:80000},
  {id:'carwash',name:'Car Wash',cost:15000000,min:200000,max:350000},
  {id:'eventcentre',name:'Event Centre',cost:60000000,min:800000,max:1600000},
  {id:'quilox',name:'Quilox share (5%)',cost:250000000,min:3000000,max:6000000}
];
var CARS = [
  {id:'corolla',name:'Tokunbo Corolla',price:2500000,speed:1,color:'#B0B7C3',kmCost:12},
  {id:'camry',name:'Camry "Muscle"',price:6000000,speed:1.05,color:'#1B263B',kmCost:14},
  {id:'prado',name:'Toyota Prado',price:25000000,speed:1.1,color:'#F8F9FA',kmCost:18},
  {id:'gwagon',name:'G-Wagon',price:120000000,speed:1.15,color:'#0B0B0B',kmCost:24}
];
var LAND = [
  {id:'imota',name:'Imota plot',loc:'imota',price:2000000,growth:0.004},
  {id:'ibeju',name:'Ibeju-Lekki plot',loc:'lekkimarket',price:8000000,growth:0.006},
  {id:'lekkiland',name:'Lekki Phase 1 plot',loc:'lekkip1',price:60000000,growth:0.005},
  {id:'bananaland',name:'Banana Island plot',loc:'banana',price:500000000,growth:0.004}
];

// ---------- houses ----------
// rooms: [x,y,w,h,floor,name,owned]; doors: [x,y,'h'|'v'] (h = edge above tile x,y; v = edge left of tile x,y)
var LAYOUTS = {
  hall:{w:11,h:8,ground:'paving',rooms:[[1,1,6,5,'concrete','Hostel room',1],[8,1,2,3,'tile','Shared bathroom',0]],doors:[[3,6,'h'],[8,4,'h']],fix:[['bunk',1,1],['desk',3,1],['toilet',8,1],['shower',9,1]]},
  faceme:{w:12,h:9,ground:'dirt',rooms:[[1,1,5,4,'concrete','Your room',1],[8,1,2,2,'concrete','Shared toilet',0],[10,1,2,2,'concrete','Bathroom',0],[7,5,5,3,'concrete','Neighbours',-1]],doors:[[3,5,'h'],[8,3,'h'],[10,3,'h']],fix:[['toilet',8,1],['bucket',10,1],['drumwater',6,6]]},
  selfcon:{w:12,h:9,ground:'paving',rooms:[[1,1,7,6,'tiles','Self-contain',1],[8,1,3,3,'tile','Bathroom',1]],doors:[[4,7,'h'],[8,2,'v']],fix:[['toilet',10,1],['basin',9,1],['shower',10,3]]},
  miniflat:{w:18,h:12,ground:'grass',rooms:[[1,1,8,6,'tiles','Living room',1],[9,1,6,6,'wood','Bedroom',1],[1,7,5,4,'tile','Kitchen',1],[6,7,4,4,'tile','Bathroom',1]],doors:[[4,1,'h'],[9,3,'v'],[2,7,'h'],[7,7,'h']],fix:[['ksink',1,10],['gas',2,10],['fridge',4,10],['toilet',9,10],['shower',6,10],['basin',9,8]],parking:[15,8]},
  duplex:{w:22,h:14,ground:'grass',rooms:[[1,1,9,7,'terrazzo','Living room',1],[10,1,6,7,'tile','Kitchen',1],[16,1,5,7,'carpet','Master bedroom',1],[1,8,6,5,'wood','Bedroom 2',1],[7,8,5,5,'wood','Study',1],[12,8,4,5,'tile','Bathroom',1],[16,8,5,5,'tile','Ensuite',1]],doors:[[5,1,'h'],[10,4,'v'],[16,4,'v'],[3,8,'h'],[8,8,'h'],[13,8,'h'],[18,8,'h']],fix:[['gas',11,1],['ksink',13,1],['fridge2',14,1],['toilet',15,12],['shower',12,12],['basin',14,12],['tub',19,12],['toilet',16,12],['basin',17,12]],parking:[0,13]},
  mansion:{w:26,h:16,ground:'grass',pool:[18,10,6,4],rooms:[[1,1,10,8,'marble','Grand living room',1],[11,1,6,8,'tile','Kitchen',1],[17,1,8,8,'carpet','Master suite',1],[1,9,6,6,'wood','Guest room',1],[7,9,5,6,'rubber','Home gym',1],[12,9,5,6,'marble','Bathroom',1]],doors:[[5,1,'h'],[11,4,'v'],[17,4,'v'],[3,9,'h'],[9,9,'h'],[14,9,'h'],[20,9,'h']],fix:[['chefrange',12,1],['ksink',14,1],['fridge2',15,1],['tub',15,14],['toilet',12,14],['basin',13,14],['shower',12,10]],parking:[0,15]},
  hotel:{w:10,h:8,ground:'carpet',rooms:[[1,1,6,5,'carpet','Hotel room',0],[7,1,2,3,'tile','Ensuite',0]],doors:[[3,6,'h'],[7,2,'v']],fix:[['foambed',1,1],['tvsmall',4,1],['toilet',8,1],['shower',8,3]]},
  abroom:{w:12,h:9,ground:'paving',rooms:[[1,1,6,5,'carpet','Your room',1],[8,1,3,3,'tile','Shared bathroom',0],[1,7,5,2,'tile','Shared kitchen',0]],doors:[[3,6,'h'],[8,4,'h'],[2,7,'h']],fix:[['toilet',10,1],['shower',8,1],['ksink',1,8],['gas',3,8],['fridge',5,8]]},
  studio:{w:13,h:9,ground:'paving',rooms:[[1,1,8,6,'wood','Studio',1],[9,1,3,3,'tile','Bathroom',1]],doors:[[4,7,'h'],[9,2,'v']],fix:[['toilet',11,1],['basin',10,1],['shower',11,3],['ksink',1,6],['gas',2,6],['fridge',5,6]]}
};

var HOMES_NG = [
  {id:'hall',name:'Hall of residence',area:'unilag',rent:1200,power:0.45,layout:'hall',note:'Fresher hostel. Shared bathroom.'},
  {id:'faceme',name:'Face-me-I-face-you room',area:'mushin',rent:2400,power:0.35,layout:'faceme',note:'One room, shared toilet in the compound.'},
  {id:'selfcon',name:'Self-contain',area:'yaba',rent:6000,power:0.5,layout:'selfcon',note:'Your own room and bathroom.'},
  {id:'miniflat',name:'Mini-flat',area:'lekkip1',rent:17000,power:0.65,layout:'miniflat',note:'Living room, bedroom, kitchen.'},
  {id:'duplex',name:'Duplex',area:'ikoyi',rent:250000,power:0.85,layout:'duplex',note:'Big family house with a study.'},
  {id:'mansion',name:'Mansion',area:'banana',rent:1500000,power:0.95,layout:'mansion',note:'Pool, home gym, Banana Island address.'}
];
var HOMES_ABROAD = [
  {id:'abroom',name:'Room in a shared house',rent:2500,power:1,layout:'abroom',note:'Shared bathroom and kitchen.'},
  {id:'studio',name:'Studio flat',rent:5200,power:1,layout:'studio',note:'Your own kitchenette and bathroom.'},
  {id:'miniflat',name:'One-bed apartment',rent:9500,power:1,layout:'miniflat',note:'Living room, bedroom, kitchen.'},
  {id:'duplex',name:'Family house',rent:24000,power:1,layout:'duplex',note:'Room for a growing family.'}
];

// ---------- venue activities ----------
// cost in Lagos naira; prop = prop kind the Sim walks to
var VENUE_ACTS = {
  buka:[{id:'amala',label:'Eat amala & ewedu',dur:30,cost:600,rate:{hunger:140,fun:10},prop:'table',bubble:'🍲'},
        {id:'suya',label:'Eat suya',dur:20,cost:500,rate:{hunger:110,fun:16},prop:'table',bubble:'🍢'},
        {id:'takeaway',label:'Buy takeaway packs (+3 food)',dur:10,cost:1500,special:'takeaway',prop:'counter'},
        {id:'gist',label:'Gist with the people',dur:40,rate:{social:60,fun:12},prop:'bench',bubble:'💬'}],
  club:[{id:'dance',label:'Dance',dur:60,cost:0,rate:{fun:50,social:30,energy:-12,hygiene:-10},skill:{fitness:0.3},prop:'dancefloor',bubble:'🕺',party:true},
        {id:'drinks',label:'Buy drinks at the bar',dur:30,cost:2500,rate:{fun:30,social:30,bladder:-40},prop:'bar',bubble:'🥂',party:true},
        {id:'bottle',label:'Bottle service in VIP (be a big boy)',dur:60,cost:50000,rate:{fun:70,social:70},special:'bigboy',prop:'vip',bubble:'🍾',party:true},
        {id:'perform',label:'Perform on stage',dur:60,cost:0,rate:{fun:30,energy:-14},skill:{music:0.6},special:'perform',prop:'stage',bubble:'🎤'}],
  comedy:[{id:'watchcomedy',label:'Watch the show',dur:90,cost:3000,rate:{fun:50,social:20},prop:'table',bubble:'😂'},
          {id:'openmic',label:'Open mic night',dur:30,cost:0,rate:{fun:12},skill:{comedy:0.8},special:'openmic',prop:'stage',bubble:'🎤'}],
  beach:[{id:'swim',label:'Swim',dur:45,rate:{fun:40,energy:-12,hygiene:-20},skill:{fitness:0.6},prop:'shore',bubble:'🏊'},
         {id:'relax',label:'Relax under an umbrella',dur:60,cost:1000,rate:{fun:28,energy:8},prop:'umbrella',bubble:'😎'},
         {id:'horse',label:'Ride a horse',dur:20,cost:2000,rate:{fun:45},prop:'horse',bubble:'🐎'},
         {id:'beachparty',label:'Join the beach party',dur:90,cost:1500,rate:{fun:50,social:50,energy:-10},prop:'bonfire',bubble:'🔥',party:true,hours:[16,23]}],
  market:[{id:'groceries',label:'Buy foodstuff (+6 food)',dur:30,cost:1800,special:'groceries',prop:'stall',bubble:'🛒'},
          {id:'clothes',label:'Shop for clothes',dur:30,cost:4000,special:'outfit',prop:'stall',bubble:'👕'},
          {id:'ring',label:'Buy an engagement ring',dur:20,cost:150000,special:'ring',prop:'stall',bubble:'💍'},
          {id:'haggle',label:'Haggle with traders',dur:40,rate:{fun:14,social:30},skill:{hustle:0.8},prop:'stall',bubble:'🗣️'}],
  mall:[{id:'shoprite',label:'Supermarket run (+6 food)',dur:30,cost:2600,special:'groceries',prop:'checkout',bubble:'🛒'},
        {id:'cinema',label:'Watch a movie',dur:120,cost:3500,rate:{fun:44,social:10},prop:'cinema',bubble:'🎬'},
        {id:'clothesmall',label:'Buy designer clothes',dur:30,cost:15000,special:'outfit',prop:'shopfront',bubble:'🛍️'},
        {id:'foodcourt',label:'Eat at the food court',dur:30,cost:2000,rate:{hunger:120,fun:10},prop:'table',bubble:'🍔'},
        {id:'ringmall',label:'Buy a diamond ring',dur:20,cost:450000,special:'ring',prop:'shopfront',bubble:'💍'}],
  campus:[{id:'class',label:'Attend a lecture',dur:120,cost:0,special:'class',prop:'desk',bubble:'📚',hours:[8,18]},
          {id:'library',label:'Study in the library',dur:90,rate:{fun:-6},skill:{logic:1},prop:'books',bubble:'📖'},
          {id:'hangout',label:'Hang out with students',dur:45,rate:{social:50,fun:24},prop:'bench',bubble:'💬'}],
  office:[{id:'visit',label:'Ask about jobs here',dur:15,special:'jobsHere',prop:'counter',bubble:'📄'}],
  tech:[{id:'cowork',label:'Co-work for the day',dur:180,cost:2000,rate:{social:12},skill:{tech:1.2},prop:'desk',bubble:'💻'},
        {id:'hackathon',label:'Enter a hackathon',dur:240,cost:0,special:'hackathon',prop:'desk',bubble:'🏆',days:[6]},
        {id:'visit',label:'Ask about jobs here',dur:15,special:'jobsHere',prop:'counter',bubble:'📄'}],
  church:[{id:'service',label:'Attend service',dur:120,rate:{social:40,fun:22},special:'worship',prop:'pew',bubble:'🙏'},
          {id:'offering',label:'Give offering (₦2,000)',dur:5,cost:2000,special:'offering',prop:'altar'}],
  mosque:[{id:'jumat',label:'Pray with the congregation',dur:60,rate:{social:35,fun:12},special:'worship',prop:'rug',bubble:'🙏'},
          {id:'sadaqah',label:'Give sadaqah (₦2,000)',dur:5,cost:2000,special:'offering',prop:'rug'}],
  hospital:[{id:'checkup',label:'See a doctor',dur:60,cost:8000,special:'heal',prop:'counter',bubble:'🩺'},
            {id:'rest',label:'Rest in the ward',dur:120,cost:5000,rate:{energy:16},prop:'hbed',bubble:'🛏️'}],
  gym:[{id:'gymwork',label:'Train',dur:90,cost:1500,rate:{energy:-12,hygiene:-20,fun:10},skill:{fitness:1.4},prop:'treadmill',bubble:'🏋️'},
       {id:'boxing',label:'Boxing class',dur:60,cost:2500,rate:{energy:-16,hygiene:-20,fun:16},skill:{fitness:1.6},prop:'ring',bubble:'🥊'}],
  golf:[{id:'golf',label:'Play nine holes',dur:150,cost:25000,rate:{fun:30,social:30},skill:{charisma:0.8,fitness:0.4},prop:'green',bubble:'⛳'},
        {id:'network',label:'Network at the clubhouse',dur:60,cost:5000,rate:{social:50},skill:{charisma:1},prop:'table',bubble:'🤝'}],
  park:[{id:'canopy',label:'Canopy walk',dur:60,cost:3000,rate:{fun:40,energy:-6},prop:'canopy',bubble:'🌳'},
        {id:'jog',label:'Jog',dur:45,rate:{energy:-12,hygiene:-14,fun:14},skill:{fitness:0.9},prop:'path',bubble:'🏃'},
        {id:'picnic',label:'Picnic',dur:60,cost:1500,rate:{hunger:60,fun:24,social:20},prop:'bench',bubble:'🧺'}],
  airport:[{id:'fly',label:'Book a flight',dur:5,special:'flights',prop:'checkin',bubble:'✈️'},
           {id:'chops',label:'Eat at the lounge',dur:30,cost:4000,rate:{hunger:110,fun:8},prop:'seat',bubble:'🥪'},
           {id:'visit',label:'Ask about jobs here',dur:15,special:'jobsHere',prop:'checkin',bubble:'📄'}],
  bank:[{id:'loan',label:'Talk to a loan officer',dur:20,special:'bank',prop:'counter',bubble:'🏦'},
        {id:'visit',label:'Ask about jobs here',dur:15,special:'jobsHere',prop:'counter',bubble:'📄'}],
  radio:[{id:'callin',label:'Win prizes on the call-in show',dur:20,special:'callin',prop:'mic',bubble:'📻'},
         {id:'visit',label:'Ask about jobs here',dur:15,special:'jobsHere',prop:'counter',bubble:'📄'}],
  casino:[{id:'roulette',label:'Play roulette',dur:30,special:'roulette',prop:'roulette',bubble:'🎰'},
          {id:'casinobar',label:'Drinks at the bar',dur:30,cost:4000,rate:{fun:24,social:24},prop:'bar',bubble:'🥂'}],
  polling:[{id:'vote',label:'Vote in the governorship election',dur:40,special:'vote',prop:'ballot',bubble:'🗳️'},
           {id:'politics',label:'Argue politics',dur:30,rate:{social:40,fun:10},skill:{charisma:0.4},prop:'canopy',bubble:'🗣️'}],
  event:[{id:'owambe',label:'Join the owambe',dur:180,cost:0,rate:{fun:50,social:60,hunger:50,energy:-8},special:'owambe',prop:'tables',bubble:'💃',party:true,days:[6]},
         {id:'wedding',label:'Host your wedding',dur:240,special:'wedding',prop:'stage',bubble:'💒'}],
  stadium:[{id:'match',label:'Watch an NPFL match',dur:120,cost:1000,rate:{fun:45,social:40},prop:'seats',bubble:'⚽',days:[0,3,6]},
           {id:'kickabout',label:'Play five-a-side',dur:60,rate:{fun:30,energy:-14,hygiene:-16},skill:{fitness:1},prop:'pitch',bubble:'⚽'}],
  estate:[{id:'househunt',label:'Look at houses here',dur:30,special:'househunt',prop:'sign',bubble:'🏠'},
          {id:'buyland',label:'Buy land here',dur:30,special:'buyland',prop:'sign',bubble:'📜'},
          {id:'stroll',label:'Stroll around',dur:30,rate:{fun:12,energy:-4},prop:'path',bubble:'🚶'}],
  restaurant:[{id:'eatout',label:'Eat a proper meal',dur:40,cost:2500,rate:{hunger:140,fun:16},prop:'table',bubble:'🍽️'},
              {id:'visit',label:'Ask about jobs here',dur:15,special:'jobsHere',prop:'counter',bubble:'📄'}],
  shrine:[{id:'shrineshow',label:'Watch the band',dur:90,cost:2000,rate:{fun:50,social:30},prop:'stage',bubble:'🎷',party:true},
          {id:'perform',label:'Jam with the band',dur:60,rate:{fun:30,energy:-12},skill:{music:0.8},special:'perform',prop:'stage',bubble:'🎤'},
          {id:'visit',label:'Ask about jobs here',dur:15,special:'jobsHere',prop:'counter',bubble:'📄'}],
  naijashop:[{id:'groceries',label:'Buy Naija foodstuff (+6 food)',dur:30,cost:2400,special:'groceries',prop:'stall',bubble:'🛒'},
             {id:'gist',label:'Gist with fellow Naija people',dur:40,rate:{social:70,fun:20},prop:'bench',bubble:'💬'},
             {id:'remit',label:'Send money home',dur:10,special:'remitapp',prop:'counter',bubble:'💸'}],
  jobcentre:[{id:'visit',label:'Look at job openings',dur:30,special:'jobsHere',prop:'counter',bubble:'📄'},
             {id:'visaoffice',label:'Immigration desk',dur:20,special:'visa',prop:'counter',bubble:'🛂'}]
};
VENUE_ACTS.office.push({id:'coffee',label:'Grab coffee',dur:15,cost:800,rate:{energy:12,fun:4},prop:'cooler',bubble:'☕'});
VENUE_ACTS.studio = VENUE_ACTS.office;

var HOURS = {club:[21,5],comedy:[18,24],shrine:[18,3],market:[7,19],mall:[9,21],beach:[7,22],campus:[7,22],park:[7,19],golf:[6,18],gym:[5,22],casino:[18,6],polling:[8,17],buka:[7,23],restaurant:[9,23],naijashop:[8,21],jobcentre:[8,18],bank:[8,16]};

// ---------- cities and maps ----------
// map is 1000 x 640. land/water polygons are drawn in order.
var CITIES = {
  lagos:{name:'Lagos',country:'Nigeria',flag:'NG',home:true,abroad:false,cost:1,pay:1,curr:'₦',fx:1,
    transport:['trek','keke','danfo','okada','cab','car'],
    sea:'#2E86AB',
    land:[
      {c:'#E8D5B0',p:[[0,0],[1000,0],[1000,170],[880,185],[780,215],[680,240],[600,272],[548,310],[505,345],[472,380],[420,398],[384,424],[364,470],[330,520],[250,560],[0,585]]},
      {c:'#E2CFA8',p:[[408,418],[470,405],[520,412],[518,452],[470,468],[420,462]]},
      {c:'#DCEFD0',p:[[522,398],[600,388],[612,418],[590,452],[522,452]]},
      {c:'#DCEFD0',p:[[602,378],[632,372],[640,392],[612,400]]},
      {c:'#EADCBB',p:[[420,466],[522,456],[600,456],[680,452],[1000,410],[1000,520],[760,528],[600,532],[520,525],[440,512]]},
      {c:'#EADCBB',p:[[380,530],[440,522],[460,540],[400,552]]}
    ],
    lagoon:{c:'#4FA3C7',p:[[620,262],[1000,175],[1000,405],[680,448],[612,452],[612,420],[640,392],[600,380],[522,398],[505,348]]},
    roads:[
      {n:'Third Mainland Bridge',w:5,p:[[560,286],[530,330],[498,372],[476,410]]},
      {n:'Ikorodu Road',w:4,p:[[300,130],[360,200],[430,260],[560,286],[700,240],[930,120]]},
      {n:'Agege Motor Road',w:3,p:[[250,50],[300,130],[330,250],[300,320],[340,340],[380,270],[430,260]]},
      {n:'Eko Bridge',w:4,p:[[300,320],[380,410],[430,440]]},
      {n:'Lekki-Epe Expressway',w:5,p:[[470,462],[540,470],[620,478],[700,476],[820,466],[1000,446]]},
      {n:'Falomo',w:3,p:[[520,452],[560,420],[612,396]]},
      {n:'Ozumba Mbadiwe',w:3,p:[[450,440],[480,470],[540,470]]}
    ],
    labels:[['IKEJA',300,80],['SURULERE',290,370],['YABA',470,240],['MUSHIN',340,290],['LAGOS ISLAND',440,476],['IKOYI',560,440],['VICTORIA ISLAND',520,505],['LEKKI',760,505],['LAGOS LAGOON',780,320],['ATLANTIC OCEAN',700,600],['IMOTA',930,150]],
    billboards:[[380,215],[650,462],[860,452],[520,300]]
  },
  abuja:{name:'Abuja',country:'Nigeria',flag:'NG',abroad:false,cost:1.15,pay:1.1,curr:'₦',fx:1,transport:['trek','keke','cab','car'],
    sea:'#7FB069',land:[{c:'#E9DFC4',p:[[0,0],[1000,0],[1000,640],[0,640]]},{c:'#9CC69B',p:[[600,60],[780,40],[860,160],[700,220],[580,170]]}],
    lagoon:{c:'#5BA4CF',p:[[120,420],[260,380],[330,450],[240,520],[130,500]]},
    roads:[{n:'Airport Road',w:5,p:[[80,600],[300,420],[500,320],[700,200]]},{n:'Ring Road',w:4,p:[[200,200],[500,140],[800,300],[700,480],[400,520],[200,200]]}],
    labels:[['ASO HILL',720,130],['WUSE',420,250],['GARKI',520,420],['JABI',230,330]],billboards:[[400,300],[650,260]]},
  ph:{name:'Port Harcourt',country:'Nigeria',flag:'NG',abroad:false,cost:1.05,pay:1.05,curr:'₦',fx:1,transport:['trek','keke','okada','cab','car'],
    sea:'#2E86AB',land:[{c:'#E3D3AE',p:[[0,0],[1000,0],[1000,380],[700,430],[400,470],[0,520]]}],
    lagoon:{c:'#4FA3C7',p:[[650,250],[1000,200],[1000,320],[700,330]]},
    roads:[{n:'Aba Road',w:5,p:[[100,120],[400,220],[700,180],[950,120]]},{n:'Ikwerre Road',w:4,p:[[380,40],[400,220],[420,420]]}],
    labels:[['GRA',300,160],['MILE 1',420,300],['TRANS-AMADI',700,260],['BONNY RIVER',800,420]],billboards:[[300,230],[620,200]]},
  london:{name:'London',country:'United Kingdom',flag:'UK',abroad:true,cost:1.25,pay:1.2,curr:'£',fx:0.00051,transport:['walk','bus','train','uber','car'],cold:true,
    sea:'#7A9E9F',land:[{c:'#D9DED6',p:[[0,0],[1000,0],[1000,640],[0,640]]}],
    lagoon:{c:'#6A8EAE',p:[[0,300],[200,280],[350,330],[500,300],[650,350],[800,320],[1000,360],[1000,400],[800,365],[650,395],[500,345],[350,375],[200,325],[0,345]]},
    roads:[{n:'A2',w:4,p:[[400,640],[450,400],[480,200],[520,0]]},{n:'A13',w:4,p:[[480,200],[700,260],[1000,280]]},{n:'M4',w:5,p:[[0,150],[300,180],[480,200]]}],
    labels:[['PECKHAM',540,520],['CANARY WHARF',760,270],['BRIXTON',400,560],['HEATHROW',90,120],['RIVER THAMES',300,355],['CENTRAL',470,230]],billboards:[[300,190],[700,250]]},
  houston:{name:'Houston',country:'United States',flag:'US',abroad:true,cost:1,pay:1.25,curr:'$',fx:0.00065,transport:['walk','bus','uber','car'],
    sea:'#83C5BE',land:[{c:'#E6DCC3',p:[[0,0],[1000,0],[1000,640],[0,640]]}],
    lagoon:{c:'#6FA8DC',p:[[0,380],[300,350],[600,390],[1000,360],[1000,385],[600,415],[300,375],[0,405]]},
    roads:[{n:'I-10',w:5,p:[[0,300],[1000,300]]},{n:'I-69',w:5,p:[[200,640],[500,300],[800,0]]},{n:'Beltway 8',w:4,p:[[150,150],[850,150],[850,560],[150,560],[150,150]]}],
    labels:[['ALIEF',180,470],['DOWNTOWN',540,270],['GALLERIA',360,330],['BUFFALO BAYOU',260,400],['IAH',700,60]],billboards:[[420,300],[700,150]]},
  toronto:{name:'Toronto',country:'Canada',flag:'CA',abroad:true,cost:1.05,pay:1.05,curr:'C$',fx:0.00088,transport:['walk','bus','train','uber','car'],cold:true,
    sea:'#5DA9E9',land:[{c:'#DDE5DA',p:[[0,0],[1000,0],[1000,460],[700,480],[400,470],[0,500]]}],
    lagoon:{c:'#5DA9E9',p:[[0,500],[400,470],[700,480],[1000,460],[1000,640],[0,640]]},
    roads:[{n:'Highway 401',w:5,p:[[0,120],[1000,140]]},{n:'Gardiner Expressway',w:4,p:[[0,440],[1000,420]]},{n:'Yonge Street',w:4,p:[[520,0],[520,450]]}],
    labels:[['BRAMPTON',140,80],['DOWNTOWN',560,400],['SCARBOROUGH',840,200],['LAKE ONTARIO',500,580]],billboards:[[300,130],[700,425]]},
  dubai:{name:'Dubai',country:'United Arab Emirates',flag:'AE',abroad:true,cost:1.05,pay:1.1,curr:'AED',fx:0.0024,transport:['walk','bus','train','uber','car'],
    sea:'#38A3A5',land:[{c:'#EFE0BB',p:[[0,0],[1000,0],[1000,400],[0,560]]},{c:'#EFE0BB',p:[[220,520],[300,480],[330,520],[260,560]]}],
    lagoon:{c:'#57CC99',p:[[600,0],[640,0],[660,200],[620,330],[600,330],[630,200]]},
    roads:[{n:'Sheikh Zayed Road',w:6,p:[[0,470],[500,330],[1000,180]]}],
    labels:[['DEIRA',800,150],['DOWNTOWN',520,300],['JBR',170,440],['ARABIAN GULF',300,600]],billboards:[[350,380],[700,280]]},
  girne:{name:'Girne',country:'North Cyprus',flag:'CY',abroad:true,cost:0.5,pay:0.45,curr:'₺',fx:0.022,transport:['walk','bus','uber','car'],
    sea:'#3D8EB9',land:[{c:'#E9E1C7',p:[[0,200],[300,180],[600,220],[1000,190],[1000,640],[0,640]]},{c:'#B5C99A',p:[[0,420],[1000,400],[1000,640],[0,640]]}],
    lagoon:null,
    roads:[{n:'Coast road',w:4,p:[[0,260],[1000,250]]},{n:'Lefkoşa road',w:5,p:[[500,250],[520,640]]}],
    labels:[['HARBOUR',460,215],['KYRENIA MOUNTAINS',500,470],['MEDITERRANEAN',300,90]],billboards:[[300,260],[650,260]]}
};

// locations: id, name, city, type, x, y, area, desc
var LOCS = [
  // Lagos — mainland
  ['mmia','Murtala Muhammed Airport','lagos','airport',250,48,'Ikeja','Flights to Abuja, PH and the world.'],
  ['shrine','New Afrika Shrine','lagos','shrine',265,96,'Ikeja','Live Afrobeat every night.'],
  ['icm','Ikeja City Mall','lagos','mall',332,104,'Ikeja','Supermarket, cinema, designer shops.'],
  ['compvillage','Computer Village','lagos','market',288,140,'Ikeja','Phones, laptops and endless hustle.'],
  ['radiohouse','Naija Radio House','lagos','radio',358,142,'Ikeja','Home of the breakfast show.'],
  ['oshodi','Oshodi Market','lagos','market',365,195,'Oshodi','Busiest market under the bridge. Dispatch riders base here.'],
  ['mushin','Mushin','lagos','estate',335,255,'Mushin','Face-me-I-face-you country. Cheap rooms.'],
  ['luth','LUTH Teaching Hospital','lagos','hospital',395,275,'Idi-Araba','Doctors, nurses, long queues.'],
  ['iyabasira','Iya Basira Kitchen','lagos','restaurant',245,300,'Surulere','The best ofada stew on the mainland.'],
  ['shitta','Amala Shitta','lagos','buka',298,322,'Surulere','The legendary amala spot.'],
  ['stadium','National Stadium','lagos','stadium',345,345,'Surulere','Five-a-side and NPFL matches.'],
  ['ironparadise','Iron Paradise Gym','lagos','gym',262,355,'Surulere','No AC, just results.'],
  ['unilag','UNILAG','lagos','campus',488,265,'Akoka','University of Lagos. Lectures and the library.'],
  ['cchub','CcHub','lagos','tech',430,292,'Yaba','Lagos tech hub. Startups and hackathons.'],
  ['yaba','Yaba','lagos','estate',462,312,'Yaba','Self-contains, students and techies.'],
  ['yabamarket','Yaba Market','lagos','market',438,338,'Yaba','Salons, okrika and fabric.'],
  ['imota','Imota','lagos','estate',930,112,'Ikorodu','Cheap land, far from everything.'],
  // Island
  ['balogun','Balogun Market','lagos','market',440,432,'Lagos Island','Everything is sold here.'],
  ['mosque','Lagos Central Mosque','lagos','mosque',468,425,'Lagos Island','Jumat prayers every Friday.'],
  ['polling','Polling Unit 001','lagos','polling',496,416,'Lagos Island','Vote for governor on election day.'],
  ['highcourt','Lagos High Court','lagos','office',428,452,'Lagos Island','Wigs, gowns and long adjournments.'],
  ['cathedral','Cathedral Church','lagos','church',462,450,'Marina','Sunday service and choir.'],
  ['ekotrust','Eko Trust Bank HQ','lagos','bank',500,444,'Marina','Banking jobs and loans.'],
  // Ikoyi
  ['golf','Ikoyi Golf Club','lagos','golf',548,410,'Ikoyi','Old money plays golf here.'],
  ['ikoyi','Ikoyi','lagos','estate',578,436,'Ikoyi','Duplexes behind high gates.'],
  ['banana','Banana Island','lagos','estate',620,386,'Ikoyi','The most expensive address in Nigeria.'],
  // VI
  ['laff','Laff Factory','lagos','comedy',470,492,'Victoria Island','Stand-up every weekend.'],
  ['owambe','Grand Owambe Event Centre','lagos','event',445,505,'Victoria Island','Weddings and Saturday parties.'],
  ['kobolabs','Kobo Labs','lagos','tech',540,466,'Victoria Island','Fintech startup with free lunch.'],
  ['quilox','Quilox','lagos','club',522,488,'Victoria Island','The most famous club in Lagos.'],
  ['casino','Eko Casino','lagos','casino',565,494,'Victoria Island','Roulette and drinks. Play responsibly.'],
  ['landmark','Landmark Beach','lagos','beach',596,515,'Victoria Island','Clean sand, beach parties.'],
  ['tarkwa','Tarkwa Bay','lagos','beach',412,538,'Lagos Harbour','Quiet beach by boat.'],
  // Lekki
  ['ankara','Ankara House','lagos','studio',636,494,'Lekki','Fashion house and atelier.'],
  ['lekkip1','Lekki Phase 1','lagos','estate',665,474,'Lekki','Mini-flats and big dreams.'],
  ['palms','The Palms Mall','lagos','mall',705,488,'Lekki','Supermarket and cinema.'],
  ['coastline','Coastline Realty','lagos','office',728,466,'Lekki','Real estate agency.'],
  ['elegushi','Elegushi Beach','lagos','beach',690,514,'Lekki','The party beach.'],
  ['lcc','Lekki Conservation Centre','lagos','park',770,484,'Lekki','The longest canopy walkway in Africa.'],
  ['lekkimarket','Lekki Market','lagos','market',820,474,'Lekki','Arts, crafts, and plots for sale nearby.'],
  // Abuja
  ['abv','Nnamdi Azikiwe Airport','abuja','airport',100,580,'Airport Road','Flights in and out of Abuja.'],
  ['wuse','Wuse Market','abuja','market',420,250,'Wuse','Biggest market in Abuja.'],
  ['jabi','Jabi Lake Mall','abuja','mall',240,330,'Jabi','Lakeside mall.'],
  ['natmosque','National Mosque','abuja','mosque',520,330,'Central Area','Golden dome.'],
  ['millennium','Millennium Park','abuja','park',640,240,'Maitama','Green and quiet.'],
  ['cbd','Central Business District','abuja','office',520,420,'CBD','Offices and ministries.'],
  ['garki','Garki','abuja','estate',600,470,'Garki','Flats near the market.'],
  ['abujabuka','Wuse Suya Spot','abuja','buka',380,160,'Wuse','Suya and cold drinks.'],
  // PH
  ['phc','Port Harcourt Airport','ph','airport',150,60,'Omagwa','Airport.'],
  ['mile1','Mile 1 Market','ph','market',420,300,'Mile 1','Market for everything.'],
  ['pleasure','Pleasure Park','ph','park',300,220,'GRA','Family park.'],
  ['transamadi','Trans-Amadi','ph','office',700,230,'Trans-Amadi','Oil and gas offices.'],
  ['phgra','GRA','ph','estate',280,150,'GRA','Quiet estates.'],
  ['phbuka','Bole Joint','ph','buka',500,180,'Rumuola','Roasted plantain and fish.'],
  ['phclub','Garden City Lounge','ph','club',560,360,'D-Line','Nightlife.'],
  // London
  ['lhr','Heathrow Airport','london','airport',90,150,'Heathrow','Flights home to Lagos.'],
  ['peckham','Peckham','london','estate',540,500,'Peckham','Little Lagos. Rooms and flats.'],
  ['peckhamshop','Peckham Naija Shop','london','naijashop',600,470,'Peckham','Garri, palm oil, and gist.'],
  ['canary','Canary Wharf','london','office',770,240,'Canary Wharf','Banks and tech offices.'],
  ['brixton','Brixton Club','london','club',400,540,'Brixton','Afrobeats nights.'],
  ['lonuni','London University','london','campus',450,200,'Bloomsbury','Lectures for student visas.'],
  ['jesushouse','Jesus House','london','church',300,120,'Brent Cross','Big Nigerian church.'],
  ['hydepark','Hyde Park','london','park',330,250,'Central','Green space.'],
  ['nhs','NHS Hospital','london','hospital',600,180,'Whitechapel','Doctors. And jobs.'],
  ['lonjc','Job Centre & Home Office desk','london','jobcentre',520,280,'Central','Jobs and visa help.'],
  ['lonbuka','Jollof Kitchen Peckham','london','restaurant',650,540,'Peckham','Jollof and pounded yam.'],
  // Houston
  ['iah','George Bush Airport','houston','airport',700,90,'IAH','Flights home.'],
  ['alief','Alief','houston','estate',180,500,'Alief','Big Nigerian community.'],
  ['aliefshop','Alief African Market','houston','naijashop',250,450,'Alief','Naija groceries.'],
  ['downtownhou','Downtown Houston','houston','office',560,260,'Downtown','Energy and tech jobs.'],
  ['galleria','The Galleria','houston','mall',360,320,'Uptown','Shopping.'],
  ['houclub','Afrobeats Lounge','houston','club',640,400,'Midtown','Afrobeats nights.'],
  ['rice','Rice University','houston','campus',470,420,'Rice Village','Student visas.'],
  ['houchurch','RCCG Houston','houston','church',250,380,'Alief','Sunday service.'],
  ['hermann','Hermann Park','houston','park',520,470,'Museum District','Jogging trails.'],
  ['houjc','Workforce & USCIS desk','houston','jobcentre',620,200,'Downtown','Jobs and visa help.'],
  ['houhosp','Texas Medical Center','houston','hospital',560,520,'TMC','Hospital.'],
  // Toronto
  ['yyz','Pearson Airport','toronto','airport',120,170,'Mississauga','Flights home.'],
  ['brampton','Brampton','toronto','estate',160,80,'Brampton','Naija community and basements.'],
  ['bramptonshop','Brampton African Store','toronto','naijashop',230,120,'Brampton','Naija groceries.'],
  ['baystreet','Bay Street','toronto','office',560,390,'Downtown','Banks and tech.'],
  ['eaton','Eaton Centre','toronto','mall',520,330,'Downtown','Shopping.'],
  ['torclub','King West Club','toronto','club',460,400,'King West','Nightlife.'],
  ['uoft','University of Toronto','toronto','campus',500,260,'Downtown','Student visas.'],
  ['highpark','High Park','toronto','park',340,360,'West End','Trails.'],
  ['torjc','Service Canada desk','toronto','jobcentre',600,300,'Downtown','Jobs and visa help.'],
  ['torhosp','Toronto General','toronto','hospital',540,200,'Downtown','Hospital.'],
  ['torchurch','RCCG Toronto','toronto','church',300,200,'Etobicoke','Sunday service.'],
  // Dubai
  ['dxb','Dubai International Airport','dubai','airport',860,120,'Deira','Flights home.'],
  ['deira','Deira','dubai','estate',780,180,'Deira','Shared flats.'],
  ['deirashop','Deira African Market','dubai','naijashop',720,220,'Deira','Naija groceries.'],
  ['difc','Business Bay','dubai','office',520,320,'Business Bay','Offices.'],
  ['dubaimall','Dubai Mall','dubai','mall',470,350,'Downtown','Shopping.'],
  ['jbr','JBR Beach','dubai','beach',200,450,'JBR','Beach.'],
  ['dubclub','Marina Club','dubai','club',260,400,'Marina','Nightlife.'],
  ['dubmosque','Grand Mosque','dubai','mosque',650,260,'Bur Dubai','Prayers.'],
  ['dubjc','GDRFA visa & jobs desk','dubai','jobcentre',600,300,'Bur Dubai','Jobs and visa help.'],
  // Girne
  ['ecn','Ercan Airport','girne','airport',560,600,'Ercan','Flights via Istanbul.'],
  ['girneharbour','Girne Harbour','girne','beach',460,240,'Harbour','Sea and sunsets.'],
  ['kyrenia','University of Kyrenia','girne','campus',700,300,'Karakum','Classes for student visas.'],
  ['girneflats','Karaoğlanoğlu','girne','estate',220,300,'West Girne','Student flats.'],
  ['girneshop','Girne African Store','girne','naijashop',380,330,'Centre','Naija groceries.'],
  ['girneoffice','Girne Business Centre','girne','office',560,320,'Centre','Offices.'],
  ['girneclub','Harbour Club','girne','club',520,270,'Harbour','Nightlife.'],
  ['girnejc','Immigration & Labour office','girne','jobcentre',620,380,'Centre','Jobs and visa help.']
];
var LOC = {};
LOCS.forEach(function(r){ LOC[r[0]]={id:r[0],name:r[1],city:r[2],type:r[3],x:r[4],y:r[5],area:r[6],desc:r[7]}; });

// where careers happen outside Lagos
var CITY_WORK = {abuja:'cbd',ph:'transamadi',london:'canary',houston:'downtownhou',toronto:'baystreet',dubai:'difc',girne:'girneoffice'};
var CITY_HOMEAREA = {lagos:null,abuja:'garki',ph:'phgra',london:'peckham',houston:'alief',toronto:'brampton',dubai:'deira',girne:'girneflats'};
var CITY_AIRPORT = {lagos:'mmia',abuja:'abv',ph:'phc',london:'lhr',houston:'iah',toronto:'yyz',dubai:'dxb',girne:'ecn'};

// flights from Lagos (naira at base rate; abroad prices scale with the rate)
var FLIGHTS = {abuja:{hours:1,price:65000},ph:{hours:1,price:60000},london:{hours:7,price:600000,visa:'UK'},houston:{hours:12,price:850000,visa:'US'},toronto:{hours:13,price:800000,visa:'CA'},dubai:{hours:7,price:450000,visa:'AE'},girne:{hours:9,price:380000,visa:'CY'}};

var COUNTRIES = {
  UK:{name:'United Kingdom',city:'london',visas:{visitor:{fee:180000,funds:1500000,chance:0.62},student:{fee:850000,funds:4000000,chance:0.78,tuition:3500000},work:{fee:900000,funds:1000000,chance:0.7,level:3}}},
  US:{name:'United States',city:'houston',visas:{visitor:{fee:250000,funds:2000000,chance:0.45},student:{fee:400000,funds:5000000,chance:0.66,tuition:4500000},work:{fee:1200000,funds:1000000,chance:0.55,level:3}}},
  CA:{name:'Canada',city:'toronto',visas:{visitor:{fee:150000,funds:1800000,chance:0.55},student:{fee:300000,funds:4500000,chance:0.72,tuition:3800000},work:{fee:800000,funds:1500000,chance:0.65,level:3}}},
  AE:{name:'UAE',city:'dubai',visas:{visitor:{fee:120000,funds:800000,chance:0.8},student:{fee:200000,funds:2500000,chance:0.8,tuition:2000000},work:{fee:500000,funds:500000,chance:0.78,level:2}}},
  CY:{name:'North Cyprus',city:'girne',visas:{visitor:{fee:60000,funds:400000,chance:0.9},student:{fee:80000,funds:900000,chance:0.92,tuition:900000},work:{fee:250000,funds:300000,chance:0.8,level:2}}}
};
var VISA_NAMES = {visitor:'Visitor visa',student:'Student visa',work:'Work permit',resident:'Permanent residency',citizen:'Citizen'};

// ---------- transport ----------
// base fare, per km, km/h; traffic = rush hour slowdown factor
var TRANSPORT = {
  trek:{name:'Trek',base:0,perKm:0,speed:5,traffic:1,tired:7,desc:'Free, slow and tiring'},
  keke:{name:'Keke',base:100,perKm:5,speed:22,traffic:1.5,desc:'Cheap tricycle'},
  danfo:{name:'Danfo',base:100,perKm:5,speed:28,traffic:2.2,wait:10,desc:'Yellow bus. "Enter with your change!"'},
  okada:{name:'Okada',base:150,perKm:8,speed:38,traffic:1.15,risk:0.03,desc:'Fast, slightly risky'},
  cab:{name:'Cab',base:300,perKm:15,speed:34,traffic:2,desc:'Air-conditioned and pricey'},
  car:{name:'Your car',base:0,perKm:0,speed:40,traffic:2,desc:'Fuel plus police checkpoints'},
  walk:{name:'Walk',base:0,perKm:0,speed:5,traffic:1,tired:6,desc:'Free'},
  bus:{name:'Bus',base:120,perKm:6,speed:22,traffic:1.4,wait:8,desc:'Tap your card'},
  train:{name:'Train',base:180,perKm:9,speed:45,traffic:1,wait:6,desc:'Fast and reliable'},
  uber:{name:'Uber',base:600,perKm:30,speed:36,traffic:1.6,desc:'Door to door'}
};
var KM_PER_PX = 0.055;

// ---------- people ----------
var FIRST_M = ['Tunde','Emeka','Seun','Chidi','Ibrahim','Femi','Kunle','Obinna','Musa','Dayo','Tobi','Uche','Segun','Ayo','Kelechi','Bayo','Yusuf','Ikenna','Damilare','Gbenga','Nnamdi','Sani','Wale','Efe'];
var FIRST_F = ['Chioma','Aisha','Funke','Ngozi','Bisi','Amaka','Zainab','Tolu','Ada','Kemi','Halima','Nneka','Simi','Yetunde','Blessing','Ifeoma','Temi','Hauwa','Ronke','Ebere','Folake','Joy','Precious','Ese'];
var LAST = ['Adeyemi','Okafor','Bello','Okonkwo','Balogun','Eze','Abubakar','Adebayo','Nwosu','Ogunleye','Danjuma','Ibe','Lawal','Obi','Afolabi','Mohammed','Chukwu','Bakare','Udo','Oyelaran'];
var SKINS = ['#3B2219','#4E2E1F','#6A3D26','#7E4B2F','#95603D','#B07650','#C68E66'];
var HAIRS = ['short','afro','braids','bald','gele','cornrow','locs','bun'];
var HAIRCOLS = ['#111111','#2B1B14','#4A2C1E','#7A4B2A','#B7410E','#D4A017'];
var SHIRTS = ['#E63946','#F4A261','#2A9D8F','#264653','#E9C46A','#8338EC','#3A86FF','#06D6A0','#FF006E','#FB5607','#1D3557','#008751'];

// ---------- birth lottery ----------
var LOTTERY = {
  nepo:{name:'Nepo Baby',odds:0.18,desc:'₦500,000 pocket money, furnished Lekki mini-flat, Daddy pays rent, Toyota Prado, and a Branch Manager job. You can call Papa for money once a day.'},
  lapo:{name:'LAPO Baby',odds:0.44,desc:'₦60,000 microfinance loan plus small savings. A room in Mushin or a Yaba self-contain. Skills grow 25% faster because life no be beans.'},
  fresher:{name:'UNILAG Fresher',odds:0.26,desc:'₦14,000, a bunk in hall, ₦1,200 weekly rent. Free lectures. Skills grow 25% faster.'},
  japakid:{name:'Japa Kid',odds:0.12,desc:'Born abroad with citizenship there. A studio flat and some savings. Family back home still calls for money.'}
};

// ---------- trivia (daily gem) ----------
var TRIVIA = [
  ['What colour are Lagos danfo buses?',['Yellow','Blue','Green','Red'],0],
  ['When did Nigeria become independent?',['1 October 1960','12 June 1993','29 May 1999','1 January 1914'],0],
  ['Which bridge links the Lagos mainland to Lagos Island across the lagoon?',['Third Mainland Bridge','Niger Bridge','Tower Bridge','Murtala Bridge'],0],
  ['What does "japa" mean?',['Relocating abroad','A type of soup','A dance step','Getting promoted'],0],
  ['Fela Kuti pioneered which genre?',['Afrobeat','Highlife','Juju','Fuji'],0],
  ['What is the capital of Nigeria?',['Abuja','Lagos','Ibadan','Kano'],0],
  ['What is the smaller unit of the naira?',['Kobo','Cent','Pesewa','Shilling'],0],
  ['Lagos stopped being Nigeria\'s capital in which year?',['1991','1976','2001','1960'],0],
  ['Amala is made from what?',['Yam flour (elubo)','Rice','Corn starch','Wheat'],0],
  ['In which year did the Super Eagles first win the Africa Cup of Nations?',['1980','1994','2013','1976'],0],
  ['A "keke" is a...',['Tricycle','Motorbike','Minibus','Ferry'],0],
  ['The Eyo festival is held in which city?',['Lagos','Kano','Enugu','Calabar'],0],
  ['Lekki Conservation Centre is famous for its...',['Canopy walkway','Zoo','Waterfall','Ski slope'],0],
  ['"Owambe" refers to...',['A lavish party','A market','A bus stop','A soup'],0],
  ['A gele is a...',['Headwrap','Drum','Shoe','Necklace'],0],
  ['Nollywood is...',['Nigeria\'s film industry','A Lagos beach','A radio station','A football club'],0],
  ['Which country fights Nigeria over the best jollof?',['Ghana','Kenya','Egypt','Senegal'],0],
  ['The Niger and Benue rivers meet at...',['Lokoja','Onitsha','Makurdi','Jebba'],0],
  ['"Face-me-I-face-you" is a type of...',['Shared housing','Greeting','Dance','Market'],0],
  ['NEPA is the old name for the body in charge of...',['Electricity','Water','Police','Roads'],0],
  ['Which Nigerian city is called the Garden City?',['Port Harcourt','Jos','Ibadan','Owerri'],0],
  ['Suya is mostly...',['Spicy grilled meat','Fried plantain','Bean cake','Pepper soup'],0],
  ['The Lagos lagoon opens to which ocean?',['Atlantic','Indian','Pacific','Arctic'],0],
  ['"Detty December" is when...',['Diaspora visit home to party','Schools resume','Rains start','Elections happen'],0]
];

// ---------- billboard ads (fictional brands) ----------
var ADS = [
  ['CHOPNOW','Hot food in 30 mins','#E63946'],['EKO TRUST','Loans in 5 minutes','#1D3557'],['KOBO LABS','We are hiring','#06D6A0'],
  ['NAIJA FM 99.9','Wake up with the breakfast show','#FB5607'],['JAPA AIR','Lagos to London daily','#3A86FF'],['YOUR BRAND HERE','Rent this billboard','#111111'],
  ['SUNSHINE SOLAR','No more NEPA wahala','#F4A261'],['MAMA GOLD RICE','Party jollof starts here','#008751']
];

var CANDIDATES = [
  {id:'pp',name:'Hon. Babatunde Alaro',party:'Progress Party',promise:'Fix the roads (less traffic)'},
  {id:'pum',name:'Mrs. Ngozi Okafor',party:'Peoples Unity Movement',promise:'Rent cap (rent down 10%)'},
  {id:'nla',name:'Comrade Sani Garba',party:'New Lagos Alliance',promise:'Light for all (more power)'}
];

G.JL_DATA = {SKILLS:SKILLS,NEEDS:NEEDS,NEED_NAMES:NEED_NAMES,NEED_DECAY:NEED_DECAY,TRAITS:TRAITS,DREAMS:DREAMS,ITEMS:ITEMS,CATS:CATS,ACTS:ACTS,
  CAREERS:CAREERS,LEVEL_SKILL:LEVEL_SKILL,GIGS:GIGS,BUSINESSES:BUSINESSES,CARS:CARS,LAND:LAND,LAYOUTS:LAYOUTS,HOMES_NG:HOMES_NG,HOMES_ABROAD:HOMES_ABROAD,
  VENUE_ACTS:VENUE_ACTS,HOURS:HOURS,CITIES:CITIES,LOCS:LOCS,LOC:LOC,CITY_WORK:CITY_WORK,CITY_HOMEAREA:CITY_HOMEAREA,CITY_AIRPORT:CITY_AIRPORT,FLIGHTS:FLIGHTS,
  COUNTRIES:COUNTRIES,VISA_NAMES:VISA_NAMES,TRANSPORT:TRANSPORT,KM_PER_PX:KM_PER_PX,FIRST_M:FIRST_M,FIRST_F:FIRST_F,LAST:LAST,SKINS:SKINS,HAIRS:HAIRS,
  HAIRCOLS:HAIRCOLS,SHIRTS:SHIRTS,LOTTERY:LOTTERY,TRIVIA:TRIVIA,ADS:ADS,CANDIDATES:CANDIDATES};
})(typeof window!=='undefined'?window:globalThis);
