const KEY="lightsOutStats";
const DEF={solved:0,seen:0,moves:0,wasted:0,hints:0,bestTime:null,totalTime:0,streak:0,bestStreak:0,abandoned:0,bestSize:3,firstClick:false,sound:true};
let stats;
try{stats=Object.assign({},DEF,JSON.parse(localStorage.getItem(KEY)||"{}"));}catch(e){stats=Object.assign({},DEF);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(stats));}catch(e){}}

let AC=null;
function ac(){if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();if(AC.state==="suspended")AC.resume();return AC;}
function tone(f,d,type,g,at,slide){
  if(!stats.sound)return;
  const c=ac(),t=c.currentTime+(at||0),o=c.createOscillator(),v=c.createGain();
  o.type=type||"triangle";o.frequency.setValueAtTime(f,t);
  if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+d);
  v.gain.setValueAtTime(0.0001,t);v.gain.linearRampToValueAtTime(g||0.12,t+0.015);
  v.gain.exponentialRampToValueAtTime(0.0001,t+d);
  o.connect(v);v.connect(c.destination);o.start(t);o.stop(t+d+0.05);
}
function sClick(on){tone(on?540:330,0.09,"triangle",0.1);if(on)tone(810,0.05,"sine",0.05,0.02);}
function sWin(){[523,659,784,1046,1318].forEach((f,i)=>tone(f,0.22,"triangle",0.09,i*0.09));}
function sHint(){tone(280,0.35,"sine",0.05,0,430);}
function sQuit(){tone(300,0.35,"sawtooth",0.05,0,110);}

const JOKES={
first:["Rule one: clicking is free. Rule two: nothing else is.","The neighbours felt that too. They always do. Click a light, its neighbours flip with it."],
double:["Clicked it twice. It's a light, not a doorbell.","Undid that, did we? Very decisive.","Twice on one tile. Indecision leaves fingerprints."],
triple:["Three clicks on one tile. That's a knock. Nobody answers a knock."],
lost:["That's {m} moves on a {p}-move board. Confidence is a muscle.","The board has started taking notes on your strategy.","Somewhere, the optimal solution is laughing at us both."],
idle:["Take your time. The lights are patient. I am not. Something over there glows differently for a reason.","{h} seconds of silence. Bold. The grid is pointing at something, though.","Staring is not a strategy. But the glowing one keeps staring back."],
quit:["Quitting is a strategy. It's just a bad one.","New board? The old one forgives you. I don't.","Abandonment: fastest way to a new problem.","Running away adds a board to the count. It also solves nothing."],
perfect:["Flawless. {p} moves, zero detours. Suspicious.","Optimal. Did you peek, or are you just like this?"],
good:["Tidy. A smudge of indecision, but tidy.","{x} wasted move{x2}. Character-building."],
slow:["That was a journey. The board remembers every step.","Solved. The tortoise approves."],
hinted:["Solved with {h} hint{h2}. The grid carried you. Adorable.","You and the grid co-authored that one."],
fast:["{t} seconds. Your hands are ahead of your brain and the board respects that."],
streak:["{n} in a row. The grid is now personally offended.","{n} solved. At what point does this become a personality?","{n}. Statistically, you should have quit three boards ago."],
grew:["The grid grew. So did the consequences.","It's {s} by {s} now. No pressure. Slight pressure."],
soundOff:["Sound off. The clicks will miss you."],
soundOn:["Sound on. Enjoy the hum of mediocre decisions."],
new:["Board {n}. Same rules. Bigger regrets.","Here it is. {p} presses deep, and you haven't even started.","{p} of these want to be off. All of them, eventually."]
};
const pick=a=>a[Math.floor(Math.random()*a.length)];
function fill(t,s){return t.replace(/\{(\w+)\}/g,(m,k)=>s&&s[k]!==undefined?s[k]:m);}

let size,board,scramble,player,moves,par,startTime,lastMove,hintsBoard,consecTile,consecCount,lostJoked,solved,tileEls,inviteDone,prevSize=0,hintGap=20000;

function neighbours(i){
  const r=Math.floor(i/size),c=i%size,out=[i];
  if(r>0)out.push(i-size);
  if(r<size-1)out.push(i+size);
  if(c>0)out.push(i-1);
  if(c<size-1)out.push(i+1);
  return out;
}
function flip(i,play){
  if(board.has(i))board.delete(i);else board.add(i);
  if(tileEls&&tileEls[i])tileEls[i].classList.toggle("on",board.has(i));
  if(play)sClick(board.has(i));
}
function newBoard(){
  size=Math.min(7,3+Math.floor(stats.solved/3));
  const count=Math.min(size*size,Math.max(3,size+1+stats.solved*2));
  const cells=size*size,all=[...Array(cells).keys()];
  for(let i=cells-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=all[i];all[i]=all[j];all[j]=t;}
  scramble=new Set(all.slice(0,count));
  board=new Set();
  for(const i of scramble)flip(i,false);
  player=new Set();moves=0;par=count;
  startTime=Date.now();lastMove=Date.now();
  hintsBoard=0;consecTile=-1;consecCount=0;lostJoked=false;solved=false;
  inviteDone=stats.firstClick;
  stats.seen++;save();
  render();
  hud();
  toast(fill(pick(JOKES.new),{n:stats.seen,p:count}),3000);
}
function render(){
  const el=document.getElementById("board");
  el.innerHTML="";
  el.style.gridTemplateColumns="repeat("+size+",minmax(0,1fr))";
  tileEls=[];
  for(let i=0;i<size*size;i++){
    const t=document.createElement("div");
    t.className="tile"+(board.has(i)?" on":"");
    if(!inviteDone&&i===0)t.classList.add("invite");
    t.addEventListener("click",()=>press(i));
    el.appendChild(t);tileEls.push(t);
  }
  if(size>prevSize&&prevSize!==0){toast(fill(pick(JOKES.grew),{s:size}),3500);}
  prevSize=size;
}
function press(i){
  if(solved)return;
  ac();
  if(!inviteDone){inviteDone=true;tileEls[0].classList.remove("invite");}
  if(!stats.firstClick){stats.firstClick=true;save();toast(fill(pick(JOKES.first)),4500);}
  if(i===consecTile){
    consecCount++;
    if(consecCount===2){stats.wasted++;save();toast(fill(pick(JOKES.double)),3500);}
    else if(consecCount===3){toast(fill(pick(JOKES.triple)),3500);}
  }else{consecTile=i;consecCount=1;}
  for(const n of neighbours(i))flip(n,true);
  if(player.has(i))player.delete(i);else player.add(i);
  moves++;stats.moves++;
  lastMove=Date.now();
  if(!lostJoked&&par>2&&moves===par*2){lostJoked=true;toast(fill(pick(JOKES.lost),{m:moves,p:par}),4000);}
  hud();
  if(board.size===0)win();
}
function remainingTiles(){
  const out=[];
  for(const i of scramble)if(player.has(i))out.push(i);
  for(const i of player)if(!scramble.has(i))out.push(i);
  return out;
}
function hint(){
  if(solved)return;
  const rem=remainingTiles();
  if(!rem.length)return;
  const i=rem[Math.floor(Math.random()*rem.length)];
  const t=tileEls[i];
  t.classList.remove("hint");void t.offsetWidth;t.classList.add("hint");
  hintsBoard++;stats.hints++;save();
  sHint();
  toast(fill(pick(JOKES.idle),{h:Math.floor((Date.now()-lastMove)/1000)}),4000);
  statsBar();
}
function win(){
  solved=true;
  const secs=Math.round((Date.now()-startTime)/1000);
  stats.solved++;stats.streak++;
  stats.bestStreak=Math.max(stats.bestStreak,stats.streak);
  stats.totalTime+=secs;
  stats.bestSize=Math.max(stats.bestSize,size);
  if(stats.bestTime===null||secs<stats.bestTime)stats.bestTime=secs;
  save();
  const extra=moves-par;
  let j;
  if(hintsBoard>0)j=fill(pick(JOKES.hinted),{h:hintsBoard,h2:hintsBoard>1?"s":""});
  else if(moves===par)j=fill(pick(JOKES.perfect),{p:par});
  else if(extra<=2)j=fill(pick(JOKES.good),{x:extra,x2:extra===1?"":"s"});
  else if(secs<=par*2)j=fill(pick(JOKES.fast),{t:secs});
  else j=fill(pick(JOKES.slow));
  sWin();confetti();toast(j,4200);
  if([3,5,10,20,50].includes(stats.solved))setTimeout(()=>toast(fill(pick(JOKES.streak),{n:stats.solved}),4000),4500);
  statsBar();
  hintGap=20000;
  setTimeout(newBoard,2200);
}
function hud(){
  document.getElementById("hud-board").textContent="board "+stats.seen;
  document.getElementById("hud-moves").textContent=moves+"/"+par+" moves";
}
function statsBar(){
  document.getElementById("stats").innerHTML=
    "solved <b>"+stats.solved+"</b> &middot; streak <b>"+stats.streak+
    "</b> &middot; best streak <b>"+stats.bestStreak+
    "</b> &middot; best solve <b>"+(stats.bestTime===null?"-":stats.bestTime+"s")+
    "</b> &middot; time played <b>"+Math.floor(stats.totalTime/60)+"m"+(stats.totalTime%60)+"s"+
    "</b> &middot; moves <b>"+stats.moves+
    "</b> &middot; wasted <b>"+stats.wasted+
    "</b> &middot; hints <b>"+stats.hints+
    "</b> &middot; abandoned <b>"+stats.abandoned+
    "</b> &middot; biggest grid <b>"+stats.bestSize+"&times;"+stats.bestSize+"</b>";
}
let toastTimer;
function toast(msg,ms){
  const el=document.getElementById("toast");
  el.textContent=msg;el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove("show"),ms||3500);
}

const fxc=document.getElementById("fx"),fx=fxc.getContext("2d");
let parts=[];
function confetti(){
  fxc.width=innerWidth;fxc.height=innerHeight;
  const cols=["#ffc65c","#6ee7ff","#ff8fa3","#9dff8f","#ffffff"];
  for(let i=0;i<140;i++){
    parts.push({x:innerWidth/2,y:innerHeight/2,vx:(Math.random()-0.5)*11,vy:(Math.random()-0.85)*11,
      r:2+Math.random()*4,c:cols[Math.floor(Math.random()*cols.length)],life:60+Math.random()*40,rot:Math.random()*Math.PI,vr:(Math.random()-0.5)*0.3});
  }
}
function fxLoop(){
  fx.clearRect(0,0,fxc.width,fxc.height);
  parts=parts.filter(p=>p.life>0&&p.y<fxc.height+20);
  for(const p of parts){
    p.x+=p.vx;p.y+=p.vy;p.vy+=0.25;p.vx*=0.99;p.rot+=p.vr;p.life--;
    fx.save();fx.translate(p.x,p.y);fx.rotate(p.rot);
    fx.globalAlpha=Math.min(1,p.life/30);
    fx.fillStyle=p.c;fx.fillRect(-p.r,-p.r/2,p.r*2,p.r);
    fx.restore();
  }
  requestAnimationFrame(fxLoop);
}

document.getElementById("btn-new").addEventListener("click",()=>{
  if(solved)return;
  stats.abandoned++;stats.streak=0;save();
  sQuit();
  toast(fill(pick(JOKES.quit)),4000);
  newBoard();statsBar();
});
const soundBtn=document.getElementById("btn-sound");
function syncSound(){soundBtn.textContent="sound "+(stats.sound?"on":"off");}
soundBtn.addEventListener("click",()=>{
  stats.sound=!stats.sound;save();syncSound();
  toast(fill(pick(stats.sound?JOKES.soundOn:JOKES.soundOff)),3000);
  if(stats.sound){ac();tone(660,0.1,"sine",0.08);}
});

setInterval(()=>{
  if(solved)return;
  document.getElementById("hud-time").textContent=Math.floor((Date.now()-startTime)/1000)+"s";
  if(Date.now()-lastMove>hintGap){hint();lastMove=Date.now();hintGap=15000;}
},1000);

syncSound();
statsBar();
newBoard();
fxLoop();
