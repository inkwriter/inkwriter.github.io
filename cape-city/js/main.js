// ============================================================
// CAPE CITY COMICS — main.js
// Rendering, HUD, loop, and DOM overlay wiring.
// ============================================================
"use strict";

const canvas=document.getElementById("game");
const sctx=canvas.getContext("2d");
sctx.imageSmoothingEnabled=false;
const SW=VIEWW*UPSCALE, SH=VIEWH*UPSCALE; // 960x600 screen

// ---- NATIVE LOW-RES PIPELINE ----
// The world draws at its true internal resolution (480x300) and is integer-
// upscaled 2x with smoothing off. No downsampling, no lost detail: every
// pixel that's drawn is a pixel you see, just chunkier and closer.
const wcan=document.createElement("canvas"); wcan.width=VIEWW; wcan.height=VIEWH;
const wctx=wcan.getContext("2d"); wctx.imageSmoothingEnabled=false;
let ctx=wctx; // draw target: world functions use this; swapped to sctx for the UI pass

// ---------------- TILE RENDERING ----------------
function drawTile(x,y){
  const t=tileAt(x,y);
  const sx=x*TILE-Cam.x+Cam.ox(), sy=y*TILE-Cam.y+Cam.oy();
  switch(t){
    case T.ROAD:{
      ctx.fillStyle=PAL.road; ctx.fillRect(sx,sy,TILE,TILE);
      const rh=(x*73+y*131)&15; // deterministic asphalt speckle
      ctx.fillStyle="rgba(255,255,255,.05)";
      if(rh<6){ctx.fillRect(sx+(rh*5)%26+2,sy+(rh*7)%26+2,2,2);ctx.fillRect(sx+(rh*11)%26+3,sy+(rh*3)%26+4,2,2);}
      ctx.fillStyle="rgba(0,0,0,.10)";
      if(rh>11)ctx.fillRect(sx+(rh*9)%24+3,sy+(rh*5)%24+3,3,2);}
      if((x%8===4&&y%2===0)||(y%8===4&&x%2===0)){ctx.fillStyle=PAL.roadLine;ctx.fillRect(sx+(x%8===4?0:8),sy+(y%8===4?14:8),x%8===4?4:14,y%8===4?4:14);}
      break;
    case T.SIDE:{
      ctx.fillStyle=(x+y)%2?PAL.sidewalk:PAL.sidewalk2; ctx.fillRect(sx,sy,TILE,TILE);
      ctx.fillStyle="rgba(0,0,0,.10)";
      ctx.fillRect(sx,sy,TILE,1);ctx.fillRect(sx,sy,1,TILE); // slab seams
      const sh=(x*53+y*89)&7;
      if(sh===3)ctx.fillRect(sx+9,sy+14,7,1); // crack
      break;}
    case T.GRASS:{
      ctx.fillStyle=(x*7+y*13)%3?PAL.grass:PAL.grass2; ctx.fillRect(sx,sy,TILE,TILE);
      const gh=(x*97+y*61)&7; // tufts + flowers
      ctx.fillStyle="#3f9440";
      if(gh<4){ctx.fillRect(sx+(gh*7)%24+3,sy+(gh*9)%24+3,2,3);ctx.fillRect(sx+(gh*13)%24+5,sy+(gh*5)%24+6,2,3);}
      if(gh===5){ctx.fillStyle="#ffc93c";ctx.fillRect(sx+18,sy+8,2,2);}
      if(gh===6){ctx.fillStyle="#e88ab0";ctx.fillRect(sx+7,sy+19,2,2);}
      break;}
    case T.WALL:{
      const b=G.buildings.find(bb=>x>=bb.x&&x<bb.x+bb.w&&y>=bb.y&&y<bb.y+bb.h);
      ctx.fillStyle=b?b.palette:PAL.wallA; ctx.fillRect(sx,sy,TILE,TILE);
      // brick coursing
      ctx.fillStyle="rgba(0,0,0,.14)";
      ctx.fillRect(sx,sy+8,TILE,2);ctx.fillRect(sx,sy+16,TILE,2);ctx.fillRect(sx,sy+24,TILE,2);
      const off=(x+y)%2;
      ctx.fillRect(sx+(off?8:18),sy+3,2,5);ctx.fillRect(sx+(off?22:6),sy+10,2,6);ctx.fillRect(sx+(off?12:26),sy+18,2,6);
      ctx.fillStyle="rgba(255,255,255,.08)";ctx.fillRect(sx,sy+3,TILE,1);
      ctx.fillStyle="rgba(0,0,0,.22)"; ctx.fillRect(sx,sy+TILE-6,TILE,6);
      ctx.fillRect(sx, sy, TILE, 3);
      break;}
    case T.FLOOR:
      ctx.fillStyle=PAL.floor; ctx.fillRect(sx,sy,TILE,TILE);
      ctx.fillStyle="rgba(0,0,0,.06)"; if((x+y)%2)ctx.fillRect(sx,sy,TILE,TILE);
      break;
    case T.DOOR:
      ctx.fillStyle=PAL.door; ctx.fillRect(sx,sy,TILE,TILE);
      ctx.fillStyle="#c9a04a"; ctx.fillRect(sx+22,sy+14,4,4);
      break;
    case T.WIN:{
      const b=G.buildings.find(bb=>x>=bb.x&&x<bb.x+bb.w&&y>=bb.y&&y<bb.y+bb.h);
      ctx.fillStyle=b?b.palette:PAL.wallA; ctx.fillRect(sx,sy,TILE,TILE);
      ctx.fillStyle=PAL.windowT; ctx.fillRect(sx+5,sy+7,TILE-10,TILE-15);
      ctx.strokeStyle=PAL.ink; ctx.lineWidth=2; ctx.strokeRect(sx+5,sy+7,TILE-10,TILE-15);
      break;}
    case T.BROKENWIN:{
      const b=G.buildings.find(bb=>x>=bb.x&&x<bb.x+bb.w&&y>=bb.y&&y<bb.y+bb.h);
      ctx.fillStyle=b?b.palette:PAL.wallA; ctx.fillRect(sx,sy,TILE,TILE);
      ctx.fillStyle="#233"; ctx.fillRect(sx+5,sy+7,TILE-10,TILE-15);
      ctx.fillStyle=PAL.windowT;
      ctx.fillRect(sx+6,sy+8,5,4);ctx.fillRect(sx+18,sy+16,6,5);
      break;}
    case T.RUBBLE:
      ctx.fillStyle=PAL.rubble; ctx.fillRect(sx,sy,TILE,TILE);
      ctx.fillStyle="#6a6458";
      ctx.fillRect(sx+4,sy+6,8,6);ctx.fillRect(sx+18,sy+16,9,7);ctx.fillRect(sx+10,sy+22,6,5);
      break;
    case T.TREE:
      ctx.fillStyle=PAL.grass; ctx.fillRect(sx,sy,TILE,TILE);
      ctx.fillStyle=PAL.treeTrunk; ctx.fillRect(sx+13,sy+18,6,10);
      ctx.fillStyle=PAL.tree; ctx.fillRect(sx+6,sy+2,20,20);
      ctx.fillStyle="#3fa04a"; ctx.fillRect(sx+9,sy+5,8,8);
      break;
    case T.ICEWALL:
      ctx.fillStyle=PAL.iceC; ctx.fillRect(sx,sy,TILE,TILE);
      ctx.fillStyle="#d8f4ff"; ctx.fillRect(sx+3,sy+3,10,8); ctx.fillRect(sx+18,sy+16,9,9);
      ctx.fillStyle="rgba(26,16,40,.25)"; ctx.fillRect(sx,sy+TILE-5,TILE,5);
      break;
  }
  // frost buildup overlay
  const fr=G.frost[idx(x,y)];
  if(fr){
    ctx.fillStyle="rgba(190,235,255,"+Math.min(0.55,0.16*fr)+")";
    ctx.fillRect(sx,sy,TILE,TILE);
    ctx.fillStyle="rgba(255,255,255,.5)";
    ctx.fillRect(sx+5,sy+6,3,2);ctx.fillRect(sx+20,sy+18,4,2);ctx.fillRect(sx+12,sy+24,3,2);
  }
  // fire overlay
  if(G.fire[idx(x,y)]){
    const fl=(G.frame>>3)%2;
    ctx.fillStyle=fl?PAL.fire1:PAL.fire2;
    ctx.fillRect(sx+4,sy+8,8,12); ctx.fillRect(sx+14,sy+4,10,16); ctx.fillRect(sx+24,sy+12,6,10);
    if(G.frame%9===0)FX.smoke(x*TILE+rand(4,28),y*TILE+rand(0,10));
  }
}

// ---------------- CHARACTER SPRITES (procedural pixel art) ----------------
function drawShadow(sx,sy,w=12){ ctx.fillStyle="rgba(0,0,0,.25)"; ctx.fillRect(sx-w/2,sy+8,w,4); }
function drawHero(p){
  const sx=Math.round(p.x-Cam.x), sy=Math.round(p.y-Cam.y);
  drawShadow(sx,sy);
  const flick=p.hurtFlash>0&&(G.frame>>2)%2;
  if(flick)return;
  const capeFlap=(G.frame>>4)%2?2:0;
  // cape (with ink edge)
  ctx.fillStyle=PAL.ink; ctx.fillRect(sx-9,sy-9,18,14+capeFlap);
  ctx.fillStyle=PAL.heroCape;
  ctx.fillRect(sx-8,sy-8,16,12+capeFlap);
  // ink silhouette
  ctx.fillStyle=PAL.ink; ctx.fillRect(sx-7,sy-17,14,26);
  // body
  ctx.fillStyle=POWERS[p.core].color;
  ctx.fillRect(sx-6,sy-6,12,14);
  // legs split
  ctx.fillStyle=PAL.ink; ctx.fillRect(sx-1,sy+3,2,5);
  // head
  ctx.fillStyle=PAL.skin; ctx.fillRect(sx-5,sy-16,10,9);
  // mask
  ctx.fillStyle=POWERS[p.core].color; ctx.fillRect(sx-5,sy-16,10,4);
  // eyes
  ctx.fillStyle="#fff"; ctx.fillRect(sx-4,sy-15,3,2); ctx.fillRect(sx+1,sy-15,3,2);
  ctx.fillStyle=PAL.ink; ctx.fillRect(sx-3,sy-15,1,2); ctx.fillRect(sx+2,sy-15,1,2);
  // belt + emblem
  ctx.fillStyle=PAL.heroYellow||"#ffc93c"; ctx.fillRect(sx-6,sy+2,12,2);
  ctx.fillStyle="#fff"; ctx.fillRect(sx-2,sy-3,4,4);
  // blocking shield
  if(p.blocking>0){
    ctx.strokeStyle=POWERS[p.core].color; ctx.lineWidth=3;
    ctx.strokeRect(sx-13,sy-20,26,32);
  }
  // held object above head
  if(p.holding)drawObj(p.holding);
  if(p.carrying){ /* drawn by civ draw at offset */ }
  // aim reticle line
  ctx.strokeStyle="rgba(255,255,255,.25)"; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(sx,sy);
  ctx.lineTo(sx+Math.cos(p.facing)*22, sy+Math.sin(p.facing)*22); ctx.stroke();
}
function drawDecoy(d){
  const sx=Math.round(d.x-Cam.x), sy=Math.round(d.y-Cam.y);
  ctx.globalAlpha=0.45+0.15*((G.frame>>3)%2);
  ctx.fillStyle=PAL.heroCape; ctx.fillRect(sx-8,sy-8,16,12);
  ctx.fillStyle=POWERS[G.player.core].color; ctx.fillRect(sx-6,sy-6,12,14);
  ctx.fillStyle=PAL.skin; ctx.fillRect(sx-5,sy-16,10,9);
  ctx.globalAlpha=1;
}
function drawCiv(c){
  const sx=Math.round(c.x-Cam.x), sy=Math.round(c.y-Cam.y);
  drawShadow(sx,sy,10);
  ctx.fillStyle=PAL.ink; ctx.fillRect(sx-5,sy-13,10,20);
  ctx.fillStyle=c.color; ctx.fillRect(sx-4,sy-4,8,10);
  ctx.fillStyle=PAL.skin; ctx.fillRect(sx-4,sy-12,8,8);
  ctx.fillStyle=PAL.ink; ctx.fillRect(sx-2,sy-9,1,2); ctx.fillRect(sx+1,sy-9,1,2);
  if(c.state==="trapped"&&(G.frame>>4)%2){ctx.fillStyle="#fff";ctx.font="12px Bangers, sans-serif";ctx.textAlign="center";ctx.fillText("!",sx,sy-16);}
  if(c.state==="carried"){ /* riding on shoulders — small wave */ 
    ctx.fillStyle=PAL.skin;ctx.fillRect(sx+5,sy-14,3,3);}
}
function drawEnemy(e){
  const sx=Math.round(e.x-Cam.x), sy=Math.round(e.y-Cam.y);
  drawShadow(sx,sy,10);
  if(e.state==="downed"){
    ctx.fillStyle=PAL.enemy; ctx.fillRect(sx-6,sy-2,12,8);
    ctx.fillStyle=PAL.skin; ctx.fillRect(sx-4,sy-9,8,7);
    if((G.frame>>4)%2){ctx.fillStyle="#ffc93c";ctx.font="10px monospace";ctx.textAlign="center";ctx.fillText("★",sx+randi(-6,6),sy-13);}
    return;
  }
  ctx.fillStyle=PAL.ink; ctx.fillRect(sx-6,sy-14,12,22);
  ctx.fillStyle=e.frozenT>0?PAL.iceC:PAL.enemy; ctx.fillRect(sx-5,sy-5,10,12);
  ctx.fillStyle=PAL.skin; ctx.fillRect(sx-4,sy-13,8,8);
  ctx.fillStyle=PAL.enemyMask; ctx.fillRect(sx-4,sy-11,8,3);
  ctx.fillStyle="#fff"; ctx.fillRect(sx-3,sy-10,2,1); ctx.fillRect(sx+1,sy-10,2,1);
  if(e.ranged){ctx.fillStyle="#c9c14f";ctx.fillRect(sx+4,sy-3,5,3);}
  if(e.frozenT>0){ctx.strokeStyle=PAL.iceC;ctx.lineWidth=2;ctx.strokeRect(sx-8,sy-16,16,26);}
}
function drawVillain(v){
  if(!v||v.state==="gone")return;
  const sx=Math.round(v.x-Cam.x), sy=Math.round(v.y-Cam.y);
  drawShadow(sx,sy,16);
  if(v.state==="downed"){
    ctx.fillStyle=v.theme.color; ctx.fillRect(sx-8,sy-2,16,9);
    ctx.fillStyle=PAL.skin; ctx.fillRect(sx-5,sy-10,10,8);
    // bubble wrap!
    ctx.strokeStyle="rgba(255,255,255,.8)";ctx.lineWidth=1;
    for(let i=0;i<3;i++)for(let j=0;j<2;j++){ctx.beginPath();ctx.arc(sx-6+i*6,sy-4+j*7,2.6,0,7);ctx.stroke();}
    return;
  }
  const capeFlap=(G.frame>>3)%2?3:0;
  ctx.fillStyle=PAL.ink; ctx.fillRect(sx-11,sy-11,22,18+capeFlap);
  ctx.fillStyle=v.theme.trim; ctx.fillRect(sx-10,sy-10,20,16+capeFlap); // jagged cape
  ctx.fillStyle=PAL.ink; ctx.fillRect(sx-8,sy-19,16,28);
  ctx.fillStyle=v.theme.color; ctx.fillRect(sx-7,sy-8,14,16);
  ctx.fillStyle=PAL.skin; ctx.fillRect(sx-5,sy-18,10,9);
  ctx.fillStyle=v.theme.trim; ctx.fillRect(sx-5,sy-18,10,4); // mask
  ctx.fillStyle="#fff"; ctx.fillRect(sx-4,sy-13,3,2); ctx.fillRect(sx+1,sy-13,3,2); // glare
  ctx.fillStyle=v.theme.trim; ctx.fillRect(sx-2,sy-2,4,3); // emblem
  // rank stars
  ctx.fillStyle="#ffc93c"; ctx.font="9px monospace"; ctx.textAlign="center";
  ctx.fillText("★".repeat(v.rank),sx,sy-24);
  // hp bar
  ctx.fillStyle=PAL.ink; ctx.fillRect(sx-14,sy-32,28,5);
  ctx.fillStyle="#e8433f"; ctx.fillRect(sx-13,sy-31,26*(v.hp/v.maxHp),3);
}
function drawObj(o){
  const sx=Math.round(o.x-Cam.x), sy=Math.round(o.y-Cam.y);
  if(o.type==="car"){
    drawShadow(sx,sy+2,26);
    ctx.fillStyle=o.color; ctx.fillRect(sx-13,sy-8,26,16);
    ctx.fillStyle=PAL.windowT; ctx.fillRect(sx-6,sy-6,12,5);
    ctx.fillStyle=PAL.ink; ctx.fillRect(sx-11,sy+6,5,4);ctx.fillRect(sx+6,sy+6,5,4);
  }else if(o.type==="bench"){
    ctx.fillStyle=o.color; ctx.fillRect(sx-10,sy-3,20,6);
    ctx.fillStyle="#7a4a2b"; ctx.fillRect(sx-9,sy+3,3,4);ctx.fillRect(sx+6,sy+3,3,4);
  }else if(o.type==="hydrant"){
    ctx.fillStyle=o.color; ctx.fillRect(sx-4,sy-6,8,11);
    ctx.fillStyle="#ffc93c"; ctx.fillRect(sx-2,sy-8,4,3);
  }else if(o.type==="trash"){
    ctx.fillStyle=o.color; ctx.fillRect(sx-5,sy-6,10,12);
    ctx.fillStyle="#5a675a"; ctx.fillRect(sx-6,sy-7,12,3);
  }else{ // debris
    ctx.fillStyle=o.color; ctx.fillRect(sx-6,sy-4,12,9);
  }
}
function drawChaseCar(car){
  const sx=Math.round(car.x-Cam.x), sy=Math.round(car.y-Cam.y);
  drawShadow(sx,sy+2,28);
  ctx.fillStyle="#2b2b33"; ctx.fillRect(sx-14,sy-9,28,18);
  ctx.fillStyle="#c9c14f"; ctx.fillRect(sx-14,sy-2,28,3);
  ctx.fillStyle=PAL.windowT; ctx.fillRect(sx-7,sy-7,14,5);
  if(!car.stopped&&(G.frame>>3)%2){ctx.fillStyle="#e8433f";ctx.font="12px Bangers, sans-serif";ctx.textAlign="center";ctx.fillText("!!",sx,sy-14);}
  if(car.stopped){ // popped tires + steam
    if(G.frame%12===0)FX.smoke(car.x,car.y-8);
  }
  // hp pips
  if(!car.stopped){
    ctx.fillStyle=PAL.ink; ctx.fillRect(sx-14,sy-20,28,4);
    ctx.fillStyle="#3fbf6e"; ctx.fillRect(sx-13,sy-19,26*(Math.max(0,car.hp)/10),2);
  }
}

// ---------------- PROJECTILE / HUD DRAW ----------------
function drawProjs(){
  for(const pr of G.projs){
    const sx=Math.round(pr.x-Cam.x), sy=Math.round(pr.y-Cam.y);
    ctx.fillStyle=PAL.ink;
    ctx.fillRect(sx-4,sy-4,8,8);
    ctx.fillStyle=pr.color;
    ctx.fillRect(sx-3,sy-3,6,6);
    ctx.fillStyle="rgba(255,255,255,.7)";
    ctx.fillRect(sx-1,sy-1,2,2);
  }
}
function drawHUD(){
  const p=G.player;
  // hearts
  for(let i=0;i<p.maxHp/2;i++){
    const hx=14+i*20, hy=14;
    const full=p.hp>=(i+1)*2, half=!full&&p.hp>i*2;
    ctx.fillStyle=full?"#e8433f":(half?"#e8888f":"#3a2b45");
    ctx.fillRect(hx,hy,14,12);
    ctx.fillStyle=PAL.ink; ctx.fillRect(hx+6,hy,2,12);
    ctx.strokeStyle=PAL.ink;ctx.lineWidth=2;ctx.strokeRect(hx,hy,14,12);
  }
  // stamina pips
  for(let i=0;i<p.maxStam;i++){
    ctx.fillStyle=p.stam>=i+1?"#ffc93c":"#3a2b45";
    ctx.fillRect(14+i*13,32,9,7);
    ctx.strokeStyle=PAL.ink;ctx.strokeRect(14+i*13,32,9,7);
  }
  // XP bar
  const need=10+p.level*8;
  ctx.fillStyle=PAL.ink; ctx.fillRect(14,46,120,8);
  ctx.fillStyle="#3fbf6e"; ctx.fillRect(15,47,118*(p.xp/need),6);
  ctx.fillStyle="#fff"; ctx.font="11px Bangers, sans-serif"; ctx.textAlign="left";
  ctx.fillText("LV "+p.level,140,54);
  // ability icons
  const slots=[
    {key:"LMB",label:POWERS[p.core].name.split(" ")[0],cd:p.cds.basic,max:22,color:POWERS[p.core].color},
    {key:"RMB",label:p.core==="ice"?"RAY (hold)":"SPECIAL",cd:p.core==="ice"?0:p.cds.special,max:45,color:POWERS[p.core].color},
    {key:"SPC",label:"DASH",cd:p.cds.mob,max:50,color:"#fff"},
    {key:"Q",label:"GUARD",cd:p.cds.def,max:90,color:"#8ae0ff"},
  ];
  if(p.support==="grapple")slots.push({key:"F",label:"GRAPPLE",cd:p.cds.sup,max:70,color:"#3fbf6e"});
  else slots.push({key:"♥",label:"REGEN",cd:0,max:1,color:"#e88ab0"});
  if(p.extra)slots.push({key:"G",label:POWERS[p.extra].name.split(" ")[0],cd:p.cds.extra,max:30,color:POWERS[p.extra].color});
  slots.forEach((s,i)=>{
    const bx=14+i*58, by=556;
    ctx.fillStyle="rgba(26,16,40,.85)"; ctx.fillRect(bx,by,52,34);
    ctx.strokeStyle=s.color; ctx.lineWidth=2; ctx.strokeRect(bx,by,52,34);
    if(s.cd>0){ctx.fillStyle="rgba(0,0,0,.55)";ctx.fillRect(bx,by,52,34*(s.cd/s.max));}
    ctx.fillStyle="#fff"; ctx.font="10px Bangers, sans-serif"; ctx.textAlign="center";
    ctx.fillText(s.key,bx+26,by+13);
    ctx.fillStyle=s.color; ctx.fillText(s.label,bx+26,by+27);
  });
  // 1-5 signature ability kit (unlocks with core power level)
  const kit=ABILITIES[p.core], klv=p.powerLv[p.core]||1;
  kit.forEach((a,i)=>{
    const bx=14+i*72, by=520;
    const unlocked=klv>=i+1;
    ctx.fillStyle=unlocked?"rgba(26,16,40,.85)":"rgba(26,16,40,.45)";
    ctx.fillRect(bx,by,66,28);
    ctx.strokeStyle=unlocked?POWERS[p.core].color:"#4a4060"; ctx.lineWidth=2;
    ctx.strokeRect(bx,by,66,28);
    if(unlocked&&p.abilityCds[i]>0){
      ctx.fillStyle="rgba(0,0,0,.55)";
      ctx.fillRect(bx,by,66,28*(p.abilityCds[i]/ABILITY_CDS[i]));
    }
    ctx.font="9px Bangers, sans-serif"; ctx.textAlign="center";
    if(unlocked){
      ctx.fillStyle="#fff"; ctx.fillText("["+(i+1)+"]",bx+33,by+11);
      ctx.fillStyle=POWERS[p.core].color; ctx.fillText(a.name,bx+33,by+22);
    }else{
      ctx.fillStyle="#6a6080"; ctx.fillText("["+(i+1)+"] LOCKED",bx+33,by+11);
      ctx.fillText("POWER LV"+(i+1),bx+33,by+22);
    }
  });
  // rep + collateral
  ctx.textAlign="right";
  ctx.font="13px Bangers, sans-serif";
  const repLabel=G.rep>30?"BELOVED":(G.rep<-30?"MENACE":"UNPROVEN");
  ctx.fillStyle=G.rep>30?"#3fbf6e":(G.rep<-30?"#e8433f":"#ffc93c");
  ctx.fillText("REP: "+repLabel+" ("+Math.round(G.rep)+")",946,22);
  ctx.fillStyle="#ffc93c";
  ctx.fillText("DAMAGES: $"+(G.collateral*1000).toLocaleString(),946,40);
  if(G.player.surgeT>0){ctx.fillStyle="#ffb02a";ctx.fillText("POWER SURGE! "+Math.ceil(G.player.surgeT/60)+"s",946,58);}
  if(G.player.fireVulnT>0){ctx.fillStyle="#ff5a2a";ctx.fillText("CRACKLY (fire hurts extra) "+Math.ceil(G.player.fireVulnT/60)+"s",946,76);}
  // event arrows at screen edges
  for(const ev of G.events){
    if(ev.done)continue;
    const dx=ev.x-(Cam.x+VIEWW/2), dy=ev.y-(Cam.y+VIEWH/2);
    if(Math.abs(dx)<VIEWW/2-20&&Math.abs(dy)<VIEWH/2-20)continue;
    const ang=Math.atan2(dy,dx);
    const ex=clamp(SW/2+Math.cos(ang)*(SW/2-30),30,SW-30);
    const ey=clamp(SH/2+Math.sin(ang)*(SH/2-30),30,SH-30);
    ctx.save();ctx.translate(ex,ey);ctx.rotate(ang);
    ctx.fillStyle=ev.type==="fire"?"#ff5a2a":(ev.type==="chase"?"#c9c14f":"#e8433f");
    ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(-6,-8);ctx.lineTo(-6,8);ctx.closePath();ctx.fill();
    ctx.strokeStyle=PAL.ink;ctx.lineWidth=2;ctx.stroke();
    ctx.restore();
  }
  // villain arrow
  if(G.villain&&G.villain.state==="fight"){
    const v=G.villain;
    const dx=v.x-(Cam.x+VIEWW/2), dy=v.y-(Cam.y+VIEWH/2);
    if(Math.abs(dx)>VIEWW/2-20||Math.abs(dy)>VIEWH/2-20){
      const ang=Math.atan2(dy,dx);
      const ex=clamp(SW/2+Math.cos(ang)*(SW/2-40),40,SW-40);
      const ey=clamp(SH/2+Math.sin(ang)*(SH/2-40),40,SH-40);
      ctx.fillStyle="#7a2ee8";ctx.font="16px Bangers, sans-serif";ctx.textAlign="center";
      ctx.fillText("⚡",ex,ey);
    }
  }
  // carrying hint
  if(p.carrying){ctx.fillStyle="#fff";ctx.font="12px Bangers, sans-serif";ctx.textAlign="center";
    ctx.fillText("CARRYING CIVILIAN — press E somewhere safe",SW/2,70);}
}

// ---------------- MASTER DRAW ----------------
function draw(){
  ctx=wctx; // ---- world pass (native low-res) ----
  Cam.x=Math.round(Cam.x); Cam.y=Math.round(Cam.y); // whole-pixel camera = crisp tiles
  ctx.fillStyle=PAL.ink;
  ctx.fillRect(0,0,VIEWW,VIEWH);
  const x0=Math.floor(Cam.x/TILE), y0=Math.floor(Cam.y/TILE);
  const x1=Math.ceil((Cam.x+VIEWW)/TILE), y1=Math.ceil((Cam.y+VIEWH)/TILE);
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)drawTile(x,y);
  // y-sorted entities
  const ents=[];
  for(const o of G.objs)if(!o.dead&&!o.held)ents.push({y:o.y,fn:()=>drawObj(o)});
  for(const c of G.civs)if(!c.dead)ents.push({y:c.y,fn:()=>drawCiv(c)});
  for(const e of G.enemies)if(!e.dead)ents.push({y:e.y,fn:()=>drawEnemy(e)});
  for(const ev of G.events)if(!ev.done&&ev.type==="chase")ents.push({y:ev.car.y,fn:()=>drawChaseCar(ev.car)});
  if(G.decoy)ents.push({y:G.decoy.y,fn:()=>drawDecoy(G.decoy)});
  if(G.villain)ents.push({y:G.villain.y,fn:()=>drawVillain(G.villain)});
  ents.push({y:G.player.y,fn:()=>drawHero(G.player)});
  ents.sort((a,b)=>a.y-b.y);
  for(const e of ents)e.fn();
  drawProjs();
  FX.drawParts(ctx);
  // ---- integer 2x upscale to screen ----
  sctx.drawImage(wcan,0,0,SW,SH);
  ctx=sctx; // ---- UI pass (crisp) ----
  FX.drawText(ctx);
  drawHUD();
}

// ---------------- OVERLAY / UI WIRING ----------------
const $=s=>document.querySelector(s);
let tickerTimeout=null;
function ticker(msg){
  const el=$("#ticker");
  el.textContent=msg;
  el.style.opacity=1;
  clearTimeout(tickerTimeout);
  tickerTimeout=setTimeout(()=>el.style.opacity=0.35,4200);
}

let pickedCore="strength", pickedSupport="grapple";
function rollHeroName(){
  const n=choice(HERO_FIRST)+" "+choice(HERO_LAST);
  $("#hero-name").textContent=n;
  return n;
}
function buildCover(freshName){
  if(freshName)rollHeroName();
  const coreRow=$("#core-picks"); coreRow.innerHTML="";
  for(const k in POWERS){
    const pw=POWERS[k];
    const card=document.createElement("div");
    card.className="pick-card"+(k===pickedCore?" sel":"");
    card.innerHTML=`<div class="swatch" style="background:${pw.color}"></div><h3>${pw.name}</h3>${pw.desc}`;
    card.onclick=()=>{pickedCore=k;buildCover();Sfx.pickup();};
    coreRow.appendChild(card);
  }
  const supRow=$("#support-picks"); supRow.innerHTML="";
  for(const k in SUPPORTS){
    const sp=SUPPORTS[k];
    const card=document.createElement("div");
    card.className="pick-card"+(k===pickedSupport?" sel":"");
    card.innerHTML=`<div class="swatch" style="background:${sp.color}"></div><h3>${sp.name}</h3>${sp.desc}`;
    card.onclick=()=>{pickedSupport=k;buildCover();Sfx.pickup();};
    supRow.appendChild(card);
  }
}
$("#reroll-name").onclick=()=>{rollHeroName();Sfx.pickup();};
$("#start-btn").onclick=()=>{
  Sfx.ensure(); Sfx.levelup();
  $("#cover").classList.add("hidden");
  startRun(pickedCore,pickedSupport,$("#hero-name").textContent);
};

// choice overlay
function showChoice(){
  const c=G.pendingChoice;
  $("#choice-title").textContent=c.title;
  const row=$("#choice-row"); row.innerHTML="";
  c.options.forEach(opt=>{
    const card=document.createElement("div");
    card.className="pick-card";
    card.innerHTML=`<h3>${opt.label}</h3>${opt.desc||""}`;
    card.onclick=()=>{
      opt.apply(); Sfx.levelup();
      G.pendingChoice=null;
      $("#choice").classList.add("hidden");
      G.state="play";
      maybeShowPaperAfterVillain();
    };
    row.appendChild(card);
  });
  $("#choice").classList.remove("hidden");
  G.state="choice";
}

// d20 overlay
function showD20(){
  G.state="d20";
  $("#d20").classList.remove("hidden");
  $("#d20-result").innerHTML="";
  $("#d20-ok").classList.add("hidden");
  const die=$("#d20-die");
  let ticks=0;
  const n=rollD20();
  const iv=setInterval(()=>{
    ticks++;
    die.setAttribute("data-n",randi(1,20));
    Sfx.die20();
    if(ticks>16){
      clearInterval(iv);
      die.setAttribute("data-n",n);
      Sfx.boom();
      const entry=applyD20(n);
      $("#d20-result").innerHTML="<strong>"+entry.title+"</strong><br>"+entry.text;
      $("#d20-ok").classList.remove("hidden");
    }
  },90);
  $("#d20-ok").onclick=()=>{
    $("#d20").classList.add("hidden");
    if(G.pendingChoice)showChoice();
    else{ G.state="play"; maybeShowPaperAfterVillain(); }
  };
}
let paperAfterD20=false;
function maybeShowPaperAfterVillain(){
  if(paperAfterD20){paperAfterD20=false;showPaper("villain");}
}

// newspaper
function showPaper(reason){
  G.state="paper";
  const s=G.stats;
  let pool, headline;
  if(reason==="villain")pool=HEADLINES.villainCaught;
  else if(reason==="ko")pool=HEADLINES.villainWin;
  else pool=G.rep>30?HEADLINES.beloved:(G.rep<-30?HEADLINES.menace:HEADLINES.mixed);
  const vName=(G.villain&&G.villain.theme.name)||choice(VILLAIN_THEMES).name;
  headline=choice(pool).replace("{HERO}",G.heroName).replace("{VILLAIN}",vName);
  $("#paper-headline").textContent=headline;
  $("#paper-date").textContent="MERIDIAN CITY — ISSUE #0 — LEVEL "+G.player.level+" EDITION";
  const repLabel=G.rep>30?"a beloved hero":(G.rep<-30?"a walking insurance claim":"a promising newcomer, sources say");
  $("#paper-body").innerHTML=
    `<p>Citizens report that ${G.heroName} has been busy: <span class="stat">${s.rescued}</span> civilians rescued, `+
    `<span class="stat">${s.crimes}</span> robberies foiled, <span class="stat">${s.chases}</span> getaway cars stopped, `+
    `and <span class="stat">${s.firesOut}</span> fires extinguished.</p>`+
    `<p>City hall estimates <span class="stat">$${(G.collateral*1000).toLocaleString()}</span> in property damage. `+
    `Public opinion currently rates the cape as ${repLabel}.</p>`+
    `<p>Villains bubble-wrapped: <span class="stat">${s.villainsCaught}</span>. `+
    `Times the hero was publicly humiliated: <span class="stat">${s.koByVillain}</span>. `+
    `This reporter, for one, will be watching the skies.</p>`;
  $("#paper").classList.remove("hidden");
}
$("#paper-continue").onclick=()=>{
  $("#paper").classList.add("hidden");
  G.koCount=0;
  if(G.paperReason==="ko"){ G.player.hp=G.player.maxHp; G.player.x=WORLDW/2; G.player.y=WORLDH/2; }
  G.paperReason=null;
  G.state="play";
  ticker("Back on patrol!");
};
$("#paper-newrun").onclick=()=>{
  $("#paper").classList.add("hidden");
  buildCover(true);
  $("#cover").classList.remove("hidden");
  G.state="cover";
};

// ---------------- MAIN LOOP ----------------
function loop(){
  requestAnimationFrame(loop);
  if(G.state==="play"){
    updateWorld();
    // flow interrupts raised by game systems:
    if(G.pendingD20){ G.pendingD20=false; paperAfterD20=true; showD20(); return; }
    if(G.pendingChoice){ showChoice(); return; }
    if(G.state==="paper"){ showPaper(G.paperReason||"rep"); return; }
    draw();
  }else if(G.state!=="cover"&&G.player){
    draw(); // frozen frame behind overlays
  }
}

// ---------------- BOOT ----------------
Input.init(canvas);
buildCover(true);
loop();
