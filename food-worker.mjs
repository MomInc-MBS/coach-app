let classifier;
const MODEL='onnx-community/swin-finetuned-food101-ONNX',REVISION='e5e50bfc6425aa546f3b4421ca8bd79d0dd610b8';
self.onmessage=async({data})=>{
 try{
  if(!classifier){
   const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.web.js');
   env.allowLocalModels=false;env.backends.onnx.wasm.numThreads=1;
   classifier=await pipeline('image-classification',MODEL,{revision:REVISION,device:'wasm',dtype:'q8',progress_callback:p=>{if(p.status==='progress')postMessage({type:'progress',text:`Downloading recognition model: ${Math.round(p.progress||0)}%`});}});
  }
  postMessage({type:'progress',text:'Looking at your photo…'});
  const ranked=await classifier(data.image,{top_k:4});
  const uncertain=ranked[0].score<.5||ranked[0].score<2*ranked[1].score;
  postMessage({type:'result',items:ranked[0].score<.2?[]:ranked.map(r=>({...r,label:r.label.replaceAll('_',' ')})),uncertain});
 }catch{classifier=null;postMessage({type:'error',text:'Photo recognition could not finish. Try again on Wi-Fi or type the food name.'});}
};
