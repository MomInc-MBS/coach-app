import {pipeline,env} from '@huggingface/transformers';
import {mkdir,writeFile} from 'node:fs/promises';
env.cacheDir='../food-model-cache';
const model=await pipeline('image-classification','onnx-community/swin-finetuned-food101-ONNX',{device:'cpu',dtype:'q8',revision:'e5e50bfc6425aa546f3b4421ca8bd79d0dd610b8'});
const datasetUrl='https://datasets-server.huggingface.co/first-rows?dataset=ethz%2Ffood101&config=default&split=validation';
const response=await fetch(datasetUrl);if(!response.ok)throw Error(`Food fixture service: ${response.status}`);const data=await response.json();
const fixtures=data.rows.slice(0,2).map(x=>({source:datasetUrl,image:x.row.image.src,expected:data.features.find(f=>f.name==='label').type.names[x.row.label]}));
for(const offset of [5000,12500,20000]){const source=`https://datasets-server.huggingface.co/rows?dataset=ethz%2Ffood101&config=default&split=validation&offset=${offset}&length=1`;const d=await(await fetch(source)).json();fixtures.push({source,image:d.rows[0].row.image.src,expected:d.features.find(f=>f.name==='label').type.names[d.rows[0].row.label]});}
fixtures.push({source:'https://huggingface.co/Xenova/clip-vit-base-patch32',image:'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/tiger.jpg',expected:'non-food'});
const results=[];for(const f of fixtures){const result=await model(f.image,{top_k:4});results.push({expected:f.expected,top:result.slice(0,4),source:f.source});console.log(JSON.stringify(results.at(-1)));}
await writeFile('../food-recognition-check.json',JSON.stringify(results,null,2));
