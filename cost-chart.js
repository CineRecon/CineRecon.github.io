// Same cost scale and pairwise nondominance rule as the paper plot.
export function paretoFrontier(rows){return rows.filter(p=>!rows.some(q=>q.cost<=p.cost&&q.score>=p.score&&(q.cost<p.cost||q.score>p.score))).sort((a,b)=>a.cost-b.cost)}
const providers={gpt6:'openai',gpt56:'openai',opus55:'anthropic',opus55_low:'anthropic',opus48:'anthropic',glm53flash:'zai',qwen38flash:'qwen',qwen38max:'qwen',deepseek41flash:'deepseek',kimik3:'moonshot',grok46:'xai',gemini31:'google',gemini38_flash:'google'};
const colors={openai:'#111111',anthropic:'#B56F50',zai:'#355CAE',qwen:'#6652B9',deepseek:'#496AE3',moonshot:'#343942',xai:'#222D37',google:'#4285D4'};
const logos={google:'google-color',qwen:'qwen-color',deepseek:'deepseek-color'};
const offsets={gpt6:[0,-30],gpt56:[0,29],opus48:[0,31],glm53flash:[0,29],qwen38flash:[0,18],qwen38max:[0,31],deepseek41flash:[0,-31],kimik3:[18,-28],grok46:[-12,30],gemini31:[40,-8],opus55:[0,-31],gemini38_flash:[32,-8],opus55_low:[0,-33]};
export function renderCostChart(root,rows){
 const ns='http://www.w3.org/2000/svg',W=1000,H=465;
 const make=(tag,attrs={},text,parent)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));if(text!==undefined)e.textContent=text;parent?.append(e);return e};
 const svg=make('svg',{viewBox:`0 0 ${W} ${H}`,role:'group','aria-label':'Overall score versus generation cost, logarithmic cost axis'});root.replaceChildren(svg);
 const x=v=>65+Math.log(v/.23)/Math.log(36/.23)*880,y=v=>409-(v-15)/70*374;
 for(let v=20;v<=80;v+=10){make('line',{x1:65,x2:945,y1:y(v),y2:y(v),stroke:'#e3e8ec'},undefined,svg);make('text',{x:51,y:y(v)+4,'text-anchor':'end',class:'axis-text'},v,svg)}
 make('path',{d:'M65 35V409H945',stroke:'#aeb8c1',fill:'none'},undefined,svg);
 for(const v of [.25,.5,1,2,5,10,20])make('text',{x:x(v),y:429,'text-anchor':'middle',class:'axis-text'},v,svg);
 make('text',{x:65,y:21,class:'axis-title'},'Overall score (%)',svg);make('text',{x:505,y:457,'text-anchor':'middle',class:'axis-title'},'Generation cost (USD / video, log scale)',svg);
 const frontier=paretoFrontier(rows),frontierIds=new Set(frontier.map(r=>r.model));
 make('path',{d:frontier.map((r,i)=>`${i?'L':'M'}${x(r.cost)},${y(r.score)}`).join(' '),fill:'none',stroke:'#48857b','stroke-width':2,'stroke-dasharray':'7 5',class:'pareto-line','data-models':frontier.map(r=>r.model).join(',')},undefined,svg);
 make('line',{x1:83,x2:125,y1:54,y2:54,stroke:'#48857b','stroke-width':2,'stroke-dasharray':'7 5'},undefined,svg);make('text',{x:135,y:58,fill:'#48857b','font-size':13},'Pareto frontier',svg);
 const guides=make('g',{visibility:'hidden','pointer-events':'none'},undefined,svg);const gx=make('line',{stroke:'#9caab7','stroke-dasharray':'3 4'},undefined,guides),gy=make('line',{stroke:'#9caab7','stroke-dasharray':'3 4'},undefined,guides);
 const tooltip=make('g',{visibility:'hidden','pointer-events':'none',class:'cost-tooltip',role:'tooltip'},undefined,null);
 make('rect',{width:274,height:80,rx:6,fill:'#fff',stroke:'#bac6d3','stroke-width':1.2},undefined,tooltip);
 const name=make('text',{x:14,y:24,'font-size':14,'font-weight':600,fill:'#202632'},'',tooltip),score=make('text',{x:14,y:48,'font-size':13,fill:'#202632'},'',tooltip),cost=make('text',{x:14,y:69,'font-size':13,fill:'#202632'},'',tooltip);
 let pinned=null;const groups=[];
 function show(r){groups.forEach(g=>g.classList.toggle('is-active',g.dataset.model===r.model));const px=x(r.cost),py=y(r.score);tooltip.setAttribute('transform',`translate(${Math.max(70,Math.min(665,px+18))},${Math.max(72,Math.min(298,py-115))})`);name.textContent=r.name;score.textContent=`Overall score: ${r.score.toFixed(2)}%`;cost.textContent=`Generation cost: $${r.cost.toFixed(4)} / video`;tooltip.setAttribute('visibility','visible');guides.setAttribute('visibility','visible');Object.entries({x1:px,x2:px,y1:py,y2:409}).forEach(([k,v])=>gx.setAttribute(k,v));Object.entries({x1:65,x2:px,y1:py,y2:py}).forEach(([k,v])=>gy.setAttribute(k,v))}
 function hide(){if(pinned){show(pinned);return}tooltip.setAttribute('visibility','hidden');guides.setAttribute('visibility','hidden');groups.forEach(g=>g.classList.remove('is-active'))}
 rows.forEach(r=>{const px=x(r.cost),py=y(r.score),provider=providers[r.model],color=colors[provider];const g=make('g',{tabindex:0,role:'button','aria-label':`${r.name}: score ${r.score.toFixed(2)}%, cost $${r.cost.toFixed(4)} per video${frontierIds.has(r.model)?', Pareto frontier':''}`,'data-model':r.model,class:'cost-point'},undefined,svg);groups.push(g);
 make('circle',{cx:px,cy:py,r:13,fill:'transparent',class:'point-hit'},undefined,g);
 if(frontierIds.has(r.model))make('circle',{cx:px,cy:py,r:9,fill:'none',stroke:'#48857b','stroke-width':1.4},undefined,g);
 make('circle',{cx:px,cy:py,r:5.8,fill:color,stroke:'#fff','stroke-width':1.5,class:'point-dot'},undefined,g);
 const [dx,dy]=offsets[r.model]||[0,-25],lx=px+dx,ly=py+dy;
 make('image',{href:`assets/logos/${logos[provider]||provider}.svg`,x:lx-8,y:dy<0?ly-16:ly-3,width:16,height:16},undefined,g);
 make('text',{x:lx,y:dy<0?ly-22:ly+27,'text-anchor':'middle','font-size':14,fill:color,'font-weight':r.model==='opus55'?600:500,'paint-order':'stroke',stroke:'#fff','stroke-width':3,'stroke-linejoin':'round'},r.name,g);
 g.onpointerenter=()=>show(r);g.onpointerleave=hide;g.onfocus=()=>show(r);g.onblur=hide;g.onclick=()=>{pinned=pinned?.model===r.model?null:r;pinned?show(r):hide()};g.onkeydown=e=>{if(e.key==='Escape'){pinned=null;hide()}else if(e.key==='Enter'||e.key===' '){e.preventDefault();g.onclick()}};
 });svg.append(tooltip);svg.onpointerleave=hide;
}
