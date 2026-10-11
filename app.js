import * as THREE from 'three';
import {applyFacade,applyFloor} from './facades.js?v=4';
import {sampleCamera} from './animation.js';
import {loadScenePayload} from './scene-loader.js';
import {OrbitControls} from './vendor/OrbitControls.js';
const $=s=>document.querySelector(s),viewport=$('#viewport'),ref=$('#reference'),rendered=$('#rendered'),videos=[ref,rendered];
let cameraFrames;
let data,buffer,meshes=[],ready=false,time=7.2,playing=false,speed=1,lastSample=-1,pathMode='sequence',lastTick=performance.now();
const scene=new THREE.Scene();scene.background=new THREE.Color('#c8d0c4');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;viewport.prepend(renderer.domElement);
const camera=new THREE.PerspectiveCamera(43,1,.035,700);camera.up.set(0,0,1);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.12;controls.maxDistance=100;controls.minDistance=.3;controls.maxPolarAngle=Math.PI*.495;
const skyPixels=new Float32Array(256*128*4);for(let i=0;i<256*128;i++)skyPixels.set([.5,.52,.44,1],i*4);const skyTexture=new THREE.DataTexture(skyPixels,256,128,THREE.RGBAFormat,THREE.FloatType);skyTexture.mapping=THREE.EquirectangularReflectionMapping;skyTexture.needsUpdate=true;const envGenerator=new THREE.PMREMGenerator(renderer);scene.environment=envGenerator.fromEquirectangular(skyTexture).texture;skyTexture.dispose();envGenerator.dispose();scene.add(new THREE.HemisphereLight(0xe5eddf,0x697265,.1));const sun=new THREE.DirectionalLight(0xfff3d9,1.3);sun.position.set(-7.02,12.15,18);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:.5,far:90});sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;scene.add(sun);const fill=new THREE.DirectionalLight(0xcfe2ff,0);fill.position.set(6,10,8);scene.add(fill);
const shotOverlays=[];
const paths=new THREE.Group();scene.add(paths);const currentCamera=new THREE.Group();paths.add(currentCamera);
function tube(points,radius,color,order){
 const curve=new THREE.CurvePath();for(let i=1;i<points.length;i++)curve.add(new THREE.LineCurve3(points[i-1],points[i]));
 const geometry=new THREE.TubeGeometry(curve,Math.max(1,Math.min(1600,points.length*2)),radius,6,false);
 const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,depthTest:false,depthWrite:false,toneMapped:false}));mesh.renderOrder=order;return mesh;
}
function outlinedPath(points,radius,color,order=5){
 const group=new THREE.Group();group.add(tube(points,radius*1.5,0xf7faf2,order));group.add(tube(points,radius,color,order+1));return group;
}
function glyph(color,scale=1){
 const group=new THREE.Group();const tip=new THREE.Vector3(),corners=[[-.43,-.28,-.8],[.43,-.28,-.8],[.43,.28,-.8],[-.43,.28,-.8]].map(p=>new THREE.Vector3(...p));
 const faces=[];for(let i=0;i<4;i++){faces.push(...tip,...corners[i],...corners[(i+1)%4]);group.add(outlinedPath([tip,corners[i]],.013,color,8));group.add(outlinedPath([corners[i],corners[(i+1)%4]],.013,color,8));}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(faces,3));
 const fill=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.09,side:THREE.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false}));fill.renderOrder=7;group.add(fill);
 const origin=new THREE.Mesh(new THREE.SphereGeometry(.06,12,8),new THREE.MeshBasicMaterial({color,depthTest:false,depthWrite:false,toneMapped:false}));origin.renderOrder=10;group.add(origin);group.scale.setScalar(scale);return group;
}
currentCamera.add(glyph(0xe7a636,1.4));
function resetView(close=false){controls.enabled=true;camera.fov=43;camera.aspect=viewport.clientWidth/viewport.clientHeight;camera.position.set(...(close?[-4.6,-5.7,3.2]:[-10,-6,9]));controls.target.set(...(close?[0,0,1]:[0,5.5,1]));camera.updateProjectionMatrix();controls.update();$('#gesture').textContent='Drag to orbit · Scroll to zoom · Right-drag to pan';}
resetView();new ResizeObserver(()=>{const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}).observe(viewport);
function typed(a,T){return new T(buffer,a.offset,a.count)}
function updateScene(){if(!ready)return;let index=Math.max(0,data.frames.findLastIndex(f=>f<=time*data.fps));if(time*data.fps>=data.frames.at(-1))index=data.frames.length-1;
 const next=Math.min(index+1,data.frames.length-1);const alpha=data.cameras[index].name===data.cameras[next].name?Math.max(0,Math.min(1,(time*data.fps-data.frames[index])/(data.frames[next]-data.frames[index]||1))):0;const sample=index+alpha;
 if(sample!==lastSample){for(const m of meshes){m.visible=!!m.userData.visible[index];for(let k=0;k<16;k++)m.matrix.elements[k]=THREE.MathUtils.lerp(m.userData.matrices[index*16+k],m.userData.matrices[next*16+k],alpha);m.matrixWorldNeedsUpdate=true;if(m.userData.motion){const dst=m.geometry.attributes.position.array,{motion,lo,span}=m.userData;let offset=index*dst.length;for(let j=0;j<dst.length;j++)dst[j]=lo[j%3]+THREE.MathUtils.lerp(motion[offset+j],motion[next*dst.length+j],alpha)/65535*span[j%3];m.geometry.attributes.position.needsUpdate=true;m.geometry.computeVertexNormals();}}lastSample=sample;}
 const cameraFrame=time*data.fps;
 sampleCamera(cameraFrames,cameraFrame,currentCamera);currentCamera.matrixWorldNeedsUpdate=true;

 const shot=Math.max(0,data.shots.findLastIndex(s=>s.time<=time));$('#shot-label').textContent=`Shot ${String(shot+1).padStart(2,'0')}`;document.querySelectorAll('.shot').forEach((el,i)=>el.classList.toggle('active',i===shot));updatePathVisibility();
}
function updatePathVisibility(){
 paths.visible=pathMode!=='none';
 for(const overlay of shotOverlays){
  overlay.group.visible=pathMode==='all'||(pathMode==='sequence'&&time>=overlay.start);
  if(!overlay.trail)continue;
  let fraction=1;
  if(pathMode==='sequence'&&time<overlay.end){
   const i=overlay.pathTimes.findLastIndex(t=>t<=time);const j=Math.min(i+1,overlay.pathTimes.length-1);
   const alpha=i<0?0:Math.max(0,Math.min(1,(time-overlay.pathTimes[i])/(overlay.pathTimes[j]-overlay.pathTimes[i]||1)));
   fraction=i<0?0:THREE.MathUtils.lerp(overlay.distances[i],overlay.distances[j],alpha)/overlay.length;
  }
  for(const mesh of overlay.trail.children){const segments=mesh.geometry.parameters.tubularSegments;mesh.geometry.setDrawRange(0,Math.floor(fraction*segments)*36);}
 }
}
function updateUI(){const value=time.toFixed(2).padStart(5,'0');$('#current').textContent=value;$('#scrub').value=time;}
function seek(t){time=Math.max(0,Math.min(data?.duration||16,t));videos.forEach(v=>{if(v.readyState>0)v.currentTime=Math.min(time,v.duration-.025)});updateScene();updateUI();}
async function setPlaying(value){playing=value;$('#play').dataset.playing=String(playing);$('#play').setAttribute('aria-label',playing?'Pause animation':'Play animation');if(playing){if(time>data.duration-.06)seek(0);for(const v of videos){v.playbackRate=speed;try{await v.play()}catch{}}}else videos.forEach(v=>v.pause());lastTick=performance.now();}
$('#play').onclick=()=>ready&&setPlaying(!playing);$('#scrub').oninput=e=>seek(Number(e.target.value));$('#speed').onchange=e=>{speed=Number(e.target.value);videos.forEach(v=>v.playbackRate=speed)};$('#reset').onclick=()=>resetView();$('#overview').onclick=()=>resetView();$('#neo').onclick=()=>resetView(true);document.querySelectorAll('[data-path-mode]').forEach(button=>button.onclick=()=>{pathMode=button.dataset.pathMode;document.querySelectorAll('[data-path-mode]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));});updatePathVisibility();});document.addEventListener('keydown',e=>{if(['INPUT','SELECT','BUTTON'].includes(document.activeElement.tagName))return;if(e.code==='Space'){e.preventDefault();if(ready)setPlaying(!playing)}if(e.code==='ArrowRight')seek(time+.2);if(e.code==='ArrowLeft')seek(time-.2)});
for(const v of videos)v.addEventListener('loadedmetadata',()=>{v.currentTime=time});
async function load(){data=await(await fetch('assets/scene.json')).json();$('#duration').textContent=`/ ${data.duration.toFixed(2)} s`;$('#scrub').max=data.duration;
 buffer=await loadScenePayload(data,{onProgress:({phase,fraction})=>{
  const percent=Math.floor(fraction*100);
  $('#load-detail').textContent=phase==='download'?`Downloading scene… ${percent}%`:`Restoring animation… ${percent}%`;
 }});
 $('#load-detail').textContent='Preparing the scene…';
 await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
 const [facadeData,floorData,denseCameras]=await Promise.all(['assets/facades.json?v=3','assets/floor.json','assets/cameras.json'].map(async url=>(await fetch(url)).json()));cameraFrames=denseCameras;
 const mats=data.materials.map(m=>new THREE.MeshStandardMaterial({color:new THREE.Color(...m.color.slice(0,3)),roughness:Math.max(.25,m.roughness),metalness:m.metalness,side:THREE.DoubleSide,emissive:new THREE.Color(...m.emission),transparent:m.color[3]<.99,opacity:m.color[3]}));
 mats.forEach((m,i)=>{const p=facadeData[data.materials[i].name];if(p)applyFacade(m,p);if(data.materials[i].name==='roof_floor')applyFloor(m,floorData);});
 for(const o of data.objects){let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(typed(o.position,Float32Array)),3));g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(typed(o.normal,Float32Array)),3));g.setIndex(new THREE.BufferAttribute(typed(o.index,Uint32Array),1));for(const [start,count,material]of o.groups)g.addGroup(start,count,material);if(!o.dynamic&&o.position.count===24){const flat=g.toNonIndexed();flat.computeVertexNormals();g.dispose();g=flat;}const m=new THREE.Mesh(g,mats);m.name=o.name;m.castShadow=!o.name.startsWith('Bullet');m.receiveShadow=true;m.matrixAutoUpdate=false;m.frustumCulled=false;m.userData={matrices:typed(o.matrix,Float32Array),visible:typed(o.visible,Uint8Array)};if(o.motion)Object.assign(m.userData,{motion:typed(o.motion,Uint16Array),lo:o.lo,span:o.span});scene.add(m);meshes.push(m);}
 data.shots.forEach((shot,i)=>{const end=data.shots[i+1]?.time??data.duration;
 const sampled=cameraFrames.filter(c=>c.frame/data.fps>=shot.time&&c.frame/data.fps<end);
 const points=[],pathTimes=[],distances=[];let length=0;
 for(const c of sampled){const point=new THREE.Vector3(...c.position);if(points.length&&point.distanceTo(points.at(-1))<=.00001)continue;if(points.length)length+=point.distanceTo(points.at(-1));points.push(point);pathTimes.push(c.frame/data.fps);distances.push(length);}
 const group=new THREE.Group();paths.add(group);let trail=null;
 if(points.length>1){trail=outlinedPath(points,.018,0x287c9e);group.add(trail);}
 const pose=sampled[0];if(pose){const anchor=new THREE.Group();anchor.position.fromArray(pose.position);anchor.quaternion.fromArray(pose.quaternion).normalize();anchor.add(glyph(0x287c9e,1.05));group.add(anchor);}
 shotOverlays.push({group,trail,start:shot.time,end,pathTimes,distances,length});
  const btn=document.createElement('button');btn.className='shot';btn.innerHTML=`<img src="assets/shot${i+1}.jpg" alt="Reference shot ${i+1}"><div><span>Shot ${String(i+1).padStart(2,'0')}</span><small>${shot.time.toFixed(2)} s</small></div>`;btn.onclick=()=>seek(shot.time+.04);$('#shots').append(btn);const tick=document.createElement('i');tick.style.left=`${shot.time/data.duration*100}%`;$('#cut-markers').append(tick);});
 ready=true;$('#loading').remove();seek(time);window.cineRecon={seek,play:()=>setPlaying(true),pause:()=>setPlaying(false),getState:()=>({time,playing,shot:$('#shot-label').textContent,objects:meshes.length,samples:data.frames.length})};
}
load().catch(e=>{console.error(e);$('#load-detail').textContent=`Could not load the scene: ${e.message||'Please reload and try again.'}`});
function animate(now){requestAnimationFrame(animate);const dt=Math.min((now-lastTick)/1000,.1);lastTick=now;if(ready&&playing){time=ref.readyState>=2&&!ref.paused?ref.currentTime:time+dt*speed;if(time>=data.duration-.015){time=data.duration;setPlaying(false)}if(Math.abs(rendered.currentTime-time)>.16&&!rendered.seeking)rendered.currentTime=time;updateUI();}if(ready)updateScene();controls.update();const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);renderer.clear();renderer.render(scene,camera);}requestAnimationFrame(animate);

if(document.modelContext?.registerTool){try{document.modelContext.registerTool({name:'set_scene_time',description:'Pause and inspect the reconstruction at a time in seconds.',inputSchema:{type:'object',properties:{seconds:{type:'number',minimum:0,maximum:16}},required:['seconds'],additionalProperties:false},execute:async input=>{if(!ready)throw Error('Scene is loading');if(typeof input.seconds!=='number'||!Number.isFinite(input.seconds)||input.seconds<0||input.seconds>data.duration)throw Error('Time outside the video');await setPlaying(false);seek(input.seconds);return {time,shot:$('#shot-label').textContent};}})}catch(e){console.warn('Optional scene tool unavailable',e)}}
