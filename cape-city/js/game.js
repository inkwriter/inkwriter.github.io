// ============================================================
// CAPE CITY COMICS — game.js
// World, destruction, fire, entities, powers, events, nemesis.
// ============================================================
"use strict";

const TILE=32, MAPW=40, MAPH=40, WORLDW=MAPW*TILE, WORLDH=MAPH*TILE;
// Internal render resolution — the world is drawn natively at 480x300 and
// integer-upscaled 2x to the 960x600 canvas. Crisp pixels, zoomed-in framing.
const VIEWW=480, VIEWH=300, UPSCALE=2;

// tile ids
const T={ROAD:0,SIDE:1,GRASS:2,WALL:3,FLOOR:4,DOOR:5,WIN:6,RUBBLE:7,TREE:8,BROKENWIN:9,ROADLINE:10,ICEWALL:11};
const SOLID=new Set([T.WALL,T.WIN,T.TREE,T.ICEWALL]);
const FLAMMABLE=new Set([T.WALL,T.FLOOR,T.DOOR,T.TREE,T.WIN]);

const G={
  state:"cover", frame:0,
  map:null, fire:null, tileHp:null, buildings:[],
  objs:[], civs:[], enemies:[], projs:[], events:[],
  villain:null, villainIdx:0, nextVillainTimer:-1,
  tempTiles:[], decoy:null, frost:{},
  player:null,
  rep:0, collateral:0, koCount:0,
  stats:{rescued:0,crimes:0,chases:0,firesOut:0,villainsCaught:0,koByVillain:0},
  tagCounts:{melee:0,ranged:0,ice:0,thrown:0},
  eventCooldown:200, eventsResolved:0,
  heroName:"CAPTAIN COMET",
  pendingChoice:null, // {title, options:[{label,desc,apply}]}
  paperReason:null
};

// ---------------- MAP GENERATION ----------------
function idx(x,y){return y*MAPW+x;}
function tileAt(x,y){ if(x<0||y<0||x>=MAPW||y>=MAPH)return T.WALL; return G.map[idx(x,y)]; }
function setTile(x,y,t){ if(x<0||y<0||x>=MAPW||y>=MAPH)return; G.map[idx(x,y)]=t; }
function isRoadLane(v){ const m=((v%8)+8)%8; return m===3||m===4; }

function genCity(){
  G.map=new Uint8Array(MAPW*MAPH);
  G.fire=new Uint8Array(MAPW*MAPH);
  G.tileHp=new Uint8Array(MAPW*MAPH); G.tileHp.fill(12);
  G.buildings=[]; G.objs=[];

  for(let y=0;y<MAPH;y++)for(let x=0;x<MAPW;x++){
    if(isRoadLane(x)||isRoadLane(y)) setTile(x,y,T.ROAD);
    else if(isRoadLane(x-1)||isRoadLane(x+1)||isRoadLane(y-1)||isRoadLane(y+1)) setTile(x,y,T.SIDE);
    else setTile(x,y,T.GRASS);
  }
  // blocks between roads: grass rects are 4x4, anchored at 8k+6 on each axis
  // (grass lanes are the runs 6,7,0,1 between sidewalk lanes 5 and 2)
  for(let gy0=6;gy0<MAPH-3;gy0+=8)for(let gx0=6;gx0<MAPW-3;gx0+=8){
    const minx=gx0,miny=gy0,maxx=gx0+3,maxy=gy0+3;
    // verify the rect really is all grass (map edges etc.)
    let allGrass=true;
    for(let y=miny;y<=maxy&&allGrass;y++)for(let x=minx;x<=maxx;x++)if(tileAt(x,y)!==T.GRASS){allGrass=false;break;}
    if(!allGrass)continue;
    if(Math.random()<0.25){ // park block: trees + bench
      for(let i=0;i<4;i++){ const tx=randi(minx,maxx),ty=randi(miny,maxy); if(tileAt(tx,ty)===T.GRASS)setTile(tx,ty,T.TREE); }
      spawnObj("bench",(minx+1.5)*TILE,(miny+1.5)*TILE);
      continue;
    }
    const b={x:minx,y:miny,w:4,h:4,burning:false,palette:choice([PAL.wallA,PAL.wallB,PAL.wallC,PAL.wallD])};
    for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++){
      const edge = x===b.x||x===b.x+b.w-1||y===b.y||y===b.y+b.h-1;
      setTile(x,y, edge?T.WALL:T.FLOOR);
    }
    // door on bottom edge center, window sprinkle
    const dx=b.x+Math.floor(b.w/2); setTile(dx,b.y+b.h-1,T.DOOR);
    for(let x=b.x+1;x<b.x+b.w-1;x++){ if(x!==dx&&Math.random()<0.5)setTile(x,b.y+b.h-1,T.WIN); if(Math.random()<0.35)setTile(x,b.y,T.WIN); }
    G.buildings.push(b);
  }
  // street props along sidewalks
  for(let y=0;y<MAPH;y++)for(let x=0;x<MAPW;x++){
    if(tileAt(x,y)!==T.SIDE)continue;
    const r=Math.random();
    const px=x*TILE+TILE/2, py=y*TILE+TILE/2;
    if(r<0.02)spawnObj("hydrant",px,py);
    else if(r<0.035)spawnObj("trash",px,py);
    else if(r<0.045)spawnObj("bench",px,py);
  }
  // parked cars on roads
  for(let i=0;i<14;i++){
    let x,y,tries=0;
    do{ x=randi(2,MAPW-3); y=randi(2,MAPH-3); tries++; }while(tileAt(x,y)!==T.ROAD&&tries<80);
    if(tileAt(x,y)===T.ROAD) spawnObj("car",x*TILE+TILE/2,y*TILE+TILE/2);
  }
}

function spawnObj(type,x,y){
  const defs={
    car:{hp:10,w:26,h:16,heavy:true,color:choice(PAL.civ)},
    bench:{hp:4,w:20,h:8,color:"#a9743e"},
    hydrant:{hp:3,w:10,h:12,color:"#e8433f"},
    trash:{hp:2,w:12,h:12,color:"#6c7a6c"},
    debris:{hp:3,w:12,h:10,color:PAL.rubble}
  };
  const d=defs[type];
  G.objs.push({type,x,y,hp:d.hp,w:d.w,h:d.h,heavy:!!d.heavy,color:d.color,held:false,thrown:false,vx:0,vy:0,dead:false});
}

// ---------------- SOLIDITY / MOVEMENT ----------------
function solidAtPx(px,py){
  const t=tileAt(Math.floor(px/TILE),Math.floor(py/TILE));
  return SOLID.has(t);
}
function moveEntity(e,dx,dy,r=7){
  // axis-separated with corner checks
  if(dx){
    const nx=clamp(e.x+dx, r, WORLDW-r);
    if(!solidAtPx(nx+Math.sign(dx)*r,e.y-r*0.7)&&!solidAtPx(nx+Math.sign(dx)*r,e.y+r*0.7)) e.x=nx;
  }
  if(dy){
    const ny=clamp(e.y+dy, r, WORLDH-r);
    if(!solidAtPx(e.x-r*0.7,ny+Math.sign(dy)*r)&&!solidAtPx(e.x+r*0.7,ny+Math.sign(dy)*r)) e.y=ny;
  }
}
function mouseWX(){return Cam.x+Input.mouse.x/UPSCALE;}
function mouseWY(){return Cam.y+Input.mouse.y/UPSCALE;}

// ---------------- DESTRUCTION ----------------
function addCollateral(n,quiet){
  G.collateral+=n;
  G.rep=clamp(G.rep-n*0.12,-100,100);
  if(!quiet&&n>=5&&Math.random()<0.6)ticker(choice(TICKER_LINES.collateral));
}
function damageTile(tx,ty,dmg,tag){
  const t=tileAt(tx,ty);
  if(t===T.WIN){ setTile(tx,ty,T.BROKENWIN); FX.burst(tx*TILE+16,ty*TILE+16,PAL.windowT,8,3); Sfx.hit(); addCollateral(1,true); return true; }
  if(t===T.TREE){ setTile(tx,ty,T.GRASS); FX.burst(tx*TILE+16,ty*TILE+16,PAL.tree,10,2.5); addCollateral(1,true); return true; }
  if(t===T.WALL){
    const i=idx(tx,ty); G.tileHp[i]=Math.max(0,G.tileHp[i]-dmg);
    FX.burst(tx*TILE+16,ty*TILE+16,"#b0a89a",4,2);
    if(G.tileHp[i]<=0){ setTile(tx,ty,T.RUBBLE); addCollateral(10); Cam.bump(4); Sfx.boom();
      FX.word(tx*TILE+16,ty*TILE,choice(["CRUNCH!","SMASH!"]),"#ffb02a");
      if(Math.random()<0.5)spawnObj("debris",tx*TILE+16,ty*TILE+16);
    }
    return true;
  }
  return false;
}
function extinguishAround(tx,ty,r=1){
  let any=false;
  for(let y=ty-r;y<=ty+r;y++)for(let x=tx-r;x<=tx+r;x++){
    if(x<0||y<0||x>=MAPW||y>=MAPH)continue;
    if(G.fire[idx(x,y)]>0){G.fire[idx(x,y)]=0;any=true;FX.burst(x*TILE+16,y*TILE+16,PAL.iceC,5,2);}
  }
  if(any){G.stats.firesOut++; if(Math.random()<0.3)ticker(choice(TICKER_LINES.fireOut));}
}
function updateFire(){
  if(G.frame%24!==0)return;
  const newFire=[];
  for(let y=0;y<MAPH;y++)for(let x=0;x<MAPW;x++){
    const f=G.fire[idx(x,y)];
    if(!f)continue;
    // burn down walls slowly
    if(tileAt(x,y)===T.WALL&&Math.random()<0.06)damageTile(x,y,4,"fire");
    // spread
    if(Math.random()<0.16){
      const nx=x+randi(-1,1),ny=y+randi(-1,1);
      if(FLAMMABLE.has(tileAt(nx,ny))&&!G.fire[idx(nx,ny)])newFire.push([nx,ny]);
    }
    if(Math.random()<0.04)G.fire[idx(x,y)]=0; // burn out
  }
  for(const [x,y] of newFire)G.fire[idx(x,y)]=1;
}

// ---------------- PLAYER ----------------
function makePlayer(coreKey,supportKey){
  return {
    x:WORLDW/2,y:WORLDH/2,r:7,
    hp:10,maxHp:10,stam:6,maxStam:6,
    level:1,xp:0,
    core:coreKey, support:supportKey, extra:null, // extra = second power key (KeyG)
    powerLv:{[coreKey]:1}, powerXp:{[coreKey]:0},
    cds:{basic:0,special:0,mob:0,def:0,sup:0,extra:0},
    abilityCds:[0,0,0,0,0], _numHeld:{},
    blocking:0, iframes:0, dashT:0, dashVx:0, dashVy:0,
    carrying:null, holding:null,
    surgeT:0, fireVulnT:0, hurtFlash:0, facing:0,
    perks:{stamRegen:0},
    dead:false
  };
}
function coreLv(){ const p=G.player; let lv=p.powerLv[p.core]||1; if(p.surgeT>0)lv=Math.min(5,lv+1); return lv; }
function gainPowerXp(key,n){
  const p=G.player;
  if(p.powerLv[key]===undefined)return;
  p.powerXp[key]=(p.powerXp[key]||0)+n;
  const need=[0,25,70,130,220];
  const lv=p.powerLv[key];
  if(lv<5&&p.powerXp[key]>=need[lv]){
    p.powerLv[key]=lv+1;
    Sfx.levelup();
    const pw=POWERS[key];
    FX.word(p.x,p.y-24,pw.name+" LV"+(lv+1)+"!",pw.color);
    ticker(pw.name+" reached level "+(lv+1)+": "+pw.lvNotes[lv]);
  }
}
function gainXp(n){
  const p=G.player; p.xp+=n;
  const need=()=>10+p.level*8;
  while(p.xp>=need()){
    p.xp-=need(); p.level++;
    p.maxHp+=2; p.hp=p.maxHp;
    Sfx.levelup(); FX.word(p.x,p.y-30,"LEVEL "+p.level+"!","#3fbf6e"); Cam.bump(3);
    if(p.level===5) offerNewPower("LEVEL 5! CHOOSE A NEW POWER (key G)");
  }
}
function offerNewPower(title,startLv=1){
  const p=G.player;
  const owned=new Set([p.core, p.extra].filter(Boolean));
  const pool=Object.keys(POWERS).filter(k=>!owned.has(k));
  const opts=[];
  const count=Math.min(3,pool.length);
  while(opts.length<count){
    const k=pool.splice(randi(0,pool.length-1),1)[0];
    opts.push({label:POWERS[k].name, desc:POWERS[k].desc, apply(){
      p.extra=k; p.powerLv[k]=startLv; p.powerXp[k]=0;
      ticker("New power: "+POWERS[k].name+" — press G to use!");
    }});
  }
  G.pendingChoice={title,options:opts};
}

// ---------------- POWER EXECUTION ----------------
function fireBolt(x,y,angle,pw,lv,fromPlayer=true,opts={}){
  G.projs.push({
    x,y,vx:Math.cos(angle)*(pw.speed||6),vy:Math.sin(angle)*(pw.speed||6),
    life:pw.life||60,dmg:(pw.dmg?pw.dmg[lv-1]:2)+(opts.bonus||0),
    tag:pw.tag,color:pw.color,from:fromPlayer?"player":"enemy",
    pierce:!!opts.pierce, slow:!!pw.slow, freeze:!!opts.freeze, split:!!opts.split
  });
}
function meleeSwing(pw,lv){
  const p=G.player;
  const rangeT=pw.range||30;
  let hitAny=false;
  const hx=p.x+Math.cos(p.facing)*rangeT*0.7, hy=p.y+Math.sin(p.facing)*rangeT*0.7;
  for(const e of allHostiles()){
    if(dist(hx,hy,e.x,e.y)<rangeT){
      hurtHostile(e,pw.dmg[lv-1],pw.tag,pw.knock||4,p.facing);
      hitAny=true;
    }
  }
  // tile damage in front (strength only smashes)
  if(pw.tag==="melee"&&G.player.core==="strength"){
    damageTile(Math.floor(hx/TILE),Math.floor(hy/TILE),4,"melee");
  }
  // objects
  for(const o of G.objs){
    if(!o.dead&&!o.held&&dist(hx,hy,o.x,o.y)<rangeT){ damageObj(o,pw.dmg[lv-1]); hitAny=true; }
  }
  if(hitAny){ FX.word(hx,hy-8,choice(IMPACT)); Sfx.hit(); Cam.bump(2); }
  else Sfx.beep(220,0.04,"square",0.06,-60);
  gainPowerXp(usedPowerKey(),hitAny?3:1);
}
let _usingKey=null;
function usedPowerKey(){return _usingKey||G.player.core;}

function doBasic(key){
  const p=G.player, pw=POWERS[key];
  const lv=key===p.core?coreLv():(p.powerLv[key]||1);
  _usingKey=key;
  if(pw.verb==="melee")meleeSwing(pw,lv);
  else{
    fireBolt(p.x,p.y,p.facing,pw,lv);
    if(key==="blast"&&lv>=3)fireBolt(p.x,p.y,p.facing+0.18,pw,lv,true,{});
    if(pw.tag==="ice")Sfx.ice(); else Sfx.zap();
    gainPowerXp(key,2);
  }
  _usingKey=null;
}
function doSpecial(){
  const p=G.player;
  const key=p.core, pw=POWERS[key], lv=coreLv();
  if(key==="strength"){
    if(p.holding){ // THROW
      const o=p.holding; p.holding=null; o.held=false; o.thrown=true;
      o.vx=Math.cos(p.facing)*9; o.vy=Math.sin(p.facing)*9;
      Sfx.throwWoosh(); FX.word(p.x,p.y-20,"HNNGH!","#e8433f");
      gainPowerXp(key,3);
      return true;
    }
    // pick up nearest object
    let best=null,bd=46+(lv>=2?14:0);
    for(const o of G.objs){ if(o.dead||o.held)continue; if(o.heavy&&lv<2)continue;
      const d=dist(p.x,p.y,o.x,o.y); if(d<bd){bd=d;best=o;} }
    if(best){ best.held=true; p.holding=best; Sfx.pickup(); return true; }
    // heavy uppercut fallback
    meleeSwing({...pw,dmg:[5,6,8,9,11],range:40,knock:9},lv); return true;
  }
  if(key==="speed"){ // blur strike
    if(p.stam<2)return false; p.stam-=2;
    const ang=p.facing, steps=14;
    for(let i=0;i<steps;i++){
      moveEntity(p,Math.cos(ang)*8,Math.sin(ang)*8);
      FX.burst(p.x,p.y,"#ffc93c",1,0.5);
      for(const e of allHostiles())if(dist(p.x,p.y,e.x,e.y)<16)hurtHostile(e,pw.dmg[lv-1]+1,"melee",5,ang);
    }
    p.iframes=Math.max(p.iframes,10); Sfx.zap(); gainPowerXp(key,3); return true;
  }
  if(key==="blast"){ // charge shot: piercing
    fireBolt(p.x,p.y,p.facing,pw,lv,true,{pierce:true,bonus:2});
    Sfx.zap(); Cam.bump(2); gainPowerXp(key,3); return true;
  }
  if(key==="ice"){ // freeze cone
    for(const off of [-0.3,0,0.3])fireBolt(p.x,p.y,p.facing+off,pw,lv,true,{freeze:lv>=2,bonus:0});
    Sfx.ice(); gainPowerXp(key,3); return true;
  }
  return false;
}
function doMobility(){
  const p=G.player;
  if(p.stam<1.5)return false;
  p.stam-=1.5;
  const ax=Input.axis();
  let ang=(ax.x||ax.y)?Math.atan2(ax.y,ax.x):p.facing;
  const distMul = p.core==="strength"?1.35 : p.core==="speed"?1.5 : 1;
  p.dashT=12; p.dashVx=Math.cos(ang)*9*distMul; p.dashVy=Math.sin(ang)*9*distMul;
  p.iframes=Math.max(p.iframes,12);
  Sfx.beep(500,0.07,"triangle",0.09,200);
  // strength lv3 ground slam scheduled on dash end
  p._slamPending = (p.core==="strength"&&coreLv()>=3);
  return true;
}
function doDefense(){
  const p=G.player; p.blocking=30;
  Sfx.beep(320,0.06,"square",0.06);
  return true;
}
function doSupport(){
  const p=G.player;
  if(p.support!=="grapple")return false;
  // find enemy along aim within 220
  const ang=p.facing;
  let best=null,bd=220;
  for(const e of allHostiles()){
    const d=dist(p.x,p.y,e.x,e.y);
    if(d<bd){
      const ea=Math.atan2(e.y-p.y,e.x-p.x);
      let dd=Math.abs(ea-ang); dd=Math.min(dd,Math.PI*2-dd);
      if(dd<0.35){bd=d;best=e;}
    }
  }
  Sfx.beep(760,0.08,"square",0.08,-350);
  if(best){ // yank enemy
    best.x=p.x+Math.cos(ang)*22; best.y=p.y+Math.sin(ang)*22;
    best.stun=30; FX.word(best.x,best.y-14,"THWIP!","#3fbf6e");
  }else{ // zip player toward mouse point
    p.dashT=14; p.dashVx=Math.cos(ang)*10; p.dashVy=Math.sin(ang)*10; p.iframes=12;
  }
  return true;
}

// ---------------- SIGNATURE ABILITIES (keys 1-5) ----------------
function villainChill(v,stun){
  if(!v||v.state!=="fight")return;
  if(v.adaptations.includes("ice")){FX.word(v.x,v.y-18,"NO CHILL!","#ff5a2a");return;}
  v.slowT=Math.max(v.slowT,140); v.stun=Math.max(v.stun,stun);
}
function castAbility(n){
  const p=G.player, key=p.core, lv=coreLv();
  if((p.powerLv[key]||1)<n){ FX.say(p,"Not strong enough yet! ("+POWERS[key].name+" LV"+n+" needed)",70); return false; }
  if(p.abilityCds[n-1]>0)return false;
  if(p.stam<ABILITY_STAM[n-1]){ Sfx.beep(160,0.08,"square",0.06,-40); return false; }
  const id=key+n, pw=POWERS[key];
  switch(id){
    // ---- STRENGTH ----
    case "strength1": // HAYMAKER
      meleeSwing({...pw,dmg:[6,7,9,10,12],range:42,knock:14},lv);
      FX.word(p.x+Math.cos(p.facing)*30,p.y+Math.sin(p.facing)*30-14,"HAYMAKER!","#e8433f");
      break;
    case "strength2":{ // SHOCKWAVE STOMP
      Cam.bump(5); Sfx.boom(); FX.burst(p.x,p.y,"#b0a89a",16,4);
      FX.word(p.x,p.y-20,"STOMP!","#ffb02a");
      for(const e of allHostiles())if(dist(p.x,p.y,e.x,e.y)<80)hurtHostile(e,3,"melee",14,Math.atan2(e.y-p.y,e.x-p.x));
      break;}
    case "strength3":{ // RUBBLE TOSS
      spawnObj("debris",p.x+Math.cos(p.facing)*14,p.y+Math.sin(p.facing)*14);
      const o=G.objs[G.objs.length-1];
      o.thrown=true; o.vx=Math.cos(p.facing)*10; o.vy=Math.sin(p.facing)*10;
      addCollateral(1,true); Sfx.throwWoosh();
      FX.word(p.x,p.y-20,"RIP!","#e8433f"); FX.burst(p.x,p.y+8,"#7d7668",6,2);
      break;}
    case "strength4":{ // THUNDERCLAP
      Sfx.boom(); Cam.bump(4); FX.word(p.x,p.y-22,"CLAP!!","#ffc93c");
      for(const e of allHostiles()){
        const d=dist(p.x,p.y,e.x,e.y);
        if(d<140){
          const ea=Math.atan2(e.y-p.y,e.x-p.x);
          let dd=Math.abs(ea-p.facing); dd=Math.min(dd,Math.PI*2-dd);
          if(dd<0.75){ if(e.isVillain){e.stun=Math.max(e.stun,70);}else{e.stun=100;} 
            e.x+=Math.cos(ea)*10; e.y+=Math.sin(ea)*10; FX.burst(e.x,e.y,"#fff",5,2); }
        }
      }
      break;}
    case "strength5":{ // TITAN IMPACT
      const tx=mouseWX(), ty=mouseWY();
      const ang=Math.atan2(ty-p.y,tx-p.x), leap=Math.min(170,dist(p.x,p.y,tx,ty));
      for(let i=0;i<12;i++){ moveEntity(p,Math.cos(ang)*leap/12,Math.sin(ang)*leap/12); FX.burst(p.x,p.y,"#e8433f",1,0.5); }
      Cam.bump(8); Sfx.boom(); FX.word(p.x,p.y-24,"TITAN IMPACT!","#e8433f");
      FX.burst(p.x,p.y,"#b0a89a",22,5); FX.burst(p.x,p.y,"#ffc93c",12,4);
      for(const e of allHostiles())if(dist(p.x,p.y,e.x,e.y)<95)hurtHostile(e,6,"melee",16,Math.atan2(e.y-p.y,e.x-p.x));
      const ptx=Math.floor(p.x/TILE), pty=Math.floor(p.y/TILE);
      for(let yy=pty-1;yy<=pty+1;yy++)for(let xx=ptx-1;xx<=ptx+1;xx++)damageTile(xx,yy,6,"melee");
      p.iframes=Math.max(p.iframes,20);
      break;}
    // ---- SPEED ----
    case "speed1": // JAB FLURRY
      for(let i=0;i<3;i++)meleeSwing({...pw,dmg:[2,2,3,3,4],range:30,knock:2},lv);
      FX.word(p.x,p.y-20,"JAB-JAB-JAB!","#ffc93c");
      break;
    case "speed2":{ // WHIRLWIND
      FX.word(p.x,p.y-20,"WHIRL!","#ffc93c"); Sfx.zap(); Cam.bump(2);
      for(const e of allHostiles()){
        const d=dist(p.x,p.y,e.x,e.y);
        if(d<95){
          const ea=Math.atan2(e.y-p.y,e.x-p.x);
          e.x=p.x+Math.cos(ea)*Math.max(24,d-26); e.y=p.y+Math.sin(ea)*Math.max(24,d-26);
          hurtHostile(e,3,"melee",2,ea);
        }
      }
      for(let i=0;i<10;i++){const a=i/10*Math.PI*2;FX.burst(p.x+Math.cos(a)*40,p.y+Math.sin(a)*40,"#ffc93c",1,0.8);}
      break;}
    case "speed3": // AFTERIMAGE
      G.decoy={x:p.x,y:p.y,t:240};
      FX.word(p.x,p.y-20,"AFTERIMAGE!","#ffc93c"); Sfx.pickup();
      break;
    case "speed4":{ // RICOCHET RUN
      const targets=allHostiles().map(e=>({e,d:dist(p.x,p.y,e.x,e.y)}))
        .filter(t=>t.d<230).sort((a,b)=>a.d-b.d).slice(0,3);
      if(!targets.length){FX.say(p,"No one to bounce off!",50);return false;}
      for(const t of targets){
        const e=t.e;
        p.x=clamp(e.x+rand(-14,14),8,WORLDW-8); p.y=clamp(e.y+rand(-14,14),8,WORLDH-8);
        hurtHostile(e,4,"melee",8,rand(0,Math.PI*2));
        FX.burst(p.x,p.y,"#ffc93c",8,3); FX.word(e.x,e.y-14,choice(IMPACT));
      }
      p.iframes=Math.max(p.iframes,24); Sfx.zap(); Cam.bump(3);
      break;}
    case "speed5":{ // TIME SKIP
      FX.word(p.x,p.y-24,"TIME SKIP!","#8ae0ff"); Sfx.beep(1200,0.4,"triangle",0.1,-900);
      for(const e of G.enemies)if(!e.dead&&e.state!=="downed"){e.slowT=Math.max(e.slowT,260);e.cd+=80;}
      villainChill(G.villain,40);
      if(G.villain&&G.villain.state==="fight"&&!G.villain.adaptations.includes("ice"))G.villain.slowT=Math.max(G.villain.slowT,260);
      break;}
    // ---- BLAST ----
    case "blast1":{ // TWIN BOLT
      const px=Math.cos(p.facing+Math.PI/2)*6, py=Math.sin(p.facing+Math.PI/2)*6;
      fireBolt(p.x+px,p.y+py,p.facing,pw,lv,true,{bonus:1});
      fireBolt(p.x-px,p.y-py,p.facing,pw,lv,true,{bonus:1});
      Sfx.zap(); break;}
    case "blast2": // SCATTER SHOT
      for(const off of [-0.5,-0.25,0,0.25,0.5])fireBolt(p.x,p.y,p.facing+off,pw,lv,true,{});
      Sfx.zap(); Cam.bump(2); break;
    case "blast3":{ // BLAST JUMP
      FX.burst(p.x,p.y,"#ffb02a",14,4); Sfx.boom(); Cam.bump(3);
      for(const e of allHostiles())if(dist(p.x,p.y,e.x,e.y)<55)hurtHostile(e,3,"ranged",10,Math.atan2(e.y-p.y,e.x-p.x));
      const ax=Input.axis();
      const ang=(ax.x||ax.y)?Math.atan2(ax.y,ax.x):p.facing+Math.PI;
      p.dashT=14; p.dashVx=Math.cos(ang)*10; p.dashVy=Math.sin(ang)*10;
      p.iframes=Math.max(p.iframes,16);
      break;}
    case "blast4":{ // PIERCE BEAM
      Sfx.beep(1400,0.18,"sawtooth",0.12,-1000); Cam.bump(3);
      let bx=p.x,by=p.y,steps=0;
      const hitSet=new Set();
      while(steps<45){
        bx+=Math.cos(p.facing)*8; by+=Math.sin(p.facing)*8; steps++;
        FX.parts.push({x:bx,y:by,vx:0,vy:0,life:10,color:"#ffb02a",size:3});
        for(const e of allHostiles())if(!hitSet.has(e)&&dist(bx,by,e.x,e.y)<12){hitSet.add(e);hurtHostile(e,5,"ranged",6,p.facing);}
        if(solidAtPx(bx,by)){damageTile(Math.floor(bx/TILE),Math.floor(by/TILE),5,"ranged");break;}
      }
      FX.word(p.x+Math.cos(p.facing)*50,p.y+Math.sin(p.facing)*50-12,"ZZZAP!","#ffb02a");
      break;}
    case "blast5":{ // NOVA RING
      FX.word(p.x,p.y-24,"NOVA!","#ffb02a"); Sfx.boom(); Cam.bump(5);
      for(let i=0;i<12;i++)fireBolt(p.x,p.y,i/12*Math.PI*2,pw,lv,true,{bonus:1});
      let popped=0;
      G.projs=G.projs.filter(pr=>{
        if(pr.from==="enemy"){FX.burst(pr.x,pr.y,"#fff",3,1.5);popped++;return false;}
        return true;
      });
      if(popped)FX.word(p.x,p.y-40,"POP x"+popped,"#fff");
      break;}
    // ---- ICE ----
    case "ice1": // ICE LANCE
      fireBolt(p.x,p.y,p.facing,pw,lv,true,{pierce:true,bonus:2,freeze:true});
      Sfx.ice(); break;
    case "ice2":{ // FROST RING
      FX.word(p.x,p.y-20,"FROST!","#8ae0ff"); Sfx.ice();
      for(let i=0;i<12;i++){const a=i/12*Math.PI*2;FX.burst(p.x+Math.cos(a)*50,p.y+Math.sin(a)*50,PAL.iceC,2,1);}
      for(const e of allHostiles()){
        if(dist(p.x,p.y,e.x,e.y)<85){
          if(e.isVillain)villainChill(e,50);
          else{e.frozenT=Math.max(e.frozenT,90);hurtHostile(e,2,"ice",2,Math.atan2(e.y-p.y,e.x-p.x));}
        }
      }
      break;}
    case "ice3":{ // ICE WALL
      const fx=p.x+Math.cos(p.facing)*44, fy=p.y+Math.sin(p.facing)*44;
      const cx=Math.floor(fx/TILE), cy=Math.floor(fy/TILE);
      const horiz=Math.abs(Math.cos(p.facing))>Math.abs(Math.sin(p.facing));
      let placed=0;
      for(const off of [-1,0,1]){
        const tx=horiz?cx:cx+off, ty=horiz?cy+off:cy;
        const t=tileAt(tx,ty);
        if(!SOLID.has(t)&&t!==T.DOOR&&t!==T.ICEWALL){
          G.tempTiles.push({x:tx,y:ty,prev:t,t:600});
          setTile(tx,ty,T.ICEWALL); placed++;
          FX.burst(tx*TILE+16,ty*TILE+16,PAL.iceC,6,2);
          extinguishAround(tx,ty,1);
        }
      }
      if(!placed)return false;
      Sfx.ice(); FX.word(fx,fy-14,"ICE WALL!","#8ae0ff");
      break;}
    case "ice4":{ // FLASH FREEZE
      FX.word(p.x,p.y-24,"FLASH FREEZE!","#8ae0ff"); Sfx.ice(); Cam.bump(2);
      for(const e of allHostiles()){
        if(dist(p.x,p.y,e.x,e.y)<170){
          if(e.isVillain)villainChill(e,70);
          else e.frozenT=Math.max(e.frozenT,110);
          FX.burst(e.x,e.y,PAL.iceC,5,2);
        }
      }
      break;}
    case "ice5":{ // BLIZZARD DOME
      FX.word(p.x,p.y-26,"BLIZZARD DOME!","#8ae0ff"); Sfx.boom(); Cam.bump(4);
      const x0=Math.floor(Cam.x/TILE), y0=Math.floor(Cam.y/TILE);
      const x1=Math.ceil((Cam.x+VIEWW)/TILE), y1=Math.ceil((Cam.y+VIEWH)/TILE);
      let doused=false;
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
        if(x<0||y<0||x>=MAPW||y>=MAPH)continue;
        if(G.fire[idx(x,y)]){G.fire[idx(x,y)]=0;doused=true;if(Math.random()<0.3)FX.burst(x*TILE+16,y*TILE+16,PAL.iceC,4,1.5);}
      }
      if(doused){G.stats.firesOut++;ticker(choice(TICKER_LINES.fireOut));}
      for(const e of allHostiles()){
        const sx=e.x-Cam.x, sy=e.y-Cam.y;
        if(sx>-20&&sx<VIEWW+20&&sy>-20&&sy<VIEWH+20){
          if(e.isVillain)villainChill(e,90);
          else e.frozenT=Math.max(e.frozenT,200);
          FX.burst(e.x,e.y,PAL.iceC,6,2);
        }
      }
      for(let i=0;i<30;i++)FX.parts.push({x:Cam.x+rand(0,VIEWW),y:Cam.y+rand(0,VIEWH),vx:rand(-.5,.5),vy:rand(.3,1),life:rand(30,60),color:"#fff",size:2});
      break;}
    default: return false;
  }
  p.stam-=ABILITY_STAM[n-1];
  p.abilityCds[n-1]=ABILITY_CDS[n-1];
  gainPowerXp(key,2+n);
  return true;
}

// ---------------- ICE: chill stacking & frost buildup ----------------
// Repeated ice hits stack chill until the target FREEZES solid.
function applyChill(e,amt){
  if(e.isVillain){
    if(e.adaptations.includes("ice")){ if(G.frame%40===0)FX.word(e.x,e.y-18,"NO CHILL!","#ff5a2a"); return; }
    e.slowT=Math.max(e.slowT,140);
    e.chill=(e.chill||0)+amt;
    if(e.chill>=7){ e.chill=0; e.stun=Math.max(e.stun,70);
      FX.word(e.x,e.y-20,"FROZEN STIFF!","#8ae0ff"); FX.burst(e.x,e.y,PAL.iceC,10,2.5); Sfx.ice(); }
  }else{
    e.slowT=Math.max(e.slowT,150);
    e.chill=(e.chill||0)+amt;
    if(e.chill>=4){ e.chill=0; e.frozenT=Math.max(e.frozenT,140);
      FX.word(e.x,e.y-16,"FROZEN!","#8ae0ff"); Sfx.ice(); }
  }
}
// Repeated ice landing on the same ground tile builds an ice wall.
function addFrost(tx,ty,n=1){
  if(tx<0||ty<0||tx>=MAPW||ty>=MAPH)return;
  const t=tileAt(tx,ty);
  if(SOLID.has(t)||t===T.DOOR)return;
  const i=idx(tx,ty);
  G.frost[i]=(G.frost[i]||0)+n;
  if(Math.random()<0.5)FX.burst(tx*TILE+randi(6,26),ty*TILE+randi(6,26),"#d8f4ff",2,0.8);
  if(G.frost[i]>=4){
    delete G.frost[i];
    G.tempTiles.push({x:tx,y:ty,prev:t,t:600});
    setTile(tx,ty,T.ICEWALL);
    FX.word(tx*TILE+16,ty*TILE,"ICE!","#8ae0ff"); Sfx.ice();
  }
}
// FROST RAY — ice's special: hold RMB to channel a continuous beam.
// Chills continuously, damages in ticks, douses fires, and frosts the
// ground where it lands (keep painting a spot to raise an ice wall).
function castFrostRay(){
  const p=G.player;
  if(p.stam<0.1)return;
  p.stam-=0.03;
  const lv=coreLv();
  let bx=p.x,by=p.y,hitEnt=null;
  const maxSteps=16+lv*4;
  let step=0;
  for(;step<maxSteps;step++){
    bx+=Math.cos(p.facing)*8; by+=Math.sin(p.facing)*8;
    if((G.frame+step)%3===0)FX.parts.push({x:bx+rand(-2,2),y:by+rand(-2,2),vx:rand(-.3,.3),vy:rand(-.3,.3),life:7,color:(step%2)?PAL.iceC:"#fff",size:2});
    const tx=Math.floor(bx/TILE),ty=Math.floor(by/TILE);
    if(G.fire[idx(tx,ty)])extinguishAround(tx,ty,1);
    for(const e of allHostiles())if(dist(bx,by,e.x,e.y)<13){hitEnt=e;break;}
    if(hitEnt)break;
    if(solidAtPx(bx,by))break;
  }
  if(hitEnt){
    applyChill(hitEnt,0.12);
    if(G.frame%12===0)hurtHostile(hitEnt,1,"ice",1,p.facing);
  }else if(step>=2&&G.frame%20===0){
    // frost the ground where the ray ends
    addFrost(Math.floor(bx/TILE),Math.floor(by/TILE),1);
  }
  if(G.frame%14===0)Sfx.beep(900+rand(-60,60),0.05,"triangle",0.05,-150);
  gainPowerXp("ice",G.frame%30===0?1:0);
}

// ---------------- HOSTILES ----------------
function allHostiles(){
  const arr=G.enemies.filter(e=>!e.dead&&e.state!=="downed");
  if(G.villain&&G.villain.state==="fight")arr.push(G.villain);
  return arr;
}
function hurtHostile(e,dmg,tag,knock=4,ang=0){
  if(e.isVillain)return damageVillain(dmg,tag,knock,ang);
  e.hp-=dmg;
  e.x+=Math.cos(ang)*knock; e.y+=Math.sin(ang)*knock;
  FX.burst(e.x,e.y,"#fff",5,2);
  if(tag==="ice")applyChill(e,dmg);
  if(e.hp<=0){
    e.state="downed"; e.downT=400; FX.stars(e.x,e.y); Sfx.beep(200,0.2,"square",0.1,-120);
    gainXp(4);
  }
}
function damageVillain(dmg,tag,knock,ang){
  const v=G.villain; if(!v||v.state!=="fight")return;
  // adaptations
  if(v.adaptations.includes("ice")&&tag==="ice"){ dmg=Math.max(0,dmg-1); FX.word(v.x,v.y-18,"NO CHILL!","#ff5a2a"); }
  else if(tag==="ice"){ applyChill(v,dmg*0.8); }
  if(v.adaptations.includes("melee")&&tag==="melee"){ hurtPlayer(1,"spikes"); }
  if(v.adaptations.includes("ranged")&&tag==="ranged"&&Math.random()<0.3){
    FX.word(v.x,v.y-18,"REFLECTED!","#8ae0ff");
    const a=Math.atan2(G.player.y-v.y,G.player.x-v.x);
    G.projs.push({x:v.x,y:v.y,vx:Math.cos(a)*5,vy:Math.sin(a)*5,life:60,dmg:1,tag:"zap",color:PAL.zap,from:"enemy"});
    return;
  }
  if(v.adaptations.includes("thrown")&&tag==="thrown"&&Math.random()<0.6){
    FX.word(v.x,v.y-18,"CAUGHT IT!","#ffc93c"); v.x+=rand(-20,20); v.y+=rand(-20,20); return;
  }
  G.tagCounts[tag]=(G.tagCounts[tag]||0)+dmg;
  v.hp-=dmg;
  v.x+=Math.cos(ang)*knock*0.5; v.y+=Math.sin(ang)*knock*0.5;
  FX.burst(v.x,v.y,v.theme.trim,6,2.5);
  if(v.hp<=v.maxHp*0.35&&v.encounters===1&&v.state==="fight"){
    villainFlee(); return;
  }
  if(v.hp<=0)villainDefeated();
}

// ---------------- VILLAIN (nemesis system) ----------------
function spawnVillain(){
  const theme=VILLAIN_THEMES[G.villainIdx%VILLAIN_THEMES.length];
  const p=G.player;
  const ang=rand(0,Math.PI*2);
  const v={
    isVillain:true, theme,
    x:clamp(p.x+Math.cos(ang)*260,40,WORLDW-40),
    y:clamp(p.y+Math.sin(ang)*260,40,WORLDH-40),
    rank:1, encounters:1,
    maxHp:22, hp:22,
    state:"fight", cd:70, slowT:0, stun:0,
    adaptations:[], memoryLines:[]
  };
  G.villain=v; G.tagCounts={melee:0,ranged:0,ice:0,thrown:0};
  FX.say(v,theme.intro,240);
  ticker("⚡ "+theme.name+" ("+RANKS[0]+") has appeared!");
  Sfx.siren();
}
function villainReturn(){
  const v=G.villain;
  v.encounters++;
  v.maxHp=22+v.rank*8; v.hp=v.maxHp;
  const p=G.player, ang=rand(0,Math.PI*2);
  v.x=clamp(p.x+Math.cos(ang)*280,40,WORLDW-40);
  v.y=clamp(p.y+Math.sin(ang)*280,40,WORLDH-40);
  v.state="fight";
  G.tagCounts={melee:0,ranged:0,ice:0,thrown:0};
  const memLine = v.memoryLines.length?v.memoryLines[v.memoryLines.length-1]:v.theme.intro;
  FX.say(v,memLine,300);
  ticker("⚡ "+v.theme.name+" is BACK — now a "+RANKS[v.rank-1]+"!");
  Sfx.siren();
}
function villainFlee(){
  const v=G.villain;
  v.state="fleeing"; v.fleeT=90;
  // learn adaptation from dominant tag
  let top=null,tv=0;
  for(const k in G.tagCounts)if(G.tagCounts[k]>tv){tv=G.tagCounts[k];top=k;}
  if(top&&!v.adaptations.includes(top)){
    v.adaptations.push(top);
    if(v.adaptations.length>2)v.adaptations.shift();
    v.memoryLines.push(ADAPTATIONS[top].line);
  }
  v.rank=Math.min(5,v.rank+1);
  FX.say(v,"You haven't seen the last of "+v.theme.name+"!",180);
  ticker(v.theme.name+" escaped! "+v.theme.brag);
  G.nextVillainTimer=60*20; // returns in ~20s
}
function villainDefeated(){
  const v=G.villain;
  v.state="downed";
  FX.stars(v.x,v.y);
  FX.word(v.x,v.y-24,"BUBBLE-WRAPPED!","#3fbf6e");
  Sfx.rescue();
  G.stats.villainsCaught++;
  G.rep=clamp(G.rep+18,-100,100);
  gainXp(20);
  ticker(v.theme.name+" captured and delivered to justice!");
  // major event → d20!
  G.pendingD20=true;
  G.villainIdx++;
  G.nextVillainTimer=60*45; // a new themed villain rises later (updateVillain swaps them in)
}
function villainKilledPlayer(){
  const v=G.villain; if(!v)return;
  v.rank=Math.min(5,v.rank+1);
  G.stats.koByVillain++;
  FX.say(v,v.theme.brag,240);
  ticker(v.theme.name+" gloats! They've grown to "+RANKS[v.rank-1]+"!");
}
function updateVillain(){
  const v=G.villain; if(!v)return;
  if(G.nextVillainTimer>0){
    G.nextVillainTimer--;
    if(G.nextVillainTimer===0){
      if(v.state==="gone")villainReturn();
      else if(v.state==="downed"){ G.villain=null; spawnVillain(); }
    }
  }
  if(v.state==="fleeing"){
    v.fleeT--;
    const ang=Math.atan2(v.y-G.player.y,v.x-G.player.x);
    moveEntity(v,Math.cos(ang)*3.2,Math.sin(ang)*3.2);
    FX.burst(v.x,v.y,v.theme.color,1,0.6);
    if(v.fleeT<=0)v.state="gone";
    return;
  }
  if(v.state!=="fight")return;
  if(v.stun>0){v.stun--;return;}
  const spd=(v.slowT-->0)?0.6:1.4+v.rank*0.15;
  const tgt=(G.decoy&&G.decoy.t>0)?G.decoy:G.player;
  const d=dist(v.x,v.y,tgt.x,tgt.y);
  const ang=Math.atan2(tgt.y-v.y,tgt.x-v.x);
  if(d>170)moveEntity(v,Math.cos(ang)*spd,Math.sin(ang)*spd,9);
  else if(d<90)moveEntity(v,-Math.cos(ang)*spd,-Math.sin(ang)*spd,9);
  else{ // strafe
    moveEntity(v,Math.cos(ang+Math.PI/2)*spd*0.6,Math.sin(ang+Math.PI/2)*spd*0.6,9);
  }
  v.cd--;
  if(v.cd<=0&&d<320){
    v.cd=Math.max(28,64-v.rank*7);
    G.projs.push({x:v.x,y:v.y,vx:Math.cos(ang)*4.6,vy:Math.sin(ang)*4.6,life:80,dmg:1+Math.floor(v.rank/2),tag:"zap",color:v.theme.color,from:"enemy"});
    Sfx.zap();
  }
}

// ---------------- CIVILIANS ----------------
function spawnCiv(x,y,stateOv){
  G.civs.push({
    x,y,color:choice(PAL.civ),
    state:stateOv||"wander", // wander|flee|trapped|carried|cheer
    dir:rand(0,Math.PI*2), t:randi(30,120), cheerT:0, dead:false
  });
}
function populateCivs(n=26){
  let placed=0,tries=0;
  while(placed<n&&tries<600){
    tries++;
    const x=randi(1,MAPW-2),y=randi(1,MAPH-2);
    if(tileAt(x,y)===T.SIDE||tileAt(x,y)===T.GRASS){ spawnCiv(x*TILE+16,y*TILE+16); placed++; }
  }
}
function nearestDanger(x,y){
  let best=null,bd=130;
  for(const e of allHostiles()){const d=dist(x,y,e.x,e.y);if(d<bd){bd=d;best={x:e.x,y:e.y};}}
  const tx=Math.floor(x/TILE),ty=Math.floor(y/TILE);
  for(let yy=ty-3;yy<=ty+3;yy++)for(let xx=tx-3;xx<=tx+3;xx++){
    if(xx<0||yy<0||xx>=MAPW||yy>=MAPH)continue;
    if(G.fire[idx(xx,yy)]){const d=dist(x,y,xx*TILE+16,yy*TILE+16);if(d<bd){bd=d;best={x:xx*TILE+16,y:yy*TILE+16};}}
  }
  return best;
}
function updateCivs(){
  for(const c of G.civs){
    if(c.dead)continue;
    if(c.state==="carried"){
      c.x=G.player.x+Math.cos(G.player.facing+Math.PI)*10;
      c.y=G.player.y+Math.sin(G.player.facing+Math.PI)*10-6;
      continue;
    }
    if(c.state==="trapped"){
      if(G.frame%120===0)FX.say(c,"HELP!",60);
      // fire damage risk
      if(G.fire[idx(Math.floor(c.x/TILE),Math.floor(c.y/TILE))]&&G.frame%90===0){
        // singed, not killed — but reputation dings
        FX.burst(c.x,c.y,PAL.fire1,4,1.5);
      }
      continue;
    }
    if(c.state==="cheer"){
      c.cheerT--;
      if(G.frame%30===0)FX.burst(c.x,c.y-14,"#ffc93c",2,1);
      if(c.cheerT<=0)c.state="wander";
      continue;
    }
    const danger=nearestDanger(c.x,c.y);
    if(danger){
      c.state="flee";
      const ang=Math.atan2(c.y-danger.y,c.x-danger.x);
      moveEntity(c,Math.cos(ang)*1.7,Math.sin(ang)*1.7,5);
      if(G.frame%150===0&&Math.random()<0.3)FX.say(c,choice(["EEK!","A VILLAIN!","RUN!","MY GROCERIES!"]),50);
    }else{
      c.state="wander";
      c.t--;
      if(c.t<=0){c.dir=rand(0,Math.PI*2);c.t=randi(40,140);}
      moveEntity(c,Math.cos(c.dir)*0.5,Math.sin(c.dir)*0.5,5);
    }
  }
}

// ---------------- ENEMIES ----------------
function spawnEnemy(x,y,ranged){
  G.enemies.push({x,y,hp:5,ranged:!!ranged,state:"fight",cd:randi(30,80),slowT:0,frozenT:0,stun:0,downT:0,dead:false});
}
function updateEnemies(){
  for(const e of G.enemies){
    if(e.dead)continue;
    if(e.state==="downed"){ e.downT--; if(e.downT<=0){e.dead=true;} continue; }
    if(e.frozenT>0){e.frozenT--;continue;}
    if(e.stun>0){e.stun--;continue;}
    const spd=(e.slowT-->0)?0.5:1.15;
    const tgt=(G.decoy&&G.decoy.t>0)?G.decoy:G.player;
    const d=dist(e.x,e.y,tgt.x,tgt.y);
    if(d>380)continue;
    const ang=Math.atan2(tgt.y-e.y,tgt.x-e.x);
    if(e.ranged){
      if(d>120)moveEntity(e,Math.cos(ang)*spd,Math.sin(ang)*spd);
      e.cd--;
      if(e.cd<=0&&d<260){e.cd=95;G.projs.push({x:e.x,y:e.y,vx:Math.cos(ang)*3.8,vy:Math.sin(ang)*3.8,life:80,dmg:1,tag:"dart",color:"#c9c14f",from:"enemy"});}
    }else{
      if(d>18)moveEntity(e,Math.cos(ang)*spd,Math.sin(ang)*spd);
      else{ e.cd--; if(e.cd<=0){e.cd=55;
        if(tgt===G.player)hurtPlayer(1,"punch");
        else{G.decoy.t-=60;FX.burst(tgt.x,tgt.y,"#ffc93c",4,1.5);FX.word(tgt.x,tgt.y-14,"POOF?","#ffc93c");}
      } }
    }
  }
  G.enemies=G.enemies.filter(e=>!e.dead);
}

// ---------------- PLAYER DAMAGE / KO ----------------
function hurtPlayer(dmg,src){
  const p=G.player;
  if(p.iframes>0)return;
  if(p.blocking>0)dmg=Math.max(0,Math.round(dmg*0.25));
  if(src==="fire"&&p.fireVulnT>0)dmg*=2;
  if(dmg<=0)return;
  p.hp-=dmg; p.hurtFlash=12; p.iframes=42;
  Sfx.hurt(); Cam.bump(4);
  if(p.hp<=0)playerKO();
}
function playerKO(){
  const p=G.player;
  G.koCount++;
  FX.word(p.x,p.y-20,"K.O.!","#e8433f");
  villainKilledPlayer();
  if(G.koCount>=2){ G.paperReason="ko"; G.state="paper"; return; }
  // wake up at HQ (center)
  p.hp=p.maxHp; p.x=WORLDW/2; p.y=WORLDH/2; p.iframes=120;
  p.carrying=null; p.holding=null;
  ticker("You wake up at HQ, bruised but determined. (One more K.O. ends the issue!)");
}

// ---------------- EVENTS ----------------
function spawnEvent(){
  const types=["robbery","fire","chase"];
  const type=choice(types);
  if(type==="robbery"){
    const b=choice(G.buildings);
    if(!b)return;
    const ex=(b.x+Math.floor(b.w/2))*TILE+16, ey=(b.y+b.h)*TILE+16;
    const ev={type,x:ex,y:ey,done:false,enemies:[]};
    for(let i=0;i<3;i++){
      spawnEnemy(ex+rand(-28,28),ey+rand(-10,30),i===2);
      ev.enemies.push(G.enemies[G.enemies.length-1]);
    }
    G.events.push(ev);
    ticker("🚨 Robbery in progress!");
  }else if(type==="fire"){
    const candidates=G.buildings.filter(b=>!b.burning);
    if(!candidates.length)return;
    const b=choice(candidates); b.burning=true;
    // ignite a few interior tiles
    for(let i=0;i<4;i++){
      const fx=randi(b.x+1,b.x+b.w-2), fy=randi(b.y+1,b.y+b.h-2);
      G.fire[idx(fx,fy)]=1;
    }
    const ev={type,x:(b.x+b.w/2)*TILE,y:(b.y+b.h/2)*TILE,done:false,civs:[],building:b};
    for(let i=0;i<2;i++){
      const cx=randi(b.x+1,b.x+b.w-2)*TILE+16, cy=randi(b.y+1,b.y+b.h-2)*TILE+16;
      spawnCiv(cx,cy,"trapped");
      ev.civs.push(G.civs[G.civs.length-1]);
    }
    G.events.push(ev);
    ticker("🔥 Building fire! Civilians trapped inside!");
    Sfx.siren();
  }else{
    // chase: car drives along a horizontal road
    let ry=3; for(let y=3;y<MAPH;y++)if(isRoadLane(y)){ry=y;break;}
    const rows=[]; for(let y=0;y<MAPH;y++)if(isRoadLane(y)&&y%8===3)rows.push(y);
    ry=choice(rows);
    const goRight=Math.random()<0.5;
    const ev={type,x:goRight?20:WORLDW-20,y:ry*TILE+TILE, done:false,
      car:{x:goRight?20:WORLDW-20,y:ry*TILE+TILE,vx:goRight?2.4:-2.4,hp:10,stopped:false}};
    G.events.push(ev);
    ticker("🚗 Getaway car spotted! Stop it before it escapes!");
    Sfx.siren();
  }
}
function resolveEvent(ev,success,msgKey){
  ev.done=true;
  G.eventsResolved++;
  if(success){
    gainXp(8); G.rep=clamp(G.rep+6,-100,100);
    ticker(choice(TICKER_LINES[msgKey]));
    if(msgKey==="crime")G.stats.crimes++;
    if(msgKey==="chase")G.stats.chases++;
  }else{
    G.rep=clamp(G.rep-5,-100,100);
  }
  // villain debut after 3 resolved events
  if(G.eventsResolved===3&&!G.villain)spawnVillain();
}
function updateEvents(){
  // spawner
  const active=G.events.filter(e=>!e.done).length;
  if(active<2){
    G.eventCooldown--;
    if(G.eventCooldown<=0){ spawnEvent(); G.eventCooldown=randi(420,700); }
  }
  for(const ev of G.events){
    if(ev.done)continue;
    if(ev.type==="robbery"){
      if(ev.enemies.every(e=>e.dead||e.state==="downed"))resolveEvent(ev,true,"crime");
    }else if(ev.type==="fire"){
      const unresolved=ev.civs.filter(c=>c.state==="trapped"||c.state==="carried");
      if(unresolved.length===0)resolveEvent(ev,true,"rescue");
    }else if(ev.type==="chase"){
      const car=ev.car;
      if(!car.stopped){
        if(solidAtPx(car.x+Math.sign(car.vx)*20,car.y)){
          FX.word(car.x,car.y-18,"CRUNCH!","#8ae0ff");
          damageChaseCar(ev,99);
        }else car.x+=car.vx;
        FX.smoke(car.x-Math.sign(car.vx)*16,car.y);
        ev.x=car.x; ev.y=car.y;
        if(car.x<8||car.x>WORLDW-8){ resolveEvent(ev,false,"chase"); ticker("The getaway car... got away. The papers noticed."); }
        // player can damage it via projectiles/melee handled in proj/melee vs car below
      }else{
        if(ev.spawned&&ev.crooks.every(e=>e.dead||e.state==="downed"))resolveEvent(ev,true,"chase");
      }
    }
  }
  G.events=G.events.filter(e=>!e.done||G.frame%600!==0);
}
function damageChaseCar(ev,dmg){
  const car=ev.car;
  car.hp-=dmg;
  FX.burst(car.x,car.y,"#b0a89a",5,2);
  if(car.hp<=0&&!car.stopped){
    car.stopped=true; Sfx.boom(); Cam.bump(4);
    FX.word(car.x,car.y-16,"SCREECH!","#ffc93c");
    ev.crooks=[]; ev.spawned=true;
    for(let i=0;i<2;i++){ spawnEnemy(car.x+rand(-20,20),car.y+rand(-20,20),i===1); ev.crooks.push(G.enemies[G.enemies.length-1]); }
  }
}

// ---------------- OBJECTS (held/thrown/props) ----------------
function damageObj(o,dmg){
  o.hp-=dmg;
  FX.burst(o.x,o.y,o.color,4,2);
  if(o.hp<=0)destroyObj(o);
}
function destroyObj(o){
  o.dead=true;
  if(o.type==="car"){ Sfx.boom(); Cam.bump(5); FX.word(o.x,o.y-14,"KABOOM!","#ff5a2a");
    FX.burst(o.x,o.y,"#ffc93c",14,4); FX.burst(o.x,o.y,"#fff",10,3); addCollateral(6);
  }else if(o.type==="hydrant"){ Sfx.beep(400,0.3,"triangle",0.12,300);
    FX.word(o.x,o.y-14,"SPLOOSH!","#4aa8e8");
    for(let i=0;i<20;i++)FX.parts.push({x:o.x,y:o.y,vx:rand(-1,1),vy:rand(-3,-1),life:rand(30,60),color:PAL.water,size:3});
    extinguishAround(Math.floor(o.x/TILE),Math.floor(o.y/TILE),2);
    addCollateral(2,true);
  }else{ Sfx.hit(); addCollateral(1,true); }
}
function updateObjs(){
  const p=G.player;
  for(const o of G.objs){
    if(o.dead)continue;
    if(o.held){ o.x=p.x; o.y=p.y-18; continue; }
    if(o.thrown){
      o.x+=o.vx; o.y+=o.vy;
      // hit hostiles
      for(const e of allHostiles()){
        if(dist(o.x,o.y,e.x,e.y)<16){
          hurtHostile(e,o.heavy?6:3,"thrown",8,Math.atan2(o.vy,o.vx));
          FX.word(o.x,o.y-10,choice(IMPACT),"#ff5a2a");
          destroyObj(o); break;
        }
      }
      if(o.dead)continue;
      // chase car hit
      for(const ev of G.events)if(!ev.done&&ev.type==="chase"&&!ev.car.stopped){
        if(dist(o.x,o.y,ev.car.x,ev.car.y)<20){ damageChaseCar(ev,o.heavy?6:3); destroyObj(o); }
      }
      if(o.dead)continue;
      // wall hit
      if(solidAtPx(o.x,o.y)){
        damageTile(Math.floor(o.x/TILE),Math.floor(o.y/TILE),o.heavy?12:4,"thrown");
        destroyObj(o);
      }
      if(o.x<0||o.y<0||o.x>WORLDW||o.y>WORLDH)o.dead=true;
    }
  }
  G.objs=G.objs.filter(o=>!o.dead);
}

// ---------------- PROJECTILES ----------------
function updateProjs(){
  const p=G.player;
  for(const pr of G.projs){
    pr.x+=pr.vx; pr.y+=pr.vy; pr.life--;
    if(pr.life<=0){pr.dead=true;
      if(pr.tag==="ice"&&pr.from==="player")addFrost(Math.floor(pr.x/TILE),Math.floor(pr.y/TILE),1);
      continue;}
    // tile collide
    const tx=Math.floor(pr.x/TILE),ty=Math.floor(pr.y/TILE);
    if(solidAtPx(pr.x,pr.y)){
      if(pr.from==="player")damageTile(tx,ty,pr.dmg,pr.tag);
      if(pr.tag==="ice"){extinguishAround(tx,ty,1);if(pr.from==="player")addFrost(tx,ty,1);}
      if(!pr.pierce){pr.dead=true;continue;}
    }
    if(pr.tag==="ice"&&G.fire[idx(tx,ty)])extinguishAround(tx,ty,1);
    if(pr.from==="player"){
      for(const e of allHostiles()){
        if(dist(pr.x,pr.y,e.x,e.y)<13){
          hurtHostile(e,pr.dmg,pr.tag,4,Math.atan2(pr.vy,pr.vx));
          if(pr.freeze&&!e.isVillain)e.frozenT=Math.max(e.frozenT,120);
          if(pr.split&&!pr._split){pr._split=true;
            fireBolt(pr.x,pr.y,Math.atan2(pr.vy,pr.vx)+0.5,POWERS.blast,1);
            fireBolt(pr.x,pr.y,Math.atan2(pr.vy,pr.vx)-0.5,POWERS.blast,1);
          }
          if(!pr.pierce){pr.dead=true;} break;
        }
      }
      for(const ev of G.events)if(!ev.done&&ev.type==="chase"&&!ev.car.stopped){
        if(dist(pr.x,pr.y,ev.car.x,ev.car.y)<20){ damageChaseCar(ev,pr.dmg); if(!pr.pierce)pr.dead=true; }
      }
      // props
      for(const o of G.objs){
        if(!o.dead&&!o.held&&!o.thrown&&dist(pr.x,pr.y,o.x,o.y)<12){ damageObj(o,pr.dmg); if(!pr.pierce)pr.dead=true; break; }
      }
    }else{
      if(dist(pr.x,pr.y,p.x,p.y)<11){ hurtPlayer(pr.dmg,"proj"); pr.dead=true; }
    }
  }
  G.projs=G.projs.filter(pr=>!pr.dead);
}

// ---------------- INTERACT (E) ----------------
function doInteract(){
  const p=G.player;
  if(p.carrying){
    // drop: safe if not on fire tile and no hostile within 90
    const tx=Math.floor(p.x/TILE),ty=Math.floor(p.y/TILE);
    const onFire=G.fire[idx(tx,ty)]>0;
    const dangerNear=allHostiles().some(e=>dist(e.x,e.y,p.x,p.y)<90);
    if(!onFire&&!dangerNear&&tileAt(tx,ty)!==T.FLOOR){
      const c=p.carrying; p.carrying=null;
      c.state="cheer"; c.cheerT=140; c.x=p.x+12; c.y=p.y;
      G.stats.rescued++; gainXp(6); G.rep=clamp(G.rep+5,-100,100);
      FX.word(p.x,p.y-24,"SAVED!","#3fbf6e"); Sfx.rescue();
      ticker(choice(TICKER_LINES.rescue));
    }else{
      FX.say(p,"Not safe here yet!",60);
    }
    return;
  }
  // pick up trapped/nearby civ
  for(const c of G.civs){
    if(!c.dead&&c.state==="trapped"&&dist(c.x,c.y,p.x,p.y)<24){
      c.state="carried"; p.carrying=c; Sfx.pickup();
      FX.say(p,"I've got you!",60);
      return;
    }
  }
}

// ---------------- D20 ----------------
function rollD20(){ return randi(1,20); }
function applyD20(n){
  const p=G.player;
  const entry=D20_TABLE.find(e=>n>=e.min&&n<=e.max);
  if(n===1){
    p.fireVulnT=60*60*3;
    offerNewPower("UNSTABLE MUTATION — CHOOSE YOUR NEW POWER",1);
  }else if(n<=4){ p.surgeT=60*90; }
  else if(n<=8){ gainPowerXp(p.core,40); }
  else if(n<=12){ const lv=p.powerLv[p.core]; if(lv<5){p.powerLv[p.core]=lv+1; ticker(POWERS[p.core].name+" advanced to level "+(lv+1)+"!");} else gainPowerXp(p.extra||p.core,40); }
  else if(n<=16){ p.maxHp+=2; p.hp=Math.min(p.maxHp,p.hp+2); p.perks.stamRegen+=0.004; }
  else if(n<=19){
    G.pendingChoice={title:"RARE TECHNIQUE — PICK ONE",options:[
      {label:"HERO'S RESOLVE",desc:"+3 max HP, permanently.",apply(){p.maxHp+=3;p.hp=p.maxHp;}},
      {label:"WIND AT YOUR BACK",desc:"+15% movement speed, permanently.",apply(){p.speedBoost=(p.speedBoost||1)*1.15;}}
    ]};
  }else{ offerNewPower("HEROIC BREAKTHROUGH — CHOOSE A POWER (starts at LV2!)",2); }
  return entry;
}

// ---------------- PLAYER UPDATE ----------------
function updatePlayer(){
  const p=G.player;
  p.facing=Math.atan2(mouseWY()-p.y, mouseWX()-p.x);
  for(const k in p.cds)if(p.cds[k]>0)p.cds[k]--;
  for(let i=0;i<5;i++)if(p.abilityCds[i]>0)p.abilityCds[i]--;
  if(p.iframes>0)p.iframes--;
  if(p.blocking>0)p.blocking--;
  if(p.hurtFlash>0)p.hurtFlash--;
  if(p.surgeT>0)p.surgeT--;
  if(p.fireVulnT>0)p.fireVulnT--;
  p.stam=Math.min(p.maxStam,p.stam+0.015+p.perks.stamRegen);
  // healing factor support
  if(p.support==="healing"&&G.frame%75===0&&p.hp<p.maxHp)p.hp+=0.5;

  // dash
  if(p.dashT>0){
    p.dashT--;
    moveEntity(p,p.dashVx,p.dashVy);
    FX.burst(p.x,p.y,POWERS[p.core].color,1,0.4);
    if(p.dashT===0&&p._slamPending){
      p._slamPending=false;
      Cam.bump(5); Sfx.boom(); FX.word(p.x,p.y-16,"SLAM!","#e8433f");
      for(const e of allHostiles())if(dist(p.x,p.y,e.x,e.y)<60)hurtHostile(e,4,"melee",10,Math.atan2(e.y-p.y,e.x-p.x));
      FX.burst(p.x,p.y,"#b0a89a",14,4);
    }
  }else{
    const ax=Input.axis();
    let spd=(p.core==="speed"?2.6:2.0)*(p.speedBoost||1);
    if(p.blocking>0)spd*=0.3;
    if(p.carrying)spd*=0.72;
    if(p.holding&&p.holding.heavy)spd*=0.6;
    moveEntity(p,ax.x*spd,ax.y*spd);
  }
  // fire damage
  const tx=Math.floor(p.x/TILE),ty=Math.floor(p.y/TILE);
  if(G.fire[idx(tx,ty)]&&G.frame%45===0)hurtPlayer(1,"fire");

  // inputs → abilities
  if(Input.mouse.l&&p.cds.basic<=0){ p.cds.basic = p.core==="speed"?14:22; doBasic(p.core); }
  if(Input.mouse.r){
    if(p.core==="ice")castFrostRay(); // channeled — no cooldown, drains stamina
    else if(p.cds.special<=0){ if(doSpecial())p.cds.special=45; }
  }
  if(Input.keys.Space&&p.cds.mob<=0){ if(doMobility())p.cds.mob=50; }
  if(Input.keys.KeyQ&&p.cds.def<=0){ if(doDefense())p.cds.def=90; }
  if(Input.keys.KeyF&&p.cds.sup<=0&&p.support==="grapple"){ if(doSupport())p.cds.sup=70; }
  if(Input.keys.KeyG&&p.extra&&p.cds.extra<=0){ p.cds.extra=30; doBasic(p.extra); }
  if(Input.keys.KeyE&&!p._ePressed){ p._ePressed=true; doInteract(); }
  if(!Input.keys.KeyE)p._ePressed=false;
  for(let n=1;n<=5;n++){
    const down=Input.keys["Digit"+n]||Input.keys["Numpad"+n];
    if(down&&!p._numHeld[n]){ p._numHeld[n]=true; castAbility(n); }
    if(!down)p._numHeld[n]=false;
  }
}

// ---------------- WORLD UPDATE ----------------
function updateWorld(){
  G.frame++;
  // temp tiles (ice walls) melt back
  for(let i=G.tempTiles.length-1;i>=0;i--){
    const tt=G.tempTiles[i]; tt.t--;
    if(tt.t<=0){
      setTile(tt.x,tt.y,tt.prev);
      FX.burst(tt.x*TILE+16,tt.y*TILE+16,PAL.iceC,6,1.5);
      G.tempTiles.splice(i,1);
    }
  }
  // frost buildup decays
  if(G.frame%120===0)for(const k in G.frost){if(--G.frost[k]<=0)delete G.frost[k];}
  // afterimage decoy
  if(G.decoy){
    G.decoy.t--;
    if(G.decoy.t<=0){ FX.burst(G.decoy.x,G.decoy.y,"#ffc93c",10,2.5); G.decoy=null; }
  }
  updatePlayer();
  updateCivs();
  updateEnemies();
  updateVillain();
  updateObjs();
  updateProjs();
  updateEvents();
  updateFire();
  FX.update();
  Cam.update();
  Cam.follow(G.player.x,G.player.y,WORLDW,WORLDH,VIEWW,VIEWH);
}

// ---------------- RESET / START ----------------
function startRun(coreKey,supportKey,heroName){
  G.state="play"; G.frame=0;
  G.rep=0; G.collateral=0; G.koCount=0;
  G.stats={rescued:0,crimes:0,chases:0,firesOut:0,villainsCaught:0,koByVillain:0};
  G.civs=[]; G.enemies=[]; G.projs=[]; G.events=[];
  G.villain=null; G.villainIdx=randi(0,VILLAIN_THEMES.length-1); G.nextVillainTimer=-1;
  G.tempTiles=[]; G.decoy=null; G.frost={};
  G.eventCooldown=180; G.eventsResolved=0;
  G.heroName=heroName; G.pendingChoice=null; G.pendingD20=false; G.paperReason=null;
  FX.parts=[];FX.words=[];FX.bubbles=[];
  genCity();
  G.player=makePlayer(coreKey,supportKey);
  Cam.x=clamp(G.player.x-VIEWW/2,0,WORLDW-VIEWW);
  Cam.y=clamp(G.player.y-VIEWH/2,0,WORLDH-VIEWH);
  Cam.shake=0;
  populateCivs();
  ticker("Patrol begins. Protect Meridian City, "+heroName+"!");
}
