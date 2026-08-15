// ============================================================
// CAPE CITY COMICS — engine.js
// Input, camera, chiptune audio, particles, impact words.
// ============================================================
"use strict";

// ---------- helpers ----------
const clamp=(v,a,b)=>v<a?a:(v>b?b:v);
const dist=(x1,y1,x2,y2)=>Math.hypot(x2-x1,y2-y1);
const rand=(a,b)=>a+Math.random()*(b-a);
const randi=(a,b)=>Math.floor(rand(a,b+1));
const choice=arr=>arr[Math.floor(Math.random()*arr.length)];
const lerp=(a,b,t)=>a+(b-a)*t;

// ---------- input ----------
const Input = {
  keys:{}, mouse:{x:480,y:300,l:false,r:false},
  init(canvas){
    addEventListener("keydown",e=>{
      this.keys[e.code]=true;
      if(["Space","KeyQ","KeyE","KeyF"].includes(e.code)) e.preventDefault();
    });
    addEventListener("keyup",e=>this.keys[e.code]=false);
    canvas.addEventListener("mousemove",e=>{
      const r=canvas.getBoundingClientRect();
      this.mouse.x=(e.clientX-r.left)*(canvas.width/r.width);
      this.mouse.y=(e.clientY-r.top)*(canvas.height/r.height);
    });
    canvas.addEventListener("mousedown",e=>{
      if(e.button===0)this.mouse.l=true;
      if(e.button===2)this.mouse.r=true;
    });
    addEventListener("mouseup",e=>{
      if(e.button===0)this.mouse.l=false;
      if(e.button===2)this.mouse.r=false;
    });
    canvas.addEventListener("contextmenu",e=>e.preventDefault());
  },
  axis(){
    let x=0,y=0;
    if(this.keys.KeyW||this.keys.ArrowUp)y-=1;
    if(this.keys.KeyS||this.keys.ArrowDown)y+=1;
    if(this.keys.KeyA||this.keys.ArrowLeft)x-=1;
    if(this.keys.KeyD||this.keys.ArrowRight)x+=1;
    if(x&&y){x*=0.707;y*=0.707;}
    return {x,y};
  }
};

// ---------- camera ----------
const Cam = {
  x:0,y:0,shake:0,
  follow(tx,ty,worldW,worldH,vw,vh){
    this.x=lerp(this.x,tx-vw/2,0.12);
    this.y=lerp(this.y,ty-vh/2,0.12);
    this.x=clamp(this.x,0,worldW-vw);
    this.y=clamp(this.y,0,worldH-vh);
  },
  ox(){return this.shake>0?rand(-this.shake,this.shake):0;},
  oy(){return this.shake>0?rand(-this.shake,this.shake):0;},
  bump(n){this.shake=Math.max(this.shake,n);},
  update(){this.shake*=0.85;if(this.shake<0.3)this.shake=0;}
};

// ---------- audio (tiny chiptune synth) ----------
const Sfx = {
  ctx:null,
  ensure(){ if(!this.ctx){ try{this.ctx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){} } },
  beep(freq=440,dur=0.08,type="square",vol=0.12,slide=0){
    this.ensure(); if(!this.ctx)return;
    const t=this.ctx.currentTime;
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,t);
    if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),t+dur);
    g.gain.setValueAtTime(vol,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o.connect(g);g.connect(this.ctx.destination);
    o.start(t);o.stop(t+dur+0.02);
  },
  hit(){this.beep(180,0.07,"square",0.14,-90);},
  zap(){this.beep(760,0.06,"sawtooth",0.09,-300);},
  ice(){this.beep(980,0.09,"triangle",0.10,-200);},
  pickup(){this.beep(520,0.06,"square",0.10,260);},
  throwWoosh(){this.beep(240,0.15,"triangle",0.10,-120);},
  boom(){this.beep(90,0.3,"square",0.20,-50);},
  rescue(){this.beep(660,0.09,"square",0.12,120);setTimeout(()=>this.beep(880,0.12,"square",0.12,80),90);},
  levelup(){[523,659,784,1046].forEach((f,i)=>setTimeout(()=>this.beep(f,0.12,"square",0.12),i*95));},
  hurt(){this.beep(140,0.15,"sawtooth",0.15,-60);},
  siren(){this.beep(700,0.25,"triangle",0.07,-250);},
  die20(){this.beep(300,0.05,"square",0.08,400);}
};

// ---------- particles & impact words ----------
const FX = {
  parts:[], words:[], bubbles:[],
  burst(x,y,color,n=8,spd=2.5){
    for(let i=0;i<n;i++){
      const a=rand(0,Math.PI*2), s=rand(spd*0.4,spd);
      this.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(14,30),color,size:rand(2,5)});
    }
  },
  smoke(x,y){this.parts.push({x,y,vx:rand(-.3,.3),vy:rand(-1,-0.4),life:rand(25,45),color:PAL.smoke,size:rand(4,8)});},
  stars(x,y){ // defeated-enemy dizzy stars
    for(let i=0;i<3;i++)this.parts.push({x:x+rand(-8,8),y:y-10,vx:rand(-.4,.4),vy:-0.6,life:50,color:PAL.heroYellow||"#ffc93c",size:3,star:true});
  },
  word(x,y,txt,color="#ffc93c"){
    this.words.push({x,y,txt,color,life:38,vy:-0.8,scale:rand(0.9,1.25)});
  },
  say(ent,txt,dur=180){
    this.bubbles=this.bubbles.filter(b=>b.ent!==ent);
    this.bubbles.push({ent,txt,life:dur});
  },
  update(){
    for(const p of this.parts){p.x+=p.vx;p.y+=p.vy;p.life--;p.vy+= p.star?0:0.03;}
    this.parts=this.parts.filter(p=>p.life>0);
    for(const w of this.words){w.y+=w.vy;w.life--;}
    this.words=this.words.filter(w=>w.life>0);
    for(const b of this.bubbles){b.life--;}
    this.bubbles=this.bubbles.filter(b=>b.life>0&&!b.ent.dead);
  },
  drawParts(ctx){
    for(const p of this.parts){
      ctx.fillStyle=p.color;
      if(p.star){
        ctx.font="bold 10px monospace";ctx.fillText("★",p.x-Cam.x,p.y-Cam.y);
      } else ctx.fillRect(p.x-Cam.x-p.size/2,p.y-Cam.y-p.size/2,p.size,p.size);
    }
  },
  drawText(ctx){
    for(const w of this.words){
      const sx=(w.x-Cam.x)*UPSCALE, sy=(w.y-Cam.y)*UPSCALE;
      ctx.save();
      ctx.translate(sx,sy);ctx.scale(w.scale,w.scale);
      ctx.font="22px Bangers, 'Arial Black', sans-serif";
      ctx.lineWidth=4;ctx.strokeStyle=PAL.ink;ctx.textAlign="center";
      ctx.strokeText(w.txt,0,0);
      ctx.fillStyle=w.color;ctx.fillText(w.txt,0,0);
      ctx.restore();
    }
    for(const b of this.bubbles){
      const e=b.ent;
      const sx=(e.x-Cam.x)*UPSCALE, sy=(e.y-Cam.y)*UPSCALE-52;
      ctx.font="11px 'Special Elite', monospace";
      const wdt=Math.min(220,ctx.measureText(b.txt).width+14);
      // naive wrap
      const words=b.txt.split(" ");let lines=[""];
      for(const w of words){
        if(ctx.measureText(lines[lines.length-1]+" "+w).width>200)lines.push(w);
        else lines[lines.length-1]=(lines[lines.length-1]+" "+w).trim();
      }
      const h=lines.length*13+10;
      const bx=clamp(sx-wdt/2,4,956-wdt), by=sy-h;
      ctx.fillStyle="#fff";ctx.strokeStyle=PAL.ink;ctx.lineWidth=2;
      ctx.fillRect(bx,by,wdt,h);ctx.strokeRect(bx,by,wdt,h);
      // tail
      ctx.beginPath();ctx.moveTo(sx-4,by+h);ctx.lineTo(sx+4,by+h);ctx.lineTo(sx,by+h+7);ctx.closePath();
      ctx.fillStyle="#fff";ctx.fill();ctx.stroke();
      ctx.fillStyle=PAL.ink;ctx.textAlign="left";
      lines.forEach((ln,i)=>ctx.fillText(ln,bx+7,by+14+i*13));
    }
  }
};
