const providers={gpt6:'openai',gpt56:'openai',opus55:'anthropic',opus48:'anthropic',glm53flash:'zai',qwen38flash:'qwen-color',qwen38max:'qwen-color',deepseek41flash:'deepseek-color',kimik3:'moonshot',grok46:'xai',gemini31:'google-color',gemini38flash:'google-color'};
const dashed=new Set(['opus48','gpt56','qwen38flash','gemini38flash']);
const order=['opus55','opus48','gpt6','gpt56','kimik3','deepseek41flash','grok46','glm53flash','qwen38max','qwen38flash','gemini31','gemini38flash'];
const positions={grok46:[43,60],glm53flash:[36,52],gemini38flash:[53,55],qwen38max:[47,43],opus48:[31,28],gpt56:[22,36],qwen38flash:[38,38],kimik3:[62,64],deepseek41flash:[67,52]};
export function renderHumanAlignment(root,data){
 const ns='http://www.w3.org/2000/svg';
 const make=(tag,attrs,text,parent)=>{const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);if(text!==undefined)el.textContent=text;parent?.append(el);return el};
 const svg=make('svg',{viewBox:'0 0 720 380',role:'group','aria-label':'Human and automatic pairwise win rates across twelve models'});
 const x=v=>57+v*6.35,y=v=>328-v*2.95;
 root.replaceChildren(svg);
 for(let v=0;v<=100;v+=20){make('path',{d:`M${x(v)} 33V328 M57 ${y(v)}H692`,fill:'none',stroke:'#e8ecf1'},undefined,svg);make('text',{x:x(v),y:348,'text-anchor':'middle',class:'axis-text'},v,svg);make('text',{x:46,y:y(v)+4,'text-anchor':'end',class:'axis-text'},v,svg)}
 make('text',{x:57,y:18,class:'axis-title'},'Automatic win rate (%)',svg);
 make('text',{x:375,y:373,'text-anchor':'middle',class:'axis-title'},'Human win rate (%)',svg);
 make('path',{d:'M57 33V328H692',fill:'none',stroke:'#9faebb'},undefined,svg);
 make('path',{d:`M57 328L692 33`,fill:'none',stroke:'#a8b5c4','stroke-dasharray':'5 5'},undefined,svg);
 const guides=make('path',{fill:'none',stroke:'#6681a3','stroke-dasharray':'3 4',visibility:'hidden','pointer-events':'none'},undefined,svg);
 const detail=document.createElement('div');detail.className='alignment-detail';detail.setAttribute('aria-live','polite');detail.textContent='Hover over a model or select its name below.';
 const legend=document.createElement('div');legend.className='alignment-legend';
 root.append(detail,legend);
 const groups=new Map(),buttons=new Map();let pinned=null;
 function show(r){groups.forEach((g,k)=>g.classList.toggle('selected',k===r.id));buttons.forEach((b,k)=>{b.classList.toggle('selected',k===r.id);b.setAttribute('aria-pressed',String(k===r.id))});guides.setAttribute('d',`M57 ${y(r.automatic)}H${x(r.human)}V328`);guides.setAttribute('visibility','visible');detail.replaceChildren();const name=document.createElement('strong');name.textContent=r.name;const values=document.createElement('span');values.textContent=`Human ${r.human.toFixed(2)}%  ·  Automatic ${r.automatic.toFixed(2)}%`;detail.append(name,values)}
 function clear(){if(pinned)return show(pinned);guides.setAttribute('visibility','hidden');groups.forEach(g=>g.classList.remove('selected'));buttons.forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false')});detail.textContent='Hover over a model or select its name below.'}
 function events(el,r){el.onpointerenter=()=>show(r);el.onpointerleave=clear;el.onfocus=()=>show(r);el.onblur=clear;el.onclick=()=>{pinned=pinned?.id===r.id?null:r;pinned?show(r):clear()};el.onkeydown=e=>{if(e.key==='Escape'){pinned=null;clear()}else if((e.key==='Enter'||e.key===' ')&&el.tagName.toLowerCase()==='g'){e.preventDefault();el.onclick()}}}
 for(const id of order){const r=data.models.find(m=>m.id===id);const [hx,ay]=positions[id]||[r.human,r.automatic],cx=x(hx),cy=y(ay),url=`assets/logos/${providers[id]}.svg`;
  const g=make('g',{class:'alignment-point',tabindex:0,role:'button','aria-label':`${r.name}, human ${r.human.toFixed(2)}%, automatic ${r.automatic.toFixed(2)}%`,'data-model':id},undefined,svg);groups.set(id,g);
  if(positions[id]){make('line',{x1:x(r.human),y1:y(r.automatic),x2:cx,y2:cy,stroke:'#8998aa','stroke-width':1},undefined,g);make('circle',{cx:x(r.human),cy:y(r.automatic),r:2.7,fill:'#45576e',stroke:'white','stroke-width':1},undefined,g)}
  make('circle',{cx,cy,r:13,fill:'white',stroke:'#222','stroke-width':1.4,...(dashed.has(id)?{'stroke-dasharray':'3 2'}:{})},undefined,g);
  make('image',{href:url,x:cx-8,y:cy-8,width:16,height:16,'pointer-events':'none'},undefined,g);events(g,r);
  const button=document.createElement('button');button.type='button';button.dataset.model=id;button.setAttribute('aria-pressed','false');const badge=document.createElement('span');badge.className='alignment-badge'+(dashed.has(id)?' dashed':'');const img=document.createElement('img');img.src=url;img.alt='';badge.append(img);const label=document.createElement('span');label.textContent=r.name;button.append(badge,label);legend.append(button);buttons.set(id,button);events(button,r);
 }
}
