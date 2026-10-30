// =====================================================================
// Dungeonfall — camada visual do combate (combat-fx.js)
// game.js decide O QUE acontece (dados, dano, alcance, linha de visão, turnos).
// Este arquivo só DESENHA: armas, projéteis, partículas, críticos, falhas
// críticas e finalizações. Cada animação recebe o resultado já calculado
// (objeto "out") e chama out.apply() no instante do impacto; assim o dano
// é aplicado exatamente uma vez e sincronizado com o golpe.
// Nada aqui altera G.grid nem a posição real das unidades (exceto o
// empurrão da Naja, que é uma regra de jogo resolvida em game.js).
// =====================================================================
(()=>{
'use strict';
const MAXL=170,live=new Set(),SCS=[];

// ---------- utilidades ----------
const cp=()=>{const c=$('#board').firstElementChild;return c&&c.offsetWidth||54}; // pixels por casa
const px=n=>n*cp(),cl=n=>`calc(var(--cell)*${n})`;
const rad=d=>d*Math.PI/180,deg=r=>r*180/Math.PI,rr=(a,b)=>a+Math.random()*(b-a),pk=a=>a[Math.floor(Math.random()*a.length)];
const angOf=(p,q)=>deg(Math.atan2(q.y-p.y,q.x-p.x)),vecOf=a=>[Math.cos(rad(a)),Math.sin(rad(a))];
const lite=()=>document.body.classList.contains('lite');
const uel=u=>document.querySelector(`#u${u.id} .u`),tkel=u=>document.getElementById('u'+u.id);
const place=(e,x,y)=>{e.style.left=(x+.5)*100/W+'%';e.style.top=(y+.5)*100/H+'%'};
const kill=e=>{live.delete(e);e.remove()};
const top=()=>SCS[SCS.length-1];

// cria um elemento na camada #fx. x,y em casas (inteiro = centro da casa).
// o.self = partícula que some sozinha; sem isso o elemento pertence à cena e é removido no fim dela.
function mk(cls,x,y,o={}){
 const e=document.createElement('span');e.className='fz '+cls;
 if(o.html!=null)e.innerHTML=o.html;
 place(e,x,y);
 if(o.w){e.style.width=cl(o.w);e.style.height=cl(o.h||o.w)}
 if(o.css)for(const k in o.css)k[0]==='-'?e.style.setProperty(k,o.css[k]):e.style[k]=o.css[k];
 if(o.z)e.style.zIndex=o.z;
 $('#fx').append(e);live.add(e);
 if(o.self)setTimeout(()=>kill(e),o.self*SPEED+500);
 else{const S=top();if(S)S.els.add(e)}
 return e}

// Web Animations: respeita a velocidade do jogo (SPEED) e nunca trava a fila de turnos
// (resolve ao terminar, ao ser cancelada ou por um temporizador de segurança).
// Se a partida for abandonada (RUN muda), a promessa fica pendente, igual ao sleep() do jogo.
const RM=matchMedia('(prefers-reduced-motion: reduce)'); // movimento reduzido: os efeitos vão direto ao estado final, o ritmo do jogo não muda
function wa(e,kf,ms,o={}){
 const k=RUN;
 return new Promise(res=>{
  if(!e||!e.isConnected){res();return}
  let an,done=false,tm;
  const fin=()=>{if(done)return;done=true;clearTimeout(tm);if(k===RUN)res()},rm=RM.matches;
  try{an=e.animate(kf,{duration:rm?1:Math.max(1,ms*SPEED),delay:rm?0:(o.delay||0)*SPEED,easing:o.ease||'ease-out',fill:'both',iterations:rm?1:o.iter||1,direction:o.dir||'normal'})}
  catch(err){console.error('wa',err);fin();return}
  if(o.own){const S=top();if(S)S.an.push(an)}   // animações em elementos reais do jogo são canceladas no fim da cena
  if(!rm)an.onfinish=fin;an.oncancel=fin;
  tm=setTimeout(fin,((ms*(o.iter||1))+(o.delay||0))*SPEED+(rm?0:150))})}

// transformações
const T=(dx=0,dy=0,r=0,s=1,sy)=>`translate(-50%,-50%) translate(${px(dx)}px,${px(dy)}px) rotate(${r}deg) scale(${s},${sy??s})`; // elemento centrado
const TP=(r=0,push=0,s=1,o)=>`translate(${px(o?o.x:0)}px,${px(o?o.y:0)}px) rotate(${r}deg) translateX(${px(push)}px) scale(${s})`;   // arma presa ao ombro (o = deslocamento do ombro)
const B=o=>`translate(${px(o.x||0)}px,${px(o.y||0)}px) rotate(${o.r||0}deg) scale(${o.s??1},${o.sy??o.s??1})`;                      // corpo da unidade (.u)

// ---------- cenas: tudo o que uma animação cria é limpo no fim, aconteça o que acontecer ----------
async function scene(fn){const S={an:[],els:new Set(),undo:[]};SCS.push(S);try{return await fn(S)}finally{endScene(S)}}
function endScene(S){
 S.an.forEach(a=>{try{a.cancel()}catch(e){}});
 S.els.forEach(e=>{if(e.isConnected)kill(e)});
 S.undo.forEach(f=>{try{f()}catch(e){console.error(e)}});
 const i=SCS.indexOf(S);if(i>=0)SCS.splice(i,1)}
// chamado ao sair da partida ou começar outra
function reset(){
 SCS.slice().forEach(endScene);[...live].forEach(kill);
 const f=$('#fx');if(f)f.replaceChildren();
 document.querySelectorAll('.vh').forEach(e=>e.classList.remove('vh'));
 if(typeof cineOff==='function')cineOff(true);
 if(typeof HOLD!=='undefined')HOLD.clear()}

// ---------- som (usa o sintetizador do jogo) ----------
const SFX={
 swish:()=>snd(1800,.1,'noise',.05,-1200),whoosh:()=>snd(500,.28,'noise',.06,600),
 clang:()=>{snd(1300,.2,'square',.035,-300);snd(2100,.14,'triangle',.03)},
 thud:()=>{snd(90,.22,'sine',.12,-50);snd(200,.1,'noise',.05,-100)},
 boom:()=>{snd(60,.4,'sine',.14,-30);snd(260,.32,'noise',.07,-160)},
 fire:()=>snd(320,.4,'noise',.06,500),zap:()=>snd(900,.18,'sawtooth',.04,-600),
 bow:()=>{snd(220,.07,'triangle',.05,120);snd(1500,.08,'noise',.03,-900)},
 hiss:()=>snd(3500,.35,'noise',.035,-1200),
 chime:()=>{snd(880,.2,'sine',.05);snd(1320,.3,'sine',.04)},
 bite:()=>{snd(260,.06,'square',.05,-120);snd(150,.1,'triangle',.05)},
 stone:()=>{snd(140,.3,'noise',.08,-60);snd(70,.25,'sine',.1,-20)},rumble:()=>snd(55,.5,'sawtooth',.05,10),
 shield:()=>{snd(1000,.09,'square',.05,-500);snd(1700,.12,'triangle',.03)}};
const sfx=n=>{try{SFX[n]&&SFX[n]()}catch(e){}};

// ---------- partículas e formas básicas (somem sozinhas) ----------
function burst(x,y,o={}){
 let n=o.n||10;if(lite())n=Math.ceil(n*.4);if(live.size>MAXL)n=Math.ceil(n/3);
 const cols=[].concat(o.col||'#fff'),sp=o.spread??360,a0=(o.ang??0)-sp/2;
 for(let i=0;i<n;i++){
  const a=rad(a0+Math.random()*sp),d=(o.r||.8)*(.45+Math.random()*.7),sz=(o.sz||.1)*(.6+Math.random()*.8);
  const e=mk('pc'+(o.sq?' sq':''),x+(o.ox||0)*(Math.random()-.5),y+(o.oy||0)*(Math.random()-.5),{w:sz,self:(o.ms||450)*1.5,css:{background:pk(cols)}});
  const dx=Math.cos(a)*d,dy=Math.sin(a)*d+(o.g||0),rot=o.sq?rr(-200,200):0;
  wa(e,[{transform:T(0,0,0,1),opacity:1},{transform:T(dx,dy,rot,o.shrink??.25),opacity:0}],(o.ms||450)*rr(.7,1.3),{ease:'cubic-bezier(.1,.7,.3,1)',delay:o.delay||0}).then(()=>kill(e))}}
// partículas que convergem para um ponto (carregar energia)
function gather(x,y,o={}){
 let n=o.n||8;if(lite())n=Math.ceil(n*.4);
 for(let i=0;i<n;i++){
  const a=rad(rr(0,360)),d=(o.r||.7)*rr(.7,1.2),e=mk('pc',x,y,{w:rr(.06,.12)*(o.sz||1),self:(o.ms||400)*1.8,css:{background:pk([].concat(o.col||'#fff'))}});
  wa(e,[{transform:T(Math.cos(a)*d,Math.sin(a)*d,0,.4),opacity:0},{opacity:1,offset:.4},{transform:T(0,0,0,1),opacity:0}],(o.ms||400)*rr(.8,1.2),{ease:'ease-in',delay:rr(0,(o.ms||400)*.4)}).then(()=>kill(e))}}
function ring(x,y,col,size=1,ms=450,w=3,s1=2.4){
 const e=mk('rg',x,y,{w:size,self:ms,css:{border:`${w}px solid ${col}`,boxShadow:lite()?'none':`0 0 10px ${col}`}});
 wa(e,[{transform:T(0,0,0,.2),opacity:1},{transform:T(0,0,0,s1),opacity:0}],ms).then(()=>kill(e))}
function glow(x,y,col,size=1.4,ms=420,peak=1.3){
 const e=mk('gl',x,y,{w:size,self:ms,css:{background:`radial-gradient(circle,#fff 0,${col} 30%,transparent 68%)`}});
 wa(e,[{transform:T(0,0,0,.2),opacity:1},{transform:T(0,0,0,peak),opacity:.95,offset:.5},{transform:T(0,0,0,peak*1.25),opacity:0}],ms).then(()=>kill(e))}
function puffs(cls,x,y,n=5,sc=1,ms=620,up=.1){
 if(lite())n=Math.ceil(n/2);if(live.size>MAXL)n=Math.ceil(n/2);
 for(let i=0;i<n;i++){const a=rad(rr(0,360)),d=rr(.2,.7)*sc,e=mk(cls,x+Math.cos(a)*.15,y+Math.sin(a)*.15,{w:rr(.3,.5)*sc,self:ms});
  wa(e,[{transform:T(0,0,0,.3),opacity:.9},{transform:T(Math.cos(a)*d,Math.sin(a)*d-up,0,1.4),opacity:0}],ms*rr(.8,1.2)).then(()=>kill(e))}}
const dust=(x,y,n,sc,ms)=>puffs('dust',x,y,n,sc,ms),smoke=(x,y,n,sc,ms)=>puffs('smoke',x,y,n,sc,ms,.25);

// rastro de corte em arco: desenha o arco aos poucos e some (centro x,y; raio r em casas; ângulos em graus)
function arc(x,y,r,a0,a1,o={}){
 const S=r*2+.7,R=100*r/S,pt=a=>[R*Math.cos(rad(a)),R*Math.sin(rad(a))],sw=a1>a0?1:0,full=Math.abs(a1-a0)>=359;
 let d;
 if(full){const m=a0+(a1>a0?180:-180),p0=pt(a0),pm=pt(m);d=`M${p0} A${R} ${R} 0 1 ${sw} ${pm} A${R} ${R} 0 1 ${sw} ${p0}`}
 else{const p0=pt(a0),p1=pt(a1);d=`M${p0} A${R} ${R} 0 ${Math.abs(a1-a0)>180?1:0} ${sw} ${p1}`}
 const col=o.col||'#fff3b0',wd=o.w||7,ms=o.ms||300,hold=o.hold||200;
 const e=mk('arc',x,y,{self:ms+hold+(o.delay||0)+100,w:S,html:`<svg viewBox="-50 -50 100 100"><path d="${d}" fill="none" stroke="${col}" stroke-width="${wd}" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" opacity=".6"/><path d="${d}" fill="none" stroke="#fff" stroke-width="${Math.max(1.5,wd/3)}" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>`});
 e.style.transform='translate(-50%,-50%)';
 e.querySelectorAll('path').forEach(p=>wa(p,[{strokeDashoffset:1},{strokeDashoffset:0}],ms,{ease:o.ease||'cubic-bezier(.3,.6,.4,1)',delay:o.delay||0}));
 return wa(e,[{opacity:1},{opacity:1,offset:.6},{opacity:0}],ms+hold,{delay:o.delay||0}).then(()=>kill(e))}
// linha de corte reta (usada nos X e nas garras)
function cut(x,y,rot,o={}){
 const ms=o.ms||320,e=mk('cut',x,y,{self:ms+(o.delay||0)+100,css:{'--c':o.col||'#fff3b0',width:cl(o.len||1.5),height:`${o.th||6}px`}}),b=`translate(-50%,-50%) rotate(${rot}deg)`;
 e.style.transform=b+' scaleX(.05)';e.style.opacity=0;
 return wa(e,[{transform:b+' scaleX(.05)',opacity:0},{transform:b+' scaleX(.7)',opacity:1,offset:.3},{transform:b+' scaleX(1)',opacity:.95,offset:.65},{transform:b+' scaleX(1.06)',opacity:0}],ms,{delay:o.delay||0}).then(()=>kill(e))}
// feixe de energia de p até q (cresce a partir de p)
function beam(p,q,o={}){
 const L=Math.hypot(q.x-p.x,q.y-p.y),a=angOf(p,q),ms=o.ms||260,th=o.th||.12;
 const e=mk('bm',p.x,p.y,{self:ms+(o.hold||200)+(o.delay||0)+100,css:{width:cl(L),height:cl(th),'--c':o.col||'#fff2a0'}});
 e.style.transform=`translate(0,-50%) rotate(${a}deg) scaleX(0)`;e.style.opacity=0;
 const t=s=>`translate(0,-50%) rotate(${a}deg) scaleX(${s})`;
 return wa(e,[{transform:t(0),opacity:1},{transform:t(1),opacity:1,offset:.45},{transform:t(1),opacity:.85,offset:.75},{transform:t(1),opacity:0}],ms+(o.hold||200),{ease:'ease-out',delay:o.delay||0}).then(()=>kill(e))}
// marcas de garra (três riscos paralelos) e de presas
function claws(x,y,o={}){
 const sa=o.rot??pk([-55,-35,35,55]),col=o.col||'#f2f0e6',px2=Math.cos(rad(sa+90))*.13,py2=Math.sin(rad(sa+90))*.13;
 for(let i=-1;i<=1;i++)cut(x+px2*i,y+py2*i,sa,{col,len:o.len||.8,th:o.th||3,ms:o.ms||300,delay:(o.delay||0)+Math.abs(i)*25})}
function fangMarks(x,y,col='#f3ecd6'){
 for(const s of[-1,1]){const e=mk('pc',x+s*.12,y-.02,{w:.1,self:420,css:{background:col}});wa(e,[{transform:T(0,-.1,0,.2),opacity:0},{transform:T(0,0,0,1.3),opacity:1,offset:.35},{transform:T(0,.02,0,1),opacity:0}],380).then(()=>kill(e))}}

// projétil: move e (já criado em p0) até p1 em ms, com arco, rotação e rastro opcionais
function fly(e,p0,p1,ms,o={}){
 const dx=p1.x-p0.x,dy=p1.y-p0.y,A=o.arc||0,N=14,kf=[],base=deg(Math.atan2(dy,dx));
 const pos=p=>({x:dx*p+(o.sx?o.sx(p):0),y:dy*p-4*A*p*(1-p)+(o.sy?o.sy(p):0)});
 let last;
 for(let i=0;i<=N;i++){const p=i/N,q=pos(p),s=o.sc?o.sc[0]+(o.sc[1]-o.sc[0])*p:1,
   r=(o.rot==='spin'?(o.spin||360)*p:o.rot==='dir'?base:0)+(o.r0||0);
  kf.push({offset:p,transform:T(q.x,q.y,r,s),opacity:o.fade?1-Math.max(0,(p-o.fade)/(1-o.fade)):1});last={dx:q.x,dy:q.y,r,s}}
 e._p=last;
 const k=RUN,t0=performance.now(),dur=Math.max(1,ms*SPEED);let iv=0;
 if(o.trail){iv=setInterval(()=>{if(k!==RUN||!e.isConnected){clearInterval(iv);return}
   const p=Math.min(1,(performance.now()-t0)/dur),q=pos(p);
   burst(p0.x+q.x,p0.y+q.y,{n:o.trail.n||2,col:o.trail.col||'#fff',r:o.trail.r||.2,sz:o.trail.sz||.12,ms:o.trail.ms||300,shrink:.1,ox:.08,oy:.08})},
   Math.max(22,(o.trail.rate||34)*SPEED))}
 return wa(e,kf,ms,{ease:o.ease||'linear'}).then(()=>{clearInterval(iv)})}

// esfera de energia (bola de fogo, esfera sombria, orbe sagrado)
const orb=(x,y,o={})=>mk('orb2'+(o.dark?' dk':''),x,y,{w:o.size||.5,css:{'--o1':o.c1||'#fff3b0','--o2':o.c2||'#ff7a2e'}});
// "fantasma": cópia visual da unidade (a unidade real fica invisível até o fim da cena)
function ghost(u,o={}){
 const src=uel(u),e=mk('gh',o.x??u.x,o.y??u.y,{w:1});e.style.transform='translate(-50%,-50%)';
 if(src){const k=src.cloneNode(true);[...k.classList].filter(c=>/^(an-|act|walking|shd|hurt|dodge)/.test(c)).forEach(c=>k.classList.remove(c));
  k.querySelector('.hp')?.remove();e.append(k);
  if(o.hide!==false){src.classList.add('vh');const S=top();S&&S.undo.push(()=>src.classList.remove('vh'))}}
 return e}
// imagem residual (rastro de velocidade)
function afterimage(u,x,y,ms=260,op=.45){const g=ghost(u,{x,y,hide:false});g.style.opacity=op;wa(g,[{opacity:op},{opacity:0}],ms).then(()=>kill(g))}

// movimento do corpo da unidade (.u). "to" pode ser um estado ou uma lista de estados.
function body(c,to,ms,ease){const el=c.ua;if(!el)return Promise.resolve();
 const fr=[c.bs||{}].concat(Array.isArray(to)?to:[to]);c.bs=fr[fr.length-1];
 return wa(el,fr.map(s=>({transform:B(s)})),ms,{ease,own:true})}
// distância (em casas) que um projétil percorre sem bater em parede, obstáculo ou unidade
function rayLen(A,a,maxLen,skip){
 const v=vecOf(a);
 for(let s=.6;s<=maxLen;s+=.2){const cx=Math.round(A.x+v[0]*s),cy=Math.round(A.y+v[1]*s);
  if(cx===A.x&&cy===A.y)continue;
  if(G.grid[cy]?.[cx]!=='.')return Math.max(.8,s-.45);
  const u=at(cx,cy);if(u&&u!==skip)return Math.max(.8,s-.55)}
 return maxLen}

// ---------- arte (SVG): usa os gradientes já definidos no index.html (#gs aço, #gb osso, #gd dragão) ----------
const ST='stroke="#1a1108" stroke-width="1.3" stroke-linejoin="round"';
const svg=(vb,b)=>`<svg viewBox="${vb}" style="width:100%;height:100%;display:block;overflow:visible">${b}</svg>`;
const ART={
 sword:(p={})=>({w:.98,h:.27,svg:svg('0 0 90 24',`<g ${ST}><rect x="1" y="9.5" width="17" height="5" rx="2" fill="#6b4423"/><circle cx="2.5" cy="12" r="3.4" fill="${p.gd||'#c9a13b'}"/><rect x="17" y="2.5" width="5" height="19" rx="2" fill="${p.gd||'#c9a13b'}"/><path d="M22 8.6H80L90 12 80 15.4H22Z" fill="${p.bl||'url(#gs)'}"/></g><path d="M25 11H80" stroke="#fff" stroke-width="1" opacity=".7"/>`)}),
 axe:(p={})=>({w:.92,h:.52,svg:svg('0 0 80 44',`<g ${ST}><rect x="0" y="19.5" width="66" height="5" rx="2" fill="${p.hl||'#6b4423'}"/><path d="M50 2C76 7 78 37 50 42 58 31 58 13 50 2Z" fill="${p.hd||'url(#gs)'}"/><rect x="46" y="16" width="9" height="12" rx="2" fill="#7a5a17"/><path d="M50 19 36 22 50 25Z" fill="${p.hd||'url(#gs)'}"/></g>`)}),
 dagger:(p={})=>({w:.52,h:.17,svg:svg('0 0 46 16',`<g ${ST}><rect x="0" y="6" width="9" height="4" rx="1.5" fill="#4a3a26"/><rect x="8" y="1.5" width="3.5" height="13" rx="1.5" fill="${p.gd||'#c9a13b'}"/><path d="M11.5 5.6H38L46 8 38 10.4H11.5Z" fill="${p.bl||'url(#gs)'}"/></g>`)}),
 staff:(p={})=>({w:.98,h:.33,orb:.857,svg:svg('0 0 84 28',`<g ${ST}><rect x="0" y="12.3" width="64" height="3.4" rx="1.7" fill="${p.sh||'#7a4a23'}"/><path d="M62 14Q64 2 73 3Q82 4 80 14" fill="none" stroke="${p.cr||'#c9a13b'}" stroke-width="2.6"/><circle cx="72" cy="14" r="7.5" fill="${p.o2||'#f2d67e'}"/><circle cx="72" cy="14" r="4.6" fill="${p.o1||'#fff8d0'}"/></g>`)}),
 bow:()=>({w:.5,h:.82,svg:svg('-14 0 40 60',`<g ${ST}><path d="M6 2Q34 30 6 58" fill="none" stroke="#7a4a23" stroke-width="4" stroke-linecap="round"/></g><path d="M6 2Q34 30 6 58" fill="none" stroke="#b07a40" stroke-width="1.6" stroke-linecap="round"/><path class="s0" d="M6 2V58" stroke="#e8e0c0" stroke-width="1.1"/><path class="s1" d="M6 2L-9 30 6 58" fill="none" stroke="#e8e0c0" stroke-width="1.1" opacity="0"/>`)}),
 arrow:(p={})=>({w:.82,h:.15,svg:svg('0 0 56 10',`<g ${ST}><rect x="3" y="4" width="46" height="2.2" rx="1" fill="${p.sh||'#d9c7a0'}"/><path d="M48 .5 56 5 48 9.5Z" fill="#cfd6dd"/><path d="M0 .8 8 5 0 9.2 3 5Z" fill="${p.f||'#e8e0c0'}"/></g>`)}),
 paw:(p={})=>({w:.5,h:.4,svg:svg('0 0 36 28',`<g ${ST}><ellipse cx="11" cy="14" rx="10" ry="9" fill="${p.c||'#8d9097'}"/><path d="M19 6 34 2M20 12 36 12M19 18 34 23" stroke="#f3ecd6" stroke-width="2.8" stroke-linecap="round" fill="none"/></g>`)}),
 mand:()=>({w:.3,h:.46,svg:svg('0 0 20 30',`<g ${ST}><path d="M3 1Q-2 20 12 29Q9 14 15 1Z" fill="#2a1a2e"/></g><path d="M12 29Q9 14 10 8" fill="none" stroke="#e8e0c0" stroke-width="1.8"/>`)}),
 jaws:()=>({w:.62,h:.5,svg:svg('0 0 50 40',`<g ${ST}><path d="M2 20Q25 -6 48 20Q25 14 2 20Z" fill="#5fc455"/><path d="M2 20Q25 46 48 20Q25 26 2 20Z" fill="#4aa043"/><path d="M6 20Q25 10 44 20Q25 30 6 20Z" fill="#8c1c28"/><path d="M13 19 17 31 21 20ZM29 20 33 31 37 19Z" fill="#fff8e0"/></g>`)}),
 tail:()=>({w:1.75,h:.42,svg:svg('0 0 110 26',`<g ${ST}><path d="M0 3C38 -1 82 5 108 15 80 15 38 21 0 23Z" fill="#4fae48"/></g><path d="M8 10C42 8 78 12 102 14" stroke="#a6e07a" stroke-width="1.6" stroke-dasharray="5 4" fill="none"/><path d="M12 18C46 17 80 17 100 16" stroke="#2f6a2a" stroke-width="1.4" stroke-dasharray="5 4" fill="none"/>`)}),
 neck:()=>({w:1,h:.3,svg:svg('0 0 100 30',`<g ${ST}><rect x="0" y="2" width="100" height="26" rx="13" fill="#4fae48"/></g><path d="M6 11H94" stroke="#a6e07a" stroke-width="2" stroke-dasharray="7 5" fill="none"/><path d="M6 21H94" stroke="#2f6a2a" stroke-width="2" stroke-dasharray="7 5" fill="none"/>`)}),
 fist:()=>({w:1,h:1,svg:svg('0 0 64 64',`<g ${ST}><rect x="8" y="12" width="48" height="40" rx="12" fill="#8d9298"/><path d="M20 12V28M32 12V28M44 12V28" stroke="#5a5f66" stroke-width="2.2" fill="none"/><rect x="14" y="40" width="36" height="8" rx="4" fill="#767b82"/></g><path d="M12 18H52" stroke="#c4cad0" stroke-width="2" opacity=".5"/>`)}),
 foot:()=>({w:1,h:1.25,svg:svg('0 0 64 80',`<g ${ST}><path d="M10 18Q32 -2 54 18L58 64Q32 80 6 64Z" fill="#8d9298"/><path d="M20 16V34M32 12V32M44 16V34" stroke="#5a5f66" stroke-width="2.2" fill="none"/><path d="M12 62Q32 74 52 62" stroke="#5a5f66" stroke-width="2" fill="none"/></g><path d="M16 22Q32 8 48 22" stroke="#c4cad0" stroke-width="2" fill="none" opacity=".5"/>`)}),
 hand:()=>({w:1.1,h:.8,svg:svg('0 0 70 50',`<g ${ST} fill="#8d9298"><rect x="2" y="8" width="38" height="34" rx="10"/><rect x="36" y="6" width="30" height="8" rx="4"/><rect x="38" y="16" width="30" height="8" rx="4"/><rect x="38" y="26" width="30" height="8" rx="4"/><rect x="36" y="36" width="26" height="8" rx="4"/></g><path d="M8 14H34" stroke="#c4cad0" stroke-width="2" opacity=".5"/>`)}),
 anvil:()=>({w:.95,h:.7,svg:svg('0 0 80 56',`<g ${ST}><path d="M2 10H62Q76 10 78 22H60Q56 30 48 30V40H64V52H16V40H32V30Q20 30 16 22H2Z" fill="#555b66"/></g><path d="M6 13H60" stroke="#aeb6c2" stroke-width="2.2" opacity=".8"/><path d="M20 44H60" stroke="#2f343c" stroke-width="2"/>`)}),
 chunk:()=>({w:.92,h:.92,svg:svg('0 0 64 64',`<g ${ST}><path class="chk" d="M6 16L20 4 44 6 58 20 56 46 40 60 16 56 4 38Z"/><path d="M20 4 24 22 6 16M24 22 40 26 58 20M40 26 38 46 56 46M24 22 22 40 4 38M22 40 16 56M38 46 40 60" fill="none" stroke="#3e3830" stroke-width="1.6"/></g><path d="M12 14 24 8 38 10" stroke="#fff" stroke-width="2" opacity=".35" fill="none"/>`)}),
 tomb:()=>({w:1.05,h:1.3,svg:svg('0 0 64 80',`<g ${ST}><path d="M14 8H50Q58 8 58 16V68Q58 76 50 76H14Q6 76 6 68V16Q6 8 14 8Z" fill="#7d8288"/><path d="M32 18V60M22 30H42" stroke="#4a4f55" stroke-width="5" stroke-linecap="round"/></g><path d="M12 14H52" stroke="#c4cad0" stroke-width="2" opacity=".5"/><path d="M10 20V70" stroke="#c4cad0" stroke-width="1.5" opacity=".3"/>`)}),
 shield:()=>({w:.5,h:.5,svg:svg('0 0 40 40',`<g ${ST}><circle cx="20" cy="20" r="18" fill="#6f6a60"/><circle cx="20" cy="20" r="13" fill="none" stroke="#b9b29a" stroke-width="2"/><circle cx="20" cy="20" r="5" fill="#d8d2b8"/></g>`)}),
 web:()=>{const R=[0,1,2,3,4,5,6,7].map(i=>i*Math.PI/4),sp=R.map(a=>`<path d="M0 0L${(48*Math.cos(a)).toFixed(1)} ${(48*Math.sin(a)).toFixed(1)}"/>`).join(''),
  rg=[14,26,38,48].map(r=>`<path d="${R.map((a,k)=>{const q=r*(.92+((k*7)%3)*.04);return(k?'L':'M')+(q*Math.cos(a)).toFixed(1)+' '+(q*Math.sin(a)).toFixed(1)}).join('')}Z"/>`).join('');
  return{w:1.5,h:1.5,svg:svg('-50 -50 100 100',`<g stroke="#f4f4f8" stroke-width="1.4" fill="none" opacity=".95">${sp}${rg}</g>`)}},
 claw:()=>({w:.9,h:.9,svg:svg('0 0 60 60',`<g ${ST}><path d="M10 36Q8 18 24 14T48 18Q56 30 46 44Q36 54 22 52Q12 48 10 36Z" fill="url(#gd)"/><path d="M18 14 14 2 24 12ZM30 11 30 -1 36 11ZM42 14 48 3 48 16Z" fill="#f3ecd6"/></g>`)}),
 gust:()=>({w:.9,h:.9,svg:svg('0 0 60 60',`<path d="M8 12Q40 2 52 30Q40 50 12 50" fill="none" stroke="#e8f4ff" stroke-width="4" stroke-linecap="round" opacity=".9"/><path d="M16 22Q36 16 44 32Q36 42 20 42" fill="none" stroke="#b8d8ff" stroke-width="3" stroke-linecap="round" opacity=".8"/>`)}),
 tornado:()=>({w:.8,h:1.1,svg:svg('0 0 50 70',`<g fill="none">${[[6,22,5,.95],[18,18,4.5,.9],[30,14,4,.85],[42,10.5,3.5,.8],[54,7,3,.75],[64,4,2.5,.7]].map(([cy,rx,ry,o])=>`<ellipse cx="25" cy="${cy}" rx="${rx}" ry="${ry}" stroke="#dbe8f6" stroke-width="2.6" opacity="${o}"/>`).join('')}</g>`)}),
 rune:c=>({w:1.8,h:1.8,svg:svg('-50 -50 100 100',`<g fill="none" stroke="${c}" stroke-width="2.2"><circle r="46"/><circle r="38" stroke-dasharray="3 5"/><path d="M0-46V-38M0 46V38M-46 0H-38M46 0H38M-32-32-27-27M32-32 27-27M-32 32-27 27M32 32 27 27"/><path d="M0-30 8.5-9.3 28.5-9.3 12.4 3.5 18.4 24.3 0 12-18.4 24.3-12.4 3.5-28.5-9.3-8.5-9.3Z" stroke-width="1.6"/></g>`)}),
 limb:()=>({w:1,h:.34,svg:svg('0 0 100 34',`<g ${ST}><rect x="1" y="3" width="98" height="28" rx="12" fill="#7d8288"/></g><path d="M10 11H90" stroke="#c4cad0" stroke-width="2" opacity=".45"/><path d="M30 6V28M62 6V28" stroke="#4a4f55" stroke-width="2"/>`)}),
 crack:()=>({w:2.4,h:2.4,svg:svg('-50 -50 100 100',`<g fill="none" stroke="#1a1410" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M0 0 14-12 30-8 44-22M0 0 -10-20-6-34M0 0-24-8-40-18M0 0-14 18-30 24-38 40M0 0 10 22 8 40M0 0 26 14 44 12"/></g>`)})};
const art=(k,p)=>ART[k](p);

// ---------- arma presa ao ombro: braço + arma giram juntos (ângulos em graus; 0 = leste, 90 = sul) ----------
// o.side: mão (+1 direita / -1 esquerda), o.from: ponto de origem (padrão: posição do atacante), o.sl: cor da manga, o.bare: só a arma (sem braço)
function wield(c,kind,o={}){
 const A=art(kind,o.p||{}),orig=o.from||c.A,side=o.side??(c.dir[0]<0?-1:1),ARM=o.arm??.3;
 const P={x:orig.x+(o.px??1)*side*.26,y:orig.y+(o.oy??.13)};
 const pre=o.bare?'':`<i class="arm" style="left:0;top:${cl(-.065)};width:${cl(ARM)};height:${cl(.13)};background:${o.sl||'#9aa7b6'}"></i><i class="hand" style="left:${cl(ARM-.06)};top:${cl(-.075)};width:${cl(.15)};height:${cl(.15)}"></i>`;
 const e=mk('wp',P.x,P.y,{html:`${pre}<span class="wpn" style="left:${cl(ARM)};top:${cl(-A.h/2)};width:${cl(A.w)};height:${cl(A.h)}">${A.svg}</span>`});
 const w={e,P,a:o.a??c.ang,p:0,s:1,o:{x:0,y:0},len:ARM+A.w,arm:ARM,A};
 e.style.transform=TP(w.a,0,1,w.o);e.style.opacity=0;
 w.set=(a,p=0,s=1,off)=>{w.a=a;w.p=p;w.s=s;if(off)w.o=off;e.style.transform=TP(a,p,s,w.o)};
 w.show=ms=>wa(e,[{opacity:0},{opacity:1}],ms||100);
 // anima por uma lista de estados {a: ângulo, p: avanço, s: escala, o: deslocamento do ombro}
 w.path=(list,ms,ease)=>{const fr=[{transform:TP(w.a,w.p,w.s,w.o),opacity:1}];
  for(const st of list){w.a=st.a??w.a;w.p=st.p??0;w.s=st.s??1;if(st.o)w.o=st.o;fr.push({transform:TP(w.a,w.p,w.s,w.o),opacity:1})}
  return wa(e,fr,ms,{ease})};
 w.rot=(a1,ms,ease,p1=0,s1=1,o1)=>w.path([{a:a1,p:p1,s:s1,o:o1}],ms,ease);
 w.at=(l,a=w.a)=>({x:P.x+w.o.x+Math.cos(rad(a))*l,y:P.y+w.o.y+Math.sin(rad(a))*l}); // ponto a l casas do ombro, na direção a
 w.tip=(a=w.a)=>w.at(ARM+A.w*(A.orb||1),a);                                          // ponta (ou orbe) da arma
 w.out=ms=>wa(e,[{opacity:1},{opacity:0}],ms||150).then(()=>kill(e));
 return w}

// ---------- efeitos de impacto (um por tipo de golpe) ----------
const IFX={
 steel:(x,y,s=1)=>{ring(x,y,'#fff3b0',.7*s,380);burst(x,y,{n:9,col:['#fff','#ffe27a','#ffb347'],r:.8*s,ms:380,sz:.08});glow(x,y,'#ffe27a',s,300);sfx('clang')},
 shadow:(x,y,s=1)=>{ring(x,y,'#d9a0ff',.7*s,380);burst(x,y,{n:9,col:['#fff','#d9a0ff','#8a4bd8'],r:.8*s,ms:380,sz:.08});glow(x,y,'#d9a0ff',s,300);sfx('clang')},
 gob:(x,y,s=1)=>{ring(x,y,'#ff6a4d',.55*s,320);burst(x,y,{n:6,col:['#fff','#ffb08a','#ff6a4d'],r:.6*s,ms:320,sz:.07});sfx('clang')},
 bone:(x,y,s=1)=>{ring(x,y,'#e8e0c4',.7*s,380);burst(x,y,{n:9,col:['#fff','#e8e0c4','#bdb492'],r:.8*s,ms:380,sz:.08});glow(x,y,'#e8e0c4',s,300);sfx('clang')},
 heavy:(x,y,s=1)=>{ring(x,y,'#ffb060',s,520,4);ring(x,y,'#fff3b0',.6*s,380);burst(x,y,{n:12,col:['#ffb060','#fff3b0','#e2401a'],r:1.1*s,ms:480,sz:.1});dust(x,y,5,s);glow(x,y,'#ffb060',1.5*s,380);shake();sfx('thud')},
 claw:(x,y)=>{claws(x,y);burst(x,y,{n:5,col:['#e8eaee','#fff'],r:.5,ms:300,sz:.06});sfx('bite')},
 fang:(x,y,s=1)=>{fangMarks(x,y);ring(x,y,'#8bd650',.5*s,320,2);burst(x,y,{n:5,col:['#8bd650','#d8f7b0'],r:.45*s,ms:340,sz:.07});sfx('bite')},
 whipG:(x,y,s=1)=>{ring(x,y,'#8bd650',.9*s,460,4);burst(x,y,{n:10,col:['#8bd650','#d8f7b0','#fff'],r:s,ms:440,sz:.09});dust(x,y,3,s);glow(x,y,'#8bd650',1.2*s,320);shake();sfx('thud')},
 fire:(x,y,s=1)=>{glow(x,y,'#ff7a2e',1.6*s,500);ring(x,y,'#ffb347',.8*s,480);burst(x,y,{n:12,col:['#ffd23f','#ff7a2e','#e2401a'],r:s,ms:500,sz:.12});sfx('fire')},
 fireP:(x,y,s=1)=>{glow(x,y,'#c77dff',2.2*s,620);ring(x,y,'#e0b0ff',s,560,4);ring(x,y,'#8a3bd8',.7*s,420);burst(x,y,{n:20,col:['#fff','#e0b0ff','#b05bff','#6a1fb8'],r:1.4*s,ms:620,sz:.13});shake();sfx('fire');sfx('boom')},
 dark:(x,y,s=1)=>{glow(x,y,'#a24bd8',1.5*s,480);ring(x,y,'#8a3bd8',.8*s,460);burst(x,y,{n:12,col:['#1a0a24','#6b2b82','#c77dff'],r:s,ms:480,sz:.12});sfx('fire')},
 darkBig:(x,y,s=1)=>{glow(x,y,'#7a2bb8',2.2*s,640);ring(x,y,'#a24bd8',1.1*s,560,4);ring(x,y,'#1a0a24',.7*s,420,5);burst(x,y,{n:20,col:['#0e0614','#4a1a62','#a24bd8','#e0b0ff'],r:1.4*s,ms:640,sz:.14});shake();sfx('boom')},
 wind:(x,y,s=1)=>{ring(x,y,'#e8f4ff',.7*s,420,2);burst(x,y,{n:8,col:['#fff','#cfe6ff'],r:.8*s,ms:420,sz:.07,g:-.1});sfx('whoosh')},
 windBig:(x,y,s=1)=>{ring(x,y,'#e8f4ff',s,520,3);ring(x,y,'#b8d8ff',.6*s,420,2);burst(x,y,{n:16,col:['#fff','#cfe6ff','#9ec4ee'],r:1.3*s,ms:520,sz:.08,g:-.15});dust(x,y,4,s);shake();sfx('whoosh')},
 holy:(x,y,s=1)=>{glow(x,y,'#fff2a0',1.7*s,520);ring(x,y,'#fff2a0',.9*s,500,3);burst(x,y,{n:12,col:['#fff','#fff2a0','#ffd23f'],r:s,ms:520,sz:.09,g:-.3});sfx('chime')},
 holyBig:(x,y,s=1)=>{glow(x,y,'#fff8c0',2.6*s,640);ring(x,y,'#fff2a0',1.2*s,600,4);ring(x,y,'#ffd23f',.7*s,440,3);burst(x,y,{n:20,col:['#fff','#fff2a0','#ffd23f'],r:1.5*s,ms:620,sz:.1,g:-.4});shake();sfx('chime');sfx('boom')},
 arrow:(x,y,s=1,c='#fff3b0')=>{burst(x,y,{n:6,col:['#fff',c],r:.5*s,ms:300,sz:.07});ring(x,y,c,.45*s,300,2);sfx('thud')},
 arrowG:(x,y,s=1)=>IFX.arrow(x,y,s,'#7dff9a'),
 rock:(x,y,s=1)=>{burst(x,y,{n:14,col:['#8d8478','#6c665c','#c4beb0','#4a4540'],r:1.2*s,ms:620,sz:.12,sq:1,g:.35});dust(x,y,7,1.2*s);ring(x,y,'#c4beb0',1.1*s,560,4);shake();sfx('stone')},
 anvil:(x,y,s=1)=>{IFX.rock(x,y,1.3*s);burst(x,y,{n:12,col:['#fff','#ffe27a','#ffb347'],r:1.3,ms:480,sz:.08});ring(x,y,'#fff3b0',1.4,520,4);glow(x,y,'#ffe27a',2,420);sfx('clang')},
 stomp:(x,y,s=1)=>{IFX.rock(x,y,1.2*s);ring(x,y,'#e8dcc0',1.6*s,700,5,3.4);ring(x,y,'#c4beb0',s,520,3,3)}};
const ifx=(k,x,y,s=1)=>{try{(IFX[k]||IFX.steel)(x,y,s)}catch(e){console.error(e)}};
const whiff=(x,y)=>burst(x,y,{n:4,col:['#e6e0d0','#bdb6a4'],r:.35,ms:260,sz:.06});

// ---------- contexto de uma animação de ataque ----------
function ctx(out,v){
 const a=out.a,t=out.t,A={x:a.x,y:a.y},Tg={x:t.x,y:t.y},ang=angOf(A,Tg);
 const c={a,t,out,v,A,Tg,ang,dir:vecOf(ang),d:dist(a,t),hit:out.hit,ua:uel(a),ut:uel(t),bs:null};
 c.pt=f=>({x:A.x+c.dir[0]*f,y:A.y+c.dir[1]*f});                       // ponto a f casas do atacante, na direção do alvo
 c.sd=()=>Math.random()<.5?-1:1;                                         // lado aleatório (para erros)
 // impacto sincronizado: mostra o efeito e aplica a resolução calculada em game.js (dano ou erro) uma única vez
 c.land=async(kind,o={})=>{const p=o.at||Tg,s=o.s||1;
  if(c.hit)ifx(kind,p.x,p.y,s);else whiff(p.x,p.y);
  out.apply();await sleep(o.wait??140)};
 c.spark=(kind,p=Tg,s=1)=>ifx(kind,p.x,p.y,s);                         // só visual (golpes intermediários de um crítico)
 return c}
// ponto onde um projétil que ERRA termina: ao lado do alvo, parando antes de parede, obstáculo ou qualquer unidade
function missPoint(c,sg,ext=1.2){
 const dv=Math.max(14,deg(Math.atan(.8/Math.max(1,c.d)))+3)*sg,a=c.ang+dv,L=Math.max(1,rayLen(c.A,a,c.d+ext,c.t)),v=vecOf(a);
 return{x:c.A.x+v[0]*L,y:c.A.y+v[1]*L,a}}
// flecha cravada no chão: balança um pouco e some
async function stick(e,ms=520){const p=e._p||{dx:0,dy:0,r:0,s:1};
 await wa(e,[{transform:T(p.dx,p.dy,p.r,p.s)},{transform:T(p.dx,p.dy,p.r+7,p.s),offset:.2},{transform:T(p.dx,p.dy,p.r-5,p.s),offset:.45},{transform:T(p.dx,p.dy,p.r+2,p.s),offset:.7},{transform:T(p.dx,p.dy,p.r,p.s),opacity:1}],240);
 await wa(e,[{opacity:1},{opacity:0}],ms-240);kill(e)}

const SEQ={};
const SPECIAL={aranha:'Teia e Mordida',goblin:'Ataque Acrobático',morcego:'Mini Tornado',esqueleto:'Investida com Escudo',lobo:'Sequência de Garras',cultista:'Esfera de Fogo Sombrio',orc:'Invocação de Goblins',
 'naja:cauda':'Golpe de Cauda',naja:'Golpe de Cauda','golem:dist':'Bigorna de Pedra','golem:mel':'Pisada Esmagadora',dragao:'Baforada Ampliada'};

// ponto de entrada: escolhe a sequência (normal, crítico 20 ou falha 1) e garante que o dano seja aplicado uma só vez
async function play(out){
 const a=out.a,mode=out.fumble?'F':out.nat20?'C':'N',key=a.pl?a.k:out.v?a.k+':'+out.v:a.k;
 const S=SEQ[key]||SEQ[a.k];let fn=S&&S[mode];
 if(!fn){console.warn('animação ausente:',key,mode);fn=async c=>{if(mode==='F')await sleep(300);else await c.land('steel')}}
 if(mode==='C'&&!a.pl){const n=SPECIAL[key]||SPECIAL[a.k];if(n){pop(a,n+'!','crit');say(`${nm(a)} usa ${n}!`,'crit')}}
 await scene(async()=>{const c=ctx(out,out.v);
  try{await fn(c)}catch(e){console.error('animação',key,mode,e)}
  if(mode!=='F'&&!out.done)out.apply()})}   // rede de segurança: a resolução nunca se perde

// ---------- auxiliares dos personagens ----------
// luz que cai do céu até (x,y)
function column(x,y,o={}){
 const h=o.h||6.5,e=mk('col',x,y,{self:(o.ms||360)+(o.hold||360)+200,css:{width:cl(o.w||.95),height:cl(h),background:`linear-gradient(transparent,${o.c1||'#fff7c2cc'} 45%,#fff)`}});
 const b='translate(-50%,-100%)';e.style.transform=b;e.style.clipPath='inset(0 0 100% 0)';
 return wa(e,[{clipPath:'inset(0 0 100% 0)',opacity:1,transform:b+' scaleX(.6)'},{clipPath:'inset(0 0 0 0)',opacity:1,transform:b+' scaleX(1)',offset:.35},{clipPath:'inset(0 0 0 0)',opacity:.95,transform:b+' scaleX(1.1)',offset:.75},{clipPath:'inset(0 0 0 0)',opacity:0,transform:b+' scaleX(1.5)'}],(o.ms||360)+(o.hold||360),{ease:'ease-out'}).then(()=>kill(e))}
// clarão colorido na tela inteira (escurece ou ilumina brevemente)
function tint(css,ms=600,a=1){
 const e=document.createElement('div');e.className='fz tint';e.style.background=css;document.body.append(e);live.add(e);
 wa(e,[{opacity:0},{opacity:a,offset:.3},{opacity:0}],ms).then(()=>kill(e))}
// postura de ataque comum do corpo
const lean=(c,d=.12,s=1.03,r=0)=>({x:-c.dir[0]*d,y:-c.dir[1]*d,s,r});
const step=(c,d=.3,s=1.1)=>({x:c.dir[0]*d,y:c.dir[1]*d,s});

// arco e flecha(s)
function bowUp(c,fl,n=1){
 const B0=art('bow'),P=c.pt(.5),b=mk('bw',P.x,P.y,{w:B0.w,h:B0.h,html:B0.svg});b.style.transform=T(0,0,c.ang);b.style.opacity=0;
 const n0=c.pt(.88),sp=n>1?[-7,0,7]:[0],arrows=[];
 for(let i=0;i<n;i++){const A0=art('arrow',{f:fl}),e=mk('ar',n0.x,n0.y,{w:A0.w,h:A0.h,html:A0.svg}),r=c.ang+sp[i];e.style.transform=T(0,0,r);e.style.opacity=0;arrows.push({e,r})}
 return{b,P,n0,arrows,s0:b.querySelector('.s0'),s1:b.querySelector('.s1')}}
async function draw(c,K,ms){
 await Promise.all([wa(K.b,[{opacity:0,transform:T(0,0,c.ang,.6)},{opacity:1,transform:T(0,0,c.ang,1)}],160),...K.arrows.map(a=>wa(a.e,[{opacity:0},{opacity:1}],160)),body(c,{x:-c.dir[0]*.06,y:-c.dir[1]*.06},160)]);
 wa(K.s1,[{opacity:0},{opacity:1}],ms);wa(K.s0,[{opacity:1},{opacity:0}],ms);sfx('bow');
 await Promise.all([...K.arrows.map(a=>wa(a.e,[{transform:T(0,0,a.r)},{transform:T(-.18*c.dir[0],-.18*c.dir[1],a.r)}],ms,{ease:'ease-in-out'})),body(c,{x:-c.dir[0]*.12,y:-c.dir[1]*.12,s:1.03},ms,'ease-in-out')])}
function release(c,K){
 wa(K.s1,[{opacity:1},{opacity:0}],70);wa(K.s0,[{opacity:0},{opacity:1}],70);body(c,{x:0,y:0},140);
 wa(K.b,[{transform:T(0,0,c.ang)},{transform:T(-.05*c.dir[0],-.05*c.dir[1],c.ang+3),offset:.4},{transform:T(0,0,c.ang)}],170);
 return{x:K.n0.x-.18*c.dir[0],y:K.n0.y-.18*c.dir[1]}}      // onde a flecha estava ao ser solta
const bowDown=(c,K)=>Promise.all([wa(K.b,[{opacity:1},{opacity:0}],180).then(()=>kill(K.b)),body(c,{},180)]);

// ========================= GUERREIRO =========================
SEQ.guerreiro={
 N:async c=>{
  const w=wield(c,'sword',{sl:'#9aa7b6'}),A=c.ang,[dx,dy]=c.dir;w.set(A-100);
  await Promise.all([w.show(110),body(c,lean(c),150)]);                                  // prepara: recua e ergue a espada
  sfx('swish');
  const sw=w.rot(A+55,190,'cubic-bezier(.55,0,.9,.55)'),mv=body(c,step(c,.3,1.1),170,'ease-in');
  arc(w.P.x,w.P.y,.95,A-70,A+50,{col:'#fff3b0',w:8,ms:170,hold:160,delay:30});          // rastro da lâmina
  await sleep(120);await c.land('steel');                                               // a lâmina chega ao alvo
  await Promise.all([sw,mv]);
  await Promise.all([w.rot(A+20,140),body(c,{},220),sleep(60).then(()=>w.out(160))])},   // recuperação
 C:async c=>{                                                                            // CORTE CRUZADO: dois cortes formam um X sobre o alvo
  const w=wield(c,'sword',{sl:'#9aa7b6'}),A=c.ang,T0=c.Tg;w.set(A-110);
  await Promise.all([w.show(110),body(c,lean(c,.16,1.05),200)]);
  glow(c.A.x,c.A.y,'#fff3b0',1.6,300);sfx('chime');sfx('swish');
  const s1=w.rot(A+30,150,'cubic-bezier(.5,0,.9,.5)'),m1=body(c,step(c,.4,1.12),150,'ease-in');
  arc(w.P.x,w.P.y,1,A-80,A+30,{col:'#fff3b0',w:9,ms:150,hold:200});
  await sleep(100);cut(T0.x,T0.y,45,{col:'#fff3b0',len:1.8,th:7,ms:320});c.spark('steel');
  await Promise.all([s1,m1]);
  await w.rot(A+115,110,'ease-in-out');sfx('swish');                                     // volta o braço para o corte oposto
  const s2=w.rot(A-35,150,'cubic-bezier(.5,0,.9,.5)');
  arc(w.P.x,w.P.y,1,A+100,A-35,{col:'#ffffff',w:9,ms:150,hold:200});
  await sleep(100);cut(T0.x,T0.y,-45,{col:'#ffe27a',len:1.8,th:7,ms:320});
  await c.land('steel',{s:1.4,wait:60});glow(T0.x,T0.y,'#fff',2,420);
  await s2;await sleep(160);
  await Promise.all([w.rot(A+10,150),body(c,{},240),sleep(60).then(()=>w.out(160))])},
 F:async c=>{                                                                            // o corte passa ao lado e roça o chão
  const w=wield(c,'sword',{sl:'#9aa7b6'}),A=c.ang,[dx,dy]=c.dir,sg=c.sd();w.set(A-100*sg);
  await Promise.all([w.show(110),body(c,lean(c),150)]);
  sfx('swish');
  const sw=w.rot(A-50*sg,200,'cubic-bezier(.55,0,.9,.55)'),mv=body(c,{x:dx*.18,y:dy*.18,r:9*sg,s:1.06},190,'ease-in');
  arc(w.P.x,w.P.y,.95,A-110*sg,A-50*sg,{col:'#d8d8d8',w:6,ms:190,hold:160,delay:30});
  await Promise.all([sw,mv]);
  const q=w.at(1.15,w.a);dust(q.x,q.y,3,.5,420);sfx('thud');
  await body(c,[{x:dx*.1,y:dy*.1,r:-6*sg},{x:0,y:0,r:3*sg},{}],360);
  await w.out(160)}};

// ========================= MAGO =========================
SEQ.mago={
 N:async c=>{
  const P=c.pt(.5),o=orb(P.x,P.y,{size:.5,c1:'#fff3b0',c2:'#ff7a2e'});o.style.opacity=0;
  const up=body(c,[{y:-.1,s:1.06,r:-5},{y:-.18,s:1.14,r:-8}],320);
  gather(P.x,P.y,{n:8,col:['#ffd23f','#ff7a2e'],r:.7,ms:320});
  await Promise.all([wa(o,[{transform:T(0,0,0,.15),opacity:.9},{transform:T(0,0,0,1),opacity:1}],320),up]);   // a bola de fogo cresce ao lado do mago
  sfx('fire');
  await Promise.all([fly(o,P,c.Tg,170+c.d*55,{trail:{col:['#ffd23f','#ff7a2e','#e2401a'],sz:.15,n:2}}),body(c,{y:-.05,s:1},200)]);
  kill(o);await c.land('fire');await body(c,{},180)},
 C:async c=>{                                                                            // BOLA DE FOGO ROXA: maior, com runas e impacto chamativo
  const P=c.pt(.55),o=orb(P.x,P.y,{size:.95,c1:'#ffffff',c2:'#9b3fe0'});o.style.opacity=0;
  const R=art('rune','#c77dff'),rune=mk('rune',c.A.x,c.A.y,{w:R.w,html:R.svg});rune.style.opacity=0;
  const up=body(c,[{y:-.12,s:1.08},{y:-.24,s:1.2,r:-6}],520);
  wa(rune,[{transform:T(0,0,0,.3),opacity:0},{transform:T(0,0,200,1),opacity:.95}],600);
  gather(P.x,P.y,{n:14,col:['#e0b0ff','#b05bff','#fff'],r:1,ms:520});sfx('chime');
  await Promise.all([wa(o,[{transform:T(0,0,0,.1),opacity:.9},{transform:T(0,0,0,1),opacity:1}],520),up]);
  shake();sfx('fire');
  await fly(o,P,c.Tg,230+c.d*60,{trail:{col:['#e0b0ff','#b05bff','#6a1fb8'],sz:.2,n:3}});
  kill(o);await c.land('fireP');
  wa(rune,[{opacity:.95},{opacity:0}],260).then(()=>kill(rune));await body(c,{},220)},
 F:async c=>{                                                                            // a esfera se desfaz em partículas antes do alvo
  const P=c.pt(.5),o=orb(P.x,P.y,{size:.5,c1:'#fff3b0',c2:'#ff7a2e'});o.style.opacity=0;
  const up=body(c,[{y:-.1,s:1.06,r:-5},{y:-.16,s:1.12,r:-8}],320);gather(P.x,P.y,{n:8,col:['#ffd23f','#ff7a2e'],r:.7,ms:320});
  await Promise.all([wa(o,[{transform:T(0,0,0,.15),opacity:.9},{transform:T(0,0,0,1),opacity:1}],320),up]);
  const L=Math.max(.9,Math.min(c.d*.55+.3,rayLen(c.A,c.ang,c.d*.55+.3,c.t)-.2)),D=c.pt(L);
  sfx('fire');
  await fly(o,P,D,150+c.d*30,{trail:{col:['#ffd23f','#ff7a2e'],sz:.12,n:2},sc:[1,.35]});
  kill(o);burst(D.x,D.y,{n:16,col:['#ffd23f','#ff7a2e','#8a8a90','#444'],r:.9,ms:600,sz:.1,g:-.15});smoke(D.x,D.y,3,.6,640);sfx('zap');
  await body(c,[{x:-c.dir[0]*.06,y:-c.dir[1]*.06,r:-6},{r:6},{r:-3},{}],420)}};

// ========================= ARQUEIRO =========================
SEQ.arqueiro={
 N:async c=>{
  const K=bowUp(c,'#e8e0c0',1);await draw(c,K,240);                                       // posiciona o arco, encaixa a flecha e puxa a corda
  const st=release(c,K),a0=K.arrows[0],ms=Math.min(520,140+c.d*45);
  place(a0.e,st.x,st.y);a0.e.style.transform=T(0,0,c.ang);
  if(c.hit){await fly(a0.e,st,{x:c.Tg.x-c.dir[0]*.15,y:c.Tg.y-c.dir[1]*.15},ms,{rot:'dir',trail:{col:'#fff',sz:.06,n:1,ms:220}});kill(a0.e);await c.land('arrow')}
  else{const M=missPoint(c,c.sd());await Promise.all([fly(a0.e,st,M,ms,{rot:'dir',trail:{col:'#fff',sz:.06,n:1,ms:220}}),sleep(ms*.8).then(()=>c.land('arrow',{wait:0}))]);await stick(a0.e)}
  await bowDown(c,K)},
 C:async c=>{                                                                            // DISPARO TRIPLO: três flechas verdes, um único dano
  const K=bowUp(c,'#7dff9a',3);glow(K.P.x,K.P.y,'#7dff9a',1.5,520);
  await draw(c,K,340);const st=release(c,K);sfx('bow');
  const ms=Math.min(560,160+c.d*48),pp=[-c.dir[1],c.dir[0]],E={x:c.Tg.x-c.dir[0]*.15,y:c.Tg.y-c.dir[1]*.15};
  await Promise.all(K.arrows.map((a,i)=>{place(a.e,st.x,st.y);a.e.style.transform=T(0,0,a.r);const amp=[.42,0,-.42][i];
   return sleep(i*70).then(()=>fly(a.e,st,E,ms,{rot:'dir',sx:p=>pp[0]*amp*Math.sin(Math.PI*p),sy:p=>pp[1]*amp*Math.sin(Math.PI*p),trail:{col:['#7dff9a','#fff'],sz:.09,n:1,ms:260}}))
    .then(()=>{kill(a.e);if(i<2)c.spark('arrowG',c.Tg,1)})}));
  await c.land('arrowG',{s:1.7});await bowDown(c,K)},
 F:async c=>{                                                                            // a flecha erra e fica cravada no chão/obstáculo
  const K=bowUp(c,'#e8e0c0',1);await draw(c,K,240);
  const st=release(c,K),a0=K.arrows[0],ms=Math.min(560,160+c.d*48);
  place(a0.e,st.x,st.y);a0.e.style.transform=T(0,0,c.ang);
  const M=missPoint(c,c.sd(),2.4);await fly(a0.e,st,M,ms,{rot:'dir',trail:{col:'#fff',sz:.06,n:1,ms:220}});
  whiff(M.x,M.y);sfx('thud');await Promise.all([stick(a0.e,620),bowDown(c,K)])}};

// ========================= BÁRBARO =========================
SEQ.barbaro={
 N:async c=>{
  const w=wield(c,'axe',{sl:'#7a5230'}),A=c.ang,[dx,dy]=c.dir;w.set(A-140);
  await Promise.all([w.show(120),body(c,{x:-dx*.16,y:-dy*.16,s:1.05,r:-dx*4},280,'ease-in-out'),w.rot(A-165,280,'ease-in-out')]);   // ergue o machado, o corpo recua
  sfx('whoosh');
  const sw=w.rot(A+25,190,'cubic-bezier(.6,0,.9,.5)'),mv=body(c,step(c,.34,1.14),190,'ease-in');
  arc(w.P.x,w.P.y,1.05,A-110,A+20,{col:'#ffb060',w:10,ms:190,hold:220,delay:40});
  await sleep(150);await c.land('heavy');await Promise.all([sw,mv]);
  await sleep(120);                                                                      // o machado é pesado: demora a voltar
  await Promise.all([w.rot(A-20,200,'ease-in-out'),body(c,{},260,'ease-in-out'),sleep(100).then(()=>w.out(180))])},
 C:async c=>{                                                                            // ATAQUE GIRATÓRIO
  const w=wield(c,'axe',{sl:'#7a5230',px:0,oy:.05}),A=c.ang;w.set(A-700);
  await Promise.all([w.show(120),body(c,{s:1.1,y:.05,sy:.93},260,'ease-in-out')]);
  sfx('whoosh');ring(c.A.x,c.A.y,'#ffb060',.9,520,3);gather(c.A.x,c.A.y,{n:10,col:['#ffb060','#fff3b0'],r:1.1,ms:300});
  const sp=w.rot(A+20,880,'cubic-bezier(.35,.05,.25,1)'),bs=body(c,{r:720,s:1.12},880,'cubic-bezier(.35,.05,.25,1)');
  arc(c.A.x,c.A.y,1.08,A-90,A+270,{col:'#ffb060',w:10,ms:430,hold:260});arc(c.A.x,c.A.y,.95,A+90,A+450,{col:'#fff3b0',w:7,ms:430,hold:260,delay:400});
  await sleep(400);c.spark('steel',c.Tg,.9);sfx('swish');                                // primeira passada do machado
  await sleep(390);await c.land('heavy',{s:1.35,wait:40});await Promise.all([sp,bs]);    // segunda passada: o golpe que causa o dano
  // pose de impacto + efeito de força ao redor do bárbaro
  ring(c.A.x,c.A.y,'#ffb060',1.4,620,5,3.2);ring(c.A.x,c.A.y,'#fff3b0',.9,460,3,2.6);burst(c.A.x,c.A.y,{n:14,col:['#ffb060','#fff3b0','#e2401a'],r:1.4,ms:520,sz:.1});dust(c.A.x,c.A.y,4,1);shake();sfx('thud');
  await body(c,[{s:1.22,y:.06,sy:1.04},{s:1.22,y:.06,sy:1.04},{}],520);await w.out(160)},
 F:async c=>{                                                                            // golpe amplo: erra a trajetória e recupera a postura
  const w=wield(c,'axe',{sl:'#7a5230'}),A=c.ang,[dx,dy]=c.dir,sg=c.sd();w.set(A-140*sg);
  await Promise.all([w.show(120),body(c,{x:-dx*.16,y:-dy*.16,s:1.05},280,'ease-in-out'),w.rot(A-165*sg,280,'ease-in-out')]);
  sfx('whoosh');
  const sw=w.rot(A-58*sg,200,'cubic-bezier(.6,0,.9,.5)'),mv=body(c,{x:dx*.2,y:dy*.2,r:16*sg,s:1.1},200,'ease-in');
  arc(w.P.x,w.P.y,1.05,A-125*sg,A-58*sg,{col:'#d8d8d8',w:8,ms:200,hold:200,delay:40});
  await Promise.all([sw,mv]);const q=w.at(1.2,w.a);dust(q.x,q.y,4,.7,480);sfx('thud');   // o machado cai no chão ao lado do alvo
  await body(c,[{x:dx*.12,y:dy*.12,r:22*sg},{x:dx*.05,y:dy*.05,r:-8*sg},{r:4*sg},{}],520,'ease-in-out');await w.out(160)}};

// ========================= CLÉRIGO (ataque com o cajado + roubo de vida) =========================
const clericBase=async c=>{
 const w=wield(c,'staff',{sl:'#e8dfc4'}),A=c.ang;w.set(A-70);
 await Promise.all([w.show(120),body(c,{y:-.1,s:1.07},240)]);await w.rot(A,200,'ease-in-out');   // ergue o cajado e aponta para o inimigo
 const tip=w.tip(A);glow(tip.x,tip.y,'#fff2a0',.9,420);gather(tip.x,tip.y,{n:8,col:['#fff2a0','#fff'],r:.5,ms:300});sfx('chime');
 await sleep(200);return{w,tip}};
const clericEnd=(c,w)=>Promise.all([w.out(180),body(c,{},200)]);
SEQ.clerigo={
 N:async c=>{
  const{w,tip}=await clericBase(c);
  if(c.hit){beam(tip,c.Tg,{col:'#fff2a0',ms:240,th:.14,hold:260});await sleep(150);await c.land('holy');await drain(c)}
  else{const M=missPoint(c,c.sd(),.6);beam(tip,M,{col:'#fff2a0',ms:240,th:.14,hold:200});await sleep(150);await c.land('holy',{wait:60})}
  await clericEnd(c,w)},
 C:async c=>{                                                                            // GOLPE CELESTIAL: luz vinda de cima + energia roubada
  const w=wield(c,'staff',{sl:'#e8dfc4'}),A=c.ang;w.set(A-70);
  await Promise.all([w.show(120),body(c,{y:-.14,s:1.12},300)]);await w.rot(-90,300,'ease-in-out');      // ergue o cajado para o céu
  const tip=w.tip(-90);glow(tip.x,tip.y,'#fff2a0',1.3,520);gather(tip.x,tip.y,{n:12,col:['#fff2a0','#fff','#ffd23f'],r:.8,ms:420});sfx('chime');
  tint('radial-gradient(ellipse at center,transparent 38%,#000b)',900,.8);await sleep(380);
  const R=art('rune','#fff2a0'),rune=mk('rune',c.Tg.x,c.Tg.y,{w:2.1,html:R.svg});rune.style.opacity=0;
  wa(rune,[{transform:T(0,0,0,.3),opacity:0},{transform:T(0,0,160,1),opacity:.9}],520);
  column(c.Tg.x,c.Tg.y,{h:7,w:1.1,ms:380,hold:420});sfx('whoosh');await sleep(300);        // o feixe desce até o inimigo
  await c.land('holyBig',{wait:60});wa(rune,[{opacity:.9},{opacity:0}],320).then(()=>kill(rune));
  await drain(c);await clericEnd(c,w)},
 F:async c=>{                                                                            // a magia se dissipa antes de atingir o alvo
  const{w,tip}=await clericBase(c),Q=c.pt(Math.max(.6,Math.min(c.d*.55,rayLen(c.A,c.ang,c.d*.55,c.t)-.25)));
  beam(tip,Q,{col:'#fff2a0',ms:200,th:.14,hold:120});await sleep(200);
  burst(Q.x,Q.y,{n:14,col:['#fff2a0','#fff','#c9a13b'],r:.8,ms:560,sz:.08,g:-.1});smoke(Q.x,Q.y,2,.5,520);sfx('zap');
  glow(tip.x,tip.y,'#fff2a0',.6,300,.6);
  await body(c,[{y:-.06,r:5},{y:-.1,r:-5},{}],360);await clericEnd(c,w)}};

// ========================= LADINO =========================
const roguePair=(c,from,a0)=>{
 const o={from,sl:'#3a2c4d',p:{bl:'#e0d4f0',gd:'#b06be0'}},dR=wield(c,'dagger',{...o,side:1,a:a0-30}),dL=wield(c,'dagger',{...o,side:-1,a:a0+30});
 dR.set(a0-30);dL.set(a0+30);return[dR,dL]};
SEQ.ladino={
 N:async c=>{
  const A=c.ang,[dx,dy]=c.dir,[dR,dL]=roguePair(c,c.A,A);
  await Promise.all([dR.show(80),dL.show(80),body(c,lean(c,.08,1.02),110)]);
  sfx('swish');
  const mv=body(c,step(c,.24,1.06),220,'ease-in-out');
  const j1=dR.rot(A-6,90,'ease-in',.38);cut(c.Tg.x-.1,c.Tg.y-.08,A+25,{col:'#d9a0ff',len:.9,th:4,ms:200});c.spark('shadow',{x:c.Tg.x-.1,y:c.Tg.y},.6);   // golpes curtos e rápidos
  await j1;await dR.rot(A-30,60);sfx('swish');
  const j2=dL.rot(A+6,90,'ease-in',.38);cut(c.Tg.x+.1,c.Tg.y+.08,A-25,{col:'#d9a0ff',len:.9,th:4,ms:200});
  await sleep(60);await c.land('shadow',{wait:60});await j2;
  await Promise.all([dL.rot(A+30,100),mv,sleep(40).then(()=>Promise.all([dR.out(140),dL.out(140)])),body(c,{},200)])},
 C:async c=>{                                                                            // CORTE EM X PELAS COSTAS
  const A=c.ang,[dx,dy]=c.dir,bx=c.Tg.x+dx,by=c.Tg.y+dy,B0={x:bx,y:by},T0=c.Tg;
  if(free(bx,by)){                                                                        // há espaço atrás do alvo: salta por cima dele
   const g=ghost(c.a);smoke(c.A.x,c.A.y,4,.7,420);sfx('whoosh');
   beam(c.A,B0,{col:'#d9a0ff',th:.1,ms:200,hold:240});afterimage(c.a,c.A.x+dx*.8,c.A.y+dy*.8,320);
   await wa(g,[{transform:T(0,0)},{transform:T(dx,dy-.55,0,1.06),offset:.5},{transform:T(dx*2,dy*2)}],280,{ease:'ease-in-out'});
   smoke(bx,by,3,.6,420);
   const A2=A+180,[dR,dL]=roguePair(c,B0,A2);
   await Promise.all([dR.show(70),dL.show(70)]);sfx('swish');
   const s1=dR.rot(A2+25,100,'ease-in',.3);cut(T0.x,T0.y,45,{col:'#d9a0ff',len:1.7,th:6,ms:300});c.spark('shadow',T0,.8);await s1;   // corte 1
   sfx('swish');const s2=dL.rot(A2-25,100,'ease-in',.3);cut(T0.x,T0.y,-45,{col:'#ffffff',len:1.7,th:6,ms:300});await sleep(70);   // corte 2: forma o X
   await c.land('shadow',{s:1.4,wait:60});glow(T0.x,T0.y,'#d9a0ff',2,420);await s2;
   await Promise.all([dR.out(120),dL.out(120)]);
   await wa(g,[{transform:T(0,0)},{transform:T(-dx,-dy-.55,0,1.06),offset:.5},{transform:T(-dx*2,-dy*2)}],260,{ease:'ease-in-out'});   // volta ao lugar previsto
   smoke(c.A.x,c.A.y,3,.6,400);kill(g)}
  else{                                                                                   // sem espaço atrás: animação alternativa, em arco pela frente
   const[dR,dL]=roguePair(c,c.A,A);await Promise.all([dR.show(70),dL.show(70),body(c,lean(c,.1,1.02),120)]);
   afterimage(c.a,c.A.x+dx*.2,c.A.y+dy*.2,300);sfx('swish');
   const mv=body(c,step(c,.42,1.1),180,'ease-in');
   const s1=dR.rot(A+25,100,'ease-in',.4);cut(T0.x,T0.y,45,{col:'#d9a0ff',len:1.7,th:6,ms:300});c.spark('shadow',T0,.8);await s1;
   sfx('swish');const s2=dL.rot(A-25,100,'ease-in',.4);cut(T0.x,T0.y,-45,{col:'#ffffff',len:1.7,th:6,ms:300});await sleep(70);
   await c.land('shadow',{s:1.4,wait:60});glow(T0.x,T0.y,'#d9a0ff',2,420);await Promise.all([s2,mv]);
   await Promise.all([dR.out(120),dL.out(120),body(c,{},220)])}},
 F:async c=>{                                                                            // os cortes passam ao lado do inimigo
  const A=c.ang,[dx,dy]=c.dir,sg=c.sd(),[dR,dL]=roguePair(c,c.A,A);
  await Promise.all([dR.show(80),dL.show(80),body(c,lean(c,.08,1.02),110)]);sfx('swish');
  const mv=body(c,{x:dx*.2,y:dy*.2,r:8*sg,s:1.05},220,'ease-in-out');
  const j1=dR.rot(A+58*sg,90,'ease-in',.34);arc(dR.P.x,dR.P.y,.8,A-10*sg,A+58*sg,{col:'#bbbbbb',w:4,ms:90,hold:140});await j1;await dR.rot(A-30*sg,60);sfx('swish');
  const j2=dL.rot(A+72*sg,90,'ease-in',.34);arc(dL.P.x,dL.P.y,.8,A+20*sg,A+72*sg,{col:'#bbbbbb',w:4,ms:90,hold:140});await j2;
  await body(c,[{x:dx*.12,y:dy*.12,r:-8*sg},{x:0,y:0,r:3*sg},{}],380);await Promise.all([dR.out(140),dL.out(140)])}};

// ========================= LOBO (garras das patas dianteiras) =========================
SEQ.lobo={
 N:async c=>{
  const w=wield(c,'paw',{sl:'#8d9097',px:.8}),A=c.ang,[dx,dy]=c.dir;w.set(A-70);
  await Promise.all([w.show(100),body(c,{x:-dx*.1,y:-dy*.1+.06,s:1.04,sy:.9},200,'ease-in-out')]);   // agacha e prepara o bote
  sfx('swish');
  const sw=w.rot(A+55,130,'cubic-bezier(.5,0,.9,.5)',.15),mv=body(c,{x:dx*.3,y:dy*.3,s:1.08,sy:1},130,'ease-in');
  arc(w.P.x,w.P.y,.7,A-60,A+50,{col:'#e8eaee',w:5,ms:130,hold:140});
  await sleep(95);await c.land('claw');await Promise.all([sw,mv]);
  await Promise.all([w.out(150),body(c,{},200)])},
 C:async c=>{                                                                           // SEQUÊNCIA DE ARRANHÕES (uma única ação crítica)
  const A=c.ang,[dx,dy]=c.dir,wR=wield(c,'paw',{side:1,sl:'#8d9097',px:.8}),wL=wield(c,'paw',{side:-1,sl:'#8d9097',px:.8});
  wR.set(A-70);wL.set(A+70);
  await Promise.all([wR.show(100),wL.show(100),body(c,{x:-dx*.12,y:-dy*.12+.06,s:1.04,sy:.88},240,'ease-in-out')]);
  sfx('whoosh');afterimage(c.a,c.A.x+dx*.25,c.A.y+dy*.25,300);
  await body(c,step(c,.42,1.1),150,'ease-in');                                            // avança
  const sw=[[wR,A-55,A+50],[wL,A+55,A-50],[wR,A-60,A+60],[wL,A+60,A-60]];
  for(let i=0;i<4;i++){const[w,a0,a1]=sw[i];w.set(a0);sfx('swish');                      // cada arranhão tem a sua animação de garra
   const s=w.rot(a1,90,'cubic-bezier(.5,0,.9,.5)',.15);arc(w.P.x,w.P.y,.75,a0,a1,{col:'#fff',w:5,ms:90,hold:130});
   await sleep(60);if(i<3)c.spark('claw');else await c.land('claw',{s:1.2,wait:40});await s}
  await Promise.all([wR.out(150),wL.out(150),body(c,{},240)])},
 F:async c=>{                                                                           // erra a trajetória das patas
  const w=wield(c,'paw',{sl:'#8d9097',px:.8}),A=c.ang,[dx,dy]=c.dir,sg=c.sd();w.set(A-70*sg);
  await Promise.all([w.show(100),body(c,{x:-dx*.1,y:-dy*.1+.06,s:1.04,sy:.9},200,'ease-in-out')]);sfx('swish');
  const sw=w.rot(A-55*sg,130,'cubic-bezier(.5,0,.9,.5)',.15),mv=body(c,{x:dx*.26,y:dy*.26,r:14*sg,s:1.08,sy:1},130,'ease-in');
  arc(w.P.x,w.P.y,.7,A-95*sg,A-55*sg,{col:'#cfd2d8',w:4,ms:130,hold:140});
  await Promise.all([sw,mv]);whiff(w.at(.9).x,w.at(.9).y);
  await body(c,[{x:dx*.14,y:dy*.14,r:-8*sg},{x:0,y:0,r:3*sg},{}],340);await w.out(150)}};

// ========================= GOBLIN (adagas) =========================
const gobDag=c=>wield(c,'dagger',{sl:'#4a3a26',p:{bl:'#cfd6dd'}});
SEQ.goblin={
 N:async c=>{
  const A=c.ang,[dx,dy]=c.dir,w=gobDag(c);w.set(A-50);
  await Promise.all([w.show(70),body(c,lean(c,.08,1.02),90)]);
  sfx('swish');afterimage(c.a,c.A.x+dx*.18,c.A.y+dy*.18,240);afterimage(c.a,c.A.x+dx*.34,c.A.y+dy*.34,240);     // avanço veloz, com rastro
  const mv=body(c,step(c,.42,1.08),110,'ease-in'),sw=w.rot(A+35,110,'ease-in',.25);
  arc(w.P.x,w.P.y,.7,A-50,A+30,{col:'#ff9a7a',w:5,ms:110,hold:130});
  await sleep(75);await c.land('gob');await Promise.all([sw,mv]);
  await Promise.all([w.out(110),body(c,{},150)])},
 C:async c=>{                                                                           // ATAQUE ACROBÁTICO: salto com giro e golpe de cima para baixo
  const A=c.ang,[dx,dy]=c.dir,sg=dx<0?-1:1,w=gobDag(c);w.set(A-125);
  await Promise.all([w.show(70),body(c,{x:-dx*.08,y:.08-dy*.08,sy:.85},170)]);sfx('whoosh');
  const o1={x:dx*.4,y:dy*.4-.7},o2={x:dx*.72,y:dy*.72-.16};     // o salto termina logo à frente do alvo
  afterimage(c.a,c.A.x+dx*.3,c.A.y+dy*.3-.3,300);
  const j=body(c,[{x:o1.x,y:o1.y,r:180*sg,s:1.1},{x:o2.x,y:o2.y,r:360*sg,s:1.12}],340,'ease-in-out');
  const wj=w.path([{a:A-150,o:o1},{a:A-60,o:o2}],340,'ease-in-out');
  await Promise.all([j,wj]);
  const sl=w.rot(A+50,100,'ease-in',.2);arc(w.P.x+w.o.x,w.P.y+w.o.y,.7,A-70,A+50,{col:'#ff9a7a',w:6,ms:100,hold:160});
  await sleep(60);await c.land('gob',{s:1.5,wait:60});await sl;                           // golpe certeiro
  const back=body(c,[{x:dx*.4,y:dy*.4-.35,r:380*sg,s:1.08},{x:0,y:0,r:360*sg,s:1}],300,'ease-in-out');      // volta ao lugar previsto
  const wb=w.path([{a:A,o:{x:dx*.4,y:dy*.4-.35}},{a:A-50,o:{x:0,y:0}}],300,'ease-in-out');
  await Promise.all([back,wb]);dust(c.A.x,c.A.y+.2,3,.5,380);await Promise.all([w.out(100),body(c,{},120)])},
 F:async c=>{                                                                           // a adaga erra o golpe e o goblin tropeça
  const A=c.ang,[dx,dy]=c.dir,sg=c.sd(),w=gobDag(c);w.set(A-100*sg);
  await Promise.all([w.show(70),body(c,lean(c,.08,1.02),90)]);sfx('swish');afterimage(c.a,c.A.x+dx*.18,c.A.y+dy*.18,240);
  const mv=body(c,{x:dx*.38,y:dy*.38,r:10*sg,s:1.08},110,'ease-in'),sw=w.rot(A-55*sg,110,'ease-in',.25);
  arc(w.P.x,w.P.y,.7,A-100*sg,A-55*sg,{col:'#d0d0d0',w:4,ms:110,hold:130});
  await Promise.all([sw,mv]);whiff(w.at(.8).x,w.at(.8).y);
  await body(c,[{x:dx*.42,y:dy*.42,r:34*sg,s:1.0},{x:dx*.2,y:dy*.2,r:-10*sg},{r:4*sg},{}],480,'ease-in-out');await w.out(110)}};

// ========================= ESQUELETO (espada e escudo) =========================
const skSword=c=>wield(c,'sword',{sl:'#d8d2b8',p:{bl:'#d8d2b8',gd:'#8a8472'}});
SEQ.esqueleto={
 N:async c=>{
  const w=skSword(c),A=c.ang,[dx,dy]=c.dir;w.set(A-115);
  await Promise.all([w.show(110),body(c,[{x:-dx*.06,y:-dy*.06,r:3},{x:-dx*.1,y:-dy*.1,r:-3,s:1.03}],200)]);   // levanta a espada; os ossos rangem
  sfx('swish');
  const sw=w.rot(A+50,180,'cubic-bezier(.55,0,.9,.55)'),mv=body(c,step(c,.26,1.08),170,'ease-in');
  arc(w.P.x,w.P.y,.95,A-75,A+45,{col:'#e8e0c4',w:7,ms:170,hold:160,delay:30});
  await sleep(115);await c.land('bone');await Promise.all([sw,mv]);
  await Promise.all([w.rot(A+15,150),body(c,{},220),sleep(60).then(()=>w.out(160))])},
 C:async c=>{                                                                           // INVESTIDA COM ESCUDO E ESPADA
  const A=c.ang,[dx,dy]=c.dir,w=skSword(c),side=dx>0?-1:1,S0=art('shield'),sp={x:c.A.x+side*.3,y:c.A.y+.1};
  const sh=mk('sh',sp.x,sp.y,{w:S0.w,html:S0.svg});sh.style.opacity=0;w.set(A-125);
  await Promise.all([wa(sh,[{opacity:0,transform:T(0,0,0,.4)},{opacity:1,transform:T(0,0,0,1)}],140),w.show(110)]);
  for(let i=0;i<3;i++){                                                                   // bate três vezes no escudo
   sfx('shield');ring(sp.x,sp.y,'#e8e0c4',.5,300,2);burst(sp.x,sp.y,{n:5,col:['#fff','#e8e0c4'],r:.4,ms:260,sz:.06});
   wa(sh,[{transform:T(0,0,0,1)},{transform:T(0,0,0,1.3),offset:.4},{transform:T(0,0,0,1)}],150);
   await Promise.all([body(c,{y:-.07,r:i%2?5:-5,s:1.03},90),w.rot(A-125+(i%2?-10:10),90)]);await body(c,{y:0,r:0},70);await sleep(60)}
  const o1={x:dx*.55,y:dy*.55};sfx('whoosh');dust(c.A.x,c.A.y+.2,4,.6,460);
  afterimage(c.a,c.A.x+dx*.2,c.A.y+dy*.2,300);
  await Promise.all([body(c,step(c,.55,1.1),170,'ease-in'),wa(sh,[{transform:T(0,0)},{transform:T(o1.x,o1.y)}],170,{ease:'ease-in'}),w.rot(A-135,170,'ease-in',0,1,o1)]);   // avança
  sfx('swish');const sw=w.rot(A+60,170,'cubic-bezier(.55,0,.9,.55)',0,1,o1);                  // golpe diagonal
  arc(w.P.x+o1.x,w.P.y+o1.y,.95,A-110,A+55,{col:'#fff',w:8,ms:170,hold:220});
  await sleep(115);await c.land('bone',{s:1.5,wait:60});await sw;
  await Promise.all([w.out(150),wa(sh,[{opacity:1},{opacity:0}],180),body(c,{},260,'ease-in-out')])},
 F:async c=>{                                                                           // a espada passa ao lado
  const w=skSword(c),A=c.ang,[dx,dy]=c.dir,sg=c.sd();w.set(A-115*sg);
  await Promise.all([w.show(110),body(c,[{x:-dx*.06,y:-dy*.06,r:3},{x:-dx*.1,y:-dy*.1,r:-3}],200)]);sfx('swish');
  const sw=w.rot(A-55*sg,180,'cubic-bezier(.55,0,.9,.55)'),mv=body(c,{x:dx*.2,y:dy*.2,r:10*sg,s:1.06},170,'ease-in');
  arc(w.P.x,w.P.y,.95,A-125*sg,A-55*sg,{col:'#cfcfcf',w:6,ms:170,hold:160,delay:30});
  await Promise.all([sw,mv]);
  await body(c,[{x:dx*.1,y:dy*.1,r:-7*sg},{r:5},{r:-4},{r:2},{}],440);await w.out(150)}};

// ========================= ARANHA (mandíbulas) =========================
const mfx=(c,s,oa,off,adv)=>{const pp=[-c.dir[1],c.dir[0]];return T(pp[0]*s*off+c.dir[0]*adv,pp[1]*s*off+c.dir[1]*adv,c.ang-90+s*oa)};
function mandibles(c){const M=art('mand'),P=c.pt(.4);
 return[-1,1].map(s=>{const e=mk('mn',P.x,P.y,{w:M.w,h:M.h,html:M.svg});e.style.transform=mfx(c,s,0,.05,0);e.style.opacity=0;return{e,s}})}
const mOpen=(c,m,ms,oa=32,off=.13,adv=0)=>Promise.all(m.map(({e,s})=>wa(e,[{transform:e.style.transform||mfx(c,s,0,.05,0),opacity:0},{transform:mfx(c,s,oa,off,adv),opacity:1}],ms)));
const mSnap=(c,m,ms,adv)=>Promise.all(m.map(({e,s})=>wa(e,[{transform:mfx(c,s,32,.13,0),opacity:1},{transform:mfx(c,s,-6,.04,adv),opacity:1}],ms,{ease:'ease-in'})));
SEQ.aranha={
 N:async c=>{
  const [dx,dy]=c.dir,m=mandibles(c);
  await Promise.all([mOpen(c,m,200),body(c,{x:dx*.1,y:dy*.1,s:1.06,sy:1.1},200)]);                  // inclina o corpo e abre as mandíbulas
  sfx('hiss');await sleep(80);
  await Promise.all([mSnap(c,m,100,.26),body(c,step(c,.3,1.1),100,'ease-in')]);
  await c.land('fang');
  await Promise.all([...m.map(({e})=>wa(e,[{opacity:1},{opacity:0}],140)),body(c,{},200)])},
 C:async c=>{                                                                           // TEIA E MORDIDA
  const A=c.ang,[dx,dy]=c.dir,P=c.pt(.45),ball=orb(P.x,P.y,{size:.32,c1:'#ffffff',c2:'#c8c8d8'});ball.style.opacity=0;
  await Promise.all([wa(ball,[{transform:T(0,0,0,.3),opacity:0},{transform:T(0,0,0,1),opacity:1}],220),body(c,{y:-.08,s:1.1,sy:1.2},240)]);    // levanta o abdômen e fia a teia
  sfx('hiss');
  await fly(ball,P,c.Tg,200+c.d*50,{trail:{col:['#fff','#d8d8e8'],sz:.06,n:2,ms:340}});kill(ball);
  const W0=art('web'),web=mk('web',c.Tg.x,c.Tg.y,{w:W0.w,html:W0.svg});web.style.opacity=0;                  // a teia envolve o alvo
  burst(c.Tg.x,c.Tg.y,{n:8,col:['#fff','#d8d8e8'],r:.8,ms:360,sz:.06});
  await wa(web,[{transform:T(0,0,-40,.2),opacity:0},{transform:T(0,0,0,1),opacity:.95}],280);
  const m=mandibles(c);
  await Promise.all([mOpen(c,m,200,36,.15),body(c,{x:dx*.14,y:dy*.14,s:1.08,sy:1.06},200)]);sfx('hiss');await sleep(60);
  await Promise.all([mSnap(c,m,110,.34),body(c,step(c,.42,1.14),110,'ease-in')]);
  await c.land('fang',{s:1.5});
  wa(web,[{opacity:.95,transform:T(0,0,0,1)},{opacity:0,transform:T(0,0,10,1.15)}],420).then(()=>kill(web));  // a teia desaparece no final
  await Promise.all([...m.map(({e})=>wa(e,[{opacity:1},{opacity:0}],140)),body(c,{},240)])},
 F:async c=>{                                                                           // avança para morder e erra a posição do alvo (as presas apontam para o lado)
  const [dx,dy]=c.dir,sg=c.sd(),c2={...c,ang:c.ang+45*sg,dir:vecOf(c.ang+45*sg)},m=mandibles(c2);
  await Promise.all([mOpen(c2,m,200),body(c,{x:dx*.1,y:dy*.1,s:1.06,sy:1.1},200)]);sfx('hiss');await sleep(80);
  const pp=[-dy*sg,dx*sg];
  await Promise.all([mSnap(c2,m,100,.26),body(c,{x:dx*.3+pp[0]*.22,y:dy*.3+pp[1]*.22,r:12*sg,s:1.1},100,'ease-in')]);
  burst(c.A.x+dx*.78+pp[0]*.3,c.A.y+dy*.78+pp[1]*.3,{n:4,col:['#fff','#d8d8e8'],r:.3,ms:260,sz:.05});sfx('bite');      // as presas fecham no ar
  await body(c,[{x:dx*.2+pp[0]*.3,y:dy*.2+pp[1]*.3,r:18*sg},{x:0,y:0,r:-4*sg},{}],420,'ease-in-out');
  await Promise.all(m.map(({e})=>wa(e,[{opacity:1},{opacity:0}],140)))}};

// ========================= MORCEGO (asas e rajada de vento) =========================
const flap=(c,n=3,big=1.3)=>{const k=[];for(let i=0;i<n;i++)k.push({s:big,sy:.85,y:-.1},{s:1,y:-.04});k.push({s:1.35,sy:.85,y:-.12});return body(c,k,140*n+160)};
function gust(from,to,ms,o={}){const G0=art('gust'),e=mk('gu',from.x,from.y,{w:G0.w*(o.sz||1),h:G0.h*(o.sz||1),html:G0.svg});e.style.opacity=0;
 return fly(e,from,to,ms,{rot:'dir',trail:{col:['#fff','#cfe6ff'],sz:.07,n:2,ms:260},sc:[.6,1.15],fade:o.fade}).then(()=>kill(e))}
SEQ.morcego={
 N:async c=>{
  const [dx,dy]=c.dir,pp=[-dy,dx],P=c.pt(.5),ms=180+c.d*50;
  sfx('whoosh');const fl=flap(c,3);await sleep(260);                                      // abre as asas e bate rápido
  const gs=[-1,0,1].map((k,i)=>sleep(i*70).then(()=>{const e=gust({x:P.x+pp[0]*k*.16,y:P.y+pp[1]*k*.16},{x:c.Tg.x+pp[0]*k*.1,y:c.Tg.y+pp[1]*k*.1},ms)}));
  await sleep(70*2+ms*.8);await c.land('wind');await Promise.all([fl,...gs])},
 C:async c=>{                                                                           // MINI TORNADO
  const P=c.pt(.55),Tn=art('tornado'),tor=mk('tor',P.x,P.y,{w:Tn.w,h:Tn.h,html:Tn.svg});tor.style.opacity=0;
  sfx('whoosh');const fl=flap(c,5,1.4);
  await sleep(300);wa(tor,[{transform:T(0,.1,0,.2),opacity:0},{transform:T(0,0,0,1),opacity:.95}],460);                    // o redemoinho se forma
  const sv=tor.firstElementChild;wa(sv,[{transform:'skewX(-9deg)'},{transform:'skewX(9deg)'}],130,{iter:14,dir:'alternate',ease:'ease-in-out'});
  tor.querySelectorAll('ellipse').forEach((el,i)=>wa(el,[{transform:'translateX(-3px)'},{transform:'translateX(3px)'}],110+i*14,{iter:16,dir:'alternate',ease:'ease-in-out'}));
  gather(P.x,P.y+.2,{n:8,col:['#fff','#cfe6ff'],r:.8,ms:420});await sleep(480);
  await Promise.all([fly(tor,P,c.Tg,300+c.d*70,{trail:{col:['#dbe8f6','#fff','#b8d8ff'],sz:.12,n:2,ms:340}}),fl]);   // é lançado contra o alvo
  kill(tor);await c.land('windBig')},
 F:async c=>{                                                                           // a rajada passa ao lado ou se dissipa antes de chegar
  const sg=c.sd(),M=missPoint(c,sg,.2),P=c.pt(.5),[dx,dy]=c.dir,pp=[-dy,dx];
  sfx('whoosh');const fl=flap(c,3);await sleep(260);
  const gs=[-1,0,1].map((k,i)=>sleep(i*70).then(()=>gust({x:P.x+pp[0]*k*.16,y:P.y+pp[1]*k*.16},{x:P.x+(M.x-P.x)*.75,y:P.y+(M.y-P.y)*.75},170+c.d*40,{fade:.3})));
  await Promise.all([fl,...gs]);burst(P.x+(M.x-P.x)*.75,P.y+(M.y-P.y)*.75,{n:8,col:['#fff','#cfe6ff'],r:.6,ms:420,sz:.06,g:-.1})}};

// ========================= ORC (machado e invocação) =========================
const orcAxe=c=>wield(c,'axe',{sl:'#5a4a2a',p:{hd:'#6c6f66',hl:'#4a3a26'}});
// casas livres perto do alvo onde os goblins invocados aparecem (só visual: nenhuma entidade é criada)
function gobSpots(c){
 const out=[],T0=c.Tg;
 for(const[dx,dy]of[[0,-1],[0,1],[-1,0],[1,0],[-1,-1],[1,-1],[-1,1],[1,1]]){const x=T0.x+dx,y=T0.y+dy;
  if((x===c.A.x&&y===c.A.y)||!free(x,y))continue;out.push({x,y})}
 const L=out.sort(()=>Math.random()-.5).slice(0,2),pp=[-c.dir[1],c.dir[0]];
 while(L.length<2)L.push({x:c.A.x+pp[0]*(L.length?.9:-.9)+c.dir[0]*.3,y:c.A.y+pp[1]*(L.length?.9:-.9)+c.dir[1]*.3});   // sem espaço: surgem ao lado do orc
 return L}
function mkGob(x,y){const g=mk('gh gob',x,y,{w:1,html:`<div class="u e" style="--col:var(--p0);--aura:#6fbf4a"><span class="sh"></span><span class="fc">${ico('goblin')}</span></div>`});g.style.transform='translate(-50%,-50%)';g.style.opacity=0;return g}
SEQ.orc={
 N:async c=>{
  const w=orcAxe(c),A=c.ang,[dx,dy]=c.dir;w.set(A-140);
  await Promise.all([w.show(120),body(c,{x:-dx*.16,y:-dy*.16,s:1.05,r:-dx*4},320,'ease-in-out'),w.rot(A-165,320,'ease-in-out')]);
  sfx('whoosh');
  const sw=w.rot(A+25,200,'cubic-bezier(.6,0,.9,.5)'),mv=body(c,step(c,.34,1.14),200,'ease-in');
  arc(w.P.x,w.P.y,1.05,A-110,A+20,{col:'#b9c07a',w:10,ms:200,hold:220,delay:40});
  await sleep(160);await c.land('heavy');await Promise.all([sw,mv]);
  await sleep(140);await Promise.all([w.rot(A-20,200,'ease-in-out'),body(c,{},260,'ease-in-out'),sleep(100).then(()=>w.out(180))])},
 C:async c=>{                                                                           // INVOCAÇÃO DE DOIS GOBLINS
  const w=orcAxe(c),A=c.ang,[dx,dy]=c.dir;w.set(A-140);
  await Promise.all([w.show(120),body(c,{y:-.14,s:1.12},320),w.rot(-100,320,'ease-in-out')]);       // ergue o machado para o alto
  const R=art('rune','#7dff6a'),rune=mk('rune',c.A.x,c.A.y,{w:2.2,html:R.svg});rune.style.opacity=0;
  wa(rune,[{transform:T(0,0,0,.3),opacity:0},{transform:T(0,0,180,1),opacity:.95}],520);
  sfx('boom');ring(c.A.x,c.A.y,'#7dff6a',1.2,620,4);tint('radial-gradient(ellipse at center,transparent 38%,#021a02c0)',900,.8);
  gather(c.A.x,c.A.y,{n:12,col:['#7dff6a','#2f6a2a'],r:1,ms:420});await sleep(420);
  const spots=gobSpots(c),gs=spots.map(p=>mkGob(p.x,p.y));
  spots.forEach(p=>{smoke(p.x,p.y,4,.6,480);burst(p.x,p.y,{n:8,col:['#7dff6a','#2f6a2a','#fff'],r:.7,ms:420,sz:.07})});
  await Promise.all(gs.map(g=>wa(g,[{transform:T(0,.2,0,.2),opacity:0},{transform:T(0,0,0,1.1),opacity:1,offset:.7},{transform:T(0,0,0,1),opacity:1}],320)));   // os goblins aparecem
  const off=[0,1].map(i=>{const p=spots[i],vx=c.Tg.x-p.x,vy=c.Tg.y-p.y,L=Math.hypot(vx,vy)||1;return{vx:vx/L,vy:vy/L,L}});
  for(let r=0;r<2;r++)for(let i=0;i<2;i++){                                                  // ataques coordenados, alternados (só efeitos: o dano é um só)
   const g=gs[i],o=off[i],dxm=o.vx*(o.L-.6),dym=o.vy*(o.L-.6);
   sfx('swish');wa(g,[{transform:T(0,0)},{transform:T(dxm,dym,0,1.1)},{transform:T(dxm*.5,dym*.5)}],220,{ease:'ease-in-out'});
   await sleep(110);cut(c.Tg.x-o.vx*.3,c.Tg.y-o.vy*.3,angOf({x:0,y:0},{x:o.vx,y:o.vy})+90*(i?1:-1)*.5,{col:'#ff9a7a',len:.8,th:4,ms:220});c.spark('gob',{x:c.Tg.x-o.vx*.3,y:c.Tg.y-o.vy*.3},.7);await sleep(110)}
  await Promise.all(gs.map(g=>wa(g,[{opacity:1},{opacity:0,transform:T(0,0,0,.6)}],260)));gs.forEach((g,i)=>{smoke(spots[i].x,spots[i].y,3,.5,420);kill(g)});   // somem em fumaça
  wa(rune,[{opacity:.95},{opacity:0}],300).then(()=>kill(rune));
  sfx('whoosh');const sw=w.rot(A+25,210,'cubic-bezier(.6,0,.9,.5)'),mv=body(c,step(c,.36,1.15),210,'ease-in');       // o orc finaliza com o machado
  arc(w.P.x,w.P.y,1.05,A-110,A+20,{col:'#b9c07a',w:11,ms:210,hold:240,delay:40});
  await sleep(165);await c.land('heavy',{s:1.4});await Promise.all([sw,mv]);
  await sleep(140);await Promise.all([w.rot(A-20,200),body(c,{},260),sleep(100).then(()=>w.out(180))])},
 F:async c=>{
  const w=orcAxe(c),A=c.ang,[dx,dy]=c.dir,sg=c.sd();w.set(A-140*sg);
  await Promise.all([w.show(120),body(c,{x:-dx*.16,y:-dy*.16,s:1.05},320,'ease-in-out'),w.rot(A-165*sg,320,'ease-in-out')]);sfx('whoosh');
  const sw=w.rot(A-58*sg,210,'cubic-bezier(.6,0,.9,.5)'),mv=body(c,{x:dx*.2,y:dy*.2,r:16*sg,s:1.1},210,'ease-in');
  arc(w.P.x,w.P.y,1.05,A-125*sg,A-58*sg,{col:'#cfcfcf',w:8,ms:210,hold:200,delay:40});
  await Promise.all([sw,mv]);const q=w.at(1.2,w.a);dust(q.x,q.y,4,.7,480);sfx('thud');
  await body(c,[{x:dx*.12,y:dy*.12,r:22*sg},{x:dx*.05,y:dy*.05,r:-8*sg},{r:4*sg},{}],520,'ease-in-out');await w.out(160)}};

// ========================= CULTISTA / MAGO DAS TREVAS (cajado e fogo sombrio) =========================
const darkStaff=c=>wield(c,'staff',{sl:'#5a1f3a',p:{sh:'#3a2a2a',cr:'#6b2b52',o1:'#e0b0ff',o2:'#8a3bd8'}});
async function darkCharge(c,big){
 const w=darkStaff(c),A=c.ang;w.set(A-70);
 await Promise.all([w.show(120),body(c,{y:big?-.14:-.08,s:big?1.12:1.06},big?320:240)]);await w.rot(big?-90:A,big?260:200,'ease-in-out');   // usa o cajado para concentrar energia
 const tip=w.tip(),o=orb(tip.x,tip.y,{size:big?.95:.5,c1:'#e0b0ff',c2:'#3a0f52',dark:1});o.style.opacity=0;
 if(big){const R=art('rune','#a24bd8'),rune=mk('rune',c.A.x,c.A.y,{w:2,html:R.svg});rune.style.opacity=0;wa(rune,[{transform:T(0,0,0,.3),opacity:0},{transform:T(0,0,180,1),opacity:.9}],520);w._rune=rune;
  tint('radial-gradient(ellipse at center,transparent 38%,#12001ac0)',900,.8)}
 gather(tip.x,tip.y,{n:big?14:8,col:['#a24bd8','#3a0f52','#e0b0ff'],r:big?1:.6,ms:big?520:300});
 await wa(o,[{transform:T(0,0,0,.15),opacity:.9},{transform:T(0,0,0,1),opacity:1}],big?520:300);return{w,o,tip}}
SEQ.cultista={
 N:async c=>{
  const{w,o,tip}=await darkCharge(c,false);sfx('zap');
  await fly(o,tip,c.Tg,170+c.d*55,{trail:{col:['#a24bd8','#3a0f52','#1a0a24'],sz:.14,n:2}});
  kill(o);await c.land('dark');await Promise.all([w.out(160),body(c,{},180)])},
 C:async c=>{                                                                           // ESFERA DE FOGO SOMBRIO (grande)
  const{w,o,tip}=await darkCharge(c,true);shake();sfx('zap');
  await fly(o,tip,c.Tg,240+c.d*60,{trail:{col:['#a24bd8','#1a0a24','#e0b0ff'],sz:.2,n:3}});
  kill(o);await c.land('darkBig');if(w._rune)wa(w._rune,[{opacity:.9},{opacity:0}],260).then(()=>kill(w._rune));await Promise.all([w.out(160),body(c,{},220)])},
 F:async c=>{                                                                           // a magia se desfaz antes de atingir o alvo
  const{w,o,tip}=await darkCharge(c,false),L=Math.max(.9,Math.min(c.d*.55+.3,rayLen(c.A,c.ang,c.d*.55+.3,c.t)-.2)),D=c.pt(L);sfx('zap');
  await fly(o,tip,D,150+c.d*30,{trail:{col:['#a24bd8','#1a0a24'],sz:.12,n:2},sc:[1,.35]});
  kill(o);burst(D.x,D.y,{n:16,col:['#3a0f52','#a24bd8','#1a0a24','#8a8a90'],r:.9,ms:600,sz:.1,g:-.15});smoke(D.x,D.y,3,.6,640);
  await body(c,[{x:-c.dir[0]*.06,y:-c.dir[1]*.06,r:-6},{r:6},{r:-3},{}],420);await w.out(160)}};

// =====================================================================
// CHEFES
// =====================================================================

// ---------- NAJA: cauda e mordida ----------
// empurrão do crítico: game.js decide (out.shove) se o destino é válido; aqui só se desenha o deslocamento ou a batida
async function pushFx(c){
 const o=c.out;if(!o.shove)return;const s=o.shove();if(!s||s.skip)return;
 const t=c.t,tk=tkel(t),[dx,dy]=c.dir;
 if(s.moved){                                                    // o alvo foi deslocado de verdade (estado já atualizado)
  const ox=t.x-dx,oy=t.y-dy;sfx('whoosh');
  burst(ox,oy,{n:6,col:['#c4beb0','#fff'],r:.5,ms:380,sz:.07});dust(ox,oy,3,.6,420);
  if(tk)tk.style.transition='transform .32s cubic-bezier(.2,.8,.2,1)';drawUnits(cur());
  await sleep(330);if(tk)tk.style.transition='';
  if(spikeAt(t.x,t.y))await trap(t,t.x,t.y)}                     // empurrado para cima de espinhos: a armadilha dispara
 else{                                                           // destino inválido: o personagem fica onde está e bate no obstáculo
  await wa(c.ut,[{transform:B({})},{transform:B({x:dx*.28,y:dy*.28,s:.92,sy:1.06}),offset:.4},{transform:B({x:-dx*.05,y:-dy*.05})},{transform:B({})}],320,{own:true});
  ifx('heavy',t.x+dx*.5,t.y+dy*.5,.6);
  if(o.bump)o.bump();                                            // +1 de dano, no máximo uma vez
  await sleep(220)}}
const tailW=(c,a0,sy=.2)=>wield(c,'tail',{bare:1,px:0,oy:sy,a:a0,arm:0});
const nSway=(c,k=1)=>({x:-c.dir[0]*.12*k,y:-c.dir[1]*.12*k,r:(c.dir[0]>=0?-1:1)*10*k,s:1.05});
SEQ['naja:cauda']={
 N:async c=>{
  const A=c.ang,[dx,dy]=c.dir,w=tailW(c,A+150);
  await Promise.all([w.show(120),body(c,nSway(c),300,'ease-in-out'),w.rot(A+118,300,'ease-in-out')]);       // o corpo balança e a cauda se arma
  sfx('hiss');await sleep(60);sfx('swish');
  const sw=w.rot(A-62,230,'cubic-bezier(.5,0,.9,.5)'),mv=body(c,{x:dx*.22,y:dy*.22,r:(dx>=0?1:-1)*8,s:1.1},230,'ease-in');
  arc(w.P.x,w.P.y,1.35,A+118,A-62,{col:'#8bd650',w:12,ms:230,hold:260});                                    // trajetória da cauda
  await sleep(150);await c.land('whipG');await Promise.all([sw,mv]);
  await Promise.all([w.rot(A+150,260,'ease-in-out'),body(c,{},280,'ease-in-out'),sleep(120).then(()=>w.out(160))])},
 C:async c=>{                                                                                                // GOLPE DE CAUDA COM EMPURRÃO
  const A=c.ang,[dx,dy]=c.dir,w=tailW(c,A+200);
  await Promise.all([w.show(120),body(c,[nSway(c,1.4),{...nSway(c,1.7),sy:.92}],420,'ease-in-out'),w.rot(A+130,420,'ease-in-out')]);
  sfx('hiss');ring(c.A.x,c.A.y,'#8bd650',1.2,520,3);gather(c.A.x,c.A.y,{n:10,col:['#8bd650','#d8f7b0'],r:1,ms:300});await sleep(120);
  sfx('whoosh');
  const sw=w.rot(A-70,300,'cubic-bezier(.5,0,.9,.5)'),mv=body(c,{x:dx*.3,y:dy*.3,r:(dx>=0?1:-1)*12,s:1.16},300,'ease-in');
  arc(w.P.x,w.P.y,1.35,A+130,A-70,{col:'#8bd650',w:14,ms:300,hold:300});arc(w.P.x,w.P.y,1.1,A+110,A-60,{col:'#fff',w:6,ms:280,hold:260,delay:20});
  await sleep(200);await c.land('whipG',{s:1.5,wait:40});await pushFx(c);                                    // o golpe empurra o alvo (ou bate no obstáculo)
  await Promise.all([sw,mv]);
  await Promise.all([w.rot(A+150,260,'ease-in-out'),body(c,{},300,'ease-in-out'),sleep(120).then(()=>w.out(160))])},
 F:async c=>{                                                                                                // a cauda erra a trajetória
  const A=c.ang,[dx,dy]=c.dir,sg=c.sd(),w=tailW(c,A+150*sg);
  await Promise.all([w.show(120),body(c,nSway(c),300,'ease-in-out'),w.rot(A+118*sg,300,'ease-in-out')]);sfx('hiss');sfx('swish');
  const sw=w.rot(A+70*sg,230,'cubic-bezier(.5,0,.9,.5)'),mv=body(c,{x:dx*.18,y:dy*.18,r:(dx>=0?1:-1)*14,s:1.08},230,'ease-in');
  arc(w.P.x,w.P.y,1.35,A+130*sg,A+70*sg,{col:'#b8d9a0',w:10,ms:230,hold:240});
  await Promise.all([sw,mv]);const q=w.at(1.5,w.a);dust(q.x,q.y,4,.7,460);sfx('thud');                        // a cauda bate no chão ao lado
  await Promise.all([body(c,[{x:dx*.1,y:dy*.1,r:-8},{r:4},{}],420),w.rot(A+150*sg,320,'ease-in-out')]);await w.out(140)}};
// mordida: o corpo sobe, a cabeça avança (pescoço estica) e as mandíbulas se fecham
function neckBar(c){const N0=art('neck'),e=mk('wp',c.A.x,c.A.y+.12,{html:`<span class="wpn" style="left:0;top:${cl(-.15)};width:${cl(1)};height:${cl(.3)}">${N0.svg}</span>`});e.style.opacity=0;e.style.transform=`rotate(${c.ang}deg) scale(.01,1)`;return e}
const neckTo=(e,c,len,op=1)=>({transform:`rotate(${c.ang}deg) scale(${Math.max(.01,len)},1)`,opacity:op});
function jawsEl(c,at){const J=art('jaws'),e=mk('jw',at.x,at.y,{w:J.w,h:J.h,html:J.svg});e.style.opacity=0;return e}
SEQ['naja:mordida']={
 N:async c=>{
  const [dx,dy]=c.dir,nk=neckBar(c),jaw=jawsEl(c,c.pt(.42));
  await Promise.all([body(c,{y:-.14,s:1.14,sy:1.22},280,'ease-out'),wa(jaw,[{opacity:0,transform:T(0,-.1,0,.3)},{opacity:1,transform:T(dx*.1,dy*.1-.12,0,1)}],280)]);   // ergue a cabeça e abre as mandíbulas
  sfx('hiss');await sleep(110);
  const ext=.62;
  await Promise.all([body(c,{x:dx*ext,y:dy*ext-.04,s:1.2,sy:1.1},120,'ease-in'),wa(nk,[neckTo(nk,c,.05,0),neckTo(nk,c,ext*.8,1)],120,{ease:'ease-in'}),
   wa(jaw,[{transform:T(dx*.1,dy*.1-.12,0,1),opacity:1},{transform:T(dx*(ext+.15),dy*(ext+.15)-.1,0,.45,.9),opacity:1}],120,{ease:'ease-in'})]);   // avança e fecha
  await c.land('fang',{s:1.5});
  await Promise.all([body(c,{},280,'ease-in-out'),wa(nk,[neckTo(nk,c,ext*.8,1),neckTo(nk,c,.05,0)],260),wa(jaw,[{opacity:1},{opacity:0}],200)])},
 C:async c=>SEQ['naja:cauda'].C(c),                                                                          // o crítico da Naja é sempre o golpe de cauda com empurrão
 F:async c=>{                                                                                                // avança, fecha as mandíbulas no ar
  const [dx,dy]=c.dir,sg=c.sd(),pp=[-dy*sg,dx*sg],nk=neckBar(c),jaw=jawsEl(c,c.pt(.42));
  await Promise.all([body(c,{y:-.14,s:1.14,sy:1.22},280,'ease-out'),wa(jaw,[{opacity:0,transform:T(0,-.1,0,.3)},{opacity:1,transform:T(dx*.1,dy*.1-.12,0,1)}],280)]);sfx('hiss');await sleep(110);
  const ext=.55,bx=dx*ext+pp[0]*.34,by=dy*ext+pp[1]*.34;
  await Promise.all([body(c,{x:bx,y:by-.04,r:14*sg,s:1.2,sy:1.1},120,'ease-in'),wa(nk,[neckTo(nk,c,.05,0),neckTo(nk,c,.6,1)],120),
   wa(jaw,[{transform:T(dx*.1,dy*.1-.12,0,1),opacity:1},{transform:T(bx+dx*.15,by+dy*.15-.1,0,.45,.9),opacity:1}],120,{ease:'ease-in'})]);
  burst(c.A.x+bx+dx*.2,c.A.y+by+dy*.2,{n:5,col:['#fff','#d8f7b0'],r:.3,ms:260,sz:.05});sfx('bite');           // as presas se fecham sem atingir ninguém
  await Promise.all([body(c,[{x:bx*.6,y:by*.6,r:-6*sg},{}],360,'ease-in-out'),wa(nk,[neckTo(nk,c,.6,1),neckTo(nk,c,.05,0)],300),wa(jaw,[{opacity:1},{opacity:0}],200)])}};

// ---------- GOLEM: pedra do chão, bigorna, soco e pisada ----------
// casa de onde o Golem arranca o chão (só visual: G.grid nunca é alterado). Preferência: vizinha na direção do alvo, em chão livre.
function tearCell(c){
 const cand=[[1,0],[-1,0],[0,1],[0,-1]].map(([x,y])=>({x:c.A.x+x,y:c.A.y+y,dot:x*c.dir[0]+y*c.dir[1]})).filter(p=>G.grid[p.y]?.[p.x]==='.'&&!at(p.x,p.y)).sort((a,b)=>b.dot-a.dot);
 return cand[0]?{x:cand[0].x,y:cand[0].y}:{x:c.A.x,y:c.A.y}}
// o Golem se abaixa, o chão racha e um pedaço de terreno vira um objeto físico erguido sobre a cabeça dele
async function tearGround(c,big=false){
 const src=tearCell(c),K0=art('chunk'),Cr=art('crack'),cls='t'+G.map;
 const hole=mk('hole '+cls,src.x,src.y,{w:1.02}),crack=mk('crk',src.x,src.y,{w:1.7,html:Cr.svg});hole.style.opacity=0;crack.style.opacity=0;
 sfx('rumble');
 await Promise.all([body(c,{x:(src.x-c.A.x)*.12,y:.1+(src.y-c.A.y)*.12,sy:.86,s:1.02},320,'ease-in-out'),wa(crack,[{opacity:0,transform:T(0,0,0,.4)},{opacity:.9,transform:T(0,0,0,1)}],280),wa(hole,[{opacity:0,transform:T(0,0,0,.6)},{opacity:1,transform:T(0,0,0,1)}],340)]);
 const chunk=mk('chunk '+cls,src.x,src.y,{w:K0.w*(big?1.25:1),html:K0.svg});
 sfx('stone');dust(src.x,src.y,6,.9,600);burst(src.x,src.y,{n:10,col:['#8d8478','#6c665c','#c4beb0'],r:.9,ms:560,sz:.1,sq:1,g:.3});
 const up={x:c.A.x,y:c.A.y-.6};
 await Promise.all([fly(chunk,src,up,360,{arc:.35,sc:[.9,1.25],rot:'spin',spin:20}),body(c,{y:-.12,s:1.1,sy:1.08},360)]);   // ergue o pedaço de chão
 place(chunk,up.x,up.y);chunk.style.transform=T(0,0,20,1.25);
 return{src,hole,crack,chunk,up}}
// o terreno original se regenera (efeito temporário; o mapa nunca foi alterado)
async function regen(tr){
 const{src,hole,crack}=tr;burst(src.x,src.y,{n:8,col:['#c4beb0','#e8e0c4','#fff'],r:.55,ms:520,sz:.06,g:-.25});
 wa(crack,[{opacity:.9},{opacity:0}],380).then(()=>kill(crack));
 await wa(hole,[{opacity:1,transform:T(0,0,0,1)},{opacity:.75,transform:T(0,0,0,.92),offset:.5},{opacity:0,transform:T(0,0,0,.7)}],560,{ease:'ease-in'});kill(hole)}
const SPECIAL_ARC=c=>.75+c.d*.12;
const golemFall=(c,tr,D)=>fly(tr.chunk,tr.up,D,290+c.d*70,{arc:SPECIAL_ARC(c),rot:'spin',spin:260,sc:[1.25,.85]});
SEQ['golem:dist']={
 N:async c=>{                                                                                                // arranca e arremessa um pedaço do chão
  const tr=await tearGround(c);await sleep(110);sfx('whoosh');
  await Promise.all([golemFall(c,tr,c.Tg),body(c,{y:.02,s:1.1,sy:1},200)]);                                   // arremesso: o projétil percorre a distância
  kill(tr.chunk);await c.land('rock');
  await Promise.all([regen(tr),body(c,{},300,'ease-in-out')])},
 C:async c=>{                                                                                                // BIGORNA: a pedra é moldada por magia e arremessada
  const tr=await tearGround(c,true),An=art('anvil');await sleep(80);
  const R=art('rune','#ffb347'),rune=mk('rune',tr.up.x,tr.up.y,{w:1.6,html:R.svg});rune.style.opacity=0;
  wa(rune,[{transform:T(0,0,0,.4),opacity:0},{transform:T(0,0,240,1),opacity:.9}],520);
  gather(tr.up.x,tr.up.y,{n:12,col:['#ffb347','#fff3b0'],r:.9,ms:520});sfx('chime');shake();
  await sleep(380);                                                                                           // a pedra se molda e vira uma bigorna
  glow(tr.up.x,tr.up.y,'#ffb347',1.6,420);burst(tr.up.x,tr.up.y,{n:12,col:['#ffb347','#fff3b0','#fff'],r:.9,ms:480,sz:.08});sfx('clang');
  tr.chunk.className='fz anvilo';tr.chunk.innerHTML=An.svg;tr.chunk.style.width=cl(An.w*1.15);tr.chunk.style.height=cl(An.h*1.15);tr.chunk.style.transform=T(0,0,0,1.1);
  wa(rune,[{opacity:.9},{opacity:0}],260).then(()=>kill(rune));await sleep(260);sfx('whoosh');
  await Promise.all([fly(tr.chunk,tr.up,c.Tg,340+c.d*75,{arc:1.1+c.d*.14,rot:'spin',spin:40,sc:[1.1,.9]}),body(c,{y:.02,s:1.12,sy:1},220)]);
  kill(tr.chunk);await c.land('anvil');
  await Promise.all([regen(tr),body(c,{},320,'ease-in-out')])},
 F:async c=>{                                                                                                // o arremesso não alcança o alvo
  const tr=await tearGround(c);await sleep(110);sfx('whoosh');
  const L=Math.max(.9,Math.min(c.d*.5,rayLen(c.A,c.ang,c.d*.5,c.t)-.3)),D=c.pt(L);                            // cai antes do alvo e de qualquer unidade
  await Promise.all([fly(tr.chunk,tr.up,D,230+c.d*40,{arc:.5,rot:'spin',spin:200,sc:[1.25,.8]}),body(c,{y:.05,s:1.1,r:(c.dir[0]>=0?-1:1)*6},200)]);
  kill(tr.chunk);ifx('rock',D.x,D.y,.7);
  await Promise.all([regen(tr),body(c,[{r:6},{r:-3},{}],420)])}};
// soco descendente / pisada: a parte do corpo vem de cima e esmaga a casa do alvo
const stoneArm=(c,sh,fist)=>{const A0=art('limb'),e=mk('wp',sh.x,sh.y,{html:`<span class="wpn" style="left:0;top:${cl(-.17)};width:${cl(1)};height:${cl(.34)}">${A0.svg}</span>`});e.style.opacity=0;e.style.transform='rotate(0deg) scale(.01,1)';return e};
const armKf=(sh,p,op=1)=>({transform:`rotate(${angOf(sh,p)}deg) scale(${Math.max(.05,Math.hypot(p.x-sh.x,p.y-sh.y))},1)`,opacity:op});
const shadowAt=(x,y,w)=>{const e=mk('fsh',x,y,{w});e.style.opacity=0;return e};
SEQ['golem:mel']={
 N:async c=>{                                                                                                // SOCO DESCENDENTE
  const [dx,dy]=c.dir,F0=art('fist'),side=dx>=0?1:-1,sh={x:c.A.x+side*.45,y:c.A.y-.1},hi={x:sh.x+dx*.3,y:sh.y-.85},lo={x:c.Tg.x,y:c.Tg.y};
  const arm=stoneArm(c,sh),fist=mk('fist',hi.x,hi.y,{w:F0.w*.85,html:F0.svg}),sw=shadowAt(lo.x,lo.y,1);fist.style.opacity=0;
  sfx('rumble');
  await Promise.all([body(c,{y:-.08,s:1.1,r:-side*4},380,'ease-in-out'),wa(fist,[{opacity:0,transform:T(-dx*.3,.8,-15,.5)},{opacity:1,transform:T(0,0,-8,1.35)}],380),wa(arm,[armKf(sh,{x:sh.x,y:sh.y+.2},0),armKf(sh,hi,1)],380)]);   // ergue o braço
  await sleep(130);sfx('whoosh');
  wa(sw,[{opacity:0,transform:T(0,0,0,1.7)},{opacity:.7,transform:T(0,0,0,.9)}],190,{ease:'ease-in'});
  await Promise.all([wa(fist,[{transform:T(0,0,-8,1.35)},{transform:T(lo.x-hi.x,lo.y-hi.y,0,1)}],190,{ease:'cubic-bezier(.6,0,1,.6)'}),wa(arm,[armKf(sh,hi),armKf(sh,lo)],190,{ease:'cubic-bezier(.6,0,1,.6)'}),body(c,{x:dx*.14,y:dy*.14,s:1.14},190,'ease-in')]);   // desce o punho com força
  await c.land('rock',{s:1.1,wait:200});
  wa(sw,[{opacity:.7},{opacity:0}],300).then(()=>kill(sw));
  await Promise.all([wa(fist,[{opacity:1},{opacity:0}],260).then(()=>kill(fist)),wa(arm,[armKf(sh,lo),armKf(sh,hi,0)],260),body(c,{},300,'ease-in-out')])},
 C:async c=>{                                                                                                // PISADA: ergue o pé e pisa com força
  const [dx,dy]=c.dir,Ft=art('foot'),hi={x:c.A.x+dx*.35,y:c.A.y-.7},lo={x:c.Tg.x,y:c.Tg.y};
  const foot=mk('foot',hi.x,hi.y,{w:Ft.w*.9,h:Ft.h*.9,html:Ft.svg}),sw=shadowAt(lo.x,lo.y,1.2),Cr=art('crack'),crk=mk('crk',lo.x,lo.y,{w:2.6,html:Cr.svg});foot.style.opacity=0;crk.style.opacity=0;
  sfx('rumble');
  await Promise.all([body(c,{y:-.1,s:1.12,sy:1.08},420,'ease-in-out'),wa(foot,[{opacity:0,transform:T(0,.9,0,.6)},{opacity:1,transform:T(0,0,-6,1.4)}],420)]);      // ergue o pé
  await sleep(180);sfx('whoosh');
  wa(sw,[{opacity:0,transform:T(0,0,0,2)},{opacity:.75,transform:T(0,0,0,.9)}],220,{ease:'ease-in'});
  await Promise.all([wa(foot,[{transform:T(0,0,-6,1.4)},{transform:T(lo.x-hi.x,lo.y-hi.y,0,1)}],220,{ease:'cubic-bezier(.6,0,1,.6)'}),body(c,{x:dx*.1,y:dy*.1,s:1.15,sy:.96},220,'ease-in')]);
  wa(crk,[{opacity:0,transform:T(0,0,0,.4)},{opacity:.95,transform:T(0,0,0,1)},{opacity:0}],900);
  ring(lo.x,lo.y,'#e8dcc0',1.8,720,5,3.6);                                                                    // onda de choque
  await c.land('stomp',{s:1.3,wait:260});
  wa(sw,[{opacity:.75},{opacity:0}],300).then(()=>kill(sw));
  await Promise.all([wa(foot,[{opacity:1},{opacity:0}],280).then(()=>kill(foot)),body(c,{},320,'ease-in-out')])},
 F:async c=>{                                                                                                // o soco desce e erra o alvo
  const [dx,dy]=c.dir,F0=art('fist'),side=dx>=0?1:-1,sh={x:c.A.x+side*.45,y:c.A.y-.1},hi={x:sh.x+dx*.3,y:sh.y-.85},lo=c.pt(.55);
  const arm=stoneArm(c,sh),fist=mk('fist',hi.x,hi.y,{w:F0.w*.85,html:F0.svg});fist.style.opacity=0;sfx('rumble');
  await Promise.all([body(c,{y:-.08,s:1.1,r:-side*4},380,'ease-in-out'),wa(fist,[{opacity:0,transform:T(-dx*.3,.8,-15,.5)},{opacity:1,transform:T(0,0,-8,1.35)}],380),wa(arm,[armKf(sh,{x:sh.x,y:sh.y+.2},0),armKf(sh,hi,1)],380)]);
  await sleep(130);sfx('whoosh');
  await Promise.all([wa(fist,[{transform:T(0,0,-8,1.35)},{transform:T(lo.x-hi.x,lo.y-hi.y,6,1)}],190,{ease:'cubic-bezier(.6,0,1,.6)'}),wa(arm,[armKf(sh,hi),armKf(sh,lo)],190),body(c,{x:dx*.1,y:dy*.1,s:1.12},190,'ease-in')]);
  dust(lo.x,lo.y,4,.8,480);sfx('thud');                                                                       // o punho bate no chão, antes do alvo
  await sleep(240);
  await Promise.all([wa(fist,[{opacity:1},{opacity:0}],260).then(()=>kill(fist)),wa(arm,[armKf(sh,lo),armKf(sh,hi,0)],260),body(c,[{r:5},{}],360)])}};

// ---------- DRAGÃO: baforada em cone ----------
// B = {a,t,mode:'N'|'C'|'F', hits:[{p,hit,apply()}]}. O dano de cada alvo só é aplicado quando a chama chega a ele.
const FLAME=['#fff6c0','#ffd23f','#ff9a2e','#ff6a2e','#e2401a'];
function flamePuff(x,y,dx,dy,o={}){
 let n=o.n||3;if(lite())n=Math.ceil(n/2);if(live.size>MAXL)n=1;
 for(let i=0;i<n;i++){
  const c1=pk(o.cols||FLAME),sz=(o.sz||.3)*rr(.7,1.3),e=mk('fl',x,y,{w:sz,self:(o.ms||460)*1.5,css:{'--f1':c1,'--f2':pk(o.cols2||['#e2401a','#a82810'])}}),k=rr(.55,1);
  wa(e,[{transform:T(0,0,0,.4),opacity:.95},{transform:T(dx*k*.55,dy*k*.55,0,1),opacity:.9,offset:.5},{transform:T(dx*k,dy*k,0,1.5),opacity:0}],(o.ms||460)*rr(.8,1.2),{ease:'ease-out'}).then(()=>kill(e))}}
async function dragonBreath(B){
 const a=B.a,t=B.t,A={x:a.x,y:a.y},Tg={x:t.x,y:t.y},ang=angOf(A,Tg),dir=vecOf(ang),mode=B.mode,big=mode==='C',fail=mode==='F';
 const c={a,t,A,Tg,ang,dir,d:dist(a,t),ua:uel(a),bs:null,pt:f=>({x:A.x+dir[0]*f,y:A.y+dir[1]*f})};
 await scene(async()=>{
  const M=c.pt(.5),sg=Math.random()<.5?-1:1;
  const Lmax=big?6.3:Math.min(4.4,Math.max(2.4,c.d+.8)),half=big?48:20;                                       // alcance e abertura visual do cone
  // prepara: a cabeça vira para o alvo, inspira e abre a boca
  const mo=mk('mouth',M.x,M.y,{w:.5,css:{}});mo.style.opacity=0;
  sfx('rumble');gather(M.x,M.y,{n:big?16:9,col:['#ffd23f','#ff7a2e','#fff'],r:big?1.1:.8,ms:big?620:380});glow(A.x,A.y,'#ff7a2e',big?2:1.3,big?640:400,1.2);
  await Promise.all([body(c,{x:dir[0]*.1,y:dir[1]*.1-.04,r:dir[0]*12,s:big?1.24:1.14},big?640:400,'ease-in-out'),wa(mo,[{opacity:0,transform:T(0,0,ang,.2,.2)},{opacity:1,transform:T(0,0,ang,big?1.6:1,big?1.6:1)}],big?460:260)]);
  // baforada: a chama parte da boca e percorre o espaço
  if(big){tint('radial-gradient(ellipse at center,#ff7a2e22 30%,#a8281088)',1300,.9);shake()}
  sfx('fire');const dur=big?1000:650,t0=performance.now(),k=RUN;
  const aim=fail?ang+sg*26:ang,L=fail?Math.max(1.4,Math.min(Lmax*.5,rayLen(A,aim,Lmax*.5,null))):Lmax;
  const iv=setInterval(()=>{if(k!==RUN){clearInterval(iv);return}
   const p=(performance.now()-t0)/(dur*SPEED);if(p>1){clearInterval(iv);return}
   const n=big?5:3;
   for(let i=0;i<n;i++){const a2=aim+rr(-half,half)*(.35+.65*Math.random()),v=vecOf(a2),r=L*rr(.55,1)*(fail?.8:1);
    flamePuff(M.x,M.y,v[0]*r,v[1]*r,{n:1,sz:big?.5:.34,ms:(big?620:440)*(fail?.8:1)})}
   if(fail&&Math.random()<.5)smoke(M.x+dir[0]*L*.6,M.y+dir[1]*L*.6,1,.5,520)},Math.max(24,30*SPEED));
  const glowEl=mk('gl',M.x+dir[0]*L*.5,M.y+dir[1]*L*.5,{w:L*(big?1.5:1.05),css:{background:'radial-gradient(circle,#ffb34788,#ff7a2e33 45%,transparent 70%)'}});
  wa(glowEl,[{opacity:0,transform:T(0,0,0,.4)},{opacity:1,transform:T(0,0,0,1),offset:.3},{opacity:.8,offset:.8},{opacity:0,transform:T(0,0,0,1.15)}],dur+250);
  const jobs=[];
  for(const h of B.hits||[]){const p=h.p,dd=Math.hypot(p.x-A.x,p.y-A.y);                                 // a chama atinge cada alvo no momento em que chega a ele
   jobs.push(sleep(220+Math.min(1,dd/L)*(big?420:300)).then(()=>{ifx(h.hit?'fire':'wind',p.x,p.y,big?1.3:1);h.apply()}))}
  await Promise.all([sleep(dur),...jobs]);clearInterval(iv);
  await Promise.all([wa(mo,[{opacity:1},{opacity:0}],240).then(()=>kill(mo)),body(c,fail?[{x:dir[0]*.05,r:6},{r:-6},{r:3},{}]:{},fail?460:360,'ease-in-out'),sleep(260)]);
  if(fail)sfx('zap')})}

// =====================================================================
// CURA, ROUBO DE VIDA E ESPINHOS
// =====================================================================

// círculo de energia no chão, centralizado na unidade: verde para aliado, amarelo para o próprio clérigo.
// aparece aos poucos, brilha e some; onPeak() aplica a cura exatamente quando o círculo está no auge.
async function healRing(u,self,onPeak){
 const c1=self?'#f2d67e':'#4fd16a',c2=self?'#fff3b0':'#b6ffc4',R=art('rune',c1);
 const e=mk('hr',u.x,u.y,{w:1.5,html:`<span class="hrg" style="--hc:${c1}"></span>${R.svg}`});e.style.opacity=0;
 const glowEl=mk('gl',u.x,u.y,{w:2,css:{background:`radial-gradient(circle,${c2}aa,${c1}44 45%,transparent 70%)`}});glowEl.style.opacity=0;
 wa(glowEl,[{opacity:0,transform:T(0,0,0,.5)},{opacity:1,transform:T(0,0,0,1),offset:.55},{opacity:.7,offset:.8},{opacity:0,transform:T(0,0,0,1.1)}],1150);
 await wa(e,[{opacity:0,transform:T(0,0,0,.55)},{opacity:.95,transform:T(0,0,70,1)}],480,{ease:'ease-out'});             // aparece gradualmente
 sfx('chime');gather(u.x,u.y,{n:8,col:[c1,c2,'#fff'],r:.9,ms:300});
 await sleep(200);
 if(onPeak)onPeak();                                                                                                      // a cura é aplicada no auge
 burst(u.x,u.y,{n:12,col:[c1,c2,'#fff'],r:.55,ms:760,sz:.07,g:-.65});glow(u.x,u.y,c2,1.4,420);
 await wa(e,[{opacity:.95,transform:T(0,0,70,1)},{opacity:1,transform:T(0,0,110,1.08),offset:.35},{opacity:0,transform:T(0,0,160,1.25)}],620);   // brilha e desaparece
 kill(e);kill(glowEl)}
// cura manual do clérigo (botão): u = clérigo, tgt = quem recebe, apply() aplica a vida
async function healFx(u,tgt,apply){return scene(()=>healRing(tgt,tgt===u,apply))}

// roubo de vida do cajado: energia sai do inimigo e flui até o clérigo; o excedente segue para aliados feridos.
// A cura só é aplicada quando a energia chega (D.apply()); os círculos mostram a cura realmente recebida.
async function drain(c){
 const o=c.out;if(!o.drain)return;const D=o.drain();if(!D)return;
 const A=c.A,T0=c.Tg,total=D.self+D.allies.reduce((s,x)=>s+x.h,0),n=Math.min(7,2+Math.ceil(total/2));
 const flow=(p0,p1,i)=>{const e=orb(p0.x,p0.y,{size:.24,c1:'#fff',c2:'#7dff9a'});e.style.opacity=0;const ll=Math.hypot(p1.x-p0.x,p1.y-p0.y)||1,pp=[-(p1.y-p0.y)/ll,(p1.x-p0.x)/ll],am=rr(-.45,.45);
  return sleep(i*60).then(async()=>{e.style.opacity=1;await fly(e,p0,p1,300+ll*60,{sx:p=>pp[0]*am*Math.sin(Math.PI*p),sy:p=>pp[1]*am*Math.sin(Math.PI*p),trail:{col:['#7dff9a','#fff'],sz:.07,n:1,ms:260}});kill(e)})};
 sfx('chime');
 await Promise.all(Array.from({length:n},(_,i)=>flow(T0,A,i)));                                                         // energia: inimigo -> clérigo
 D.apply();                                                                                                              // a vida sobe quando a energia chega
 const jobs=[];
 if(D.self>0)jobs.push(healRing(c.a,true));                                                                              // círculo amarelo no próprio clérigo
 if(D.allies.length){                                                                                                    // excedente: clérigo -> aliados feridos
  for(const x of D.allies)jobs.push(Promise.all(Array.from({length:Math.min(4,1+x.h)},(_,i)=>flow(A,{x:x.u.x,y:x.u.y},i))).then(()=>healRing(x.u,false)))}
 await Promise.all(jobs)}

// espinhos: sobem do chão, ferem quem pisou (onPeak aplica o dano no auge) e recolhem
const SPK=`<svg viewBox="0 0 64 54" style="width:100%;height:100%;display:block;overflow:visible"><g stroke="#1a1108" stroke-width="1.5" stroke-linejoin="round"><path d="M3 52 11 14 19 52Z" fill="url(#gs)"/><path d="M15 52 25 6 35 52Z" fill="url(#gs)"/><path d="M29 52 39 10 49 52Z" fill="url(#gs)"/><path d="M44 52 52 16 60 52Z" fill="url(#gs)"/></g><path d="M25 12 25 40M39 16 39 42" stroke="#fff" stroke-width="1.2" opacity=".5"/></svg>`;
async function spikesFx(x,y,onPeak){
 return scene(async()=>{
  const sp=mk('spk',x,y,{w:1,html:SPK});sp.style.opacity=0;sfx('clang');
  await wa(sp,[{opacity:0,transform:T(0,.45,0,.55,.15)},{opacity:1,transform:T(0,-.1,0,1.1,1.3),offset:.7},{opacity:1,transform:T(0,-.04,0,1,1.18)}],170,{ease:'cubic-bezier(.2,.9,.3,1)'});   // os espinhos disparam
  burst(x,y,{n:8,col:['#fff','#ffe27a','#c4beb0'],r:.7,ms:380,sz:.07,g:.15});dust(x,y,3,.5,420);ring(x,y,'#ffe27a',.6,360,2);shake();
  if(onPeak)onPeak();
  await sleep(150);
  await wa(sp,[{opacity:1,transform:T(0,-.04,0,1,1.18)},{opacity:1,transform:T(0,0,0,1,1),offset:.4},{opacity:0,transform:T(0,.3,0,.9,.4)}],340,{ease:'ease-in'})})}

// =====================================================================
// FINALIZAÇÕES CINEMATOGRÁFICAS DOS CHEFES
// Só acontecem quando um ataque válido de um chefe reduz um personagem a 0 (game.js decide).
// Estilizadas: sem sangue nem ferimentos; a vítima some em luz e partículas.
// =====================================================================
let CINE=null;
async function cineOn(v,title,sub){
 const o=document.createElement('div');o.id='cine';
 o.innerHTML=`<i class="cb t"></i><i class="cb b"></i><div class="cv"></div><div class="cn"><small>${sub}</small><b>${title}</b></div>`;
 document.body.append(o);live.add(o);document.body.classList.add('cine');
 cam(v,true);await sleep(280);                                                              // enquadra a vítima
 const tk=tkel(v),r=tk&&tk.getBoundingClientRect();
 if(r){o.style.setProperty('--sx',(r.left+r.width/2)+'px');o.style.setProperty('--sy',(r.top+r.height/2)+'px')}
 requestAnimationFrame(()=>o.classList.add('on'));
 const bw=document.querySelector('.bwrap');
 if(bw&&!lite()){bw.style.transformOrigin=`${(v.x+.5)*cp()}px ${(v.y+.5)*cp()}px`;bw.style.transition='transform .8s cubic-bezier(.3,.7,.3,1)';bw.style.transform='scale(1.28)'}
 CINE=o;sfx('boom');
 await sleep(950)}
async function cineOut(){
 if(!CINE)return;CINE.classList.remove('on');
 const bw=document.querySelector('.bwrap');if(bw&&bw.style.transform)bw.style.transform='scale(1)';
 await sleep(650);cineOff()}
function cineOff(){
 const bw=document.querySelector('.bwrap');if(bw){bw.style.transform='';bw.style.transition='';bw.style.transformOrigin=''}
 document.querySelectorAll('#cine').forEach(e=>{live.delete(e);e.remove()});
 document.body.classList.remove('cine');CINE=null}

function finCtx(a,v){
 const A={x:a.x,y:a.y},Tg={x:v.x,y:v.y},ang=angOf(A,Tg),c={a,t:v,A,Tg,ang,dir:vecOf(ang),d:dist(a,v),ua:uel(a),bs:null};
 c.pt=f=>({x:A.x+c.dir[0]*f,y:A.y+c.dir[1]*f});return c}
const hideVictim=v=>{const u=uel(v);if(u)u.style.visibility='hidden'};
const poseOf=(e,sx=1,sy=1)=>{const p=e._p||{dx:0,dy:0,r:0,s:1};return T(p.dx,p.dy,p.r,p.s*sx,p.s*sy)};
const FIN={};

// ---------- NAJA: constrição ----------
FIN.naja=async(a,v)=>{
 await cineOn(v,'ABRAÇO DA SERPENTE','FINALIZAÇÃO');
 await scene(async()=>{
  const c=finCtx(a,v),V=c.Tg,vu=uel(v),[ux,uy]=c.dir,Ld=Math.hypot(V.x-c.A.x,V.y-c.A.y),L=Math.max(0,Ld-.95),pp=[-uy,ux],g=ghost(a);
  const kf=[];for(let i=0;i<=14;i++){const p=i/14,w=Math.sin(p*Math.PI*5)*.14*(1-.4*p);kf.push({transform:T(ux*L*p+pp[0]*w,uy*L*p+pp[1]*w,0,1+.08*p)})}
  sfx('hiss');await wa(g,kf,1000,{ease:'ease-in-out'});                                              // aproxima-se serpenteando
  const rings=[[.3,.42,.15],[0,.48,.17],[-.3,.42,.15]],k=66,
   sv=`<svg viewBox="-50 -50 100 100" style="width:100%;height:100%;overflow:visible">${rings.map(([cy,rx,ry])=>`<g><ellipse class="cr" cx="0" cy="${cy*k}" rx="${rx*k}" ry="${ry*k}" fill="none" stroke="#1a1108" stroke-width="13" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/><ellipse class="cr" cx="0" cy="${cy*k}" rx="${rx*k}" ry="${ry*k}" fill="none" stroke="#4fae48" stroke-width="9" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/><ellipse class="cr" cx="0" cy="${cy*k}" rx="${rx*k}" ry="${ry*k}" fill="none" stroke="#a6e07a" stroke-width="2.2" pathLength="1" stroke-dasharray=".05 .04" stroke-dashoffset="1"/></g>`).join('')}</svg>`;
  const coil=mk('coil',V.x,V.y,{w:1.7,html:sv});coil.style.transform='translate(-50%,-50%)';
  const hp={x:V.x-c.A.x,y:V.y-c.A.y-.78};
  wa(g,[{transform:T(ux*L,uy*L,0,1.08)},{transform:T(hp.x,hp.y,0,1.28)}],620,{ease:'ease-out'});     // a cabeça sobe por cima da vítima
  const gs=[...coil.querySelectorAll('g')];
  for(let i=0;i<3;i++){const gg=gs[i];                                                                // enrola o corpo, volta por volta (de baixo para cima)
   gg.querySelectorAll('ellipse').forEach(el=>wa(el,[{strokeDashoffset:1},{strokeDashoffset:0}],320,{ease:'ease-out',delay:i*260}));
   sfx('hiss');if(i<2)await sleep(260)}
  await sleep(380);
  // aperta de forma dramática: duas contrações com tremor
  const sq=wa(coil,[{transform:T(0,0,0,1)},{transform:T(0,0,0,.66,.8),offset:.3},{transform:T(0,0,0,.9,.95),offset:.5},{transform:T(0,0,0,.6,.74),offset:.8},{transform:T(0,0,0,.62,.78)}],1250,{ease:'ease-in-out'});
  const vs=wa(vu,[{transform:B({})},{transform:B({s:.84,sy:.92,r:-4}),offset:.3},{transform:B({s:.94,r:3}),offset:.5},{transform:B({s:.78,sy:.88,r:-5}),offset:.8},{transform:B({s:.8,sy:.9})}],1250,{own:true});
  setTimeout(()=>{sfx('stone');shake();burst(V.x,V.y,{n:8,col:['#8bd650','#d8f7b0'],r:.6,ms:420,sz:.06})},300*SPEED);
  setTimeout(()=>{snd(110,.5,'sawtooth',.06,-40);shake();ring(V.x,V.y,'#8bd650',1.1,500,3)},760*SPEED);
  await Promise.all([sq,vs]);
  // efeito de derrota: clarão e a vítima se desfaz em luz
  glow(V.x,V.y,'#d8f7b0',2.4,560);ring(V.x,V.y,'#fff',1.4,620,4,3);shake();snd(90,.6,'sine',.12,-30);
  burst(V.x,V.y,{n:16,col:['#d8f7b0','#fff','#8bd650'],r:.55,g:-1,ms:900,sz:.08});
  wa(coil,[{opacity:1,transform:T(0,0,0,.62,.78)},{opacity:0,transform:T(0,0,0,1.5,1.25)}],560);
  await wa(vu,[{opacity:1,transform:B({s:.8,sy:.9})},{opacity:0,transform:B({s:.4,y:-.3})}],520,{own:true});hideVictim(v);
  await wa(g,[{transform:T(hp.x,hp.y,0,1.28)},{transform:T(0,0,0,1)}],700,{ease:'ease-in-out'});await sleep(150)})};

// ---------- GOLEM À DISTÂNCIA: túmulo de pedra ----------
FIN.golemDist=async(a,v)=>{
 await cineOn(v,'TÚMULO DE PEDRA','FINALIZAÇÃO');
 await scene(async()=>{
  const c=finCtx(a,v),V=c.Tg,vu=uel(v),Tb=art('tomb'),tr=await tearGround(c,true);                  // arranca uma grande pedra do chão
  await sleep(120);
  const R=art('rune','#c4beb0'),rune=mk('rune',tr.up.x,tr.up.y,{w:1.8,html:R.svg});rune.style.opacity=0;
  wa(rune,[{transform:T(0,0,0,.4),opacity:0},{transform:T(0,0,200,1),opacity:.9}],600);
  gather(tr.up.x,tr.up.y,{n:14,col:['#c4beb0','#fff','#e8dcc0'],r:1,ms:560});sfx('chime');shake();await sleep(560);
  glow(tr.up.x,tr.up.y,'#e8dcc0',1.8,420);sfx('stone');                                              // a pedra é moldada até virar um túmulo
  tr.chunk.className='fz tombo';tr.chunk.innerHTML=Tb.svg;tr.chunk.style.width=cl(Tb.w*1.1);tr.chunk.style.height=cl(Tb.h*1.1);tr.chunk.style.transform=T(0,0,0,1.1);
  wa(rune,[{opacity:.9},{opacity:0}],280).then(()=>kill(rune));await sleep(380);sfx('whoosh');
  await fly(tr.chunk,tr.up,V,520,{arc:1.7,rot:'spin',spin:0,sc:[1.1,1.5]});                          // a tampa cai e se fecha sobre a vítima
  hideVictim(v);ifx('stomp',V.x,V.y,1.5);ring(V.x,V.y,'#fff',1.2,520,3,3);sfx('boom');
  await sleep(120);
  for(let i=0;i<3;i++){                                                                              // esmagamento estilizado
   await wa(tr.chunk,[{transform:poseOf(tr.chunk)},{transform:poseOf(tr.chunk,1.06,.86)},{transform:poseOf(tr.chunk)}],220);
   dust(V.x,V.y,3,.9,520);shake();sfx('stone')}
  glow(V.x,V.y,'#e8dcc0',1.8,500);await sleep(220);
  burst(V.x,V.y,{n:16,col:['#8d8478','#c4beb0','#fff'],r:1.1,ms:640,sz:.1,sq:1,g:.3});
  await wa(tr.chunk,[{opacity:1,transform:poseOf(tr.chunk)},{opacity:0,transform:poseOf(tr.chunk,1.1,1.1)}],620);kill(tr.chunk);   // o túmulo se desfaz em poeira
  await regen(tr);await sleep(150)})};

// ---------- GOLEM CORPO A CORPO: palma ----------
FIN.golemMel=async(a,v)=>{
 await cineOn(v,'PALMA ESMAGADORA','FINALIZAÇÃO');
 await scene(async()=>{
  const c=finCtx(a,v),V=c.Tg,vu=uel(v),H0=art('hand'),pa=c.ang+90,pv=vecOf(pa),far=1.6,near=.46;
  // cada mão nasce no flanco do Golem (F) e vai até o lado da vítima; s = -1 (esquerda) ou +1 (direita) no eixo perpendicular
  const mkH=s=>{const F={x:c.A.x+pv[0]*s*.75,y:c.A.y+pv[1]*s*.75},e=mk('hnd',F.x,F.y,{w:H0.w*1.1,h:H0.h*1.1,html:H0.svg});e.style.opacity=0;e.F=F;e.s=s;e.rot=s<0?pa:pa+180;return e},hL=mkH(-1),hR=mkH(1);
  const at=(h,d)=>T(V.x-h.F.x+pv[0]*h.s*d,V.y-h.F.y+pv[1]*h.s*d,h.rot,1.1),st=h=>T(0,0,h.rot,.5);
  sfx('rumble');
  await Promise.all([body(c,{y:-.1,s:1.14,sy:1.06},520,'ease-in-out'),wa(hL,[{opacity:0,transform:st(hL)},{opacity:1,transform:at(hL,far)}],620,{ease:'ease-out'}),wa(hR,[{opacity:0,transform:st(hR)},{opacity:1,transform:at(hR,far)}],620,{ease:'ease-out'})]);   // aproxima as mãos da vítima
  await Promise.all([wa(hL,[{transform:at(hL,far)},{transform:at(hL,far+.4)}],260),wa(hR,[{transform:at(hR,far)},{transform:at(hR,far+.4)}],260)]);          // abre os braços
  sfx('whoosh');
  await Promise.all([wa(hL,[{transform:at(hL,far+.4)},{transform:at(hL,near)}],140,{ease:'cubic-bezier(.6,0,1,.6)'}),wa(hR,[{transform:at(hR,far+.4)},{transform:at(hR,near)}],140,{ease:'cubic-bezier(.6,0,1,.6)'}),body(c,{y:.02,s:1.18,sy:.96},140,'ease-in')]);   // a palma
  ifx('stomp',V.x,V.y,1.5);ring(V.x,V.y,'#fff',1.3,560,4,3);glow(V.x,V.y,'#fff',2.2,400);sfx('boom');shake();
  const vs=wa(vu,[{transform:B({})},{transform:B({s:.5,sy:.95})},{transform:B({s:.55,sy:.95})}],360,{own:true});
  burst(V.x,V.y,{n:16,col:['#c4beb0','#fff','#e8dcc0'],r:1.2,ms:700,sz:.1,sq:1,g:.3});dust(V.x,V.y,6,1.2,720);
  await vs;await sleep(260);
  await wa(vu,[{opacity:1,transform:B({s:.55,sy:.95})},{opacity:0,transform:B({s:.2})}],340,{own:true});hideVictim(v);
  burst(V.x,V.y,{n:12,col:['#fff','#e8dcc0','#ffe27a'],r:.7,g:-.8,ms:800,sz:.07});
  await Promise.all([wa(hL,[{opacity:1},{opacity:0}],360),wa(hR,[{opacity:1},{opacity:0}],360),body(c,{},420,'ease-in-out')])})};

// ---------- DRAGÃO: baforada que muda de laranja/vermelho para azul ----------
const RAMP=[[0,[255,176,64]],[.3,[255,100,40]],[.46,[226,64,26]],[.62,[58,110,255]],[.8,[60,150,255]],[1,[190,232,255]]];
const rampAt=p=>{p=Math.max(0,Math.min(1,p));let i=0;while(i<RAMP.length-2&&p>RAMP[i+1][0])i++;
 const[p0,c0]=RAMP[i],[p1,c1]=RAMP[i+1],k=(p-p0)/(p1-p0||1),m=c0.map((x,j)=>Math.round(x+(c1[j]-x)*k));return m};
const rgb=(m,d=0)=>`rgb(${Math.max(0,m[0]-d)},${Math.max(0,m[1]-d)},${Math.max(0,m[2]-d)})`;
FIN.dragao=async(a,v)=>{
 await cineOn(v,'CHAMA AZUL','FINALIZAÇÃO');
 await scene(async()=>{
  const c=finCtx(a,v),V=c.Tg,vu=uel(v),g=ghost(a),[ux,uy]=c.dir,Ld=Math.hypot(V.x-c.A.x,V.y-c.A.y),L=Math.max(0,Ld-1.15),gp={x:c.A.x+ux*L,y:c.A.y+uy*L};
  sfx('rumble');await wa(g,[{transform:T(0,0)},{transform:T(ux*L,uy*L,0,1.2)}],760,{ease:'ease-in-out'});                  // aproxima-se
  const Cl=art('claw'),claw=mk('clw',V.x,V.y+.12,{w:Cl.w,html:Cl.svg});claw.style.opacity=0;
  await Promise.all([wa(claw,[{opacity:0,transform:T(gp.x-V.x,gp.y-V.y,0,.5)},{opacity:1,transform:T(0,.06,0,1)}],380,{ease:'ease-out'}),wa(g,[{transform:T(ux*L,uy*L,0,1.2)},{transform:T(ux*L,uy*L+.04,0,1.28)}],380)]);
  sfx('stone');                                                                                           // agarra e ergue a vítima com a garra
  await Promise.all([wa(vu,[{transform:B({})},{transform:B({y:-.55,s:1.14})}],480,{own:true}),wa(claw,[{transform:T(0,.06,0,1)},{transform:T(0,-.5,0,1.08)}],480)]);
  const M={x:gp.x,y:gp.y-.1};                                                                             // ergue a cabeça e prepara a baforada
  const hd=wa(g,[{transform:T(ux*L,uy*L+.04,0,1.28)},{transform:T(ux*L,uy*L-.1,ux>=0?-14:14,1.42)}],700,{ease:'ease-in-out'});
  gather(M.x,M.y,{n:16,col:['#ffd23f','#ff7a2e','#fff'],r:1.1,ms:700});glow(gp.x,gp.y,'#ff7a2e',2.2,700,1.2);sfx('rumble');await hd;
  // a baforada: laranja e vermelho no início, azul intenso no final, na MESMA rajada
  const dur=2700,t0=performance.now(),k=RUN,tgt={x:V.x,y:V.y-.5},vx=tgt.x-M.x,vy=tgt.y-M.y,ll=Math.hypot(vx,vy)||1,aim=deg(Math.atan2(vy,vx));
  const warm=mk('gl',V.x,V.y-.3,{w:3.2,css:{background:'radial-gradient(circle,#ffb347cc,#ff6a2e66 45%,transparent 72%)'}}),cold=mk('gl',V.x,V.y-.3,{w:3.6,css:{background:'radial-gradient(circle,#bfe6ffcc,#2a6bff88 45%,transparent 72%)'}});
  warm.style.opacity=0;cold.style.opacity=0;
  wa(warm,[{opacity:0},{opacity:1,offset:.12},{opacity:.9,offset:.35},{opacity:0,offset:.62},{opacity:0}],dur,{ease:'linear'});
  wa(cold,[{opacity:0},{opacity:0,offset:.35},{opacity:.85,offset:.62},{opacity:1,offset:.85},{opacity:0}],dur,{ease:'linear'});
  tint('radial-gradient(ellipse at center,#ff7a2e22 20%,#a8281099)',1500,.95);setTimeout(()=>{if(k===RUN)tint('radial-gradient(ellipse at center,#3a7bff22 20%,#0a2a8a99)',1500,.95)},1350*SPEED);
  sfx('fire');
  const iv=setInterval(()=>{if(k!==RUN){clearInterval(iv);return}
   const p=(performance.now()-t0)/(dur*SPEED);if(p>1){clearInterval(iv);return}
   const m=rampAt(p),m2=rampAt(Math.min(1,p+.14));
   for(let i=0;i<4;i++){const a2=aim+rr(-14,14),vv=vecOf(a2),r=ll*rr(.7,1.15),e=mk('fl',M.x,M.y,{w:rr(.28,.5),self:900,css:{'--f1':rgb(m,i*8),'--f2':rgb(m2,60)}});
    wa(e,[{transform:T(0,0,0,.4),opacity:.95},{transform:T(vv[0]*r*.55,vv[1]*r*.55,0,1),opacity:.9,offset:.5},{transform:T(vv[0]*r,vv[1]*r,0,1.5),opacity:0}],rr(420,620),{ease:'ease-out'}).then(()=>kill(e))}
   if(p>.55&&Math.random()<.5)burst(V.x+rr(-.3,.3),V.y-.4,{n:2,col:['#bfe6ff','#fff','#4fa0ff'],r:.5,g:-.5,ms:520,sz:.06})},Math.max(24,32*SPEED));
  const vf=wa(vu,[{transform:B({y:-.55,s:1.14}),opacity:1},{transform:B({y:-.58,s:1.12,r:-4}),opacity:1,offset:.35},{transform:B({y:-.55,s:1.16,r:4}),opacity:1,offset:.6},{transform:B({y:-.6,s:1.0}),opacity:.55,offset:.85},{transform:B({y:-.8,s:.7}),opacity:0}],dur,{own:true,ease:'linear'});
  setTimeout(()=>shake(),500*SPEED);setTimeout(()=>shake(),1500*SPEED);
  await Promise.all([vf,sleep(dur)]);clearInterval(iv);hideVictim(v);
  // a chama se apaga em brasas azuis
  glow(V.x,V.y-.3,'#bfe6ff',2.6,700);burst(V.x,V.y-.4,{n:18,col:['#bfe6ff','#fff','#4fa0ff'],r:.8,g:-1.1,ms:1000,sz:.07});sfx('chime');
  await Promise.all([wa(claw,[{opacity:1},{opacity:0}],420),sleep(450)]);
  await wa(g,[{transform:T(ux*L,uy*L-.1,ux>=0?-14:14,1.42)},{transform:T(0,0,0,1)}],820,{ease:'ease-in-out'});await sleep(150)})};

// ponto de entrada: o tipo de finalização depende do chefe e do ataque que causou a derrota
async function finisher(o){
 const a=o.a,v=o.t,key=a.k==='naja'?'naja':a.k==='golem'?(o.ranged?'golemDist':'golemMel'):a.k==='dragao'?'dragao':null;
 if(!key||!FIN[key])return;
 try{await FIN[key](a,v)}catch(e){console.error('finalização',key,e)}
 try{await cineOut()}catch(e){cineOff()}
 hideVictim(v)}

// =====================================================================
// API pública (usada por game.js)
// =====================================================================
window.CFX={
 play,                  // anima um ataque; out = resolução já calculada em game.js (out.apply() é chamado no impacto)
 breath:dragonBreath,   // baforada em cone do Dragão
 finish:finisher,       // finalização cinematográfica de chefe
 spikes:spikesFx,       // espinhos disparando (onPeak aplica o dano no auge)
 heal:healFx,           // círculo de cura (verde: aliado, amarelo: o próprio clérigo)
 reset,                 // limpa efeitos, zoom e overlays (sair da partida / nova partida)
 rayLen,                // distância livre de um projétil (usado também nos testes)
 live:()=>live.size,    // diagnóstico: elementos de efeito vivos
 scenes:()=>SCS.length  // diagnóstico: cenas em andamento
};
})();
