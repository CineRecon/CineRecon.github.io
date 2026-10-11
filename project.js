import {renderHumanAlignment} from './human-alignment.js';
import {renderCostChart} from './cost-chart.js';
import {createVideoComparison} from './video-comparison.js';
const $=s=>document.querySelector(s);
const settings={L1:'Proxy',L2:'Simplified',L3:'Detailed'};
const descriptions={L1:'Geometric stand-ins, with the same camera and dynamic requirements.',L2:'Simplified shapes and appearance.',L3:'Reference-specific appearance and details.'};
const json=async path=>{const r=await fetch(`assets/${path}.json`);if(!r.ok)throw Error(path);return r.json()};
function selectButtons(selector,current,key){document.querySelectorAll(selector).forEach(b=>{const on=b.dataset[key]===current;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))})}
const deferredSections=new Set();
function lazy(root,fn){let done=false;const run=()=>{if(done)return;done=true;observer.disconnect();deferredSections.delete(run);fn()};const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))run()},{rootMargin:'200px'});deferredSections.add(run);observer.observe(root)}
async function initGallery(){
 const [data,caseScores]=await Promise.all([json('showcase'),json('case-scores')]);let caseIndex=Math.max(0,data.cases.findIndex(c=>c.id==='11')),setting='L3',player=null,previous=-1,showAll=false;
 const featured=['opus55','gpt6','kimik3','deepseek41flash','grok46'];
 const picker=$('#case-picker'),strip=$('#case-strip');
 data.cases.forEach((c,i)=>{picker.add(new Option(c.title,String(i)));const b=document.createElement('button');b.dataset.case=String(i);const img=document.createElement('img');img.src=c.thumbnail;img.alt='';img.loading='lazy';const label=document.createElement('span');label.textContent=c.title;b.append(img,label);b.onclick=()=>{caseIndex=i;picker.value=String(i);draw()};strip.append(b)});
 picker.value=String(caseIndex);
 function draw(){const c=data.cases[caseIndex],time=previous===caseIndex?player?.getTime()||0:0;player?.destroy();previous=caseIndex;
 $('#active-case-name').textContent=c.title;$('#case-position').textContent=`${caseIndex+1} / ${data.cases.length}`;selectButtons('[data-case]',String(caseIndex),'case');selectButtons('[data-setting]',setting,'setting');$('#setting-description').textContent=descriptions[setting];
 const models=showAll?Object.keys(data.models):featured;
 $('#gallery-model-count').textContent=`${models.length} models · scores / 100`;
 $('#gallery-show-all').textContent=showAll?'Show fewer models':'View all 12 models';$('#gallery-show-all').setAttribute('aria-expanded',String(showAll));
 player=createVideoComparison($('#comparison-grid'),[{label:'Reference video',src:c.reference,poster:c.thumbnail},...models.map(m=>({label:data.models[m],detail:settings[setting],src:c.videos[m]?.[setting],metrics:caseScores.cases[c.id]?.[m]?.[setting]}))],{title:'Reconstruction comparison',initialTime:time});
 }
 const revealSelection=()=>{const b=strip.querySelector(`[data-case="${caseIndex}"]`);strip.scrollTo({left:b.offsetLeft-strip.offsetLeft-(strip.clientWidth-b.clientWidth)/2,behavior:'smooth'})};
 $('#gallery-show-all').onclick=()=>{showAll=!showAll;draw()};
 picker.onchange=()=>{caseIndex=Number(picker.value);draw();revealSelection()};
 document.querySelectorAll('[data-setting]').forEach(b=>b.onclick=()=>{setting=b.dataset.setting;draw()});
 // Native touch/trackpad scrolling, plus mouse drag without accidental selection.
 let drag=null,suppressClick=false;
 strip.addEventListener('dragstart',e=>e.preventDefault());
 strip.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;suppressClick=false;drag={x:e.clientX,left:strip.scrollLeft,id:e.pointerId,moved:false}});
 strip.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x;if(!drag.moved&&Math.abs(dx)>6){drag.moved=true;strip.setPointerCapture(drag.id);strip.classList.add('dragging')}if(drag.moved){e.preventDefault();strip.scrollLeft=drag.left-dx}});
 const endDrag=()=>{if(!drag)return;suppressClick=drag.moved;if(strip.hasPointerCapture(drag.id))strip.releasePointerCapture(drag.id);drag=null;strip.classList.remove('dragging')};
 strip.addEventListener('pointerup',endDrag);strip.addEventListener('pointercancel',endDrag);strip.addEventListener('pointerleave',()=>{if(drag&&!drag.moved)endDrag()});
 strip.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();suppressClick=false}},true);
 const step=delta=>{caseIndex=(caseIndex+delta+data.cases.length)%data.cases.length;picker.value=String(caseIndex);draw();revealSelection()};$('#cases-prev').onclick=()=>step(-1);$('#cases-next').onclick=()=>step(1);lazy($('#compare'),draw);
}
// Linked row/column inspection, shared by both score heatmaps.
function enableHeatmapInspection(table){
 let active=null;
 const clear=()=>{table.querySelectorAll('.heat-row,.heat-column,.heat-axis,.heat-selected').forEach(e=>e.classList.remove('heat-row','heat-column','heat-axis','heat-selected'));active=null};
 const select=cell=>{
  if(!cell||cell.cellIndex===0||!cell.closest('tbody')||cell.closest('table')!==table)return;
  if(active===cell)return;clear();active=cell;
  const col=cell.cellIndex,row=cell.parentElement;
  for(const r of table.rows){const c=r.cells[col];if(c)c.classList.add(r.parentElement.tagName==='THEAD'?'heat-axis':'heat-column')}
  for(const c of row.cells)c.classList.add('heat-row');
  row.cells[0].classList.add('heat-axis');cell.classList.add('heat-selected');
 };
 table.addEventListener('pointerover',e=>select(e.target.closest('td')));
 table.addEventListener('pointerleave',()=>{clear();select(document.activeElement.closest?.('td'))});
 table.addEventListener('focusin',e=>select(e.target.closest('td')));
 table.addEventListener('focusout',clear);
 table.addEventListener('click',e=>{if(e.target.closest('thead'))clear()},true);
 table.closest('.result-view')?.addEventListener('change',clear);
}
function heat(v){const a=[246,248,252],b=[134,159,208];return `rgb(${a.map((x,i)=>Math.round(x+(b[i]-x)*v/100)).join(',')})`}
async function initResults(){const data=await json('results');function draw(){const level=$('#result-setting').value,sort=$('#result-sort').value;document.querySelectorAll('#scores-view th').forEach((th,i)=>{if(i)th.setAttribute('aria-sort',['overall','camera','static','dynamic'][i-1]===sort?'descending':'none')});const rows=data.models.map(m=>{let r={model:m};for(const dim of ['camera','static','dynamic'])r[dim]=(level==='mean'?['L1','L2','L3']:[level]).reduce((sum,l)=>sum+data.scores[m][l][dim],0)/(level==='mean'?3:1);r.overall=(r.camera+r.static+r.dynamic)/3;return r}).sort((a,b)=>b[sort]-a[sort]);$('#result-rows').replaceChildren(...rows.map((r,i)=>{const tr=document.createElement('tr');tr.innerHTML=`<td><span class="rank">${String(i+1).padStart(2,'0')}</span>${data.names[r.model]}${i<3?` <span class="rank-medal" role="img" aria-label="${['Gold','Silver','Bronze'][i]} medal" title="Rank ${i+1}">${['🥇','🥈','🥉'][i]}</span>`:''}</td>`;for(const dim of ['overall','camera','static','dynamic']){const td=document.createElement('td');td.textContent=r[dim].toFixed(1);td.style.backgroundColor=heat(r[dim]);td.className=dim==='overall'?'overall-cell':'';td.tabIndex=0;td.setAttribute('aria-label',`${data.names[r.model]}, ${dim}: ${r[dim].toFixed(1)} out of 100`);tr.append(td)}return tr}));}$('#result-setting').onchange=draw;$('#result-sort').onchange=draw;draw();
 const cats=[['camera_translation','Translation'],['camera_rotation','Rotation'],['camera_zoom','Zoom'],['camera_position','Position'],['camera_target','Target'],['cut_count','Cuts'],['object_presence','Presence'],['object_appearance','Appearance'],['object_relation','Relations'],['object_motion','Motion'],['action_event','Actions']];
 document.querySelectorAll('#scores-view th').forEach((th,i)=>{if(!i)return;const dim=['overall','camera','static','dynamic'][i-1],button=document.createElement('button');button.textContent=th.textContent;button.title=`Rank by ${dim}`;button.onclick=()=>{$('#result-sort').value=dim;draw()};th.replaceChildren(button)});
 const controls=document.createElement('div');controls.className='results-toolbar';controls.innerHTML='<label>Representation <select id="category-setting" aria-label="Category representation"><option value="mean">All settings · mean</option><option value="L1">Proxy</option><option value="L2">Simplified</option><option value="L3">Detailed</option></select></label><span class="section-note">Click a column to rank models.</span>';$('#category-table').before(controls);
 const table=document.createElement('table');table.className='score-table category-scores';table.innerHTML='<thead><tr><th>Model</th>'+cats.map(([key,n])=>`<th><button data-category="${key}">${n}</button></th>`).join('')+'</tr></thead>';const body=document.createElement('tbody');table.append(body);$('#category-table').append(table);let categorySort=null;
 function drawCategories(){const level=$('#category-setting').value;const rows=data.models.map(m=>{const r={model:m};cats.forEach(([c])=>{const values=(level==='mean'?['L1','L2','L3']:[level]).map(l=>data.scores[m][l][c]).filter(v=>Number.isFinite(v));r[c]=values.length?values.reduce((a,b)=>a+b,0)/values.length:null});return r});if(categorySort)rows.sort((a,b)=>(b[categorySort]??-1)-(a[categorySort]??-1));body.replaceChildren(...rows.map(r=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${data.names[r.model]}</td>`;cats.forEach(([c,label])=>{const v=r[c],td=document.createElement('td');td.textContent=v===null?'—':v.toFixed(1);td.title=`${data.names[r.model]} · ${label}: ${v===null?'Not evaluated in this setting':v.toFixed(3)+'%'}`;td.style.background=heat(v||0);td.tabIndex=0;td.setAttribute('aria-label',td.title);tr.append(td)});return tr}));table.querySelectorAll('th button').forEach(b=>{const active=b.dataset.category===categorySort;b.classList.toggle('sorted',active);b.parentElement.setAttribute('aria-sort',active?'descending':'none')})}
 table.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{categorySort=b.dataset.category;drawCategories()});$('#category-setting').onchange=drawCategories;drawCategories();
 enableHeatmapInspection(table);enableHeatmapInspection($('#scores-view table')); 

}
async function initAlignment(){renderHumanAlignment($('#alignment-chart'),await json('human-alignment'))}
async function initCost(){renderCostChart($('#cost-chart'),await json('costs'))}
async function initExamples(){const examples=await json('checklist-examples');const contact=examples.find(e=>e.key==='contact');const annotation=await json('annotation-example');let contactPlayer;
 function ensureContact(){if(!contactPlayer)contactPlayer=createVideoComparison($('#contact-videos'),contact.rows.filter(r=>r.label!=='GPT-6 Astra').map(({score,...r})=>({...r,src:r.label==='Reference'?'assets/showcase/annotation_ref_v2.mp4':'assets/showcase/annotation_opus55_v2.mp4'})),{title:'Appendix scoring example',initialTime:0});}
 $('#checklist-example').ontoggle=()=>{if($('#checklist-example').open)ensureContact();else contactPlayer?.pause()};
 for(const item of annotation.checks){const tr=document.createElement('tr');const cat=document.createElement('td'),frames=document.createElement('td'),statement=document.createElement('td'),rating=document.createElement('td'),button=document.createElement('button');cat.textContent=item.category;button.type='button';button.className='annotation-frame';button.textContent=item.frames;button.setAttribute('aria-label',`Inspect ${item.category}, frames ${item.frames}`);button.onclick=()=>{ensureContact();contactPlayer.pause();contactPlayer.seek(item.startFrame/annotation.fps);$('#annotation-checks').querySelectorAll('tr').forEach(row=>row.classList.toggle('selected',row===tr))};frames.append(button);statement.textContent=item.statement;rating.className=item.score===1?'check-pass':'check-fail';rating.textContent=item.score===1?'✓ 1':'× 0';rating.setAttribute('aria-label',item.score===1?'Satisfied, 1':'Missed, 0');tr.append(cat,frames,statement,rating);$('#annotation-checks').append(tr);}

 const descriptions={placement:'La La Land · Detailed. The foreground performer and seated person should occupy the divider between the traffic lanes. Opus 5.5 partly matches these relations; GPT-6 Astra misses the item.',flowers:'Moonrise Kingdom · Proxy. The character turns and spreads the paper between the two people. Opus 5.5 reproduces this interaction; GPT-6 Astra misses the specified action.','camera-roll':'Stadium FPV · Detailed. Near the end of the clip, the reference rolls until the near edge of the pitch is almost horizontal. Opus 5.5 keeps a steep tilt; GPT-6 Astra rotates but leaves this edge steeply tilted.',contact:'Forrest Gump · Simplified. The crouching person’s hand should support the body on the ground. Opus 5.5 misses this contact relation; GPT-6 Astra satisfies the item.',landing:'Parkour gameplay · Proxy. The character descends, lands on one foot and draws the arms inward. Both models miss the specified landing sequence.',steering:'F1 gameplay · Proxy. Simpler appearance requirements still leave errors in the direction and timing of steering motion.'};let player;
 function draw(key){const e=examples.find(x=>x.key===key);player?.destroy();selectButtons('[data-finding]',key,'finding');$('#finding-description').textContent=descriptions[key];$('#finding-statement').textContent=e.statement;
 const entityRoot=$('#finding-entities');entityRoot.replaceChildren();entityRoot.hidden=!e.entities?.length;
 if(e.entities?.length){const heading=document.createElement('h4');heading.textContent='Entities in the reference clip';const list=document.createElement('dl');for(const entity of e.entities){const term=document.createElement('dt'),description=document.createElement('dd');term.textContent=entity.name;description.textContent=entity.description;list.append(term,description)}entityRoot.append(heading,list)}
 player=createVideoComparison($('#finding-videos'),e.rows,{title:'Checklist comparison',initialTime:0})}
 document.querySelectorAll('[data-finding]').forEach(b=>b.onclick=()=>draw(b.dataset.finding));lazy($('#analysis'),()=>draw('steering'));
}
async function initAblation(){
 const data=await json('ablation');let player=null;
 const tabs=$('#ablation-tabs');
 function draw(key){const c=data.cases.find(c=>c.key===key);player?.destroy();selectButtons('[data-ablation]',key,'ablation');$('#ablation-description').textContent=c.description;player=createVideoComparison($('#ablation-videos'),c.videos,{title:'Iteration and effort ablation'});}
 for(const c of data.cases){const button=document.createElement('button'),img=document.createElement('img'),text=document.createElement('span'),name=document.createElement('strong'),focus=document.createElement('small');button.dataset.ablation=c.key;img.src=c.thumbnail;img.alt='';name.textContent=c.title;focus.textContent=c.focus;text.append(name,focus);button.append(img,text);button.onclick=()=>draw(c.key);tabs.append(button);}
 lazy($('#ablation'),()=>{if(!player)draw(data.cases[0].key)});
 $('#ablation-scores').innerHTML=Object.entries(data.scores).map(([name,s])=>`<div><span>${name}</span><div class="score-bar"><i style="width:${s.Overall}%"></i></div><strong>${s.Overall.toFixed(1)}</strong></div>`).join('');
}

const pageContentReady=Promise.all([initGallery,initResults,initCost,initExamples,initAblation,initAlignment].map(init=>init().catch(e=>{console.error('Page content could not load',e)})));
// Lay out deferred video sections before jumping to the bottom of the page.
async function showCitation(){await pageContentReady;for(const run of [...deferredSections])run();requestAnimationFrame(()=>document.querySelector('#citation').scrollIntoView({behavior:'smooth',block:'start'}))}
$('a[href="#citation"]').addEventListener('click',event=>{event.preventDefault();if(location.hash!=='#citation')history.pushState(null,'','#citation');showCitation()});
if(location.hash==='#citation')showCitation();

// A single outline follows the responsive L-shaped reconstruction surface.
{
 const workspace=$('#explore .workspace'),rendered=$('#rendered').closest('article'),scene=$('#explore .scene-panel');
 const ns='http://www.w3.org/2000/svg',outline=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path');
 outline.classList.add('reconstruction-outline');outline.setAttribute('aria-hidden','true');outline.append(path);workspace.append(outline);
 function updateOutline(){
  const box=workspace.getBoundingClientRect(),a=rendered.getBoundingClientRect(),b=scene.getBoundingClientRect();
  const inset=.8,r=5,w=box.width-inset,h=box.height-inset;
  const x=Math.max(a.left,b.left)-box.left+inset,y=Math.max(a.top,b.top)-box.top+inset;
  outline.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
  path.setAttribute('d',`M ${x+r} ${inset} H ${w-r} Q ${w} ${inset} ${w} ${inset+r} V ${h-r} Q ${w} ${h} ${w-r} ${h} H ${inset+r} Q ${inset} ${h} ${inset} ${h-r} V ${y+r} Q ${inset} ${y} ${inset+r} ${y} H ${x} V ${inset+r} Q ${x} ${inset} ${x+r} ${inset} Z`);
 }
 const resize=new ResizeObserver(updateOutline);[workspace,rendered,scene].forEach(el=>resize.observe(el));updateOutline();
}
