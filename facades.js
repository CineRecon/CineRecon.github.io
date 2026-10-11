import * as THREE from 'three';
// Window periods, masks, and linear colors are read from the source Blender nodes.
export function applyFacade(material,p){
 material.flatShading=true;material.color.setRGB(1,1,1);material.roughness=p.glass?.08:.7;
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 facadePosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfacadePosition=position;');
  shader.fragmentShader=`varying vec3 facadePosition;
float facadeMask(float x,float threshold){float edge=fract(x);float aa=min(fwidth(x),.25);return 1.-smoothstep(threshold-aa,threshold+aa,edge);}
`+shader.fragmentShader;
  const v=c=>`vec3(${c.map(x=>Number(x).toFixed(7)).join(',')})`;
  let code=`float columnMask=facadeMask((facadePosition.x+facadePosition.y)/${p.period[0].toFixed(7)},${p.width[0].toFixed(7)});float rowMask=facadeMask(facadePosition.z/${p.period[1].toFixed(7)},${p.width[1].toFixed(7)});`;
  if(p.glass){code+=`float facadeGrid=max(columnMask,rowMask);float variation=.5+.16*sin(facadePosition.x*.25+sin(facadePosition.z*.2));vec3 glassColor=mix(${v(p.colors[0])},${v(p.colors[1])},variation);diffuseColor.rgb=mix(glassColor,${v(p.colors[2])},facadeGrid);`;shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(.08,.6,facadeGrid);').replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=mix(.7,0.,facadeGrid);');}
  else code+=`diffuseColor.rgb=mix(${v(p.colors[0])},${v(p.colors[1])},columnMask*rowMask);`;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+code);
  // Match the original distance-dependent haze shader after surface lighting.
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`outgoingLight=mix(outgoingLight,vec3(.36,.41,.37),1.-exp(-length(vViewPosition)*${p.haze.toFixed(7)}));\n#include <opaque_fragment>`);
 };
 material.customProgramCacheKey=()=>JSON.stringify(p);
}

export function applyFloor(material,p){
 material.color.setRGB(1,1,1);material.roughness=.85;material.metalness=0;
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 tilePosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntilePosition=position;');
  shader.fragmentShader='varying vec3 tilePosition;\n'+shader.fragmentShader;
  const v=c=>`vec3(${c.map(x=>Number(x).toFixed(7)).join(',')})`;
  const code=`
vec2 tileSize=vec2(${p.width.toFixed(7)},${p.height.toFixed(7)});
vec2 tileCoord=tilePosition.xy;
float tileRow=floor(tileCoord.y/tileSize.y);
tileCoord.x+=mod(tileRow,${Number(p.offsetFrequency).toFixed(1)})==0.?tileSize.x*${p.offset.toFixed(7)}:0.;
vec2 inside=mod(tileCoord,tileSize);
vec2 edgeDistance=min(inside,tileSize-inside);
vec2 aa=max(fwidth(tileCoord),vec2(.0001));
vec2 lines=1.-smoothstep(vec2(${p.mortar.toFixed(7)})-aa,vec2(${p.mortar.toFixed(7)})+aa,edgeDistance);
float seam=max(lines.x,lines.y);
float variation=clamp(.5+.14*sin(tilePosition.x*.6+sin(tilePosition.y*.5))+.08*sin(tilePosition.y*1.4),0.,1.);
vec3 stone=mix(${v(p.colors[0])},${v(p.colors[1])},variation)*.85;
diffuseColor.rgb=stone*mix(vec3(1.),${v(p.mortarColor)},seam);
`;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+code);
 };material.customProgramCacheKey=()=>`source-floor-${JSON.stringify(p)}`;
}
