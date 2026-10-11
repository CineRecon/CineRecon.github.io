import {decodeScenePayload} from './scene-codec.js';

/** Download the ordered gzip parts, then restore the original scene bytes. */
export async function loadScenePayload(scene, {baseURL=document.baseURI,onProgress=()=>{}}={}){
 const manifestURL=new URL('assets/scene-v2-parts.json',baseURL);
 const response=await fetch(manifestURL);
 if(!response.ok)throw new Error(`Scene manifest request failed (${response.status})`);
 const manifest=await response.json();
 if(manifest.version!==2||manifest.encoding!=='motion-delta-shuffle-v1'||manifest.compression!=='gzip'||!Array.isArray(manifest.parts)||!manifest.parts.length||!Number.isSafeInteger(manifest.bytes)||manifest.bytes<=0)throw new Error('Invalid scene manifest');
 let expectedBytes=0;
 for(const part of manifest.parts){
  if(typeof part.path!=='string'||!part.path||!Number.isSafeInteger(part.bytes)||part.bytes<=0)throw new Error('Invalid scene part');
  expectedBytes+=part.bytes;
 }
 if(!Number.isSafeInteger(expectedBytes)||expectedBytes!==manifest.bytes)throw new Error('Scene manifest byte count does not match its parts');
 let partIndex=0,partBytes=0,totalBytes=0,lastPercent=-1,reader=null,cancelled=false;
 const abort=new AbortController();
 const reportDownload=()=>{
  const percent=Math.floor(totalBytes/manifest.bytes*100);
  if(percent!==lastPercent){lastPercent=percent;onProgress({phase:'download',fraction:totalBytes/manifest.bytes,bytes:totalBytes,total:manifest.bytes});}
 };
 reportDownload();
 async function cancelReader(reason){const activeReader=reader;reader=null;if(activeReader){try{await activeReader.cancel(reason)}finally{activeReader.releaseLock()}}}
 // A single active request limits memory usage while gzip decoding streams.
 const compressed=new ReadableStream({
  async pull(controller){
   try{
    while(!cancelled){
     if(!reader){
      if(partIndex===manifest.parts.length){controller.close();return;}
      const part=manifest.parts[partIndex];
      const partResponse=await fetch(new URL(part.path,manifestURL),{signal:abort.signal});
      if(cancelled){await partResponse.body?.cancel();return;}
      if(!partResponse.ok)throw new Error(`Scene part ${partIndex+1} request failed (${partResponse.status})`);
      if(!partResponse.body)throw new Error(`Scene part ${partIndex+1} has no response body`);
      reader=partResponse.body.getReader();partBytes=0;
     }
     const {value,done}=await reader.read();
     if(cancelled)return;
     if(done){
      reader.releaseLock();reader=null;
      if(partBytes!==manifest.parts[partIndex].bytes)throw new Error(`Scene part ${partIndex+1} is incomplete`);
      partIndex++;continue;
     }
     partBytes+=value.byteLength;
     if(partBytes>manifest.parts[partIndex].bytes)throw new Error(`Scene part ${partIndex+1} exceeds its expected size`);
     totalBytes+=value.byteLength;reportDownload();controller.enqueue(value);return;
    }
   }catch(error){
    if(cancelled)return;
    cancelled=true;abort.abort();await cancelReader(error).catch(()=>{});controller.error(error);
   }
  },
  async cancel(reason){cancelled=true;abort.abort();await cancelReader(reason);}
 });
 const encoded=await new Response(compressed.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
 onProgress({phase:'restore',fraction:0});
 return decodeScenePayload(encoded,scene,manifest,fraction=>onProgress({phase:'restore',fraction}));
}
