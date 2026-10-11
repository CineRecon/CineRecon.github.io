import * as THREE from 'three';
const q0=new THREE.Quaternion(),q1=new THREE.Quaternion(),p0=new THREE.Vector3(),p1=new THREE.Vector3();
export function sampleCamera(frames,frame,target){
 const first=frames[0].frame;const index=Math.min(frames.length-1,Math.max(0,Math.floor((frame-first)*4)));
 const a=frames[index],b=frames[Math.min(index+1,frames.length-1)];const t=a.name===b.name?Math.max(0,Math.min(1,(frame-a.frame)/(b.frame-a.frame||1))):0;
 target.position.copy(p0.fromArray(a.position).lerp(p1.fromArray(b.position),t));target.quaternion.copy(q0.fromArray(a.quaternion).normalize().slerp(q1.fromArray(b.quaternion).normalize(),t).normalize());target.scale.set(1,1,1);target.fov=THREE.MathUtils.radToDeg(THREE.MathUtils.lerp(a.fov,b.fov,t));target.updateMatrix();
 return a.name;
}
