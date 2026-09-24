import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// The USDA source remains readable in the repository and the AGPL source offer.
// Only the deployed copy stores its repeated object keys once, then restores
// the exact object array when the optional Food list is opened.
export async function packNutrition(source='nutrition-data.mjs',target='dist/client/nutrition-data.mjs'){
 const records=(await import(pathToFileURL(resolve(source)).href)).default;
 if(!Array.isArray(records)||!records.length)throw Error('Nutrition source has no rows.');
 const keys=Object.keys(records[0]),signature=keys.join('\0');
 for(const row of records)if(Object.keys(row).join('\0')!==signature)throw Error('Nutrition source columns differ between rows.');
 const rows=records.map(row=>keys.map(key=>row[key]));
 const header=(await readFile(source,'utf8')).split(/\r?\n/).slice(0,3).join('\n');
 const module=`${header}\n// Packed deploy copy; scripts/pack-nutrition.mjs verifies a uniform source schema.\nexport default (()=>{const keys=${JSON.stringify(keys)},rows=${JSON.stringify(rows)},out=new Array(rows.length);for(let j=0;j<rows.length;j++){const item={};for(let i=0;i<keys.length;i++)item[keys[i]]=rows[j][i];out[j]=item;}return out;})();\n`;
 await writeFile(target,module);
 return (await readFile(source)).length-Buffer.byteLength(module);
}
