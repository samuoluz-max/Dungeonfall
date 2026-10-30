// ---------- Dados do jogo ----------
let W=17,H=9;
// # parede (ou árvore), . chão, o obstáculo, P início dos jogadores, G goblin, S esqueleto, D dragão, T poção
// deco = enfeites no chão, obs = obstáculos, torch = tochas nas paredes, tree = paredes viram árvores
// ---------- Gerador de mapas: cada partida sorteia um mapa novo, com pelo menos o dobro do tamanho original ----------
const rnd=n=>Math.floor(Math.random()*n),pick=a=>a[rnd(a.length)],N4=[[1,0],[-1,0],[0,1],[0,-1]];
// T poção, B baú, X espinhos, F fonte; caixotes, jarros e troncos (BRK) podem ser quebrados
const ITEMS={T:'pocao',B:'bau',X:'espinhos',F:'fonte'},BRK=['crate','jar','log'];
const bfs=(g,sx,sy)=>{const w=g[0].length,d=new Array(w*g.length).fill(-1),q=[[sx,sy]];d[sy*w+sx]=0;
 for(let i=0;i<q.length;i++){const[x,y]=q[i];for(const[dx,dy]of N4){const a=x+dx,b=y+dy;if(g[b]?.[a]==='.'&&d[b*w+a]<0){d[b*w+a]=d[y*w+x]+1;q.push([a,b])}}}return d};
const open8=(g,x,y)=>{for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++)if((i||j)&&g[y+j]?.[x+i]!=='.')return false;return true};
// salas de tamanhos diferentes ligadas por corredores (cw = largura do corredor)
function rooms(w,h,o){const g=Array.from({length:h},()=>Array(w).fill('#')),R=[],cw=o.cw||1;
 for(let t=0;t<500&&R.length<o.n;t++){const rw=o.w[0]+rnd(o.w[1]-o.w[0]+1),rh=o.h[0]+rnd(o.h[1]-o.h[0]+1),x=1+rnd(w-rw-2),y=1+rnd(h-rh-2);
  if(!R.some(r=>x<r.x+r.w+2&&x+rw+2>r.x&&y<r.y+r.h+2&&y+rh+2>r.y))R.push({x,y,w:rw,h:rh})}
 R.sort((a,b)=>a.x-b.x);
 for(const r of R)for(let j=r.y;j<r.y+r.h;j++)for(let i=r.x;i<r.x+r.w;i++)g[j][i]='.';
 const cen=r=>[r.x+(r.w>>1),r.y+(r.h>>1)],tun=(a,b)=>{let[x,y]=cen(a);const[tx,ty]=cen(b);
  while(x!==tx){for(let k=0;k<cw;k++)g[y+k][x]='.';x+=Math.sign(tx-x)}
  while(y!==ty){for(let k=0;k<cw;k++)g[y][x+k]='.';y+=Math.sign(ty-y)}};
 for(let i=1;i<R.length;i++)tun(R[i-1],R[i]);
 for(let k=0;k<o.loops;k++){const a=rnd(R.length),b=rnd(R.length);if(a!==b)tun(R[a],R[b])}
 return{g,s:cen(R[0])}}
// floresta aberta: manchas de árvores por autômato celular
function forest(w,h){const edge=(x,y)=>!x||!y||x===w-1||y===h-1;
 let g=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>edge(x,y)||Math.random()<.42?'#':'.'));
 for(let k=0;k<4;k++)g=g.map((r,y)=>r.map((c,x)=>{if(edge(x,y))return'#';let n=0;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++)if((i||j)&&g[y+j][x+i]==='#')n++;return n>=5?'#':n<=2?'.':c}));
 for(let y=(h>>1)-2;y<=(h>>1)+2;y++)for(let x=1;x<=4;x++)g[y][x]='.';
 return g}
// põe heróis, chefe (o mais longe), inimigos (mais fortes quanto mais longe), poções, baús, fontes, espinhos e obstáculos
function fill(g,o,sx,sy){const w=g[0].length,cells=[],used=[],d=bfs(g,sx,sy);
 g.forEach((r,y)=>r.forEach((c,x)=>{if(c==='.'){if(d[y*w+x]<0)r[x]='#';else cells.push({x,y,d:d[y*w+x]})}}));
 const far=Math.max(...cells.map(c=>c.d)),n=k=>Math.ceil(cells.length/k);
 const put=(min,max,f,gap=3,open=0)=>{for(let t=0;t<80;t++){const c=pick(cells);
  if(g[c.y][c.x]!=='.'||c.d<min||c.d>max||(open&&!open8(g,c.x,c.y))||used.some(u=>Math.abs(u.x-c.x)+Math.abs(u.y-c.y)<gap))continue;
  g[c.y][c.x]=typeof f==='string'?f:f(c);used.push(c);return}};
 cells.filter(c=>c.d<4).sort((a,b)=>a.d-b.d).slice(0,4).forEach(c=>{g[c.y][c.x]='P';used.push(c)});
 const b=cells.find(c=>c.d===far);g[b.y][b.x]=o.boss;used.push(b);
 for(let i=0;i<cells.length/o.dens*(1+.35*(nP-2));i++)put(9,far,c=>{const t=c.d/far;return pick((t<.4?'GGA':t<.75?'GSAS':'SOOA')+o.ex+o.ex)});
 for(let i=0;i<n(60);i++)put(4,far,'T',4);
 for(let i=0;i<n(120);i++)put(10,far,'B',6);
 for(let i=0;i<2;i++)put(far*.3,far*.85,'F',10);
 for(let i=0;i<n(70);i++)put(6,far,'X',2,1);
 for(let i=0;i<cells.length/o.ob;i++)put(3,far,'o',0,1);
 return g.map(r=>r.join(''))}
// deco = enfeites, obs = obstáculos, torch = tochas nas paredes, tree = paredes viram árvores, dens/ob = casas por monstro / por obstáculo
const MAPS=[
 {n:'Salões de Pedra',boss:'R',ex:'M',obs:['crate','jar','rock'],torch:1,dens:30,ob:24,gen(){const{g,s}=rooms(50+rnd(5),28+rnd(3),{n:12,w:[5,9],h:[4,6],loops:4});return fill(g,this,...s)}},
 {n:'Floresta Sombria',boss:'N',ex:'L',obs:['rock','log'],tree:1,dens:36,ob:28,gen(){const w=56+rnd(5),h=30+rnd(3);let g;do g=forest(w,h);while(bfs(g,2,h>>1).filter(v=>v>=0).length<w*h*.3);return fill(g,this,2,h>>1)}},
 {n:'Covil do Dragão',boss:'D',ex:'C',obs:['pillar','jar'],torch:1,dens:40,ob:16,gen(){const{g,s}=rooms(52+rnd(5),32+rnd(3),{n:8,w:[7,12],h:[6,9],loops:3,cw:2});return fill(g,this,...s)}}];
let mapIdx=0;
// d = [quantidade de dados, lados, bônus]; rg = alcance; mv = passos por turno; ac = classe de armadura; c = cor da aura
const CLASSES={
 guerreiro:{n:'Guerreiro',e:'🤺',c:'#8aa0b8',hp:34,ac:15,atk:5,d:[1,8,3],rg:1,mv:4,info:'Forte e resistente. Luta corpo a corpo.'},
 mago:{n:'Mago',e:'🧙',c:'#5b8cff',hp:20,ac:11,atk:5,d:[2,6,0],rg:4,mv:4,info:'Bola de fogo a 4 casas, mas frágil.'},
 arqueiro:{n:'Arqueiro',e:'🧝',c:'#5fc46f',hp:24,ac:13,atk:6,d:[1,8,2],rg:7,mv:5,info:'Rápido e atira flechas a até 7 casas de distância.'},
 clerigo:{n:'Clérigo',e:'🙏',c:'#f2d67e',hp:28,ac:14,atk:3,d:[1,6,2],rg:1,mv:4,steal:1,info:'Cura aliados que estiverem perto e rouba vida dos inimigos com o cajado.'},
 barbaro:{n:'Bárbaro',e:'🧔',c:'#e2603f',hp:38,ac:12,atk:4,d:[1,12,3],rg:1,mv:4,info:'Muita vida e golpes enormes, mas fácil de acertar.'},
 ladino:{n:'Ladino',e:'🥷',c:'#b06be0',hp:22,ac:14,atk:7,d:[1,6,3],rg:1,mv:6,crit:19,info:'Muito veloz e dá crítico com 19 ou 20.'}};
const FOES={
 G:{k:'goblin',n:'Goblin',e:'👺',c:'#6fbf4a',hp:10,ac:12,atk:4,d:[1,6,1],rg:1,mv:3},
 S:{k:'esqueleto',n:'Esqueleto',e:'💀',c:'#d8d2b8',hp:16,ac:13,atk:4,d:[1,8,1],rg:1,mv:3},
 D:{k:'dragao',n:'Dragão',e:'🐉',c:'#ff6a2e',hp:24,ac:15,atk:7,d:[2,6,3],rg:4,mv:3,boss:1},
 R:{k:'golem',n:'Golem de Pedra',e:'🗿',c:'#9aa3ad',hp:30,ac:16,atk:7,d:[2,8,3],d2:[2,6,2],rg:5,mv:2,mel:1,hard:1,boss:1},
 N:{k:'naja',n:'Naja',e:'🐍',c:'#5fc455',hp:22,ac:14,atk:7,d:[1,8,3],dm:-1,multi:2,rg:1,mv:8,boss:1},
 M:{k:'morcego',n:'Morcego',e:'🦇',c:'#8a6aa8',hp:7,ac:13,atk:4,d:[1,4,1],rg:1,mv:6},
 L:{k:'lobo',n:'Lobo',e:'🐺',c:'#9a9ea6',hp:12,ac:12,atk:5,d:[1,6,2],rg:1,mv:6},
 C:{k:'cultista',n:'Cultista',e:'🧙',c:'#c0455a',hp:12,ac:12,atk:5,d:[1,6,2],rg:4,mv:3,keep:1},
 A:{k:'aranha',n:'Aranha',e:'🕷️',c:'#a06be0',hp:8,ac:13,atk:5,d:[1,4,1],rg:1,mv:5},
 O:{k:'orc',n:'Orc',e:'👹',c:'#8a9a4a',hp:22,ac:13,atk:5,d:[1,10,2],rg:1,mv:3}};

const SH='<path d="M6 63Q8 45 32 43Q56 45 58 63Z" fill="',HD='<circle cx="32" cy="30" r="11" fill="url(#gk)"/>';
const SV={
guerreiro:SH+'url(#gs)"/>'+HD+'<path d="M19 34Q19 12 32 12T45 34v4H19Z" fill="url(#gs)"/><path d="M23 31h18" stroke-width="3.5"/><path d="M32 12Q46 4 51 17Q41 12 32 22Z" fill="#b3271b"/>',
mago:SH+'#2f4fa8"/>'+HD+'<path d="M22 33Q32 60 42 33Q32 39 22 33Z" fill="#eee"/><path d="M14 27L32 1 50 27Q32 20 14 27Z" fill="#3a4fbf"/>',
arqueiro:SH+'#2e6b3a"/>'+HD+'<path d="M17 40Q12 10 32 10T47 40Q42 24 32 24T17 40Z" fill="#3f8a4c"/><path d="M54 10Q64 32 54 54" fill="none" stroke="#6b4423" stroke-width="3"/>',
clerigo:SH+'#e8dfc4"/>'+HD+'<ellipse cx="32" cy="12" rx="12" ry="3" fill="none" stroke="#f2d67e" stroke-width="2.5"/><path d="M32 47v12M27 52h10" stroke="#c9a13b" stroke-width="3"/>',
barbaro:SH+'#7a5230"/>'+HD+'<path d="M20 30Q20 15 32 15T44 30Z" fill="#8b8f96"/><path d="M20 24Q9 22 7 7Q18 13 23 20ZM44 24Q55 22 57 7Q46 13 41 20Z" fill="url(#gb)"/><path d="M22 34Q32 54 42 34Q32 40 22 34Z" fill="#a2481f"/>',
ladino:SH+'#2a2233"/>'+HD+'<path d="M22 32Q32 26 42 32V40Q32 46 22 40Z" fill="#171017"/><path d="M15 42Q11 9 32 9T49 42L41 34Q32 21 23 34Z" fill="#3a2c4d"/><path d="M26 33h4M34 33h4" stroke="#f2d67e" stroke-width="2"/>',
goblin:SH+'#4a3a26"/><path d="M19 30L3 21 17 39ZM45 30L61 21 47 39Z" fill="url(#gg)"/><ellipse cx="32" cy="30" rx="14" ry="15" fill="url(#gg)"/><circle cx="26" cy="28" r="2.6" fill="#ffe14a"/><circle cx="38" cy="28" r="2.6" fill="#ffe14a"/><path d="M26 40l2 6 2-6M34 40l2 6 2-6" fill="#f3ecd6"/>',
esqueleto:SH+'url(#gb)"/><path d="M18 30Q18 9 32 9T46 30Q46 36 42 38V45H22V38Q18 36 18 30Z" fill="url(#gb)"/><circle cx="26" cy="30" r="4.5" fill="#1a1108"/><circle cx="38" cy="30" r="4.5" fill="#1a1108"/><path d="M26 45v-5M32 45v-5M38 45v-5"/>',
dragao:'<path d="M6 42Q10 12 32 12T58 42Q48 34 44 46L32 58 20 46Q16 34 6 42Z" fill="url(#gd)"/><path d="M18 18L7 1 25 14ZM46 18L57 1 39 14Z" fill="url(#gb)"/><path d="M19 30L28 33 19 36ZM45 30L36 33 45 36Z" fill="#ffd23f"/><circle cx="28" cy="46" r="1.6"/><circle cx="36" cy="46" r="1.6"/>',
pocao:'<path d="M27 6h10v12l9 18c4 16-8 24-14 24S14 52 18 36l9-18Z" fill="#dcecef" fill-opacity=".6"/><path d="M19 38c5-3 11 3 26 0 2 13-8 20-13 20S17 51 19 38Z" fill="#c02a1e"/><rect x="26" y="3" width="12" height="7" rx="2" fill="#8a5a2b"/>',
lapide:'<path d="M15 61V27Q15 8 32 8T49 27v34Z" fill="#8a8f96"/><path d="M32 20v22M24 28h16" stroke="#4a4f55" stroke-width="3.5"/>',
crate:'<rect x="7" y="13" width="50" height="46" fill="#8a5a2b"/><path d="M7 13L57 59M57 13L7 59" stroke="#5a3a18" stroke-width="3"/><rect x="7" y="13" width="50" height="46" fill="none" stroke="#5a3a18" stroke-width="4"/>',
jar:'<path d="M24 6h16v9q13 6 13 23T32 61 11 38q0-17 13-23Z" fill="#b5652f"/><path d="M14 33h36" stroke="#6b3a17" stroke-width="3"/>',
rock:'<path d="M5 58L13 28 30 12 49 21 60 58Z" fill="#7c7f84"/><path d="M13 28L30 35 49 21M30 35l-4 23" fill="none" stroke="#4d5054" stroke-width="2"/>',
log:'<rect x="5" y="20" width="54" height="26" rx="11" fill="#7a5230"/><ellipse cx="52" cy="33" rx="7" ry="13" fill="#c79a63"/><ellipse cx="52" cy="33" rx="3" ry="6" fill="none" stroke="#7a5230" stroke-width="1.5"/>',
pillar:'<circle cx="32" cy="16" r="9" fill="#a8a092"/><path d="M18 62V27l7-5h14l7 5v35Z" fill="#9a9284"/><rect x="13" y="55" width="38" height="8" fill="#7a7468"/>',
pine:'<path d="M32 3L13 30h9L9 46h15v14h16V46h15L42 30h9Z" fill="#245a2b"/>',
oak:'<rect x="28" y="42" width="8" height="20" fill="#5a3a1b"/><circle cx="21" cy="32" r="14" fill="#356d2c"/><circle cx="43" cy="32" r="14" fill="#4a8a3c"/><circle cx="32" cy="22" r="17" fill="#3f7d34"/>',
orc:SH+'#5a4a2a"/><ellipse cx="32" cy="30" rx="15" ry="14" fill="#7a9a4a"/><path d="M17 24Q32 4 47 24Q32 17 17 24Z" fill="#5a4a3a"/><circle cx="26" cy="29" r="2.4" fill="#ffd23f"/><circle cx="38" cy="29" r="2.4" fill="#ffd23f"/><path d="M24 40l-2-9M40 40l2-9" stroke="#f3ecd6" stroke-width="3"/>',
aranha:'<path d="M8 20L24 32M8 34L22 38M8 48L24 42M56 20L40 32M56 34L42 38M56 48L40 42" fill="none" stroke="#2a1a2e" stroke-width="3"/><ellipse cx="32" cy="38" rx="13" ry="15" fill="#3a2244"/><circle cx="32" cy="24" r="9" fill="#4a2a55"/><circle cx="28" cy="22" r="2.2" fill="#ff4a4a"/><circle cx="36" cy="22" r="2.2" fill="#ff4a4a"/>',
bau:'<rect x="8" y="26" width="48" height="30" rx="3" fill="#8a5a2b"/><path d="M8 26Q8 10 32 10T56 26Z" fill="#a8703a"/><rect x="28" y="28" width="8" height="10" fill="#f2d67e"/><path d="M8 40H56" stroke="#5a3a18" stroke-width="3"/>',
espinhos:'<path d="M6 58L14 22 22 58ZM22 58L32 12 42 58ZM42 58L50 22 58 58Z" fill="#9aa3ad"/>',
fonte:'<ellipse cx="32" cy="50" rx="24" ry="8" fill="#8a8f96"/><path d="M12 50V38Q32 46 52 38V50Z" fill="#6a6f76"/><path d="M32 12Q40 26 32 34Q24 26 32 12Z" fill="#5bc8ff"/><ellipse cx="32" cy="40" rx="18" ry="5" fill="#5bc8ff" fill-opacity=".7"/>'};
Object.assign(SV,{
golem:'<path d="M8 58V30Q8 8 32 8T56 30V58H42V46H22V58Z" fill="#8d9298"/><path d="M8 30l10 6M56 30l-10 6M32 8v10" fill="none" stroke="#5a5f66" stroke-width="3"/><rect x="19" y="24" width="9" height="6" fill="#ffb347"/><rect x="36" y="24" width="9" height="6" fill="#ffb347"/>',
naja:'<ellipse cx="32" cy="53" rx="24" ry="9" fill="#3d7f2f"/><path d="M32 54V28" stroke="#4fae48" stroke-width="12" stroke-linecap="round"/><path d="M12 22Q32 -4 52 22Q44 38 32 38Q20 38 12 22Z" fill="#5fc455"/><circle cx="26" cy="22" r="2.6" fill="#ffe14a"/><circle cx="38" cy="22" r="2.6" fill="#ffe14a"/><path d="M32 32v8M29 40l3 4 3-4" fill="none" stroke="#d6293a" stroke-width="2"/>',
morcego:'<path d="M32 22Q14 4 2 18Q12 24 14 36Q22 28 32 38Q42 28 50 36Q52 24 62 18Q50 4 32 22Z" fill="#4a3a5e"/><circle cx="32" cy="29" r="9" fill="#5a4872"/><path d="M25 23l-3-11 8 6ZM39 23l3-11-8 6Z" fill="#5a4872"/><circle cx="28" cy="29" r="2" fill="#ff4a4a"/><circle cx="36" cy="29" r="2" fill="#ff4a4a"/>',
lobo:'<path d="M10 54Q8 28 22 20L20 6 30 14Q38 12 44 14L50 6V22Q58 32 54 54Z" fill="#7d7f86"/><path d="M22 48Q32 58 42 48L32 40Z" fill="#cfd2d8"/><circle cx="25" cy="32" r="2.4" fill="#ffd23f"/><circle cx="39" cy="32" r="2.4" fill="#ffd23f"/>',
cultista:SH+'#5a1f3a"/><path d="M16 44Q14 8 32 8T48 44L40 36H24Z" fill="#7a2b52"/><ellipse cx="32" cy="30" rx="9" ry="10" fill="#171017"/><circle cx="28" cy="30" r="1.8" fill="#ff6a2e"/><circle cx="36" cy="30" r="1.8" fill="#ff6a2e"/>',
bvida:'<path d="M32 57C6 40 8 14 24 13Q32 13 32 22Q32 13 40 13C56 14 58 40 32 57Z" fill="#e0344a"/><path d="M18 22Q20 17 26 18" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
bdano:'<path d="M32 3l7 9v27H25V12Z" fill="#dfe6ee"/><rect x="17" y="39" width="30" height="6" rx="2" fill="#c9a13b"/><rect x="29" y="45" width="6" height="14" fill="#7a4a23"/>',
escudo:'<path d="M32 4L9 12v19c0 15 10 25 23 29 13-4 23-14 23-29V12Z" fill="#4f8bdc"/><path d="M32 4v56M9 26h46" stroke="#dbe9ff" stroke-width="3" fill="none"/>'});
const PORTRAITS={}; // fotos dos personagens: PORTRAITS.guerreiro='img/guerreiro.png' (use a chave do personagem ou monstro)
const ico=n=>PORTRAITS[n]?`<img class="pt" src="${PORTRAITS[n]}" alt="" draggable="false">`:`<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke="#1a1108" stroke-width="1.8" stroke-linejoin="round">${SV[n]}</g></svg>`;

// ---------- Estado e ajudantes ----------
const $=s=>document.querySelector(s);
const roll=(n,s)=>{let t=0;for(let i=0;i<n;i++)t+=1+Math.floor(Math.random()*s);return t};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let SPEED=1,RUN=0;const sleep=ms=>{const k=RUN;return new Promise(r=>setTimeout(()=>{if(k===RUN)r()},ms*SPEED))};
const G={units:[],grid:[],items:[],turn:0,round:1,phase:'setup',mv:0,acted:false,busy:false,over:false};
const HOLD=new Set(); // vítimas de uma finalização de chefe: a queda visual só acontece depois da cena
let nP=2;const names=['Aldric','Brenna','Cedric','Dara'],picks=['guerreiro','mago','arqueiro','clerigo'];
let AC=null,MUTE=false,TC=null;
function snd(f,d=.12,t='square',v=.05,s=0){if(MUTE)return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();const g=AC.createGain(),n=AC.currentTime;let o;
 if(t==='noise'){const len=Math.max(1,Math.floor(AC.sampleRate*d)),b=AC.createBuffer(1,len,AC.sampleRate),a=b.getChannelData(0);for(let i=0;i<len;i++)a[i]=Math.random()*2-1;
  o=AC.createBufferSource();o.buffer=b;const fl=AC.createBiquadFilter();fl.type='bandpass';fl.frequency.setValueAtTime(f,n);if(s)fl.frequency.exponentialRampToValueAtTime(Math.max(60,f+s),n+d);o.connect(fl);fl.connect(g)}
 else{o=AC.createOscillator();o.type=t;o.frequency.setValueAtTime(f,n);if(s)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+s),n+d);o.connect(g)}
 g.gain.setValueAtTime(v,n);g.gain.exponentialRampToValueAtTime(.0001,n+d);g.connect(AC.destination);o.start(n);o.stop(n+d)}catch(e){}}
const save=()=>{try{localStorage.setItem('dungeonfall',JSON.stringify({n:nP,names,picks,map:mapIdx,fast:SPEED<1,mute:MUTE,lite:document.body.classList.contains('lite')}))}catch(e){}};
try{const s=JSON.parse(localStorage.getItem('dungeonfall')||'{}');if(s.n>=2&&s.n<=4)nP=s.n;(s.names||[]).forEach((v,i)=>{if(i<4)names[i]=String(v).slice(0,12)});(s.picks||[]).forEach((v,i)=>{if(CLASSES[v]&&i<4)picks[i]=v});if(s.map>=0&&s.map<MAPS.length)mapIdx=s.map;if(s.fast)SPEED=.5;MUTE=!!s.mute;document.body.classList.toggle('lite',!!s.lite)}catch(e){}
function ui(){$('#snd').textContent='Som: '+(MUTE?'mudo':'ligado');$('#spd').textContent='Velocidade: '+(SPEED<1?'2x':'1x');$('#gfx').textContent='Gráficos: '+(document.body.classList.contains('lite')?'leve':'alto')}
const nm=u=>u.name||u.n, dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const ps=()=>G.units.filter(u=>u.pl), players=()=>ps().filter(u=>u.hp>0), foes=()=>G.units.filter(u=>!u.pl&&u.hp>0);
const at=(x,y)=>G.units.find(u=>u.hp>0&&u.x===x&&u.y===y), cur=()=>ps()[G.turn];
const free=(x,y)=>G.grid[y]?.[x]==='.'&&!at(x,y);
const spikeAt=(x,y)=>G.items.some(i=>i.t==='espinhos'&&i.x===x&&i.y===y);
// linha de visão: paredes bloqueiam ataques à distância
const los=(a,b)=>{const n=Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));for(let i=1;i<n;i++)if(G.grid[Math.round(a.y+(b.y-a.y)*i/n)][Math.round(a.x+(b.x-a.x)*i/n)]==='#')return false;return true};
// linha de visão rígida (arremesso do Golem): além de paredes e árvores, pedras e demais obstáculos também bloqueiam
const losHard=(a,b)=>{const n=Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));for(let i=1;i<n;i++){const c=G.grid[Math.round(a.y+(b.y-a.y)*i/n)][Math.round(a.x+(b.x-a.x)*i/n)];if(c==='#'||c==='o')return false}return true};
// "a" consegue atacar "t" estando em "p"? Quem tem "hard" (Golem) só arremessa com linha limpa; colado no alvo é corpo a corpo.
const canHit=(a,p,t)=>{const d=dist(p,t);return d<=a.rg&&(a.hard?d===1||losHard(p,t):los(p,t))};
const inRange=(a,t)=>canHit(a,a,t);
// distâncias por busca em largura (BFS): mostra até onde dá para andar
const dists=(sx,sy,block=true,lim=99)=>{const d={[sy*W+sx]:0},q=[[sx,sy]];
 for(let i=0;i<q.length;i++){const[x,y]=q[i],n=d[y*W+x];if(n>=lim)continue;
  for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=b*W+a;
   if(G.grid[b]?.[a]!=='.'||d[k]!==undefined||(block&&at(a,b)))continue;d[k]=n+1;q.push([a,b])}}return d};
function say(t,c=''){const l=$('#log'),p=document.createElement('p');p.className=c;p.textContent=t;l.append(p);while(l.children.length>80)l.firstChild.remove();l.scrollTop=l.scrollHeight}
function pop(u,t,c=''){const s=document.createElement('span');s.className='pop '+c;s.textContent=t;s.style.left=(u.x+.5)*100/W+'%';s.style.top=(u.y+.2)*100/H+'%';$('#fx').append(s);setTimeout(()=>s.remove(),1000)}
const hpColor=p=>p<35?'#d9482f':p<65?'#e0b03a':'#5bd16a';

// ---------- Desenho na tela ----------
const hs=(x,y)=>(x*31+y*17+x*y*7)%23; // número "aleatório" fixo por casa, para variar o chão
const torchAt=(x,y,TH)=>TH.torch&&G.grid[y]?.[x]==='#'&&G.grid[y+1]?.[x]==='.'&&hs(x,y)%5===0;
// as miniaturas ficam numa camada própria: assim elas deslizam de uma casa para outra
function drawUnits(u0){const L=$('#units');
 for(const u of G.units){let el=document.getElementById('u'+u.id);
  if(u.hp<=0){if(HOLD.has(u))continue;if(el&&!el.dataset.dead){el.dataset.dead=1;el.classList.add('dying');setTimeout(()=>el.remove(),700)}continue}
  if(!el){el=document.createElement('div');el.id='u'+u.id;el.className='tk';
   el.innerHTML=`<div class="u ${u.pl?'p':'e'}${u.boss?' boss':''}" style="--col:var(--p${u.col||0});--aura:${u.c}"><span class="sh"></span><span class="fc">${ico(u.k)}</span><i class="hp"><b></b></i></div>`;L.append(el)}
  el.style.transform=`translate(${u.x*100}%,${u.y*100}%)`;
  const p=100*u.hp/u.mhp,b=el.querySelector('.hp b');b.style.width=p+'%';b.style.background=hpColor(p);
  el.firstChild.classList.toggle('act',u===u0&&G.phase==='players'&&!G.over);el.firstChild.classList.toggle('shd',!!u.shield)}}
function render(){
 const TH=MAPS[G.map],u0=cur(),can=G.phase==='players'&&!G.over&&!G.busy&&!!u0;
 const reach=can?dists(u0.x,u0.y,true,G.mv):{};
 const tg=can&&!G.acted?foes().filter(f=>inRange(u0,f)):[];
 const B=$('#board');if(B.children.length!==W*H){const f=document.createDocumentFragment();for(let y=0;y<H;y++)for(let x=0;x<W;x++){const e=document.createElement('div');e.dataset.x=x;e.dataset.y=y;f.append(e)}B.replaceChildren(f)}
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const ch=G.grid[y][x],r=hs(x,y),u=at(x,y);let c='c ',inner='';
  if(ch==='#'){c+='w v'+r%3;inner=TH.tree?ico(r%2?'pine':'oak'):torchAt(x,y,TH)?'<i class="torch"></i>':''}
  else if(ch==='o'){const k=TH.obs[r%TH.obs.length];c+='f o v'+r%3+(can&&!G.acted&&BRK.includes(k)&&dist(u0,{x,y})===1?' br':'');inner=`<b class="ob">${ico(k)}</b>`}
  else{c+='f v'+r%3+((x+y)%2?' a':'')+(torchAt(x,y-1,TH)?' lit':'');
   if(can&&reach[y*W+x]>0)c+=' m';if(u&&tg.includes(u))c+=' t';
   let im;const dead=G.units.find(d=>d.pl&&d.hp<=0&&d.x===x&&d.y===y);
   inner=dead?`<span class="it">${ico('lapide')}</span>`:(im=G.items.find(i=>i.x===x&&i.y===y))&&!u?`<span class="it">${ico(im.t)}</span>`:''}
  const e=B.children[y*W+x];if(e._c!==c){e.className=c;e._c=c}if(e._i!==inner){e.innerHTML=inner;e._i=inner}}
 B.className='t'+G.map;drawUnits(u0);
 $('#turn').innerHTML=G.phase==='players'&&u0
  ?`<h3>Rodada ${G.round}</h3><p>Vez de <b>${esc(u0.name)}</b>, ${u0.n}</p><span class="chip">${G.mv} passos</span><span class="chip">${G.acted?'ação usada':'ação livre'}</span>`
  :`<h3>Rodada ${G.round}</h3><p>Os monstros estão agindo…</p>`;
 $('#party').innerHTML=ps().map(u=>{const p=100*u.hp/u.mhp;return `<div class="card${u===u0&&G.phase==='players'?' on':''}${u.hp<=0?' off':''}" style="--col:var(--p${u.col})"><span class="dot"></span><div class="ci"><b>${esc(u.name)}</b><small>${u.n} nv ${u.lv||1}, CA ${u.ac}</small><div class="bar"><i style="width:${p}%;background:${hpColor(p)}"></i></div></div><span class="hpn">${u.hp}/${u.mhp}</span></div>`}).join('');
 $('#heal').hidden=$('#selfheal').hidden=!(u0&&u0.k==='clerigo'&&G.phase==='players');
 $('#end').disabled=$('#heal').disabled=$('#selfheal').disabled=!can;miniSoon()}

// ---------- Combate ----------
// ---------- Animações ----------
const cellPos=(e,u)=>{e.style.left=(u.x+.5)*100/W+'%';e.style.top=(u.y+.5)*100/H+'%'};
function fxAdd(cls,u,ch='',vars={},ms=700){const e=document.createElement('span');e.className=cls;e.textContent=ch;cellPos(e,u);for(const k in vars)e.style.setProperty(k,vars[k]);$('#fx').append(e);setTimeout(()=>e.remove(),ms);return e}
function anim(u,cls,t){const e=document.querySelector(`#u${u.id} .u`);if(!e)return;
 if(t){e.style.setProperty('--lx',Math.sign(t.x-u.x));e.style.setProperty('--ly',Math.sign(t.y-u.y))}
 [...e.classList].filter(c=>/^(an-|hurt|dodge)/.test(c)).forEach(c=>e.classList.remove(c));void e.offsetWidth;e.classList.add(cls)}
const shake=()=>{const b=$('#board');b.classList.add('shake');setTimeout(()=>b.classList.remove('shake'),320)};
// As animações de ataque, críticos, falhas críticas, espinhos, cura e finalizações ficam em combat-fx.js (objeto CFX).
// câmera: o mapa agora é maior que a tela, então ela segue quem está agindo
function cam(u,force){const c=$('#cam'),s=c.scrollWidth/W,x=(u.x+.5)*s,y=(u.y+.5)*s,m=s*2.5;
 if(force||x<c.scrollLeft+m||x>c.scrollLeft+c.clientWidth-m||y<c.scrollTop+m||y>c.scrollTop+c.clientHeight-m)c.scrollTo({left:x-c.clientWidth/2,top:y-c.clientHeight/2,behavior:'smooth'})}
// caminho mais curto (busca em largura guardando de onde veio cada casa)
function steps(sx,sy,tx,ty){const par={[sy*W+sx]:-1},q=[[sx,sy]];
 for(let i=0;i<q.length;i++){const[x,y]=q[i];if(x===tx&&y===ty)break;
  for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=b*W+a;if(par[k]!==undefined||!free(a,b))continue;par[k]=y*W+x;q.push([a,b])}}
 const p=[];for(let k=ty*W+tx;par[k]!==undefined&&k!==sy*W+sx;k=par[k])p.unshift([k%W,(k-k%W)/W]);return p}
async function walk(u,p){const e=document.querySelector(`#u${u.id} .u`);e?.classList.add('walking');
 for(const[x,y]of p){u.x=x;u.y=y;drawUnits(cur());await sleep(150);
  if(spikeAt(x,y)){await trap(u,x,y);if(u.hp<=0)break}} // cada casa de espinhos pisada dispara a armadilha uma vez; vale para jogadores e monstros
 e?.classList.remove('walking');cam(u)}
// armadilha de espinhos: 1d6+1 de dano por casa pisada. Heróis nunca morrem nela (regra original: sobra pelo menos 1 de vida);
// monstros podem cair. Não há dano por ficar parado: o jogo não define essa regra.
async function trap(u,x,y){const raw=roll(1,6)+1,d=u.pl?Math.min(raw,u.hp-1):Math.min(raw,u.hp);let done=0;
 const apply=()=>{if(done)return;done=1;
  say(d>0?`${nm(u)} pisa em espinhos e perde ${d} de vida!`:`${nm(u)} pisa em espinhos, mas escapa por pouco.`,'hit');
  if(d>0){u.hp-=d;pop(u,'-'+d);anim(u,'hurt');if(u.hp<=0)say(`${nm(u)} caiu nos espinhos!`,'dead');drawUnits(cur())}};
 try{if(window.CFX)await CFX.spikes(x,y,apply)}catch(e){console.error(e)}
 apply();await sleep(u.hp<=0?400:250)}
async function diceRoll(a){const el=$('#dice'),v=(window.__rolls&&window.__rolls.length)?window.__rolls.shift():1+Math.floor(Math.random()*20),pl=!a||a.pl,n=pl?11:7,d=pl?50:45;
 el.className='dice rolling';el.style.animationDuration=(pl?1:.5)+'s';
 for(let i=0;i<n;i++){$('#dnum').textContent=1+Math.floor(Math.random()*20);snd(420+i*35,.03,'square',.015);await sleep(d+i*8)}
 el.style.animationDuration='';$('#dnum').textContent=v;el.className='dice'+(v===20?' crit':v===1?' fail':'');await dieFx(v,pl);return v}
async function dieFx(v,pl){const s=$('#sfx'),k=v===20?'crit':v===1?'fail':v<=5?'low':v>=15?'good':'';
 const T={fail:'FALHA CRÍTICA!',low:'Rolagem fraca',good:'Boa rolagem'}[k];
 if(k&&T){$('#sfx b').textContent=T;s.className='';void s.offsetWidth;s.className='s-'+k;setTimeout(()=>s.className='',1500)}
 if(v===20){const b=$('#bigdie');b.innerHTML=`<div class="bd">${$('#dice svg').outerHTML}<span>20</span></div><p>ACERTO CRÍTICO!</p>`;b.hidden=false;shake();await sleep(pl?1400:900);b.hidden=true}
 else if(v===1){shake();await sleep(450)}else await sleep(k?300:100)}
// ---------- Resolução do ataque (matemática) separada da apresentação (animações em combat-fx.js) ----------
// plan() decide tudo (acerto, crítico, dano, empurrão) sem desenhar nada. A animação chama o.apply() no instante do impacto,
// então o dano é aplicado exatamente uma vez e sincronizado com o golpe. Natural 1 = falha automática; natural 20 = crítico.
function plan(a,t,r,v){
 const tot=r+a.atk,crit=r>=(a.crit||20),nat20=r===20,ult=nat20&&!!a.pl,fumble=r===1,
  hit=!fumble&&(crit||tot>=t.ac),ranged=dist(a,t)>1,D=a.d2&&ranged?a.d2:a.d; // com 1 natural nenhum bônus transforma a falha em acerto
 const o={a,t,r,tot,crit,nat20,ult,fumble,hit,ranged,D,v:v||(a.k==='golem'?(ranged?'dist':'mel'):undefined),done:0};
 if(hit){o.nd=D[0]*(ult?3:crit?2:1);o.fl=D[2]+(a.bd||0)+(a.dm||0);o.dmg=Math.max(1,roll(o.nd,D[1])+o.fl)}
 if(a.k==='naja'&&nat20&&hit){const dx=Math.sign(t.x-a.x),dy=Math.sign(t.y-a.y);o.push={dx,dy,x:t.x+dx,y:t.y+dy}}
 o.apply=()=>commit(o);o.shove=()=>shove(o);o.bump=()=>bump(o);o.drain=()=>drain(o);
 return o}
// aplica o resultado (dano, escudo ou erro) uma única vez; falha crítica não aplica nada
function commit(o){
 if(o.done)return;o.done=1;const{a,t,r,tot,D}=o;
 if(o.fumble)return;
 if(!o.hit){snd(300,.12,'triangle',.05,-160);say(`${nm(a)} ataca ${nm(t)} (d20 ${r} + ${a.atk} = ${tot} contra CA ${t.ac}) e erra.`,'miss');pop(t,'errou','miss');anim(t,'dodge');return}
 if(t.shield){t.shield=0;o.absorbed=1;say(`O escudo de ${nm(t)} absorve o golpe de ${nm(a)} e se desfaz!`,'heal');pop(t,'escudo','miss');drawUnits(cur());return}
 const hp0=t.hp;t.hp=Math.max(0,t.hp-o.dmg);o.taken=hp0-t.hp;snd(o.crit?120:170,.16,'sawtooth',.07,-80);
 say(`${o.ult?'ACERTO CRÍTICO! ATAQUE ESPECIAL! ':o.crit?'ACERTO CRÍTICO! ':''}${nm(a)} acerta ${nm(t)} (d20 ${r} + ${a.atk} = ${tot}) e causa ${o.dmg} de dano [${o.nd}d${D[1]}+${o.fl}].`,o.crit?'crit':'hit');
 pop(t,'-'+o.dmg);anim(t,'hurt');
 if(t.hp<=0)fell(o);
 drawUnits(cur())}
// o alvo chegou a 0: vítima de chefe espera a finalização; nos demais casos cai na hora
function fell(o){const{a,t}=o;
 if(a.boss&&t.pl&&a.hp>0){o.fin=1;HOLD.add(t);return}
 say(`${nm(t)} caiu!`,'dead');if(a.pl)gainXp(a,t)}
// empurrão do crítico da Naja (1 casa): só se o alvo sobreviveu e o golpe não foi absorvido pelo escudo.
// Destino válido (chão livre, sem obstáculo nem unidade): o alvo é movido de verdade. Inválido: fica onde está.
function shove(o){if(o.shoved)return o.shoved;const{t,push:p}=o;
 if(!p||!o.hit||o.absorbed||t.hp<=0)return o.shoved={skip:1};
 if(free(p.x,p.y)){t.x=p.x;t.y=p.y;say(`${nm(t)} é empurrado pela cauda da ${nm(o.a)}!`,'hit');return o.shoved={moved:1}}
 say(`${nm(t)} é empurrado, mas não há espaço atrás dele!`,'hit');return o.shoved={moved:0}}
// empurrão bloqueado: 1 ponto de dano adicional, no máximo uma vez por ataque
function bump(o){if(o.bumped||!o.shoved||o.shoved.moved||o.shoved.skip)return;o.bumped=1;const t=o.t;
 t.hp=Math.max(0,t.hp-1);say(`${nm(t)} bate no obstáculo e sofre 1 de dano adicional.`,'hit');pop(t,'-1','');anim(t,'hurt');
 if(t.hp<=0)fell(o);drawUnits(cur())}
// roubo de vida do cajado do Clérigo: a vida tirada do inimigo volta para ele (nunca acima do máximo).
// O que sobraria vai para aliados feridos (até 3 casas, como a cura do Clérigo); sem aliados feridos, o excedente se perde.
function drain(o){if(o.drained!==undefined)return o.drained;const{a,t}=o;
 if(!a.steal||!o.hit||o.absorbed||!(o.taken>0))return o.drained=null;
 const total=Math.floor(o.taken*a.steal),self=Math.min(total,a.mhp-a.hp);let rest=total-self;const al=[];
 if(rest>0)for(const p of players().filter(p=>p!==a&&p.hp<p.mhp&&dist(a,p)<=3).sort((x,y)=>x.hp/x.mhp-y.hp/y.mhp)){if(rest<=0)break;const h=Math.min(rest,p.mhp-p.hp);if(h>0){al.push({u:p,h});rest-=h}}
 if(self<=0&&!al.length)return o.drained=null;
 const Dn={self,allies:al,apply(){if(Dn.done)return;Dn.done=1;
  if(self>0){a.hp+=self;pop(a,'+'+self,'heal');say(`${nm(a)} rouba ${self} de vida de ${nm(t)}.`,'heal')}
  for(const x of al){x.u.hp+=x.h;pop(x.u,'+'+x.h,'heal');say(`${nm(a)} direciona ${x.h} de vida roubada para ${nm(x.u)}.`,'heal')}
  drawUnits(cur())}};
 return o.drained=Dn}
// garante que tudo o que depende do ataque foi resolvido exatamente uma vez, mesmo sem animação
function settle(o){commit(o);const s=o.shove();if(s&&!s.skip&&!s.moved)bump(o);const D=o.drain();if(D)D.apply()}
async function finishHim(o){const t=o.t;
 try{if(window.CFX)await CFX.finish(o)}catch(e){console.error(e)}
 HOLD.delete(t);say(`${nm(t)} caiu!`,'dead');drawUnits(cur());await sleep(350)}
async function strike(a,t,opt={}){
 if(a.hard&&dist(a,t)>1&&!losHard(a,t)){console.warn('Arremesso bloqueado por obstáculo: ataque cancelado.');return} // dupla checagem: o projétil nunca atravessa obstáculos
 const r=await diceRoll(a),o=plan(a,t,r,opt.v);
 if(o.fumble){say(`FALHA CRÍTICA! ${nm(a)} tira 1 natural contra ${nm(t)}: o ataque falha automaticamente, sem dano nem outros efeitos.`,'fumble');pop(a,'FALHA CRÍTICA!','fumble')}
 else if(o.ult)await cutscene(a);
 try{if(window.CFX)await CFX.play(o)}catch(e){console.error(e)}
 settle(o);
 if(o.fin)await finishHim(o);else await sleep(t.hp<=0?450:250)}
const ULT={guerreiro:['Golpe Heroico','#fff3b0'],mago:['Meteoro Arcano','#ff7a2e'],arqueiro:['Disparo Triplo','#7dff9a'],clerigo:['Julgamento Divino','#fff2a0'],barbaro:['Fúria Ancestral','#ff8a4d'],ladino:['Dança das Sombras','#d9a0ff']};
async function cutscene(a){const[n,c]=ULT[a.k],e=$('#cut');e.style.setProperty('--cc',c);
 e.innerHTML=`<div class="cp">${ico(a.k)}</div><b>${n}</b><small>${esc(a.name)}, ${a.n}!</small>`;e.hidden=false;
 await sleep(1500);e.hidden=true}
// bafo do dragão: cone de fogo na direção do alvo. Uma rolagem para todos; cada personagem dentro do cone é verificado
// individualmente (posição, alcance e linha de visão) e recebe dano no máximo uma vez. 1 natural: a chama se dissipa e ninguém é atingido.
// 20 natural: baforada ampliada (cone mais longo e mais aberto), com o dano crítico já existente (dados x2).
async function breath(a,t){const dx=t.x-a.x,dy=t.y-a.y,L=Math.hypot(dx,dy);
 say(`${nm(a)} inspira fundo e solta um bafo de fogo em cone!`,'dead');
 const r=await diceRoll(a),fumble=r===1,crit=r===20,R=crit?6.5:4.5,cosMin=crit?.5:.78,cells=[],hits=[];
 if(!fumble)for(let vy=-7;vy<=7;vy++)for(let vx=-7;vx<=7;vx++){const m=Math.hypot(vx,vy),c={x:a.x+vx,y:a.y+vy};
  if(m&&m<=R&&(vx*dx+vy*dy)/(m*L)>=cosMin&&G.grid[c.y]?.[c.x]==='.'&&los(a,c))cells.push(c)}
 if(fumble){say(`FALHA CRÍTICA! ${nm(a)} tira 1 natural: a baforada se dissipa e ninguém é atingido.`,'fumble');pop(a,'FALHA CRÍTICA!','fumble')}
 else{if(crit){say(`ACERTO CRÍTICO! ${nm(a)} tira 20 natural e solta uma baforada ampliada!`,'crit');pop(a,'Baforada Ampliada!','crit')}
  for(const p of players()){if(!cells.some(c=>c.x===p.x&&c.y===p.y))continue;
   const hit=crit||r+a.atk>=p.ac,dmg=hit&&!p.shield?roll(a.d[0]*(crit?2:1),a.d[1])+a.d[2]:0;
   const h={p,hit,done:0,apply(){if(h.done)return;h.done=1;
    if(!hit){say(`${nm(p)} desvia das chamas.`,'miss');pop(p,'esquivou','miss');anim(p,'dodge');return}
    if(p.shield){p.shield=0;say(`O escudo de ${nm(p)} segura o fogo e se desfaz!`,'heal');pop(p,'escudo','miss');drawUnits(cur());return}
    p.hp=Math.max(0,p.hp-dmg);say(`As chamas queimam ${nm(p)} e causam ${dmg} de dano.`,'hit');pop(p,'-'+dmg);anim(p,'hurt');
    if(p.hp<=0){h.fin=1;HOLD.add(p)}drawUnits(cur())}};
   hits.push(h)}}
 try{if(window.CFX)await CFX.breath({a,t,mode:fumble?'F':crit?'C':'N',hits})}catch(e){console.error(e)}
 hits.forEach(h=>h.apply()); // rede de segurança (idempotente)
 for(const h of hits)if(h.fin)await finishHim({a,t:h.p,ranged:true});
 drawUnits(cur());await sleep(300)}
async function pAttack(t){G.busy=true;G.acted=true;render();try{await strike(cur(),t)}catch(e){console.error(e)}G.busy=false;after()}
function after(){if(!foes().some(f=>f.boss))return finish(true);if(!players().length)return finish(false);render();if(G.acted&&G.mv<1)endTurn()}
async function moveTo(x,y){const u=cur(),d=dists(u.x,u.y,true,G.mv)[y*W+x];if(!d)return;
 G.busy=true;G.mv-=d;render();try{await walk(u,steps(u.x,u.y,x,y))}catch(e){console.error(e)}
 const i=G.items.findIndex(t=>t.x===x&&t.y===y&&t.t!=='espinhos'); // espinhos disparam em walk()
 if(i>=0)try{await touch(u,i)}catch(e){console.error(e)}
 G.busy=false;render();if(G.acted&&G.mv<1)endTurn()}
// interações: poção, fonte e baú (bônus ou mímico). Os espinhos ficam em trap(), chamada por walk()
async function touch(u,i){const it=G.items[i],up=n=>{const h=Math.min(n,u.mhp-u.hp);u.hp+=h;pop(u,'+'+h,'heal');fxAdd('fxb heal',u,'',{},550);return h};
 G.items.splice(i,1);
 if(it.t==='pocao')say(`${u.name} bebe uma poção e recupera ${up(10)} de vida.`,'heal');
 else if(it.t==='fonte')say(`${u.name} bebe da fonte encantada e recupera ${up(99)} de vida.`,'heal');
 else if(it.t==='bvida'){u.mhp+=5;u.hp+=5;say(`${u.name} pega um buff de vida: +5 de vida máxima!`,'crit');pop(u,'+5 vida','heal');fxAdd('fxb heal',u,'',{},550)}
 else if(it.t==='bdano'){u.bd=(u.bd||0)+2;say(`${u.name} pega um buff de dano: +2 de dano nos ataques!`,'crit');pop(u,'+2 dano','heal')}
 else if(it.t==='escudo'){u.shield=1;drawUnits(cur());say(`${u.name} ganha um escudo que dura até levar um ataque!`,'crit');pop(u,'escudo','heal')}
 else{const r=rnd(4);
  if(r===0){u.atk++;say(`${u.name} acha uma arma afiada no baú: +1 de ataque!`,'crit');pop(u,'+1 atq','heal')}
  else if(r===1){u.mhp+=6;u.hp+=6;say(`${u.name} acha um amuleto no baú: +6 de vida máxima!`,'crit');pop(u,'+6 vida','heal')}
  else if(r===2)say(`${u.name} abre o baú e acha uma poção grande: recupera ${up(15)} de vida.`,'heal');
  else{const a=N4.map(([dx,dy])=>({x:u.x+dx,y:u.y+dy})).find(p=>free(p.x,p.y)),f=FOES.S;
   if(a){G.units.push({...f,id:G.units.length,pl:0,mhp:f.hp,x:a.x,y:a.y});say('O baú era um mímico! Um esqueleto surge ao lado.','dead')}else say('O baú estava vazio.','miss')}}}
// quebrar caixote, jarro ou tronco ao lado do herói (gasta a ação)
async function smash(x,y){const u=cur(),r=rnd(6);G.busy=true;G.acted=true;TC=null;G.grid[y][x]='.';fxAdd('fxb hit',{x,y},'',{},400);
 if(r<4){const t=['pocao','bvida','bdano','escudo'][r];G.items.push({x,y,t});say(`${u.name} quebra o objeto e um item rola para o chão!`,'heal')}
 else if(r===4){const f=FOES.G;G.units.push({...f,id:G.units.length,pl:0,mhp:f.hp,x,y});say(`${u.name} quebra o objeto e um goblin pula de dentro!`,'dead')}
 else say(`${u.name} quebra o objeto, mas só encontra cacos.`,'miss');
 await sleep(400);G.busy=false;render();after()}
async function heal(me){const u=cur();if(!u||u.k!=='clerigo'||G.busy||G.over||G.phase!=='players')return;
 if(G.acted){say('A ação deste turno já foi usada.','miss');return}
 const c=me?(u.hp<u.mhp?u:null):players().filter(p=>p!==u&&p.hp<p.mhp&&dist(u,p)<=3).sort((a,b)=>a.hp/a.mhp-b.hp/b.mhp)[0];
 if(!c){say(me?`${u.name} já está com a vida cheia.`:'Nenhum aliado por perto precisa de cura.','miss');return}
 G.busy=true;G.acted=true;const h=Math.min(c.mhp-c.hp,roll(1,8)+3);
 say(c===u?`${u.name} reza e se cura em ${h} de vida.`:`${u.name} cura ${nm(c)} em ${h} de vida.`,'heal');anim(u,'an-pray');snd(520,.3,'sine',.07,320);render();
 let ok=0;const apply=()=>{if(ok)return;ok=1;c.hp+=h;pop(c,'+'+h,'heal');drawUnits(cur())}; // a vida sobe quando o círculo de energia chega ao auge
 try{if(window.CFX)await CFX.heal(u,c,apply)}catch(e){console.error(e)}
 apply();G.busy=false;render();if(G.mv<1)endTurn()}

// ---------- Turnos ----------
function startTurn(){const u=cur();G.mv=u.mv;G.acted=false;say(`Vez de ${u.name} (${u.n}).`,'turn');render();cam(u,1)}
async function endTurn(){
 if(G.busy||G.over||G.phase!=='players')return;G.busy=true;
 const all=ps();do{G.turn++}while(G.turn<all.length&&all[G.turn].hp<=0);
 if(G.turn>=all.length){G.phase='foes';render();try{await enemyPhase()}catch(e){console.error(e)}
  if(G.over){G.busy=false;return}
  G.round++;G.turn=0;while(all[G.turn].hp<=0)G.turn++;G.phase='players'}
 G.busy=false;startTurn()}
async function enemyPhase(){
 say(`Rodada ${G.round}: turno dos monstros.`,'turn');const PM=new Map(),pd=t=>PM.get(t)||(PM.set(t,dists(t.x,t.y,false)),PM.get(t));
 for(const f of foes()){
  if(f.hp<=0)continue;const ts=players();if(!ts.length)break;
  let best=null,bd=99,bm=null;
  for(const t of ts){const m=pd(t),v=m[f.y*W+f.x];if(v!==undefined&&v<bd){bd=v;best=t;bm=m}}
  if(!best||bd>8)continue; // monstro dormindo: só acorda se um herói chegar perto
  cam(f);
  const want=f.mel&&bd<=f.mv+1?1:f.rg,okAt=q=>dist(q,best)<=want&&(f.hard&&want>1?losHard(q,best):los(q,best)); // Golem: o arremesso exige linha de visão limpa
  if(!okAt(f)){const r=dists(f.x,f.y,true,f.mv);let bk=null,bs=-1e9;
   for(const k in r){const x=k%W,y=(k-x)/W,m=bm[k];if(m===undefined)continue;
    const s=okAt({x,y})?1000+(f.keep?dist({x,y},best):0):-m;if(s>bs){bs=s;bk=[x,y]}}
   if(bk&&(bk[0]!==f.x||bk[1]!==f.y)){await walk(f,steps(f.x,f.y,bk[0],bk[1]));
    if(f.hp<=0){render();if(!foes().some(x=>x.boss)){finish(true);return}continue} // o monstro caiu nos espinhos: perde a vez
    render();await sleep(150)}}
  let nv; // Naja: duas ações por turno, uma de cauda e outra de mordida (a primeira é sorteada)
  for(let i=0,prev=null;i<(f.multi||1);i++){const c=players().filter(p=>inRange(f,p));if(!c.length)break;
   const tg=(i&&c.find(p=>p!==prev))||c.find(p=>p===best)||c[0];prev=tg;
   if(f.k==='naja')nv=i?(nv==='cauda'?'mordida':'cauda'):pick(['cauda','mordida']);
   await(f.k==='dragao'?breath(f,tg):strike(f,tg,{v:nv}));render();if(!players().length){finish(false);return}}}}
function finish(win){G.over=true;render();[0,1,2].forEach(i=>setTimeout(()=>snd(win?440+i*160:300-i*70,.3,win?'triangle':'sawtooth',.07),i*180));$('#modal').hidden=false;
 $('#mt').textContent=win?'Vitória!':'Derrota';
 $('#mp').textContent=win?`O chefe (${FOES[MAPS[G.map].boss].n}) caiu e a masmorra é de vocês. Glória eterna aos aventureiros!`:'Todos os aventureiros caíram. As sombras vencem desta vez.'}

// ---------- Início e menus ----------
function fixPicks(){const u=new Set();for(let i=0;i<4;i++){if(u.has(picks[i]))picks[i]=Object.keys(CLASSES).find(k=>!u.has(k));u.add(picks[i])}}
function renderSetup(){fixPicks();
 $('#maps').innerHTML=MAPS.map((m,i)=>`<button class="seg${i===mapIdx?' on':''}" data-m="${i}"><b>${m.n}</b><small>Chefe: ${FOES[m.boss].n}</small></button>`).join('');
 $('#count').innerHTML=[2,3,4].map(n=>`<button class="seg${n===nP?' on':''}" data-n="${n}">${n} jogadores</button>`).join('');
 $('#plist').innerHTML=Array.from({length:nP},(_,i)=>{const c=CLASSES[picks[i]];
  return `<div class="prow" style="--col:var(--p${i+1})"><span class="dot"></span><input maxlength="12" value="${esc(names[i])}" data-i="${i}" aria-label="Nome do jogador ${i+1}"><div class="classes">${Object.entries(CLASSES).map(([k,v])=>`<button class="cls${picks[i]===k?' on':''}" data-i="${i}" data-k="${k}" title="${v.n}" aria-label="${v.n}"${picks.slice(0,nP).some((p,j)=>j!==i&&p===k)?' disabled':''}>${ico(k)}</button>`).join('')}</div><small>${c.n}: ${c.info}</small></div>`}).join('')}
function start(){save();TC=null;
 const M=MAPS[mapIdx],gr=M.gen();H=gr.length;W=gr[0].length;$('#game').style.setProperty('--W',W);$('#game').style.setProperty('--H',H);G.map=mapIdx;G.grid=gr.map(r=>[...r]);G.units=[];G.items=[];let s=0;
 G.grid.forEach((row,y)=>row.forEach((ch,x)=>{
  if(ch==='P'){if(s<nP){const c=CLASSES[picks[s]];G.units.push({...c,id:G.units.length,k:picks[s],pl:1,name:(names[s]||'').trim()||'Jogador '+(s+1),mhp:c.hp,x,y,col:s+1})}s++;row[x]='.'}
  else if(FOES[ch]){const f=FOES[ch],hp=f.boss?f.hp+12*nP:Math.round(f.hp*(1+.2*(nP-2)));G.units.push({...f,id:G.units.length,pl:0,hp,mhp:hp,atk:f.atk+(nP>3?1:0),x,y});row[x]='.'}
  else if(ITEMS[ch]){G.items.push({x,y,t:ITEMS[ch]});row[x]='.'}}));
 Object.assign(G,{turn:0,round:1,phase:'players',busy:false,over:false});
 $('#board').replaceChildren();$('#log').innerHTML='';window.CFX&&CFX.reset();HOLD.clear();$('#units').innerHTML='';$('#fx').innerHTML='';$('#setup').hidden=true;$('#game').hidden=false;$('#modal').hidden=true;
 say('Vocês entram em '+M.n+'. Cuidado com '+(M.boss==='N'?'a ':'o ')+FOES[M.boss].n+'!','turn');startTurn();perfProbe()}
$('#setup').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.n){nP=+b.dataset.n;renderSetup()}else if(b.dataset.m){mapIdx=+b.dataset.m;renderSetup()}else if(b.dataset.k){picks[+b.dataset.i]=b.dataset.k;renderSetup()}});
$('#setup').addEventListener('input',e=>{if(e.target.dataset.i!==undefined)names[+e.target.dataset.i]=e.target.value});
$('#board').onclick=e=>{const c=e.target.closest('.c');if(!c||G.busy||G.over||G.phase!=='players')return;
 const x=+c.dataset.x,y=+c.dataset.y;
 if(c.classList.contains('t'))pAttack(at(x,y));else if(c.classList.contains('m'))moveTo(x,y);else if(c.classList.contains('br'))smash(x,y);else{const u=cur();if(u&&u.k==='clerigo'&&u.x===x&&u.y===y)heal(true)}};
addEventListener('keydown',e=>{
 if($('#game').hidden||qOpen()||G.busy||G.over||G.phase!=='players'||e.target.tagName==='INPUT')return;
 if(e.key==='c'){cam(cur(),1);return}
 if(e.key==='f'){const t=document.querySelector('.c.t');if(t)t.click();return}
 const m={ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]}[e.key];
 if(!m)return;e.preventDefault();const u=cur(),x=u.x+m[0],y=u.y+m[1];if(G.mv>0&&free(x,y))moveTo(x,y)});
addEventListener('keydown',e=>{if(e.code!=='Space'||$('#game').hidden||qOpen()||G.over||e.target.tagName==='INPUT')return;
 e.preventDefault();e.target.blur?.();if(!e.repeat)endTurn()});
addEventListener('keyup',e=>{if(e.code==='Space'&&!$('#game').hidden&&!qOpen()&&!G.over&&e.target.tagName!=='INPUT')e.preventDefault()});
const qOpen=()=>!$('#qmodal').hidden,closeQ=()=>{$('#qmodal').hidden=true};
function quit(){RUN++;window.CFX&&CFX.reset();closeQ();$('#bigdie').hidden=true;$('#cut').hidden=true;$('#sfx').className='';const d=$('#dice');d.className='dice';d.style.animationDuration='';
 Object.assign(G,{busy:false,over:true,phase:'setup'});$('#modal').hidden=true;$('#game').hidden=true;$('#setup').hidden=false;renderSetup()}
$('#quit').onclick=()=>{if(!$('#game').hidden&&!G.over){$('#qmodal').hidden=false;$('#qno').focus()}};
$('#qno').onclick=closeQ;$('#qyes').onclick=quit;
addEventListener('keydown',e=>{if(e.key==='Escape'&&qOpen())closeQ()});
$('#go').onclick=start;$('#end').onclick=endTurn;$('#heal').onclick=()=>heal();$('#selfheal').onclick=()=>heal(true);
$('#again').onclick=()=>{$('#modal').hidden=true;$('#game').hidden=true;$('#setup').hidden=false;renderSetup()};
renderSetup();
$('#ctr').onclick=()=>{const u=cur();if(u&&!$('#game').hidden)cam(u,1)};
// ---------- Extras: nível, minimapa, modo leve ----------
function gainXp(a,t){a.xp=(a.xp||0)+(t.boss?3:1);const l=a.lv||1;if(a.xp<l+2)return;a.xp-=l+2;a.lv=l+1;a.mhp+=4;a.hp+=4;if(l%2)a.atk++;
 say(`${a.name} sobe para o nível ${a.lv}! +4 de vida máxima${l%2?' e +1 de ataque':''}.`,'crit');pop(a,'NÍVEL '+a.lv,'heal');fxAdd('fxb holy',a,'',{},550);[0,1,2].forEach(i=>setTimeout(()=>snd(520+i*130,.14,'triangle',.06),i*90))}
function perfProbe(){let n=0,last=performance.now(),bad=0;const f=t=>{if(t-last>34)bad++;last=t;if(++n<90)requestAnimationFrame(f);else if(bad>18&&!document.body.classList.contains('lite')){document.body.classList.add('lite');ui();say('Modo leve ativado para manter o jogo fluido.','miss')}};requestAnimationFrame(f)}
const MC=$('#mini'),MX=MC.getContext('2d');let mq=0;
const miniSoon=()=>{mq||(mq=requestAnimationFrame(()=>{mq=0;if(!$('#game').hidden&&G.grid.length)mini()}))};
function mini(){const s=Math.max(2,Math.floor(300/W));if(MC.width!==W*s||MC.height!==H*s){MC.width=W*s;MC.height=H*s;TC=null}
 if(!TC){TC=document.createElement('canvas');TC.width=MC.width;TC.height=MC.height;const t=TC.getContext('2d');t.fillStyle='#120b06';t.fillRect(0,0,TC.width,TC.height);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const c=G.grid[y][x];if(c!=='#'){t.fillStyle=c==='o'?'#7a6a52':'#5d4d3b';t.fillRect(x*s,y*s,s,s)}}}
 MX.drawImage(TC,0,0);for(const i of G.items){MX.fillStyle='#f2d67e';MX.fillRect(i.x*s,i.y*s,s,s)}
 for(const u of G.units){if(u.hp<=0)continue;MX.fillStyle=u.pl?['#e0503f','#4a8cf0','#3fbf70','#b06be0'][u.col-1]:u.boss?'#ff9a2e':'#d2281e';const z=u.boss?s*2:s;MX.fillRect(u.x*s-(z-s)/2,u.y*s-(z-s)/2,z,z)}
 const c=$('#cam'),k=c.scrollWidth/W;MX.strokeStyle='#fff';MX.strokeRect(c.scrollLeft/k*s+.5,c.scrollTop/k*s+.5,c.clientWidth/k*s,c.clientHeight/k*s)}
MC.onclick=e=>{const r=MC.getBoundingClientRect(),c=$('#cam'),k=c.scrollWidth/W;c.scrollTo({left:(e.clientX-r.left)/r.width*W*k-c.clientWidth/2,top:(e.clientY-r.top)/r.height*H*k-c.clientHeight/2,behavior:'smooth'})};
$('#cam').addEventListener('scroll',miniSoon,{passive:true});
$('#snd').onclick=()=>{MUTE=!MUTE;ui();save();snd(600,.1)};$('#spd').onclick=()=>{SPEED=SPEED<1?1:.5;ui();save()};$('#gfx').onclick=()=>{document.body.classList.toggle('lite');ui();save()};
ui();
