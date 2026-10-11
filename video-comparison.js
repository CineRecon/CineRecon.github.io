// Synchronized, timestamp-preserving video groups. Reference is the playback clock.
export function createVideoComparison(root,entries,{title='Video comparison',initialTime=0,inspectTime=null}={}){
 root.replaceChildren();root.className='video-comparison';root.setAttribute('aria-label',title);
 const grid=document.createElement('div');grid.className='comparison-videos';grid.style.setProperty('--columns',entries.length);root.append(grid);
 let alive=true,ready=false,playing=false,duration=0,speed=1,raf=0,busy=false;
 const abort=new AbortController(),options={signal:abort.signal};
 const videos=entries.map(entry=>{
  const card=document.createElement('article');card.className='comparison-video-card';
  const label=document.createElement('div');label.className='comparison-video-label';
  const name=document.createElement('strong');name.textContent=entry.label==='Reference'?'Reference clip':entry.label;label.append(name);
  const detail=document.createElement('span');detail.textContent=entry.detail||'';label.append(detail);
  if(entry.score!==undefined){const badge=document.createElement('span');badge.className=`verdict ${entry.score===1?'yes':entry.score===0?'no':'partial'}`;badge.textContent=entry.score===1?'✓ Satisfied':entry.score===0?'× Missed':'Partly satisfied';label.append(badge)}
  if(!entry.src){const missing=document.createElement('div');missing.className='video-unavailable';missing.textContent='Video unavailable';card.append(label,missing);grid.append(card);return null}
  const v=document.createElement('video');v.src=entry.src;v.poster=entry.poster||'';v.preload='metadata';v.muted=true;v.playsInline=true;v.setAttribute('aria-label',`${title} — ${name.textContent}`);card.append(label,v);
  if(entry.metrics){
   const scores=entry.metrics,format=value=>Number.isFinite(value)?value.toFixed(1):'-';
   const metrics=document.createElement('div');metrics.className='model-metrics';
   const hasOverall=Number.isFinite(scores.overall),applicable=['camera','static','dynamic'].filter(key=>Number.isFinite(scores[key])).map(key=>key[0].toUpperCase()+key.slice(1));
   metrics.classList.toggle('dimensions-only',!hasOverall);
   metrics.title=`Scores out of 100. ${hasOverall?`Overall equally weights the applicable dimensions: ${applicable.join(', ')}. `:''}A dash means no applicable score.`;
   for(const [key,title] of [['overall','Overall'],['camera','Camera'],['static','Static'],['dynamic','Dynamic']]){
    if(key==='overall'&&!hasOverall)continue;
    const cell=document.createElement('div'),caption=document.createElement('span'),value=document.createElement('strong');
    cell.className=key;caption.textContent=title;value.textContent=format(scores[key]);cell.append(caption,value);metrics.append(cell);
   }
   card.append(metrics);
  }
  grid.append(card);return v;
 }).filter(Boolean);
 const controls=document.createElement('div');controls.className='comparison-controls';controls.innerHTML=`<button class="comparison-play" type="button" aria-label="Play ${title}" data-playing="false" disabled></button><output class="comparison-time">Loading…</output><input class="comparison-scrub" type="range" min="0" max="1" step="0.001" value="0" aria-label="${title} time" disabled><select aria-label="${title} speed"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option></select><label class="loop-control"><input type="checkbox" checked> Loop</label><button class="comparison-expand" type="button" aria-label="Expand ${title}">⤢</button>`;
 root.append(controls);const button=controls.querySelector('.comparison-play'),timeLabel=controls.querySelector('output'),slider=controls.querySelector('.comparison-scrub'),rate=controls.querySelector('select'),loop=controls.querySelector('[type=checkbox]');
 if(inspectTime!==null){const focus=document.createElement('button');focus.className='inspect-moment';focus.textContent='Inspect checklist moment';focus.onclick=()=>{pause();seek(inspectTime)};root.append(focus)}
 const status=document.createElement('div');status.className='video-status';status.setAttribute('aria-live','polite');root.append(status);
 const display=()=>{const t=videos[0].currentTime||0;slider.value=t;timeLabel.textContent=`${t.toFixed(2)} / ${duration.toFixed(2)} s`};
 function pause(){playing=false;videos.forEach(v=>v.pause());button.dataset.playing='false';button.setAttribute('aria-label',`Play ${title}`);}
 function seek(t){if(!ready)return;const value=Math.max(0,Math.min(t,duration-.001));videos.forEach(v=>{v.currentTime=value});display()}
 async function play(){if(!ready||busy||!alive)return;busy=true;status.textContent='';if(videos[0].currentTime>=duration-.06)seek(0);try{await Promise.all(videos.map(v=>v.play()));if(!alive){videos.forEach(v=>v.pause());return}playing=true;button.dataset.playing='true';button.setAttribute('aria-label',`Pause ${title}`)}catch{pause();status.textContent='Playback could not start. Press play to retry.'}finally{busy=false}}
 button.onclick=()=>playing?pause():play();slider.oninput=()=>{pause();seek(Number(slider.value))};rate.onchange=()=>{speed=Number(rate.value);videos.forEach(v=>v.playbackRate=speed)};
 controls.querySelector('.comparison-expand').onclick=async()=>{try{if(document.fullscreenElement===root)await document.exitFullscreen();else await root.requestFullscreen()}catch{status.textContent='Fullscreen is unavailable in this browser.'}};
 const onReady=()=>{if(!alive||ready||!videos.every(v=>v.readyState>=1&&Number.isFinite(v.duration)))return;duration=Math.min(...videos.map(v=>v.duration));ready=true;button.disabled=false;slider.disabled=false;slider.max=duration;seek(initialTime);display()};
 videos.forEach(v=>{v.addEventListener('loadedmetadata',onReady,options);v.addEventListener('error',()=>{pause();status.textContent='This video could not load. Please refresh the page.'},options);v.addEventListener('ended',()=>{if(playing){if(loop.checked){seek(0);play()}else pause()}},options)});
 function tick(){if(!alive)return;if(ready){if(playing){const t=videos[0].currentTime;if(t>=duration-.04){if(loop.checked){seek(0);videos.forEach(v=>v.play().catch(()=>pause()))}else{pause();seek(duration-.001)}}else{const stalled=videos.some(v=>v.readyState<3);videos.forEach(v=>{if(stalled){v.pause()}else if(v.paused){v.play().catch(()=>pause())}});for(const v of videos.slice(1)){if(!v.seeking&&Math.abs(v.currentTime-t)>.035)v.currentTime=t;}}}display()}raf=requestAnimationFrame(tick)}
 raf=requestAnimationFrame(tick);onReady();
 const observer=new IntersectionObserver(([e])=>{if(!e.isIntersecting&&playing)pause()},{threshold:0});observer.observe(root);
 return {getTime:()=>videos[0].currentTime||0,pause,seek,destroy(){alive=false;pause();abort.abort();observer.disconnect();cancelAnimationFrame(raf);videos.forEach(v=>{v.removeAttribute('src');v.load()})}};
}
